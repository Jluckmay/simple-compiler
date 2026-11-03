// runtimes/python.mjs — Execução Python via Pyodide (WASM) com sandbox de segurança.
// Valida padrões perigosos, restringe builtins, captura stdout e sanitiza erros.

import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs';

const SECURITY_PY = String.raw`
import sys
import re
from io import StringIO

# Padrões perigosos rejeitados antes da execução.
DANGEROUS_PATTERNS = [
    r'import\s+os',
    r'import\s+subprocess',
    r'import\s+sys',
    r'import\s+socket',
    r'import\s+urllib',
    r'import\s+requests',
    r'import\s+shutil',
    r'import\s+pathlib',
    r'import\s+ctypes',
    r'import\s+marshal',
    r'import\s+pickle',
    r'import\s+shelve',
    r'import\s+sqlite3',
    r'import\s+ftplib',
    r'import\s+paramiko',
    r'import\s+http',
    r'import\s+email',
    r'import\s+xml',
    r'import\s+html',
    r'import\s+webbrowser',
    r'import\s+crypt',
    r'import\s+pty',
    r'import\s+resource',
    r'import\s+fcntl',
    r'import\s+termios',
    r'import\s+tty',
    r'import\s+curses',
    r'import\s+msvcrt',
    r'import\s+winreg',
    r'import\s+_winreg',
    r'import\s+imp',
    r'import\s+importlib',
    r'import\s+pkgutil',
    r'import\s+modulefinder',
    r'import\s+zipimport',
    r'__import__\s*\(',
    r'eval\s*\(',
    r'exec\s*\(',
    r'compile\s*\(',
    r'open\s*\(',
    r'input\s*\(',
    r'getattr\s*\(',
    r'setattr\s*\(',
    r'delattr\s*\(',
    r'hasattr\s*\(',
    r'globals\s*\(',
    r'locals\s*\(',
    r'vars\s*\(',
    r'dir\s*\(',
    r'help\s*\(',
    r'breakpoint\s*\(',
    r'os\.system',
    r'os\.popen',
    r'os\.exec',
    r'os\.spawn',
    r'os\.startfile',
    r'os\.remove',
    r'os\.unlink',
    r'os\.rmdir',
    r'os\.mkdir',
    r'os\.makedirs',
    r'os\.chdir',
    r'os\.getcwd',
    r'os\.environ',
    r'os\.path',
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
    # Metacaracteres de shell / injeção de comando
    r';\s*rm\s',
    r';\s*curl\s',
    r';\s*wget\s',
    r'&&\s*rm\s',
    r'&&\s*curl\s',
    r'&&\s*wget\s',
    r'\|\s*cat\s',
    r'\|\s*nc\s',
    r'[\`]',
    r'\$\(',
    r'\\\${',
]

# Builtins seguros — apenas funções puras e inofensivas.
SAFE_BUILTINS = {
    'print': print,
    'len': len,
    'str': str,
    'int': int,
    'float': float,
    'bool': bool,
    'list': list,
    'dict': dict,
    'tuple': tuple,
    'set': set,
    'frozenset': frozenset,
    'range': range,
    'enumerate': enumerate,
    'zip': zip,
    'map': map,
    'filter': filter,
    'sorted': sorted,
    'reversed': reversed,
    'any': any,
    'all': all,
    'sum': sum,
    'min': min,
    'max': max,
    'abs': abs,
    'round': round,
    'pow': pow,
    'divmod': divmod,
    'chr': chr,
    'ord': ord,
    'hex': hex,
    'oct': oct,
    'bin': bin,
    'repr': repr,
    'ascii': ascii,
    'format': format,
    'isinstance': isinstance,
    'issubclass': issubclass,
    'callable': callable,
    'hash': hash,
    'id': id,
    'type': type,
    'object': object,
    'property': property,
    'staticmethod': staticmethod,
    'classmethod': classmethod,
    'super': super,
    'slice': slice,
    'memoryview': memoryview,
    'bytearray': bytearray,
    'bytes': bytes,
    'complex': complex,
    'next': next,
    'iter': iter,
}

def validate_code(code):
    if not isinstance(code, str):
        return False, "Código inválido: esperado uma string."
    if len(code.encode('utf-8')) > 100 * 1024:
        return False, "Código excede o tamanho máximo de 100 KB."
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, code, re.IGNORECASE):
            return False, f"Padrão perigoso detectado: {pattern}"
    return True, ""

def run_code_safely(code):
    ok, reason = validate_code(code)
    if not ok:
        return {"ok": False, "output": "", "error": reason}

    old_stdout = sys.stdout
    sys.stdout = captured = StringIO()
    try:
        exec(code, {"__builtins__": SAFE_BUILTINS})
        output = captured.getvalue()
        return {"ok": True, "output": output, "error": ""}
    except SystemExit as e:
        return {"ok": False, "output": captured.getvalue(), "error": f"SystemExit: {e.code}"}
    except Exception as e:
        return {"ok": False, "output": captured.getvalue(), "error": f"{type(e).__name__}: {e}"}
    finally:
        sys.stdout = old_stdout
`;

let pyodide = null;
let ready = false;
let initPromise = null;

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/",
    });
    pyodide.runPython(SECURITY_PY);
    ready = true;
  })();
  return initPromise;
}

export async function run(code) {
  await init();
  pyodide.globals.set("user_code", code);
  const jsonStr = pyodide.runPython("import json; json.dumps(run_code_safely(user_code))");
  const js = JSON.parse(String(jsonStr));
  return {
    output: js.output || "",
    error: js.error || null,
  };
}
