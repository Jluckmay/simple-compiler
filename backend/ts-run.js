// ts-run.js — Executa TypeScript/JavaScript via Node.js no backend.
// TypeScript simples (sem anotações de tipo complexas) é JavaScript válido.
// Não requer o pacote 'typescript' — roda direto no Node.js.

const fs = require('fs');
const srcPath = process.argv[2];

if (!srcPath) {
  console.error('Usage: node ts-run.js <file.ts>');
  process.exit(1);
}

const code = fs.readFileSync(srcPath, 'utf8');

// TypeScript sem anotações de tipo é JavaScript válido — roda direto.
// Se houver erro de sintaxe, o Node.js reportará naturalmente.
const vm = require('vm');
const capturedOutput = [];
const sandbox = {
  console: {
    log: (...args) => capturedOutput.push(args.join(' ')),
    error: (...args) => capturedOutput.push(args.join(' ')),
    warn: (...args) => capturedOutput.push(args.join(' ')),
    info: (...args) => capturedOutput.push(args.join(' ')),
  },
};
vm.createContext(sandbox);
const script = new vm.Script(code, { filename: srcPath });
try {
  script.runInContext(sandbox);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
console.log(capturedOutput.join('\n'));
