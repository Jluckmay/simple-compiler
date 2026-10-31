from flask import Flask, request, jsonify
import subprocess, tempfile, os, shlex, uuid, pathlib, threading
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Simple sandbox: limited runtime, no network, limited resources enforced by OS (not exhaustive)
TIMEOUT = 5  # seconds
MAX_OUTPUT = 10000  # characters

LANG_CONFIG = {
    "python": {
        "cmd": lambda src: ["python", "- <<END\n" + src + "\nEND"],
        "ext": ".py",
    },
    "c": {
        "compile": lambda src, out: ["gcc", "-x", "c", "-o", out, "-"],
        "run": lambda out: [out],
        "ext": ".c",
    },
    "cpp": {
        "compile": lambda src, out: ["g++", "-x", "c++", "-o", out, "-"],
        "run": lambda out: [out],
        "ext": ".cpp",
    },
    # Placeholder for other languages – return not implemented
}

def run_subprocess(cmd, input_data=None):
    try:
        res = subprocess.run(
            cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
            cwd=tempfile.gettempdir(),
        )
        out = res.stdout[:MAX_OUTPUT]
        err = res.stderr[:MAX_OUTPUT]
        return out, err
    except subprocess.TimeoutExpired:
        return "", "Execution timed out"
    except Exception as e:
        return "", f"Internal error: {e}"

@app.route('/compile', methods=['POST'])
def compile_code():
    data = request.get_json(silent=True) or {}
    code = data.get('code', '')
    language = data.get('language', '').lower()
    cfg = LANG_CONFIG.get(language)
    if not cfg:
        return jsonify({"error": f"Language {language} not supported yet"})
    # Python – exec directly
    if language == "python":
        cmd = ["python", "-c", code]
        out, err = run_subprocess(cmd)
        return jsonify({"output": out, "error": err})
    # C / C++ – compile then run
    if language in ("c", "cpp"):
        ext = cfg["ext"]
        src_fd, src_path = tempfile.mkstemp(suffix=ext)
        os.write(src_fd, code.encode())
        os.close(src_fd)
        exe_path = src_path + "_exe"
        compile_cmd = cfg["compile"](code, exe_path)
        # compile using stdin dash "-" reads from src_path via cat
        compile_cmd = cfg["compile"](code, exe_path)
        # Use gcc/g++ with input from file via redirection
        compile_res = subprocess.run(
            cfg["compile"](code, exe_path),
            input=code.encode(),
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
        )
        if compile_res.returncode != 0:
            os.remove(src_path)
            return jsonify({"output": "", "error": compile_res.stderr[:MAX_OUTPUT]})
        run_cmd = cfg["run"](exe_path)
        out, err = run_subprocess(run_cmd)
        os.remove(src_path)
        if os.path.exists(exe_path):
            os.remove(exe_path)
        return jsonify({"output": out, "error": err})
    return jsonify({"error": "Unsupported language handler"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
