# Simple Compiler / Compilador Simples

> **English** | **Português** — Use the language selector in the UI to switch the interface language.

A **web‑based multi‑language compiler** that runs user code in a secure, isolated environment — entirely client‑side via WebAssembly (WASM), with no backend server required.

Um **compilador multi‑linguagem baseado na web** que executa código do usuário em um ambiente seguro e isolado — inteiramente no lado do cliente via WebAssembly (WASM), sem necessidade de servidor backend.

---

## Table of Contents / Sumário

- [Features / Recursos](#features--recursos)
- [Supported Languages / Linguagens Suportadas](#supported-languages--linguagens-suportadas)
- [Security Model / Modelo de Segurança](#security-model--modelo-de-segurança)
- [Project Structure / Estrutura do Projeto](#project-structure--estrutura-do-projeto)
- [Getting Started (Local Development) / Começando (Desenvolvimento Local)](#getting-started-local-development--começando-desenvolvimento-local)
- [Running the Frontend / Executando o Frontend](#running-the-frontend--executando-o-frontend)
- [Testing / Testes](#testing--testes)
- [Streamlit Interface (Local GUI) / Interface Streamlit (GUI Local)](#streamlit-interface-local-gui--interface-streamlit-gui-local)
- [Web page access / Acesso à página web](#web-page-access--acesso-à-página-web)
- [License / Licença](#license--licença)

---

## Features / Recursos

**English:**
- **Modern UI** – simple, responsive layout with dark/light mode that follows the system preference.
- **Internationalisation** – English/Português toggle, all UI strings externalised in `frontend/i18n`.
- **Screen‑reader friendly** – ARIA live region for output, proper `aria-label`s.
- **WASM sandbox** – Python code executes in the browser via **Pyodide** (WebAssembly) inside a **Web Worker**, isolating it from the main UI thread. No backend server, no Docker, no network calls to external APIs.
- **Python only** – the WASM sandbox currently supports Python. Other languages (C, C++, Java, Go, etc.) require a backend server and are not available in client‑only mode.
- **Execution timeout** – Python execution is limited to **5 seconds** to prevent infinite loops and hangs.
- **Content Security Policy (CSP)** – restrictive CSP headers block inline scripts, `object` tags, and unauthorized network connections.
- **Dangerous pattern detection** – code containing `import os/subprocess/sys/socket/urllib/requests/shutil/pathlib/ctypes/pickle/sqlite3`, `eval()`, `exec()`, `compile()`, `open()`, `__import__`, shell metacharacters (backticks, `$(`, `; rm`, `&& curl`, `| nc`), and other dangerous patterns is rejected before execution.
- **Restricted builtins** – only safe, pure builtins are exposed (`print`, `len`, `str`, `int`, `range`, `map`, `filter`, `sorted`, etc.). File system, network, and process APIs are unavailable.
- **Maximum code size** – submissions larger than 100 KB are rejected.
- **Error sanitization** – error messages are scrubbed of sensitive information before being returned to the UI.
- **CI pipeline** – GitHub Actions run unit tests on every push.
- **Ready for production** – deployable on **GitHub Pages** as a static site.

**Português:**
- **UI moderna** – layout simples e responsivo com modo claro/escuro que segue a preferência do sistema.
- **Internacionalização** – alternância Inglês/Português, todas as strings da UI externalizadas em `frontend/i18n`.
- **Amigável para leitores de tela** – região ARIA ao vivo para saída, `aria-label`s apropriados.
- **Sandbox WASM** – código Python executa no navegador via **Pyodide** (WebAssembly) dentro de um **Web Worker**, isolado da thread principal da UI. Sem servidor backend, sem Docker, sem chamadas de rede para APIs externas.
- **Apenas Python** – o sandbox WASM suporta atualmente apenas Python. Outras linguagens (C, C++, Java, Go, etc.) requerem um servidor backend e não estão disponíveis no modo apenas-cliente.
- **Tempo limite de execução** – a execução Python é limitada a **5 segundos** para evitar loops infinitos e travamentos.
- **Política de Segurança de Conteúdo (CSP)** – cabeçalhos CSP restritivos bloqueiam scripts inline, tags `object` e conexões de rede não autorizadas.
- **Detecção de padrões perigosos** – código contendo `import os/subprocess/sys/socket/urllib/requests/shutil/pathlib/ctypes/pickle/sqlite3`, `eval()`, `exec()`, `compile()`, `open()`, `__import__`, metacaracteres de shell (crases, `$(`, `; rm`, `&& curl`, `| nc`), e outros padrões perigosos é rejeitado antes da execução.
- **Builtins restritos** – apenas builtins seguros e puros são expostos (`print`, `len`, `str`, `int`, `range`, `map`, `filter`, `sorted`, etc.). APIs de sistema de arquivos, rede e processo estão indisponíveis.
- **Tamanho máximo de código** – submissões maiores que 100 KB são rejeitadas.
- **Sanitização de erros** – mensagens de erro são limpas de informações sensíveis antes de serem retornadas à UI.
- **Pipeline de CI** – GitHub Actions executa testes unitários a cada push.
- **Pronto para produção** – implantável no **GitHub Pages** como site estático.

---

## Supported Languages / Linguagens Suportadas

| Language / Linguagem | WASM Support | Notes / Notas |
|----------|--------------|---------------|
| Python | ✅ Yes / Sim | Via Pyodide (WebAssembly) in Web Worker |
| C | ❌ No / Não | Requires backend server |
| C++ | ❌ No / Não | Requires backend server |
| C# | ❌ No / Não | Requires backend server |
| Java | ❌ No / Não | Requires backend server |
| JavaScript | ❌ No / Não | Requires backend server |
| TypeScript | ❌ No / Não | Requires backend server |
| SQL (SQLite) | ❌ No / Não | Requires backend server |
| Lua | ❌ No / Não | Requires backend server |
| Go | ❌ No / Não | Requires backend server |
| Lean | ❌ No / Não | Requires backend server |
| R | ❌ No / Não | Requires backend server |
| LaTeX | ❌ No / Não | Requires backend server |
| HTML/CSS | ❌ No / Não | Requires backend server |

> **Note / Nota:** The client‑side WASM sandbox supports Python only. To compile/run other languages, a backend server (Flask + Docker) is required, which is retained in `backend/` but not used by the default frontend.

> **Nota / Nota:** O sandbox WASM do lado do cliente suporta apenas Python. Para compilar/executar outras linguagens, um servidor backend (Flask + Docker) é necessário, que está retido em `backend/` mas não é usado pelo frontend padrão.

---

## Security Model / Modelo de Segurança

**English:**
1. **Browser sandbox** – WASM execution runs inside the browser's native sandbox: no access to the host filesystem, network, DOM, or environment variables.
2. **Web Worker isolation** – Python execution runs in a dedicated Web Worker thread, preventing UI freezes and allowing worker termination on timeout.
3. **Execution timeout** – Python code is terminated after **5 seconds** to prevent infinite loops and denial‑of‑service.
4. **Content Security Policy (CSP)** – `script-src` limited to `'self'` and trusted CDNs; `object-src 'none'`; `connect-src 'self'`; inline scripts blocked.
5. **Input validation** – code is validated for size (max 100 KB) and dangerous patterns before execution.
6. **Dangerous pattern detection** – regex‑based rejection of `import os/subprocess/sys/socket/urllib/requests/shutil/pathlib/ctypes/pickle/sqlite3`, `eval()`, `exec()`, `compile()`, `open()`, `__import__`, shell metacharacters, and other dangerous constructs.
7. **Restricted builtins** – only safe pure builtins are exposed; `open`, `eval`, `exec`, `__import__`, `globals()`, `locals()`, `vars()`, `dir()` are unavailable.
8. **Stdout capture** – `sys.stdout` is redirected to `StringIO` during execution, capturing only `print()` output.
9. **Error sanitization** – Python exceptions are caught and returned without exposing system paths or sensitive information.
10. **Worker termination** – the Web Worker is terminated after each execution (success, error, or timeout), ensuring no lingering state.

**Português:**
1. **Sandbox do navegador** – execução WASM roda dentro do sandbox nativo do navegador: sem acesso ao sistema de arquivos do host, rede, DOM ou variáveis de ambiente.
2. **Isolamento Web Worker** – execução Python roda em um Web Worker dedicado, evitando travamentos da UI e permitindo terminação do worker em caso de timeout.
3. **Tempo limite de execução** – código Python é terminado após **5 segundos** para evitar loops infinitos e negação de serviço.
4. **Política de Segurança de Conteúdo (CSP)** – `script-src` limitado a `'self'` e CDNs confiáveis; `object-src 'none'`; `connect-src 'self'`; scripts inline bloqueados.
5. **Validação de entrada** – código validado quanto ao tamanho (máx. 100 KB) e padrões perigosos antes da execução.
6. **Detecção de padrões perigosos** – rejeição baseada em regex de `import os/subprocess/sys/socket/urllib/requests/shutil/pathlib/ctypes/pickle/sqlite3`, `eval()`, `exec()`, `compile()`, `open()`, `__import__`, metacaracteres de shell e outros construtos perigosos.
7. **Builtins restritos** – apenas builtins seguros e puros são expostos; `open`, `eval`, `exec`, `__import__`, `globals()`, `locals()`, `vars()`, `dir()` estão indisponíveis.
8. **Captura de stdout** – `sys.stdout` é redirecionado para `StringIO` durante a execução, capturando apenas a saída de `print()`.
9. **Sanitização de erros** – exceções Python são capturadas e retornadas sem expor caminhos do sistema ou informações sensíveis.
10. **Término do worker** – o Web Worker é terminado após cada execução (sucesso, erro ou timeout), garantindo que nenhum estado persista.

---

## Project Structure / Estrutura do Projeto

```
simple-compiler/
├─ frontend/                     # static site / site estático (HTML/CSS/JS)
│   ├─ index.html                # HTML com CSP e carregamento do Pyodide via CDN
│   ├─ style.css
│   ├─ script.js                 # frontend WASM + Web Worker orchestration
│   ├─ worker.js                 # Web Worker com Pyodide + validação de segurança
│   └─ i18n/ (en.json, pt.json)
├─ backend/                      # Flask API (retained, not used by default frontend)
│   ├─ app.py
│   ├─ requirements.txt
│   ├─ Dockerfile
│   ├─ .gitignore
│   └─ tests/ test_app.py
├─ .github/                     # CI workflow / fluxo de CI
│   └─ workflows/ ci.yml
├─ render.yaml                   # Render service definition (backend, optional)
├─ README.md
└─ LICENSE
```

---

## Getting Started (Local Development) / Começando (Desenvolvimento Local)

**English:**
```bash
# Clone the repo
git clone <repo‑url>
cd simple-compiler

# Serve the static frontend (any HTTP server works)
cd frontend
python -m http.server 8080   # open http://localhost:8080 in a browser
```
No backend server is required — Python code runs entirely in the browser via Pyodide (WASM).

**Português:**
```bash
# Clone o repositório
git clone <url-do-repo>
cd simple-compiler

# Sirva o frontend estático (qualquer servidor HTTP funciona)
cd frontend
python -m http.server 8080   # abra http://localhost:8080 no navegador
```
Nenhum servidor backend é necessário — código Python roda inteiramente no navegador via Pyodide (WASM).

---

## Running the Frontend / Executando o Frontend

See **Getting Started** above. The frontend is a static site that loads Pyodide from a CDN and executes Python in a Web Worker. No backend server, Docker, or network API calls are involved.

Consulte **Começando** acima. O frontend é um site estático que carrega o Pyodide de um CDN e executa Python em um Web Worker. Nenhum servidor backend, Docker ou chamada de rede para API está envolvida.

---

## Testing / Testes

**English:**
```bash
# Backend tests (Flask API, retained for optional backend use)
python -m pytest backend/tests
```

**Português:**
```bash
# Testes do backend (API Flask, retido para uso opcional do backend)
python -m pytest backend/tests
```

---

## Streamlit Interface (Local GUI) / Interface Streamlit (GUI Local)

The Streamlit app in `streamlit_app/` is a separate local GUI that can use either the WASM frontend or an optional backend server. See `streamlit_app/app.py` for details.

O app Streamlit em `streamlit_app/` é uma GUI local separada que pode usar tanto o frontend WASM quanto um servidor backend opcional. Veja `streamlit_app/app.py` para detalhes.

---

## Web page access / Acesso à página web

**English:**
- **GitHub Pages (frontend)**: `https://jluckmay.github.io/simple-compiler/` — static site, client‑side WASM execution.

**Português:**
- **GitHub Pages (frontend)**: `https://jluckmay.github.io/simple-compiler/` — site estático, execução WASM no lado do cliente.

---

## License / Licença

See the [LICENSE](LICENSE) file.

Veja o arquivo [LICENSE](LICENSE).
3. **Validação de entrada** – apenas `code` (string) e `language` (lista branca) são aceitos; linguagens desconhecidas retornam erro 400.
4. **Detecção de padrões perigosos** – código contendo `import os`, `subprocess`, `eval()`, `exec()`, `open()`, `os.system()`, metacaracteres de shell, crases e outros padrões perigosos é rejeitado com HTTP 400 antes da execução.
5. **Sem sistema de arquivos persistente** – arquivos de origem são gravados em um diretório temporário e removidos após a execução.
6. **Sanitização de erros** – mensagens de erro são limpas de caminhos do sistema, nomes de usuário e informações sensíveis antes de serem retornadas ao cliente.
7. **Tamanho máximo de payload** – submissões de código maiores que 100 KB são rejeitadas com HTTP 413.
8. **Segurança do fallback de subprocesso** – quando o Docker está indisponível, o fallback de subprocesso apenas executa código que já passou pela validação de padrões perigosos.

---

## Project Structure / Estrutura do Projeto

```
simple-compiler/
├─ frontend/                     # static site / site estático (HTML/CSS/JS)
│   ├─ index.html
│   ├─ style.css
│   ├─ script.js
│   └─ i18n/ (en.json, pt.json)
├─ backend/                      # Flask API
│   ├─ app.py
│   ├─ requirements.txt
│   ├─ Dockerfile
│   ├─ .gitignore
│   └─ tests/ test_app.py
├─ .github/                     # CI workflow / fluxo de CI
│   └─ workflows/ ci.yml
├─ render.yaml                   # Render service definition
├─ README.md
└─ LICENSE
```

---

## Getting Started (Local Development) / Começando (Desenvolvimento Local)

**English:**
```bash
# Clone the repo (once created remotely)
git clone <repo‑url>
cd simple-compiler

# Backend – virtual environment (optional but recommended)
python -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# Run the backend API (Docker is used if available, otherwise falls back)
python backend/app.py   # listens on http://127.0.0.1:5000
```

**Português:**
```bash
# Clone o repositório (apenas uma vez, após criação remota)
git clone <url-do-repo>
cd simple-compiler

# Backend – ambiente virtual (opcional, mas recomendado)
python -m venv .venv
source .venv/bin/activate  # no Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# Execute a API do backend (Docker é usado se disponível, caso contrário usa fallback)
python backend/app.py   # escuta em http://127.0.0.1:5000
```

---

## Running the Frontend / Executando o Frontend

**English:**
```bash
# From the project root, serve the static files (any HTTP server will do)
cd frontend
python -m http.server 8080   # open http://localhost:8080 in a browser
```
The UI talks to the backend at `http://localhost:5000/compile`.

**Português:**
```bash
# A partir da raiz do projeto, sirva os arquivos estáticos (qualquer servidor HTTP serve)
cd frontend
python -m http.server 8080   # abra http://localhost:8080 no navegador
```
A UI se comunica com o backend em `http://localhost:5000/compile`.

---

## Running the Backend / Executando o Backend

**English:**
```bash
python backend/app.py   # listens on http://127.0.0.1:5000
```
Docker is optional — if unavailable, the backend falls back to a local subprocess with the same timeout and output limits.

**Português:**
```bash
python backend/app.py   # escuta em http://127.0.0.1:5000
```
O Docker é opcional — se indisponível, o backend recorre a um subprocesso local com os mesmos limites de tempo e saída.

---

## Testing / Testes

**English:**
```bash
# Backend unit tests (pytest)
pytest backend/tests
```
All tests pass (`6 passed`). The tests cover:
- Successful Python execution.
- Timeout handling.
- Proper error for unsupported languages.
- Code size limit (413 for oversized payloads).
- SQL uses stdin, not shell redirection.
- Java uses basename for class name.

**Português:**
```bash
# Testes unitários do backend (pytest)
pytest backend/tests
```
Todos os testes passam (`6 passed`). Os testes cobrem:
- Execução bem-sucedida de Python.
- Tratamento de tempo limite.
- Erro adequado para linguagens não suportadas.
- Limite de tamanho de código (413 para payloads grandes).
- SQL usa stdin, não redirecionamento de shell.
- Java usa basename para o nome da classe.

---

## Streamlit Interface (Local GUI) / Interface Streamlit (GUI Local)

**English:**
A lightweight local GUI built with **Streamlit** mirrors the web UI, allowing you to run the compiler without a browser.

The Streamlit app is **self-contained** — it imports the execution logic directly from the backend, so you do **not** need to start the Flask API separately.

```bash
# 1️⃣ Install Streamlit UI dependencies
cd streamlit_app
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2️⃣ Launch the Streamlit app (no backend server needed)
streamlit run app.py
```
The app will open at `http://localhost:8501`. It supports the same language selector, dark/light mode, and Portuguese/English UI toggle. Docker is optional — if unavailable, the app falls back to a local subprocess runner with the same timeout and output limits.

**Português:**
Uma GUI local leve construída com **Streamlit** espelha a interface web, permitindo que você execute o compilador sem um navegador.

O aplicativo Streamlit é **autocontido** — ele importa a lógica de execução diretamente do backend, então você **não** precisa iniciar a API Flask separadamente.

```bash
# 1️⃣ Instale as dependências da UI do Streamlit
cd streamlit_app
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2️⃣ Inicie o aplicativo Streamlit (não é necessário servidor backend)
streamlit run app.py
```
O aplicativo será aberto em `http://localhost:8501`. Ele suporta o mesmo seletor de linguagem, modo claro/escuro e alternância de idioma Inglês/Português. O Docker é opcional — se indisponível, o aplicativo recorre a um subprocesso local com os mesmos limites de tempo e saída.

---

## Acesso à página web / Web page access

**English:**
The frontend is hosted on GitHub Pages at:
`https://jluckmay.github.io/simple-compiler/`

Just open the link in your browser — no installation or backend server is required.

**Português:**
O frontend está hospedado no GitHub Pages em:
`https://jluckmay.github.io/simple-compiler/`

Basta abrir o link no navegador — nenhuma instalação ou servidor backend é necessário.

---

## License / Licença

**English:** This project is released under the **MIT License** – see the `LICENSE` file for details.

**Português:** Este projeto é lançado sob a **Licença MIT** – consulte o arquivo `LICENSE` para detalhes.

---

*If you have any questions or need further customisation, feel free to ask! / Se tiver alguma dúvida ou precisar de mais personalização, fique à vontade para perguntar!*