# Simple Compiler v1.0.0 / Compilador Simples v1.0.0

## English / Inglês

### What's New / Novidades

**Desktop Application / Aplicativo Desktop**
- Native desktop app for Windows and Linux using `pywebview`
- Pre-built executables available in this release:
  - `Simple Compiler-Windows-x64.exe` (Windows)
  - `Simple Compiler-Linux-x64` (Linux)
- Runs completely locally — no Docker or backend server required for client-side languages
- Spell check for code comments and strings (English & Portuguese dictionaries)
- Click on suggestions to auto-correct misspelled words

**WASM Support for All Languages / Suporte WASM para Todas as Linguagens**
- All 13 languages now have WASM support with automatic backend fallback:
  - Client-side WASM: Python (Pyodide), JavaScript/TypeScript (QuickJS), Lua (wasmoon), R (WebR), LaTeX (Tectonic WASM + pdf.js), HTML/CSS
  - Backend fallback: C, C++, C#, Java, Go, Lean, SQL (Flask + Docker in `backend/`)
- Guaranteed output for every language — if WASM is unavailable, the code is sent to the backend server

**Autocomplete / Autocomplete**
- Keyword-based code completion for all supported languages
- Type indicators (fn, kw, type, const, class, obj, var, tag, prop)
- Keyboard navigation: ArrowUp/Down to select, Enter/Tab to insert, Escape to close
- Click outside to dismiss
- Smart triggering: activates when typing word characters
- Highlighted matches: typed prefix shown in bold
- Tab indentation: inserts 2 spaces (or selected autocomplete suggestion)

**Favicon / Ícone da Aba**
- Modern minimalist icon with gradient accent and dark background
- Cleaner terminal-inspired design for browser tab

**Security / Segurança**
- CSP `style-src` updated to allow `'unsafe-inline'` for dynamic styling
- CSP `connect-src` includes backend API and CDN endpoints
- External timeout mechanism (5s execution, 30-150s init) prevents infinite loops
- Web Worker isolation prevents UI freezes
- Dangerous pattern detection rejects malicious code before execution
- Rate limiting (30 req/min/IP) on backend server

### How to Use / Como Usar

**Web (GitHub Pages):**
1. Open https://jluckmay.github.io/simple-compiler/
2. Select a language from the dropdown
3. Write your code in the editor
4. Click **Run** (or **Executar**)

**Desktop (Windows):**
1. Download `Simple Compiler-Windows-x64.exe` from this release
2. Double-click to run — no installation required

**Desktop (Linux):**
1. Download `Simple Compiler-Linux-x64` from this release
2. `chmod +x Simple Compiler-Linux-x64 && ./Simple Compiler-Linux-x64`

### Supported Languages / Linguagens Suportadas

| Language | WASM | Fallback |
|----------|------|----------|
| Python | ✅ Pyodide | — |
| JavaScript | ✅ QuickJS | — |
| TypeScript | ✅ QuickJS | — |
| Lua | ✅ wasmoon | — |
| R | ✅ WebR | — |
| LaTeX | ✅ Tectonic WASM | Backend |
| HTML/CSS | ✅ Preview | — |
| C | ✅ Emscripten | Backend |
| C++ | ✅ Emscripten | Backend |
| C# | ✅ Blazor WASM | Backend |
| Java | ✅ CheerpJ WASM | Backend |
| Go | ✅ Native WASM | Backend |
| Lean | ✅ Official port | Backend |
| SQL | ✅ SQLite WASM | Backend |

---

## Português (Brasil) / Português

### O que há de Novo / What's New

**Aplicativo Desktop / Desktop Application**
- Aplicativo desktop nativo para Windows e Linux usando `pywebview`
- Executáveis pré-compilados disponíveis nesta release:
  - `Simple Compiler-Windows-x64.exe` (Windows)
  - `Simple Compiler-Linux-x64` (Linux)
- Roda completamente localmente — sem Docker ou servidor backend necessário para linguagens client-side
- Corretor ortográfico para comentários e strings do código (dicionários Inglês e Português)
- Clique nas sugestões para auto-corrigir palavras escritas erradas

**Suporte WASM para Todas as Linguagens / WASM Support for All Languages**
- Todas as 13 linguagens têm suporte WASM com fallback automático para backend:
  - Client-side WASM: Python (Pyodide), JavaScript/TypeScript (QuickJS), Lua (wasmoon), R (WebR), LaTeX (Tectonic WASM + pdf.js), HTML/CSS
  - Fallback para backend: C, C++, C#, Java, Go, Lean, SQL (Flask + Docker em `backend/`)
- Saída garantida para todas as linguagens — se o WASM estiver indisponível, o código é enviado ao servidor backend

**Autocomplete / Autocomplete**
- Conclusão de código baseada em palavras-chave para todas as linguagens suportadas
- Indicadores de tipo (fn, kw, type, const, class, obj, var, tag, prop)
- Navegação por teclado: ArrowUp/Down para selecionar, Enter/Tab para inserir, Escape para fechar
- Clique fora para descartar
- Disparo inteligente: ativa ao digitar caracteres de palavra
- Destaque de correspondências: prefixo digitado em negrito
- Indentação com Tab: insere 2 espaços (ou sugestão selecionada do autocomplete)

**Ícone da Aba / Favicon**
- Ícone moderno e minimalista com gradiente e fundo escuro
- Design mais limpo inspirado em terminal para aba do navegador

**Segurança / Security**
- CSP `style-src` atualizado para permitir `'unsafe-inline'` para estilização dinâmica
- CSP `connect-src` inclui endpoints da API backend e CDN
- Mecanismo de tempo limite externo (5s execução, 30-150s init) previne loops infinitos
- Isolamento Web Worker previne travamentos da UI
- Detecção de padrões perigosos rejeita código malicioso antes da execução
- Rate limiting (30 req/min/IP) no servidor backend

### Como Usar / How to Use

**Web (GitHub Pages):**
1. Abra https://jluckmay.github.io/simple-compiler/
2. Selecione uma linguagem no menu suspenso
3. Escreva seu código no editor
4. Clique em **Executar** (ou **Run**)

**Desktop (Windows):**
1. Baixe `Simple Compiler-Windows-x64.exe` desta release
2. Dê duplo-clique para executar — nenhuma instalação necessária

**Desktop (Linux):**
1. Baixe `Simple Compiler-Linux-x64` desta release
2. `chmod +x Simple Compiler-Linux-x64 && ./Simple Compiler-Linux-x64`

### Linguagens Suportadas / Supported Languages

| Linguagem | WASM | Fallback |
|-----------|------|----------|
| Python | ✅ Pyodide | — |
| JavaScript | ✅ QuickJS | — |
| TypeScript | ✅ QuickJS | — |
| Lua | ✅ wasmoon | — |
| R | ✅ WebR | — |
| LaTeX | ✅ Tectonic WASM | Backend |
| HTML/CSS | ✅ Preview | — |
| C | ✅ Emscripten | Backend |
| C++ | ✅ Emscripten | Backend |
| C# | ✅ Blazor WASM | Backend |
| Java | ✅ CheerpJ WASM | Backend |
| Go | ✅ Native WASM | Backend |
| Lean | ✅ Port oficial | Backend |
| SQL | ✅ SQLite WASM | Backend |

---

### Installation / Instalação

**From source / Do código-fonte:**
```bash
# Clone
git clone https://github.com/Jluckmay/simple-compiler.git
cd simple-compiler

# Desktop dependencies / Dependências do desktop
pip install -r desktop/requirements.txt

# Run desktop / Executar desktop
python -m desktop

# Build Windows
python desktop/build.py

# Build Linux
./desktop/build.sh
```

---

### License / Licença

MIT License — see [LICENSE](LICENSE) file.

Licença MIT — consulte o arquivo [LICENSE](LICENSE).

---

*Simple Compiler — Compile anywhere. Compile safely. / Compile em qualquer lugar. Compile com segurança.*