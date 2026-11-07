// ts-run.js — Wrapper to run TypeScript via Node.js.
// Used by the backend as a fallback when WASM TypeScript runtime is unavailable.
// Uses ts.createSourceFile + ts.createPrinter (stable API) instead of
// ts.transpileModule which can break with newer TypeScript versions.

const ts = require('typescript');
const fs = require('fs');
const srcPath = process.argv[2];

if (!srcPath) {
  console.error('Usage: node ts-run.js <file.ts>');
  process.exit(1);
}

const code = fs.readFileSync(srcPath, 'utf8');

// Transpile TypeScript to JavaScript using the stable compiler API.
const sourceFile = ts.createSourceFile(srcPath, code, ts.ScriptTarget.ES2020, true);
const printer = ts.createPrinter();
const result = printer.printFile(sourceFile);

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
const script = new vm.Script(result, { filename: srcPath });
script.runInContext(sandbox);
console.log(capturedOutput.join('\n'));
