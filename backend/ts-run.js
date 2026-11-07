// ts-run.js — Wrapper to run TypeScript via Node.js with proper ts.sys configuration
// Used by the backend as a fallback when WASM TypeScript runtime is unavailable.

const ts = require('typescript');

// Configure minimal ts.sys for the backend environment (ts-node needs it)
if (!ts.sys) ts.sys = {};
if (!ts.sys.fileExists) ts.sys.fileExists = (fileName) => {
  try {
    require('fs').accessSync(fileName);
    return true;
  } catch (_) {
    return false;
  }
};
if (!ts.sys.readFile) ts.sys.readFile = (fileName) => {
  try {
    return require('fs').readFileSync(fileName, 'utf8');
  } catch (_) {
    return undefined;
  }
};
if (!ts.sys.writeFile) ts.sys.writeFile = () => {};
if (!ts.sys.getCurrentDirectory) ts.sys.getCurrentDirectory = () => process.cwd();
if (!ts.sys.useCaseSensitiveFileNames) ts.sys.useCaseSensitiveFileNames = true;
if (!ts.sys.getNewLine) ts.sys.getNewLine = () => '\n';
if (!ts.sys.createHash) ts.sys.createHash = () => ({ update: () => {}, digest: () => '' });
if (!ts.sys.realpath) ts.sys.realpath = (p) => p;
if (!ts.sys.getFileSize) ts.sys.getFileSize = () => -1;
if (!ts.sys.deleteFile) ts.sys.deleteFile = () => false;
if (!ts.sys.createDirectory) ts.sys.createDirectory = () => {};
if (!ts.sys.readDirectory) ts.sys.readDirectory = () => [];
if (!ts.sys.getModifiedTime) ts.sys.getModifiedTime = () => 0;
if (!ts.sys.setModifiedTime) ts.sys.setModifiedTime = () => {};
if (!ts.sys.createGetCanonicalFileName) ts.sys.createGetCanonicalFileName = (p) => p;

const fs = require('fs');
const srcPath = process.argv[2];

if (!srcPath) {
  console.error('Usage: node ts-run.js <file.ts>');
  process.exit(1);
}

const code = fs.readFileSync(srcPath, 'utf8');

// Transpile TypeScript to JavaScript
const result = ts.transpileModule(code, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    strict: false,
    esModuleInterop: true,
  },
});

// Run the transpiled JavaScript
const vm = require('vm');
const capturedOutput = [];
const sandbox = {
  console: {
    log: (...args) => capturedOutput.push(args.join(' ')),
    error: (...args) => capturedOutput.push(args.join(' ')),
    warn: (...args) => capturedOutput.push(args.join(' ')),
    info: (...args) => capturedOutput.push(args.join(' ')),
  },
  __output: () => capturedOutput.join('\n'),
};
vm.createContext(sandbox);
const script = new vm.Script(result.outputText, { filename: srcPath });
script.runInContext(sandbox);
console.log(capturedOutput.join('\n'));
