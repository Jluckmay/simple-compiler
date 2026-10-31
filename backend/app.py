from flask import Flask, request, jsonify
import subprocess, tempfile, os, shutil
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5000", "http://127.0.0.1:5000"])

# Maximum accepted code size (100 KB) to prevent resource exhaustion
MAX_CODE_SIZE = 100 * 1024

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TIMEOUT = 5  # seconds – enforced inside Docker and in subprocess fallback
MAX_OUTPUT = 10000  # characters – truncate stdout / stderr

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
        "run": lambda src: ["java", os.path.basename(src).replace('.java', '')],
        "ext": ".java",
    },
    "js": {
        "image": "node:20-slim",
        "run": lambda src: ["node", src],
        "ext": ".js",
    },
    "ts": {
        "image": "node:20-slim",
        "run": lambda src: ["ts-node", src],
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
    },
}

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def docker_available():
    """Return True if the Docker CLI is present on the host system."""
    return shutil.which('docker') is not None

def run_subprocess(cmd, input_data=None):
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
        )
        return res.stdout[:MAX_OUTPUT], res.stderr[:MAX_OUTPUT]
    except subprocess.TimeoutExpired:
        return "", "Execution timed out"
    except Exception as e:
        return "", f"Internal error: {e}"

def run_in_container(image, cmd, src_path=None, workdir=None, input_data=None):
    """Run a command inside a Docker container with strict resource limits.
    Returns (stdout, stderr). If Docker is not available this function should not be called.
    """
    docker_cmd = [
        "docker", "run", "--rm",
        "--network", "none",
        "--cpus", "0.5",
        "--memory", "256m",
        "-i",
    ]
    if workdir:
        docker_cmd += ["-w", workdir]
    if src_path:
        host_dir = os.path.dirname(src_path)
        docker_cmd += ["-v", f"{host_dir}:/code"]
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

def execute_code(cfg, src_path):
    """Compile (if needed) and run the user code using Docker when possible,
    otherwise fall back to the local subprocess runner.
    Returns (stdout, stderr).
    """
    # Read source file content for languages that need it on stdin (e.g. SQL)
    with open(src_path, 'r', encoding='utf-8', errors='replace') as f:
        src_content = f.read()

    # Compilation step for compiled languages
    if cfg.get('compile'):
        out_path = src_path + "_out"
        compile_cmd = cfg['compile'](src_path, out_path)
        if docker_available():
            _, compile_err = run_in_container(cfg['image'], compile_cmd, src_path=src_path, workdir="/code")
        else:
            _, compile_err = run_subprocess(compile_cmd)
        if compile_err:
            os.remove(src_path)
            return "", compile_err
        exec_cmd = cfg['run'](out_path)
        exec_input = None
    else:
        exec_cmd = cfg['run'](src_path)
        # SQL reads the script from stdin instead of a file argument
        exec_input = src_content.encode() if language_uses_stdin(cfg) else None

    # Execution – try Docker first, fallback on error
    if docker_available():
        out, err = run_in_container(cfg['image'], exec_cmd, src_path=src_path, workdir="/code", input_data=exec_input)
        if err.lower().startswith('container error'):
            # Docker not functional – fallback to subprocess
            out, err = run_subprocess(exec_cmd, input_data=exec_input)
    else:
        out, err = run_subprocess(exec_cmd, input_data=exec_input)
    # Clean up temporary artefacts
    if os.path.exists(src_path):
        os.remove(src_path)
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
# API endpoint
# ---------------------------------------------------------------------------
@app.route('/compile', methods=['POST'])
def compile_code():
    data = request.get_json(silent=True) or {}
    code = data.get('code', '')
    language = data.get('language', '').lower()
    # Reject oversized payloads
    if len(code.encode('utf-8')) > MAX_CODE_SIZE:
        return jsonify({"error": f"Code exceeds maximum size of {MAX_CODE_SIZE // 1024} KB"}), 413
    cfg = LANG_CONFIG.get(language)
    if not cfg:
        return jsonify({"error": f"Language {language} not supported"}), 400
    # Write source to a temporary file with proper extension
    ext = cfg.get('ext', '')
    fd, src_path = tempfile.mkstemp(suffix=ext)
    os.write(fd, code.encode())
    os.close(fd)
    # Execute safely
    stdout, stderr = execute_code(cfg, src_path)
    return jsonify({"output": stdout, "error": stderr})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
