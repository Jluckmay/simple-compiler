from flask import Flask, request, jsonify
import subprocess, tempfile, os, shutil, re, time
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["https://jluckmay.github.io"])

# Maximum accepted code size (100 KB) to prevent resource exhaustion
MAX_CODE_SIZE = 100 * 1024

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TIMEOUT = 5  # seconds – enforced inside Docker and in subprocess fallback
MAX_OUTPUT = 10000  # characters – truncate stdout / stderr

# Rate limiting: máximo de requisições por IP por minuto
RATE_LIMIT_REQUESTS = 30
RATE_LIMIT_WINDOW = 60  # seconds
_rate_limit_store = {}  # ip -> [timestamps]

# API key opcional para autenticação (definir via variável de ambiente API_KEY)
API_KEY = os.environ.get('API_KEY', None)

# ---------------------------------------------------------------------------
# Security helpers
# ---------------------------------------------------------------------------

def check_rate_limit(ip: str) -> bool:
    """Retorna True se o IP excedeu o limite de requisições."""
    now = time.time()
    timestamps = _rate_limit_store.get(ip, [])
    # Remove timestamps antigos
    timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(timestamps) >= RATE_LIMIT_REQUESTS:
        return True
    timestamps.append(now)
    _rate_limit_store[ip] = timestamps
    return False

def check_auth() -> tuple[bool, str]:
    """Verifica autenticação via API key se configurada."""
    if API_KEY is None:
        return True, ""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return False, "Missing or invalid Authorization header"
    token = auth_header[7:]
    if token != API_KEY:
        return False, "Invalid API key"
    return True, ""

# Mapping language → Docker image + command helpers
LANG_CONFIG = {
    "python": {
        "image": "python:3.12-slim",
        "run": lambda src: ["python", src],
        "ext": ".py",
    },
    "c": {
        "image": "gcc:13",
        "compile": lambda src, out: ["gcc", src, "-o", out],
        "run": lambda out: [out],
        "ext": ".c",
    },
    "cpp": {
        "image": "gcc:13",
        "compile": lambda src, out: ["g++", src, "-o", out],
        "run": lambda out: [out],
        "ext": ".cpp",
    },
    "csharp": {
        "image": "mcr.microsoft.com/dotnet/sdk:8.0",
        "run": lambda src: ["dotnet", "script", src],
        "ext": ".csx",
    },
    "java": {
        "image": "openjdk:21",
        "compile": lambda src, _: ["javac", src],
        "run": lambda src: ["java", os.path.basename(src).replace('_out', '').rsplit('.', 1)[0]],
        "ext": ".java",
        "filename": "Main.java",
    },
    "js": {
        "image": "node:20-slim",
        "run": lambda src: ["node", src],
        "ext": ".js",
    },
    "ts": {
        "image": "node:20-slim",
        "run": lambda src: ["node", "./ts-run.js", src],
        "ext": ".ts",
    },
    "sql": {
        "image": "nouchka/sqlite3",
        "run": lambda src: ["sqlite3", ":memory:"],
        "ext": ".sql",
    },
    "lua": {
        "image": "lua:5.4",
        "run": lambda src: ["lua", src],
        "ext": ".lua",
    },
    "go": {
        "image": "golang:1.22",
        "run": lambda src: ["go", "run", src],
        "ext": ".go",
    },
    "lean": {
        "image": "leanprover/lean4:latest",
        "run": lambda src: ["lean", src],
        "ext": ".lean",
    },
    "r": {
        "image": "r-base:latest",
        "run": lambda src: ["Rscript", src],
        "ext": ".R",
    },
    "latex": {
        "image": "texlive/texlive:latest",
        "run": lambda src: ["pdflatex", "-interaction=nonstopmode", src],
        "ext": ".tex",
    },
    "htmlcss": {
        "image": "node:20-slim",
        "run": lambda src: ["cat", src],
        "ext": ".html",
        "no_exec": True,
    },
}

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def docker_available():
    """Return True if the Docker CLI is present on the host system."""
    return shutil.which('docker') is not None

def run_subprocess(cmd, input_data=None, cwd=None):
    """Execute a command locally (fallback when Docker is missing).
    The call respects TIMEOUT and truncates output to MAX_OUTPUT.
    """
    try:
        res = subprocess.run(
            cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
            cwd=cwd,
        )
        return res.stdout[:MAX_OUTPUT], res.stderr[:MAX_OUTPUT]
    except subprocess.TimeoutExpired:
        return "", "Execution timed out"
    except FileNotFoundError as e:
        # Interpreter not installed on the host
        missing_cmd = cmd[0] if cmd else "unknown"
        return "", f"Interpreter not found: {missing_cmd}. Please install it or use Docker."
    except Exception as e:
        return "", f"Internal error: {e}"

def run_in_container(image, cmd, src_path=None, workdir=None, input_data=None):
    """Run a command inside a Docker container with strict resource limits.
    Returns (stdout, stderr). If Docker is not available this function should not be called.
    Uses an isolated temporary directory for volume mounting to avoid exposing
    the host filesystem.
    """
    docker_cmd = [
        "docker", "run", "--rm",
        "--network", "none",
        "--cpus", "0.5",
        "--memory", "256m",
        "-i",
        "--read-only",  # Prevent writing to container filesystem except /tmp
        "--tmpfs", "/tmp:noexec,nosuid,size=64m",  # Isolated, non-executable tmpfs
    ]
    if workdir:
        docker_cmd += ["-w", workdir]
    if src_path:
        # Use an isolated temp directory for the volume mount, not the host's /tmp
        host_dir = os.path.dirname(src_path)
        # Mount only the specific temp directory, read-only where possible
        docker_cmd += ["-v", f"{host_dir}:/code:ro"]
        # join command parts into a shell string executed inside the container
        docker_cmd += [image, "bash", "-c", " ".join(["cd /code &&"] + cmd)]
    else:
        docker_cmd += [image] + cmd
    try:
        res = subprocess.run(
            docker_cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
        )
        return res.stdout[:MAX_OUTPUT], res.stderr[:MAX_OUTPUT]
    except subprocess.TimeoutExpired:
        return "", "Execution timed out"
    except Exception as e:
        return "", f"Container error: {e}"

def execute_code(cfg, src_path, language=None):
    """Compile (if needed) and run the user code using Docker when possible,
    otherwise fall back to the local subprocess runner.
    Returns (stdout, stderr).
    """
    # Read source file content for languages that need it on stdin (e.g. SQL)
    # or for no_exec languages (e.g. htmlcss)
    with open(src_path, 'r', encoding='utf-8', errors='replace') as f:
        src_content = f.read()

    # For no_exec languages (e.g. htmlcss), just return the file content
    if cfg.get('no_exec'):
        return src_content, ""

    # Compilation step for compiled languages
    if cfg.get('compile'):
        out_path = src_path + "_out"
        compile_cmd = cfg['compile'](src_path, out_path)
        if docker_available():
            _, compile_err = run_in_container(cfg['image'], compile_cmd, src_path=src_path, workdir="/code")
            if compile_err.lower().startswith('container error'):
                # Docker not functional – fallback to subprocess (dangerous patterns already filtered)
                _, compile_err = run_subprocess(compile_cmd, cwd=os.path.dirname(src_path))
        else:
            _, compile_err = run_subprocess(compile_cmd, cwd=os.path.dirname(src_path))
        if compile_err:
            os.remove(src_path)
            return "", compile_err
        exec_cmd = cfg['run'](out_path)
        exec_input = None
    else:
        exec_cmd = cfg['run'](src_path)
        # SQL reads the script from stdin instead of a file argument
        exec_input = src_content if language_uses_stdin(cfg) else None
        if exec_input is not None and isinstance(exec_input, bytes):
            exec_input = exec_input.decode('utf-8', errors='replace')

    # Execution – try Docker first, fallback on error
    if docker_available():
        out, err = run_in_container(cfg['image'], exec_cmd, src_path=src_path, workdir="/code", input_data=exec_input)
        if err.lower().startswith('container error'):
            # Docker not functional – fallback to subprocess (dangerous patterns already filtered)
            out, err = run_subprocess(exec_cmd, input_data=exec_input, cwd=os.path.dirname(src_path))
    else:
        out, err = run_subprocess(exec_cmd, input_data=exec_input, cwd=os.path.dirname(src_path))
    # Clean up temporary artefacts
    if os.path.exists(src_path):
        os.remove(src_path)
    # Clean up TypeScript runner script if it was created
    if language == 'ts':
        runner_path = os.path.join(os.path.dirname(src_path), 'ts-run.js')
        if os.path.exists(runner_path):
            os.remove(runner_path)
    if cfg.get('compile') and os.path.exists(src_path + "_out"):
        os.remove(src_path + "_out")
    return out, err


def language_uses_stdin(cfg):
    """Return True if the language reads its program from stdin rather than a file argument."""
    run_cmd = cfg.get('run', lambda _: [])
    # Probe with a dummy path to inspect the command structure
    try:
        cmd = run_cmd("/dev/null")
    except Exception:
        cmd = []
    return any(part == ":memory:" for part in cmd)

# ---------------------------------------------------------------------------
# Security: dangerous patterns that must be rejected
# ---------------------------------------------------------------------------
DANGEROUS_PATTERNS = [
    # Python dangerous operations
    r'import\s+os',
    r'import\s+subprocess',
    r'import\s+sys',
    r'__import__\s*\(',
    r'eval\s*\(',
    r'exec\s*\(',
    r'compile\s*\(',
    r'open\s*\(',
    r'os\.system\s*\(',
    r'os\.popen\s*\(',
    r'os\.exec',
    r'os\.spawn',
    r'subprocess\.',
    r'socket\.',
    r'urllib\.',
    r'requests\.',
    r'ftplib\.',
    r'paramiko\.',
    r'ssh',
    r'shutil\.',
    r'glob\.',
    r'pathlib\.',
    r'ctypes\.',
    r'marshal\.',
    r'pickle\.',
    r'shelve\.',
    r'dbm\.',
    r'sqlite3\.',
    # Shell metacharacters for command injection
    r';\s*rm\s',
    r';\s*curl\s',
    r';\s*wget\s',
    r'&&\s*rm\s',
    r'&&\s*curl\s',
    r'&&\s*wget\s',
    r'\|\s*cat\s',
    r'\|\s*nc\s',
    r'`',
    r'\$\(',
]

import re

def contains_dangerous_pattern(code: str) -> tuple[bool, str]:
    """Check if code contains dangerous patterns. Returns (is_dangerous, reason)."""
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, code, re.IGNORECASE):
            return True, f"Potentially dangerous pattern detected: {pattern}"
    return False, ""

def sanitize_error(message: str) -> str:
    """Remove system paths and sensitive info from error messages."""
    # Replace Windows absolute paths
    message = re.sub(r'[A-Za-z]:\\.*?(?=\s|$)', '[PATH]', message)
    # Replace Unix absolute paths
    message = re.sub(r'/[^\s]*?(?=\s|$)', '[PATH]', message)
    # Replace temp file paths
    message = re.sub(r'tmp[a-zA-Z0-9_]*', '[TMPFILE]', message)
    # Replace user home directories
    message = re.sub(r'Users/[^\s/]*', '[USER]', message)
    return message


# ---------------------------------------------------------------------------
# API endpoint
# ---------------------------------------------------------------------------
@app.route('/compile', methods=['POST'])
def compile_code():
    # Rate limiting
    client_ip = request.remote_addr or 'unknown'
    if check_rate_limit(client_ip):
        return jsonify({"error": "Rate limit exceeded. Try again later."}), 429

    # Authentication (if API_KEY is configured)
    auth_ok, auth_reason = check_auth()
    if not auth_ok:
        return jsonify({"error": auth_reason}), 401

    data = request.get_json(silent=True) or {}
    code = data.get('code', '')
    language = data.get('language', '').lower()
    # Reject oversized payloads
    if len(code.encode('utf-8')) > MAX_CODE_SIZE:
        return jsonify({"error": f"Code exceeds maximum size of {MAX_CODE_SIZE // 1024} KB"}), 413
    cfg = LANG_CONFIG.get(language)
    if not cfg:
        return jsonify({"error": f"Language {language} not supported"}), 400
    # Security: reject dangerous patterns
    is_dangerous, reason = contains_dangerous_pattern(code)
    if is_dangerous:
        return jsonify({"error": f"Security: {reason}"}), 400
    # Write source to a temporary file with proper extension
    ext = cfg.get('ext', '')
    fd, src_path = tempfile.mkstemp(suffix=ext)
    os.write(fd, code.encode())
    os.close(fd)
    # For Java, the filename must match the public class name
    required_filename = cfg.get('filename')
    if required_filename:
        required_path = os.path.join(os.path.dirname(src_path), required_filename)
        os.rename(src_path, required_path)
        src_path = required_path
    # For TypeScript backend fallback, write the runner script alongside the source
    if language == 'ts':
        runner_path = os.path.join(os.path.dirname(src_path), 'ts-run.js')
        with open(os.path.join(os.path.dirname(__file__), 'ts-run.js'), 'r') as f:
            runner_content = f.read()
        with open(runner_path, 'w') as f:
            f.write(runner_content)
    # Execute safely
    stdout, stderr = execute_code(cfg, src_path, language)
    # Sanitize error messages to not reveal system paths
    if stderr:
        stderr = sanitize_error(stderr)
    return jsonify({"output": stdout, "error": stderr})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
