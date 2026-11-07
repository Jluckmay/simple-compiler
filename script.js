// script.js — Frontend WASM multi-linguagem (sem servidor backend).
// Cada linguagem executa em um Web Worker dedicado via seu runtime WASM.
// Um tempo limite externo (5 s) encerra o worker em caso de looping infinito.

const i18n = {
  en: {
    title: "Simple Compiler",
    languageLabel: "Language",
    runButton: "Run",
    outputTitle: "Output",
    error: "Error",
    placeholder: "Write your code here...",
    loadingRuntime: "Loading WASM runtime...",
    timeout: "Execution timed out after {seconds} seconds",
    backendFallback: "WASM execution failed, falling back to backend server...",
    backendError: "Backend error",
    wakingBackend: "Waking up backend server...",
  },
  pt: {
    title: "Compilador Simples",
    languageLabel: "Linguagem",
    runButton: "Executar",
    outputTitle: "Saída",
    error: "Erro",
    placeholder: "Escreva seu código aqui...",
    loadingRuntime: "Carregando runtime WASM...",
    timeout: "Execução excedeu {seconds} segundos",
    backendFallback: "Falha na execução WASM, recorrendo ao servidor backend...",
    backendError: "Erro do servidor backend",
    wakingBackend: "Acordando servidor backend...",
  },
};

const EXEC_TIMEOUT_MS = 5000; // tempo máximo de execução do código (ms)
const DEFAULT_INIT_TIMEOUT_MS = 30000; // tempo padrão para baixar/inicializar o runtime WASM (ms)
const WORKER_INIT_TIMEOUT_MS = 60000; // tempo máximo para criar o worker (ms)

// Runtimes grandes (sqlite-wasm, webr) precisam de mais tempo para baixar.
// Linguagens que executam no backend precisam de tempo extra para cold start.
const INIT_TIMEOUT_BY_LANG = {
  sql: 120000,  // sqlite-wasm é grande (~several MB)
  r: 120000,    // webr é grande (~several MB)
  latex: 180000, // tectonic + pdf.js são grandes (~several MB)
  c: 150000,    // backend cold start (Render free tier)
  cpp: 150000,  // backend cold start
  csharp: 150000, // backend cold start
  java: 150000, // backend cold start
  go: 150000,   // backend cold start
  lean: 150000, // backend cold start
};

const BACKEND_LANGUAGES = new Set([
  'c', 'cpp', 'csharp', 'java', 'go', 'lean', 'sql', 'latex',
]);

const LANGUAGE_MAP = {
  js: 'javascript',
  ts: 'typescript',
};

const WASM_LANGUAGES = new Set([
  'python', 'javascript', 'typescript', 'lua', 'sql', 'r', 'latex', 'htmlcss',
  'c', 'cpp', 'csharp', 'java', 'go', 'lean',
]);

// Keyword lists per language for autocomplete
const KEYWORDS = {
  python: [
    { word: 'def', kind: 'fn' }, { word: 'class', kind: 'class' },
    { word: 'if', kind: 'kw' }, { word: 'else', kind: 'kw' }, { word: 'elif', kind: 'kw' },
    { word: 'for', kind: 'kw' }, { word: 'while', kind: 'kw' },
    { word: 'try', kind: 'kw' }, { word: 'except', kind: 'kw' }, { word: 'finally', kind: 'kw' },
    { word: 'import', kind: 'kw' }, { word: 'from', kind: 'kw' }, { word: 'as', kind: 'kw' },
    { word: 'with', kind: 'kw' }, { word: 'return', kind: 'kw' }, { word: 'yield', kind: 'kw' },
    { word: 'lambda', kind: 'kw' }, { word: 'None', kind: 'const' }, { word: 'True', kind: 'const' },
    { word: 'False', kind: 'const' }, { word: 'and', kind: 'kw' }, { word: 'or', kind: 'kw' },
    { word: 'not', kind: 'kw' }, { word: 'in', kind: 'kw' }, { word: 'is', kind: 'kw' },
    { word: 'print', kind: 'fn' }, { word: 'len', kind: 'fn' }, { word: 'range', kind: 'fn' },
    { word: 'str', kind: 'fn' }, { word: 'int', kind: 'fn' }, { word: 'float', kind: 'fn' },
    { word: 'list', kind: 'fn' }, { word: 'dict', kind: 'fn' }, { word: 'set', kind: 'fn' },
    { word: 'tuple', kind: 'fn' }, { word: 'open', kind: 'fn' }, { word: 'enumerate', kind: 'fn' },
    { word: 'zip', kind: 'fn' }, { word: 'map', kind: 'fn' }, { word: 'filter', kind: 'fn' },
    { word: 'sorted', kind: 'fn' }, { word: 'reversed', kind: 'fn' },
  ],
  javascript: [
    { word: 'function', kind: 'fn' }, { word: 'const', kind: 'kw' }, { word: 'let', kind: 'kw' },
    { word: 'var', kind: 'kw' }, { word: 'if', kind: 'kw' }, { word: 'else', kind: 'kw' },
    { word: 'for', kind: 'kw' }, { word: 'while', kind: 'kw' }, { word: 'do', kind: 'kw' },
    { word: 'try', kind: 'kw' }, { word: 'catch', kind: 'kw' }, { word: 'finally', kind: 'kw' },
    { word: 'return', kind: 'kw' }, { word: 'import', kind: 'kw' }, { word: 'export', kind: 'kw' },
    { word: 'from', kind: 'kw' }, { word: 'async', kind: 'kw' }, { word: 'await', kind: 'kw' },
    { word: 'class', kind: 'class' }, { word: 'new', kind: 'kw' }, { word: 'this', kind: 'kw' },
    { word: 'null', kind: 'const' }, { word: 'undefined', kind: 'const' }, { word: 'true', kind: 'const' },
    { word: 'false', kind: 'const' }, { word: 'typeof', kind: 'kw' }, { word: 'instanceof', kind: 'kw' },
    { word: 'console', kind: 'obj' }, { word: 'log', kind: 'fn' }, { word: 'document', kind: 'obj' },
    { word: 'window', kind: 'obj' }, { word: 'setTimeout', kind: 'fn' }, { word: 'setInterval', kind: 'fn' },
    { word: 'Promise', kind: 'class' }, { word: 'JSON', kind: 'obj' }, { word: 'Array', kind: 'class' },
    { word: 'Object', kind: 'class' }, { word: 'String', kind: 'class' }, { word: 'Number', kind: 'class' },
    { word: 'Boolean', kind: 'class' },
  ],
  typescript: [
    { word: 'function', kind: 'fn' }, { word: 'const', kind: 'kw' }, { word: 'let', kind: 'kw' },
    { word: 'var', kind: 'kw' }, { word: 'if', kind: 'kw' }, { word: 'else', kind: 'kw' },
    { word: 'for', kind: 'kw' }, { word: 'while', kind: 'kw' }, { word: 'do', kind: 'kw' },
    { word: 'try', kind: 'kw' }, { word: 'catch', kind: 'kw' }, { word: 'finally', kind: 'kw' },
    { word: 'return', kind: 'kw' }, { word: 'import', kind: 'kw' }, { word: 'export', kind: 'kw' },
    { word: 'from', kind: 'kw' }, { word: 'async', kind: 'kw' }, { word: 'await', kind: 'kw' },
    { word: 'class', kind: 'class' }, { word: 'interface', kind: 'class' }, { word: 'type', kind: 'kw' },
    { word: 'enum', kind: 'kw' }, { word: 'namespace', kind: 'kw' }, { word: 'new', kind: 'kw' },
    { word: 'this', kind: 'kw' }, { word: 'null', kind: 'const' }, { word: 'undefined', kind: 'const' },
    { word: 'true', kind: 'const' }, { word: 'false', kind: 'const' }, { word: 'typeof', kind: 'kw' },
    { word: 'instanceof', kind: 'kw' }, { word: 'public', kind: 'kw' }, { word: 'private', kind: 'kw' },
    { word: 'protected', kind: 'kw' }, { word: 'readonly', kind: 'kw' }, { word: 'static', kind: 'kw' },
    { word: 'abstract', kind: 'kw' }, { word: 'implements', kind: 'kw' }, { word: 'extends', kind: 'kw' },
    { word: 'console', kind: 'obj' }, { word: 'log', kind: 'fn' }, { word: 'Promise', kind: 'class' },
    { word: 'Array', kind: 'class' }, { word: 'Object', kind: 'class' }, { word: 'String', kind: 'class' },
    { word: 'Number', kind: 'class' }, { word: 'Boolean', kind: 'class' },
  ],
  c: [
    { word: 'int', kind: 'type' }, { word: 'char', kind: 'type' }, { word: 'float', kind: 'type' },
    { word: 'double', kind: 'type' }, { word: 'void', kind: 'kw' }, { word: 'main', kind: 'fn' },
    { word: 'printf', kind: 'fn' }, { word: 'scanf', kind: 'fn' }, { word: 'include', kind: 'kw' },
    { word: 'stdio', kind: 'obj' }, { word: 'stdlib', kind: 'obj' }, { word: 'string', kind: 'type' },
    { word: 'if', kind: 'kw' }, { word: 'else', kind: 'kw' }, { word: 'for', kind: 'kw' },
    { word: 'while', kind: 'kw' }, { word: 'do', kind: 'kw' }, { word: 'switch', kind: 'kw' },
    { word: 'case', kind: 'kw' }, { word: 'break', kind: 'kw' }, { word: 'continue', kind: 'kw' },
    { word: 'return', kind: 'kw' }, { word: 'struct', kind: 'kw' }, { word: 'typedef', kind: 'kw' },
    { word: 'sizeof', kind: 'kw' }, { word: 'NULL', kind: 'const' }, { word: 'true', kind: 'const' },
    { word: 'false', kind: 'const' },
  ],
  cpp: [
    { word: 'int', kind: 'type' }, { word: 'char', kind: 'type' }, { word: 'float', kind: 'type' },
    { word: 'double', kind: 'type' }, { word: 'void', kind: 'kw' }, { word: 'bool', kind: 'type' },
    { word: 'auto', kind: 'kw' }, { word: 'class', kind: 'class' }, { word: 'struct', kind: 'kw' },
    { word: 'public', kind: 'kw' }, { word: 'private', kind: 'kw' }, { word: 'protected', kind: 'kw' },
    { word: 'virtual', kind: 'kw' }, { word: 'override', kind: 'kw' }, { word: 'template', kind: 'kw' },
    { word: 'typename', kind: 'kw' }, { word: 'namespace', kind: 'kw' }, { word: 'using', kind: 'kw' },
    { word: 'std', kind: 'obj' }, { word: 'cout', kind: 'obj' }, { word: 'cin', kind: 'obj' },
    { word: 'endl', kind: 'const' }, { word: 'vector', kind: 'class' }, { word: 'string', kind: 'class' },
    { word: 'nullptr', kind: 'const' }, { word: 'true', kind: 'const' }, { word: 'false', kind: 'const' },
    { word: 'if', kind: 'kw' }, { word: 'else', kind: 'kw' }, { word: 'for', kind: 'kw' },
    { word: 'while', kind: 'kw' }, { word: 'do', kind: 'kw' }, { word: 'switch', kind: 'kw' },
    { word: 'case', kind: 'kw' }, { word: 'break', kind: 'kw' }, { word: 'continue', kind: 'kw' },
    { word: 'return', kind: 'kw' }, { word: 'new', kind: 'kw' }, { word: 'delete', kind: 'kw' },
    { word: 'include', kind: 'kw' }, { word: 'iostream', kind: 'obj' }, { word: 'algorithm', kind: 'obj' },
  ],
  csharp: [
    { word: 'using', kind: 'kw' }, { word: 'namespace', kind: 'kw' }, { word: 'class', kind: 'class' },
    { word: 'public', kind: 'kw' }, { word: 'private', kind: 'kw' }, { word: 'protected', kind: 'kw' },
    { word: 'static', kind: 'kw' }, { word: 'void', kind: 'kw' }, { word: 'int', kind: 'type' },
    { word: 'string', kind: 'type' }, { word: 'bool', kind: 'type' }, { word: 'true', kind: 'const' },
    { word: 'false', kind: 'const' }, { word: 'null', kind: 'const' }, { word: 'if', kind: 'kw' },
    { word: 'else', kind: 'kw' }, { word: 'for', kind: 'kw' }, { word: 'while', kind: 'kw' },
    { word: 'do', kind: 'kw' }, { word: 'switch', kind: 'kw' }, { word: 'case', kind: 'kw' },
    { word: 'break', kind: 'kw' }, { word: 'continue', kind: 'kw' }, { word: 'return', kind: 'kw' },
    { word: 'new', kind: 'kw' }, { word: 'this', kind: 'kw' }, { word: 'base', kind: 'kw' },
    { word: 'override', kind: 'kw' }, { word: 'virtual', kind: 'kw' }, { word: 'abstract', kind: 'kw' },
    { word: 'interface', kind: 'kw' }, { word: 'enum', kind: 'kw' }, { word: 'struct', kind: 'kw' },
    { word: 'var', kind: 'kw' }, { word: 'async', kind: 'kw' }, { word: 'await', kind: 'kw' },
    { word: 'Task', kind: 'class' }, { word: 'Console', kind: 'obj' }, { word: 'WriteLine', kind: 'fn' },
    { word: 'ReadLine', kind: 'fn' },
  ],
  java: [
    { word: 'public', kind: 'kw' }, { word: 'class', kind: 'class' }, { word: 'static', kind: 'kw' },
    { word: 'void', kind: 'kw' }, { word: 'main', kind: 'fn' }, { word: 'String', kind: 'type' },
    { word: 'args', kind: 'var' }, { word: 'System', kind: 'obj' }, { word: 'out', kind: 'obj' },
    { word: 'println', kind: 'fn' }, { word: 'int', kind: 'type' }, { word: 'boolean', kind: 'type' },
    { word: 'true', kind: 'const' }, { word: 'false', kind: 'const' }, { word: 'null', kind: 'const' },
    { word: 'if', kind: 'kw' }, { word: 'else', kind: 'kw' }, { word: 'for', kind: 'kw' },
    { word: 'while', kind: 'kw' }, { word: 'do', kind: 'kw' }, { word: 'switch', kind: 'kw' },
    { word: 'case', kind: 'kw' }, { word: 'break', kind: 'kw' }, { word: 'continue', kind: 'kw' },
    { word: 'return', kind: 'kw' }, { word: 'new', kind: 'kw' }, { word: 'this', kind: 'kw' },
    { word: 'super', kind: 'kw' }, { word: 'extends', kind: 'kw' }, { word: 'implements', kind: 'kw' },
    { word: 'interface', kind: 'kw' }, { word: 'abstract', kind: 'kw' }, { word: 'final', kind: 'kw' },
    { word: 'import', kind: 'kw' }, { word: 'package', kind: 'kw' }, { word: 'try', kind: 'kw' },
    { word: 'catch', kind: 'kw' }, { word: 'finally', kind: 'kw' }, { word: 'throw', kind: 'kw' },
    { word: 'throws', kind: 'kw' }, { word: 'instanceof', kind: 'kw' }, { word: 'enum', kind: 'kw' },
    { word: 'default', kind: 'kw' },
  ],
  go: [
    { word: 'package', kind: 'kw' }, { word: 'import', kind: 'kw' }, { word: 'func', kind: 'fn' },
    { word: 'main', kind: 'fn' }, { word: 'fmt', kind: 'obj' }, { word: 'Println', kind: 'fn' },
    { word: 'Printf', kind: 'fn' }, { word: 'var', kind: 'kw' }, { word: 'const', kind: 'kw' },
    { word: 'type', kind: 'kw' }, { word: 'struct', kind: 'kw' }, { word: 'interface', kind: 'kw' },
    { word: 'if', kind: 'kw' }, { word: 'else', kind: 'kw' }, { word: 'for', kind: 'kw' },
    { word: 'range', kind: 'kw' }, { word: 'switch', kind: 'kw' }, { word: 'case', kind: 'kw' },
    { word: 'default', kind: 'kw' }, { word: 'break', kind: 'kw' }, { word: 'continue', kind: 'kw' },
    { word: 'return', kind: 'kw' }, { word: 'go', kind: 'kw' }, { word: 'defer', kind: 'kw' },
    { word: 'chan', kind: 'kw' }, { word: 'make', kind: 'fn' }, { word: 'new', kind: 'fn' },
    { word: 'nil', kind: 'const' }, { word: 'true', kind: 'const' }, { word: 'false', kind: 'const' },
    { word: 'int', kind: 'type' }, { word: 'string', kind: 'type' }, { word: 'bool', kind: 'type' },
    { word: 'float64', kind: 'type' }, { word: 'error', kind: 'type' }, { word: 'append', kind: 'fn' },
    { word: 'len', kind: 'fn' }, { word: 'cap', kind: 'fn' }, { word: 'copy', kind: 'fn' },
    { word: 'delete', kind: 'fn' }, { word: 'close', kind: 'fn' }, { word: 'panic', kind: 'fn' },
    { word: 'recover', kind: 'fn' },
  ],
  lua: [
    { word: 'local', kind: 'kw' }, { word: 'function', kind: 'fn' }, { word: 'end', kind: 'kw' },
    { word: 'if', kind: 'kw' }, { word: 'then', kind: 'kw' }, { word: 'else', kind: 'kw' },
    { word: 'elseif', kind: 'kw' }, { word: 'for', kind: 'kw' }, { word: 'while', kind: 'kw' },
    { word: 'do', kind: 'kw' }, { word: 'repeat', kind: 'kw' }, { word: 'until', kind: 'kw' },
    { word: 'return', kind: 'kw' }, { word: 'break', kind: 'kw' }, { word: 'nil', kind: 'const' },
    { word: 'true', kind: 'const' }, { word: 'false', kind: 'const' }, { word: 'and', kind: 'kw' },
    { word: 'or', kind: 'kw' }, { word: 'not', kind: 'kw' }, { word: 'in', kind: 'kw' },
    { word: 'print', kind: 'fn' }, { word: 'type', kind: 'fn' }, { word: 'tostring', kind: 'fn' },
    { word: 'tonumber', kind: 'fn' }, { word: 'table', kind: 'obj' }, { word: 'insert', kind: 'fn' },
    { word: 'remove', kind: 'fn' }, { word: 'sort', kind: 'fn' }, { word: 'pairs', kind: 'fn' },
    { word: 'ipairs', kind: 'fn' }, { word: 'next', kind: 'fn' }, { word: 'require', kind: 'fn' },
    { word: 'module', kind: 'kw' }, { word: 'package', kind: 'obj' }, { word: 'os', kind: 'obj' },
    { word: 'io', kind: 'obj' }, { word: 'string', kind: 'obj' }, { word: 'math', kind: 'obj' },
  ],
  r: [
    { word: 'library', kind: 'kw' }, { word: 'function', kind: 'fn' }, { word: 'if', kind: 'kw' },
    { word: 'else', kind: 'kw' }, { word: 'for', kind: 'kw' }, { word: 'while', kind: 'kw' },
    { word: 'repeat', kind: 'kw' }, { word: 'break', kind: 'kw' }, { word: 'next', kind: 'kw' },
    { word: 'return', kind: 'kw' }, { word: 'NULL', kind: 'const' }, { word: 'TRUE', kind: 'const' },
    { word: 'FALSE', kind: 'const' }, { word: 'NA', kind: 'const' }, { word: 'NaN', kind: 'const' },
    { word: 'Inf', kind: 'const' }, { word: 'c', kind: 'fn' }, { word: 'list', kind: 'fn' },
    { word: 'data.frame', kind: 'fn' }, { word: 'matrix', kind: 'fn' }, { word: 'array', kind: 'fn' },
    { word: 'factor', kind: 'fn' }, { word: 'print', kind: 'fn' }, { word: 'summary', kind: 'fn' },
    { word: 'plot', kind: 'fn' }, { word: 'hist', kind: 'fn' }, { word: 'mean', kind: 'fn' },
    { word: 'sd', kind: 'fn' }, { word: 'sum', kind: 'fn' }, { word: 'min', kind: 'fn' },
    { word: 'max', kind: 'fn' }, { word: 'length', kind: 'fn' }, { word: 'dim', kind: 'fn' },
    { word: 'names', kind: 'fn' }, { word: 'head', kind: 'fn' }, { word: 'tail', kind: 'fn' },
    { word: 'str', kind: 'fn' }, { word: 'class', kind: 'fn' }, { word: 'typeof', kind: 'fn' },
    { word: 'seq', kind: 'fn' }, { word: 'rep', kind: 'fn' }, { word: 'sample', kind: 'fn' },
    { word: 'sort', kind: 'fn' }, { word: 'order', kind: 'fn' },
  ],
  sql: [
    { word: 'SELECT', kind: 'kw' }, { word: 'FROM', kind: 'kw' }, { word: 'WHERE', kind: 'kw' },
    { word: 'INSERT', kind: 'kw' }, { word: 'INTO', kind: 'kw' }, { word: 'VALUES', kind: 'kw' },
    { word: 'UPDATE', kind: 'kw' }, { word: 'SET', kind: 'kw' }, { word: 'DELETE', kind: 'kw' },
    { word: 'CREATE', kind: 'kw' }, { word: 'TABLE', kind: 'kw' }, { word: 'DROP', kind: 'kw' },
    { word: 'ALTER', kind: 'kw' }, { word: 'ADD', kind: 'kw' }, { word: 'COLUMN', kind: 'kw' },
    { word: 'INDEX', kind: 'kw' }, { word: 'JOIN', kind: 'kw' }, { word: 'LEFT', kind: 'kw' },
    { word: 'RIGHT', kind: 'kw' }, { word: 'INNER', kind: 'kw' }, { word: 'OUTER', kind: 'kw' },
    { word: 'ON', kind: 'kw' }, { word: 'AS', kind: 'kw' }, { word: 'AND', kind: 'kw' },
    { word: 'OR', kind: 'kw' }, { word: 'NOT', kind: 'kw' }, { word: 'IN', kind: 'kw' },
    { word: 'LIKE', kind: 'kw' }, { word: 'BETWEEN', kind: 'kw' }, { word: 'IS', kind: 'kw' },
    { word: 'NULL', kind: 'const' }, { word: 'GROUP', kind: 'kw' }, { word: 'BY', kind: 'kw' },
    { word: 'HAVING', kind: 'kw' }, { word: 'ORDER', kind: 'kw' }, { word: 'ASC', kind: 'kw' },
    { word: 'DESC', kind: 'kw' }, { word: 'LIMIT', kind: 'kw' }, { word: 'OFFSET', kind: 'kw' },
    { word: 'DISTINCT', kind: 'kw' }, { word: 'COUNT', kind: 'fn' }, { word: 'SUM', kind: 'fn' },
    { word: 'AVG', kind: 'fn' }, { word: 'MIN', kind: 'fn' }, { word: 'MAX', kind: 'fn' },
    { word: 'INT', kind: 'type' }, { word: 'VARCHAR', kind: 'type' }, { word: 'TEXT', kind: 'type' },
    { word: 'FLOAT', kind: 'type' }, { word: 'BOOLEAN', kind: 'type' }, { word: 'DATE', kind: 'type' },
  ],
  latex: [
    { word: '\\documentclass', kind: 'kw' }, { word: '\\begin', kind: 'kw' }, { word: '\\end', kind: 'kw' },
    { word: '\\section', kind: 'kw' }, { word: '\\subsection', kind: 'kw' }, { word: '\\subsubsection', kind: 'kw' },
    { word: '\\paragraph', kind: 'kw' }, { word: '\\subparagraph', kind: 'kw' },
    { word: '\\title', kind: 'kw' }, { word: '\\author', kind: 'kw' }, { word: '\\date', kind: 'kw' },
    { word: '\\maketitle', kind: 'kw' }, { word: '\\tableofcontents', kind: 'kw' },
    { word: '\\textbf', kind: 'fn' }, { word: '\\textit', kind: 'fn' }, { word: '\\underline', kind: 'fn' },
    { word: '\\emph', kind: 'fn' }, { word: '\\item', kind: 'kw' }, { word: '\\enumerate', kind: 'kw' },
    { word: '\\itemize', kind: 'kw' }, { word: '\\description', kind: 'kw' },
    { word: '\\label', kind: 'kw' }, { word: '\\ref', kind: 'kw' }, { word: '\\cite', kind: 'kw' },
    { word: '\\bibitem', kind: 'kw' }, { word: '\\footnote', kind: 'fn' }, { word: '\\index', kind: 'kw' },
    { word: '\\usepackage', kind: 'kw' }, { word: '\\documentclass', kind: 'kw' },
    { word: 'article', kind: 'const' }, { word: 'report', kind: 'const' }, { word: 'book', kind: 'const' },
    { word: '\\input', kind: 'kw' }, { word: '\\include', kind: 'kw' }, { word: '\\newcommand', kind: 'kw' },
    { word: '\\renewcommand', kind: 'kw' }, { word: '\\providecommand', kind: 'kw' },
  ],
  htmlcss: [
    { word: 'div', kind: 'tag' }, { word: 'span', kind: 'tag' }, { word: 'p', kind: 'tag' },
    { word: 'h1', kind: 'tag' }, { word: 'h2', kind: 'tag' }, { word: 'h3', kind: 'tag' },
    { word: 'h4', kind: 'tag' }, { word: 'h5', kind: 'tag' }, { word: 'h6', kind: 'tag' },
    { word: 'a', kind: 'tag' }, { word: 'ul', kind: 'tag' }, { word: 'ol', kind: 'tag' },
    { word: 'li', kind: 'tag' }, { word: 'table', kind: 'tag' }, { word: 'tr', kind: 'tag' },
    { word: 'td', kind: 'tag' }, { word: 'th', kind: 'tag' }, { word: 'form', kind: 'tag' },
    { word: 'input', kind: 'tag' }, { word: 'button', kind: 'tag' }, { word: 'select', kind: 'tag' },
    { word: 'option', kind: 'tag' }, { word: 'textarea', kind: 'tag' }, { word: 'label', kind: 'tag' },
    { word: 'img', kind: 'tag' }, { word: 'br', kind: 'tag' }, { word: 'hr', kind: 'tag' },
    { word: 'color', kind: 'prop' }, { word: 'background', kind: 'prop' }, { word: 'font-size', kind: 'prop' },
    { word: 'font-family', kind: 'prop' }, { word: 'margin', kind: 'prop' }, { word: 'padding', kind: 'prop' },
    { word: 'border', kind: 'prop' }, { word: 'display', kind: 'prop' }, { word: 'position', kind: 'prop' },
    { word: 'flex', kind: 'prop' }, { word: 'grid', kind: 'prop' }, { word: 'width', kind: 'prop' },
    { word: 'height', kind: 'prop' }, { word: 'text-align', kind: 'prop' }, { word: 'display', kind: 'prop' },
  ],
};

// Autocomplete state
let autocompleteActive = false;
let autocompleteSelectedIndex = 0;
let autocompleteMatches = [];
let autocompletePrefix = '';
let autocompleteStartPos = 0;

function getCursorPosition(el) {
  const sel = window.getSelection();
  if (sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(el);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  return preCaretRange.toString().length;
}

function setCursorPosition(el, pos) {
  el.focus();
  const sel = window.getSelection();
  sel.removeAllRanges();
  const range = document.createRange();
  let charIndex = 0;
  let node = el.firstChild;
  let found = false;

  function walk(node) {
    if (found || !node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharIndex = charIndex + node.length;
      if (pos >= charIndex && pos <= nextCharIndex) {
        range.setStart(node, pos - charIndex);
        range.setEnd(node, pos - charIndex);
        sel.addRange(range);
        found = true;
        return;
      }
      charIndex = nextCharIndex;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        walk(node.childNodes[i]);
        if (found) return;
      }
    }
  }

  walk(el);
  if (!found) {
    range.selectNodeContents(el);
    range.collapse(false);
    sel.addRange(range);
  }
}

function getSelectionRange(el) {
  const sel = window.getSelection();
  if (sel.rangeCount === 0) return { start: 0, end: 0 };
  const range = sel.getRangeAt(0);
  const start = getCursorPosition(el);
  const end = start + range.toString().length;
  return { start, end };
}

function setSelectionRange(el, start, end) {
  el.focus();
  const sel = window.getSelection();
  sel.removeAllRanges();
  const range = document.createRange();
  let charIndex = 0;
  let startNode = null, startOffset = 0, endNode = null, endOffset = 0;
  let foundStart = false, foundEnd = false;

  function walk(node) {
    if (foundEnd || !node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharIndex = charIndex + node.length;
      if (!foundStart && start >= charIndex && start <= nextCharIndex) {
        startNode = node;
        startOffset = start - charIndex;
        foundStart = true;
      }
      if (foundStart && end >= charIndex && end <= nextCharIndex) {
        endNode = node;
        endOffset = end - charIndex;
        foundEnd = true;
        return;
      }
      charIndex = nextCharIndex;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        walk(node.childNodes[i]);
        if (foundEnd) return;
      }
    }
  }

  walk(el);
  if (startNode && endNode) {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    sel.addRange(range);
  }
}

const INDENT = '    '; // 4 spaces for indentation

function indentCode(el) {
  const { start, end } = getSelectionRange(el);
  const text = el.textContent;

  if (start === end) {
    // No selection: insert indentation at cursor
    const before = text.substring(0, start);
    const after = text.substring(end);
    const lineStart = before.lastIndexOf('\n') + 1;
    const indent = before.substring(lineStart, start).match(/^\s*/)[0];
    const newText = before + INDENT + after;
    el.textContent = newText;
    setCursorPosition(el, start + INDENT.length);
  } else {
    // Selection: indent all selected lines
    const selected = text.substring(start, end);
    const lines = selected.split('\n');
    const indented = lines.map(line => INDENT + line).join('\n');
    const before = text.substring(0, start);
    const after = text.substring(end);
    el.textContent = before + indented + after;
    setSelectionRange(el, start, start + indented.length);
  }
}

function outdentCode(el) {
  const { start, end } = getSelectionRange(el);
  const text = el.textContent;

  if (start === end) {
    // No selection: remove indentation before cursor (one indent level)
    const before = text.substring(0, start);
    const after = text.substring(end);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineIndent = before.substring(lineStart, start);
    const match = lineIndent.match(/^(\s{0,4})/);
    const removeLen = match ? match[1].length : 0;
    const newBefore = before.substring(0, lineStart) + before.substring(lineStart + removeLen, start);
    el.textContent = newBefore + after;
    setCursorPosition(el, start - removeLen);
  } else {
    // Selection: outdent all selected lines
    const selected = text.substring(start, end);
    const lines = selected.split('\n');
    const outdented = lines.map(line => {
      const match = line.match(/^(\s{0,4})/);
      const removeLen = match ? match[1].length : 0;
      return line.substring(removeLen);
    }).join('\n');
    const before = text.substring(0, start);
    const after = text.substring(end);
    el.textContent = before + outdented + after;
    setSelectionRange(el, start, start + outdented.length);
  }
}

function getCurrentWord(text, pos) {
  // Find the start of the current word (backwards from cursor)
  let start = pos;
  while (start > 0 && /[\w\\]/.test(text[start - 1])) {
    start--;
  }
  return text.substring(start, pos);
}

function showAutocomplete(language, code, cursorPos) {
  const prefix = getCurrentWord(code, cursorPos);
  if (!prefix || prefix.length < 1) {
    hideAutocomplete();
    return;
  }

  const keywords = KEYWORDS[language] || [];
  const matches = keywords.filter(k =>
    k.word.toLowerCase().startsWith(prefix.toLowerCase())
  );

  if (matches.length === 0) {
    hideAutocomplete();
    return;
  }

  autocompleteMatches = matches;
  autocompleteSelectedIndex = 0;
  autocompletePrefix = prefix;
  autocompleteStartPos = cursorPos - prefix.length;
  autocompleteActive = true;

  renderAutocomplete();
}

function renderAutocomplete() {
  const container = document.getElementById('autocomplete');
  const codeEl = document.getElementById('code');
  if (!container || !codeEl) return;

  // Position the dropdown near the cursor
  const rect = codeEl.getBoundingClientRect();
  const wrapperRect = document.getElementById('code-wrapper').getBoundingClientRect();

  // Simple positioning: below the code editor
  container.style.top = '100%';
  container.style.left = '0';
  container.style.right = '0';
  container.style.width = (wrapperRect.width) + 'px';

  const itemsHtml = autocompleteMatches.map((match, i) => {
    const isSelected = i === autocompleteSelectedIndex;
    const highlightedWord = match.word.replace(
      new RegExp(`(${autocompletePrefix})`, 'gi'),
      '<strong>$1</strong>'
    );
    return `
      <div class="autocomplete-item ${isSelected ? 'selected' : ''}" data-index="${i}">
        <span>${highlightedWord}</span>
        <span class="autocomplete-kind">${match.kind}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = itemsHtml;
  container.classList.add('show');
}

function hideAutocomplete() {
  autocompleteActive = false;
  autocompleteMatches = [];
  autocompleteSelectedIndex = 0;
  autocompletePrefix = '';
  autocompleteStartPos = 0;
  const container = document.getElementById('autocomplete');
  if (container) {
    container.classList.remove('show');
    container.innerHTML = '';
  }
}

function insertSuggestion(index) {
  const match = autocompleteMatches[index];
  if (!match) return;

  const codeEl = document.getElementById('code');
  const text = codeEl.textContent;
  const before = text.substring(0, autocompleteStartPos);
  const after = text.substring(autocompleteStartPos + autocompletePrefix.length);
  const newText = before + match.word + after;

  codeEl.textContent = newText;
  setCursorPosition(codeEl, autocompleteStartPos + match.word.length);
  hideAutocomplete();
}

function handleCodeKeydown(e) {
  const codeEl = document.getElementById('code');

  // Autocomplete navigation
  if (autocompleteActive) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      autocompleteSelectedIndex = (autocompleteSelectedIndex + 1) % autocompleteMatches.length;
      renderAutocomplete();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      autocompleteSelectedIndex = (autocompleteSelectedIndex - 1 + autocompleteMatches.length) % autocompleteMatches.length;
      renderAutocomplete();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      insertSuggestion(autocompleteSelectedIndex);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hideAutocomplete();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      insertSuggestion(autocompleteSelectedIndex);
      return;
    }
    // If typing a regular character, keep autocomplete active (will be re-evaluated on input)
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      return; // Let input handler deal with it
    }
  }

  // Original Tab handling (only when autocomplete is not active)
  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      // Shift+Tab: outdent selected lines or remove indentation before cursor
      outdentCode(codeEl);
    } else {
      // Tab: insert tab character or indent selected lines
      indentCode(codeEl);
    }
    return;
  }
}

function handleCodeInput(e) {
  const codeEl = e.target;
  const text = codeEl.textContent;
  const pos = getCursorPosition(codeEl);
  const language = document.getElementById('language').value;
  const key = runtimeKey(language);

  // Show autocomplete when typing word characters
  if (/[\w\\]/.test(e.key) || e.inputType === 'insertFromPaste') {
    showAutocomplete(key, text, pos);
  } else if (e.key === ' ' || e.key === '(' || e.key === '[' || e.key === '{' || e.key === '.' || e.key === ':') {
    hideAutocomplete();
  }
}

function t(langKey, key) {
  return i18n[langKey][key] || key;
}

async function runCode() {
  const codeEl = document.getElementById('code');
  const code = codeEl.textContent;
  const language = document.getElementById('language').value;
  const resultEl = document.getElementById('result');
  const runBtn = document.getElementById('run');
  const langKey = document.getElementById('lang-toggle').textContent.trim() === 'PT' ? 'pt' : 'en';
  resultEl.textContent = '';

  if (!code.trim()) {
    resultEl.textContent = '';
    return;
  }

  const key = runtimeKey(language);
  if (!WASM_LANGUAGES.has(key)) {
    console.info(`A linguagem '${language}' não é suportada no modo WASM.`);
    runBtn.disabled = false;
    runBtn.textContent = t(langKey, 'runButton');
    return;
  }

  let wasmResult = null;
  let wasmError = null;

  try {
    runBtn.disabled = true;
    runBtn.textContent = t(langKey, 'loadingRuntime');

    wasmResult = await runInWorker(key, code);
  } catch (err) {
    wasmError = err;
  }

  // Se o WASM falhou, recorre ao servidor backend (mensagem apenas no console)
  if (wasmError || (wasmResult && wasmResult.error)) {
    console.info(`WASM falhou para '${language}', recorrendo ao servidor backend.`);
    try {
      const backendResult = await runViaBackend(code, language);
      if (backendResult.error) {
        resultEl.textContent = t(langKey, 'backendError') + ': ' + backendResult.error;
        const pdfViewer = document.getElementById('pdf-viewer');
        if (pdfViewer) pdfViewer.style.display = 'none';
      } else if (backendResult.output) {
        resultEl.textContent = backendResult.output;
        // Check for PDF data URL in backend output (LaTeX fallback)
        const pdfMatch = backendResult.output.match(/data:application\/pdf;base64,[A-Za-z0-9+/=]+/);
        const pdfViewer = document.getElementById('pdf-viewer');
        const pdfFrame = document.getElementById('pdf-frame');
        if (pdfMatch && pdfViewer && pdfFrame) {
          pdfFrame.src = pdfMatch[0];
          pdfViewer.style.display = 'block';
        } else if (pdfViewer) {
          pdfViewer.style.display = 'none';
        }
      } else {
        resultEl.textContent = '(no output)';
        const pdfViewer = document.getElementById('pdf-viewer');
        if (pdfViewer) pdfViewer.style.display = 'none';
      }
    } catch (backendErr) {
      resultEl.textContent = t(langKey, 'backendError') + ': ' + backendErr.message;
      const pdfViewer = document.getElementById('pdf-viewer');
      if (pdfViewer) pdfViewer.style.display = 'none';
    }
  } else if (wasmResult && wasmResult.output) {
    resultEl.textContent = wasmResult.output;
    // Render PDF if a data URL was returned (LaTeX)
    if (wasmResult.pdfDataUrl) {
      const pdfViewer = document.getElementById('pdf-viewer');
      const pdfFrame = document.getElementById('pdf-frame');
      if (pdfViewer && pdfFrame) {
        pdfFrame.src = wasmResult.pdfDataUrl;
        pdfViewer.style.display = 'block';
      }
    } else {
      const pdfViewer = document.getElementById('pdf-viewer');
      if (pdfViewer) pdfViewer.style.display = 'none';
    }
  } else {
    resultEl.textContent = '(no output)';
    const pdfViewer = document.getElementById('pdf-viewer');
    if (pdfViewer) pdfViewer.style.display = 'none';
  }

  runBtn.disabled = false;
  runBtn.textContent = t(langKey, 'runButton');
}

document.addEventListener('DOMContentLoaded', () => {
  loadThemeFromPref();
  loadLangFromPref();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  const codeEl = document.getElementById('code');
  codeEl.addEventListener('keydown', handleCodeKeydown);
  codeEl.addEventListener('input', handleCodeInput);
  // Hide autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#code-wrapper')) {
      hideAutocomplete();
    }
  });
  document.getElementById('run').addEventListener('click', runCode);

  // Acorda o servidor backend em segundo plano (Render free tier hiberna após inatividade)
  wakeBackend();
});

function runtimeKey(language) {
  return LANGUAGE_MAP[language] || language;
}

function initTimeoutFor(language) {
  if (BACKEND_LANGUAGES.has(language)) {
    return INIT_TIMEOUT_BY_LANG[language] || 150000;
  }
  return INIT_TIMEOUT_BY_LANG[language] || DEFAULT_INIT_TIMEOUT_MS;
}

function getApiUrl() {
  // Desktop app (localhost) proxies /api/compile to the remote backend to avoid CORS.
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return '/api/compile';
  }
  return 'https://simple-compiler-ldj7.onrender.com/compile';
}

async function wakeBackend() {
  // Tenta acordar o backend até 3 vezes com intervalo
  for (let i = 0; i < 3; i++) {
    try {
      await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '\\documentclass{article}\\begin{document}Hello\\end{document}', language: 'latex' }),
      });
      return; // Sucesso, não precisa tentar novamente
    } catch (_) {
      // Ignore wake-up errors; the backend may be spinning down
      await new Promise(r => setTimeout(r, 2000)); // Espera 2s entre tentativas
    }
  }
}

async function runViaBackend(code, language) {
  // Tenta até 3 vezes com backoff exponencial
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const resp = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      const data = await resp.json();
      return {
        output: data.output || '',
        error: data.error || null,
      };
    } catch (err) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1))); // Espera 3s, 6s entre tentativas
      } else {
        throw err;
      }
    }
  }
}

const workers = {}; // language -> Worker
const pending = new Map(); // id -> { resolve, reject, timer, worker }
const runtimeLoaded = {}; // language -> boolean (runtime já baixado/inicializado)
let msgCounter = 0;

function setLang(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) el.textContent = i18n[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[lang][key]) {
      // For contenteditable elements, update the placeholder attribute which is used via CSS :empty::before
      el.setAttribute('placeholder', i18n[lang][key]);
      // If the element is empty, clear its text content to show placeholder
      if (!el.textContent.trim()) {
        el.textContent = '';
      }
    }
  });
}

function loadLangFromPref() {
  const stored = localStorage.getItem('lang') || navigator.language.slice(0, 2);
  const lang = stored.startsWith('pt') ? 'pt' : 'en';
  document.getElementById('lang-toggle').textContent = lang === 'pt' ? 'PT' : 'EN';
  setLang(lang);
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon();
}

function loadThemeFromPref() {
  const stored = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', stored);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle');
  const theme = document.documentElement.getAttribute('data-theme');
  btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleLang() {
  const btn = document.getElementById('lang-toggle');
  const current = btn.textContent.trim();
  const next = current === 'EN' ? 'PT' : 'EN';
  btn.textContent = next;
  const lang = next === 'PT' ? 'pt' : 'en';
  localStorage.setItem('lang', lang);
  setLang(lang);
}

function createWorker(language) {
  const w = new Worker('worker.mjs?v=20261111', { type: 'module' });
  w.language = language;
  return new Promise((resolve, reject) => {
    const initTimeout = setTimeout(() => {
      w.terminate();
      reject(new Error('Worker initialization timeout'));
    }, initTimeoutFor(language));

    w.onmessage = (event) => {
      const { id, output, error, pdfDataUrl } = event.data || {};
      const cb = pending.get(id);
      if (!cb || cb.worker !== w) return;
      pending.delete(id);
      clearTimeout(cb.timer);
      if (error) {
        cb.reject(new Error(error));
      } else {
        runtimeLoaded[w.language] = true;
        cb.resolve({ output, error: null, pdfDataUrl: pdfDataUrl || null });
      }
    };

    w.onerror = (err) => {
      clearTimeout(initTimeout);
      w.terminate();
      const detail = `${err.message || ''} | ${err.filename || ''}:${err.lineno || ''}:${err.colno || ''} | ${err.error ? err.error.stack : ''}`;
      // Rejeita todas as chamadas pendentes deste worker
      for (const [id, cb] of pending) {
        if (cb.worker === w) {
          pending.delete(id);
          clearTimeout(cb.timer);
          cb.reject(new Error(`Worker error: ${detail}`));
        }
      }
      reject(new Error(`Worker error: ${detail}`));
    };

    resolve(w);
  });
}

function getWorker(language) {
  if (!workers[language]) {
    workers[language] = createWorker(language);
  }
  return workers[language];
}

function removeWorker(language) {
  const w = workers[language];
  if (w) {
    try { w.terminate(); } catch (_) {}
    delete workers[language];
  }
}

function runInWorker(language, code) {
  return new Promise(async (resolve, reject) => {
    const id = ++msgCounter;
    let worker = null;

    try {
      worker = await getWorker(language);
    } catch (err) {
      removeWorker(language);
      reject(err);
      return;
    }

    // Primeira execução de uma linguagem inclui o download do runtime WASM.
    // Linguagens backend mantêm timeout longo mesmo após runtime carregado.
    const timeoutMs = (runtimeLoaded[language] && !BACKEND_LANGUAGES.has(language))
      ? EXEC_TIMEOUT_MS
      : initTimeoutFor(language);
    const langKey = document.getElementById('lang-toggle').textContent.trim() === 'PT' ? 'pt' : 'en';

    const timer = setTimeout(() => {
      pending.delete(id);
      removeWorker(language);
      runtimeLoaded[language] = false;
      reject(new Error(i18n[langKey].timeout.replace('{seconds}', timeoutMs / 1000)));
    }, timeoutMs);

    pending.set(id, { resolve, reject, timer, worker });

    worker.postMessage({ language, code, id });
  });
}
