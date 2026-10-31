# Simple Compiler / Compilador Simples

> **English** | **Português** — Use the language selector in the UI to switch the interface language.

A **web‑based multi‑language compiler** that runs user code in a secure, isolated environment.

Um **compilador multi‑linguagem baseado na web** que executa código do usuário em um ambiente seguro e isolado.

---

## Table of Contents / Sumário

- [Features / Recursos](#features--recursos)
- [Supported Languages / Linguagens Suportadas](#supported-languages--linguagens-suportadas)
- [Security Model / Modelo de Segurança](#security-model--modelo-de-segurança)
- [Project Structure / Estrutura do Projeto](#project-structure--estrutura-do-projeto)
- [Getting Started (Local Development) / Começando (Desenvolvimento Local)](#getting-started-local-development--começando-desenvolvimento-local)
- [Running the Frontend / Executando o Frontend](#running-the-frontend--executando-o-frontend)
- [Running the Backend / Executando o Backend](#running-the-backend--executando-o-backend)
- [Testing / Testes](#testing--testes)
- [Streamlit Interface (Local GUI) / Interface Streamlit (GUI Local)](#streamlit-interface-local-gui--interface-streamlit-gui-local)
- [Deployment / Implantação](#deployment--implantação)
  - [GitHub Pages (frontend)](#github-pages-frontend)
  - [Render (backend)](#render-backend)
- [License / Licença](#license--licença)

---

## Features / Recursos

**English:**
- **Modern UI** – simple, responsive layout with dark/light mode that follows the system preference.
- **Internationalisation** – English/Português toggle, all UI strings externalised in `frontend/i18n`.
- **Screen‑reader friendly** – ARIA live region for output, proper `aria-label`s.
- **Multi‑language support** – Python, C, C++, C#, Java, JavaScript, TypeScript, SQL, Lua, Go, Lean, R, LaTeX, HTML/CSS.
- **Secure sandbox** – each compilation/execution runs inside a Docker container with:
  - Network disabled (`--network none`).
  - CPU limited to **0.5 vCPU** and memory to **256 MiB**.
  - Execution timeout of **5 seconds**.
  - Output truncated to **10 KB**.
- **Graceful fallback** – if Docker is unavailable, the backend falls back to a local subprocess with the same timeout and output limits.
- **CI pipeline** – GitHub Actions run unit tests on every push.
- **Ready for production** – ready to be deployed on **GitHub Pages** (static frontend) and **Render** (containerised Flask API).

**Português:**
- **UI moderna** – layout simples e responsivo com modo claro/escuro que segue a preferência do sistema.
- **Internacionalização** – alternância Inglês/Português, todas as strings da UI externalizadas em `frontend/i18n`.
- **Amigável para leitores de tela** – região ARIA ao vivo para saída, `aria-label`s apropriados.
- **Suporte a múltiplas linguagens** – Python, C, C++, C#, Java, JavaScript, TypeScript, SQL, Lua, Go, Lean, R, LaTeX, HTML/CSS.
- **Sandbox seguro** – cada compilação/execução roda dentro de um contêiner Docker com:
  - Rede desabilitada (`--network none`).
  - CPU limitada a **0.5 vCPU** e memória a **256 MiB**.
  - Tempo limite de execução de **5 segundos**.
  - Saída truncada a **10 KB**.
- **Fallback gracioso** – se o Docker estiver indisponível, o backend recorre a um subprocesso local com os mesmos limites de tempo e saída.
- **Pipeline de CI** – GitHub Actions executa testes unitários a cada push.
- **Pronto para produção** – pronto para ser implantado no **GitHub Pages** (frontend estático) e **Render** (API Flask contêinerizada).

---

## Supported Languages / Linguagens Suportadas

| Language / Linguagem | Docker Image | Compile? / Compila? |
|----------|--------------|----------|
| Python | `python:3.12-slim` | No / Não |
| C | `gcc:13` | Yes / Sim |
| C++ | `gcc:13` | Yes / Sim |
| C# | `mcr.microsoft.com/dotnet/sdk:8.0` | No (dotnet‑script) / Não (dotnet‑script) |
| Java | `openjdk:21` | Yes (javac) / Sim (javac) |
| JavaScript | `node:20-slim` | No / Não |
| TypeScript | `node:20-slim` | No (ts‑node) / Não (ts‑node) |
| SQL (SQLite) | `nouchka/sqlite3` | No / Não |
| Lua | `lua:5.4` | No / Não |
| Go | `golang:1.22` | No (go run) / Não (go run) |
| Lean | `leanprover/lean4:latest` | No / Não |
| R | `r-base:latest` | No / Não |
| LaTeX | `texlive/texlive:latest` | No (pdflatex) / Não (pdflatex) |
| HTML/CSS | `node:20-slim` | No (cat) / Não (cat) |

---

## Security Model / Modelo de Segurança

**English:**
1. **Docker isolation** – each request spawns a short‑lived container, network disabled, resource caps applied.
2. **Timeout & output limits** – enforced both in Docker and the subprocess fallback to prevent hangs and data‑exfiltration.
3. **Input validation** – only `code` (string) and `language` (whitelisted) are accepted; unknown languages return a 400 error.
4. **No persistent filesystem** – source files are written to a temporary directory and removed after execution.
5. **Error handling** – any Docker‑related error returns a clear message in the `error` field; the service never crashes.

**Português:**
1. **Isolamento Docker** – cada requisição gera um contêiner de curta duração, rede desabilitada, limites de recursos aplicados.
2. **Limites de tempo e saída** – aplicados tanto no Docker quanto no fallback de subprocesso para evitar travamentos e exfiltração de dados.
3. **Validação de entrada** – apenas `code` (string) e `language` (lista branca) são aceitos; linguagens desconhecidas retornam erro 400.
4. **Sem sistema de arquivos persistente** – arquivos de origem são gravados em um diretório temporário e removidos após a execução.
5. **Tratamento de erros** – qualquer erro relacionado ao Docker retorna uma mensagem clara no campo `error`; o serviço nunca falha.

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

## Deployment / Implantação

### GitHub Pages (frontend)

**English:**
1. Push the `frontend/` folder to a `gh-pages` branch (or enable GitHub Pages from the `main` branch settings with `/frontend`).
2. The site is automatically served at `https://<username>.github.io/<repo>/`.

**Português:**
1. Envie a pasta `frontend/` para um branch `gh-pages` (ou habilite o GitHub Pages nas configurações do branch `main` com `/frontend`).
2. O site é servido automaticamente em `https://<usuario>.github.io/<repo>/`.

### Render (backend)

**English:**
1. In Render, create a **Web Service**.
2. Connect it to this repository.
3. Choose **Docker** as the environment; Render will build the `backend/Dockerfile`.
4. Set the start command to `python app.py` (Render uses the Docker CMD from the Dockerfile).
5. The service will be exposed at `https://<app>.onrender.com/compile` – update the frontend `script.js` base URL if needed.

**Português:**
1. No Render, crie um **Web Service**.
2. Conecte-o a este repositório.
3. Escolha **Docker** como o ambiente; o Render construirá o `backend/Dockerfile`.
4. Defina o comando de inicialização como `python app.py` (o Render usa o CMD do Docker do Dockerfile).
5. O serviço será exposto em `https://<app>.onrender.com/compile` – atualize a URL base do `script.js` do frontend se necessário.

---

## License / Licença

**English:** This project is released under the **MIT License** – see the `LICENSE` file for details.

**Português:** Este projeto é lançado sob a **Licença MIT** – consulte o arquivo `LICENSE` para detalhes.

---

*If you have any questions or need further customisation, feel free to ask! / Se tiver alguma dúvida ou precisar de mais personalização, fique à vontade para perguntar!*