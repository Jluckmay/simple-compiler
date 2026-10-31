# Simple Compiler

A **web‑based multi‑language compiler** that runs user code in a secure, isolated environment.

## Table of Contents
- [Features](#features)
- [Supported Languages](#supported-languages)
- [Security Model](#security-model)
- [Project Structure](#project-structure)
- [Getting Started (Local Development)](#getting-started-local-development)
- [Running the Frontend](#running-the-frontend)
- [Running the Backend](#running-the-backend)
- [Testing](#testing)
- [Deployment](#deployment)
  - [GitHub Pages (frontend)](#github-pages-frontend)
  - [Render (backend)](#render-backend)
- [License](#license)

## Features
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

## Supported Languages
| Language | Docker Image | Compile? |
|----------|--------------|----------|
| Python   | `python:3.12-slim` | No |
| C        | `gcc:13` | Yes |
| C++      | `gcc:13` | Yes |
| C#       | `mcr.microsoft.com/dotnet/sdk:8.0` | No (dotnet‑script) |
| Java     | `openjdk:21` | Yes (javac) |
| JavaScript | `node:20-slim` | No |
| TypeScript | `node:20-slim` | No (ts‑node) |
| SQL (SQLite) | `nouchka/sqlite3` | No |
| Lua      | `lua:5.4` | No |
| Go       | `golang:1.22` | No (go run) |
| Lean     | `leanprover/lean4:latest` | No |
| R        | `r-base:latest` | No |
| LaTeX    | `texlive/texlive:latest` | No (pdflatex) |
| HTML/CSS | `node:20-slim` | No (cat) |

## Security Model
1. **Docker isolation** – each request spawns a short‑lived container, network disabled, resource caps applied.
2. **Timeout & output limits** – enforced both in Docker and the subprocess fallback to prevent hangs and data‑exfiltration.
3. **Input validation** – only `code` (string) and `language` (whitelisted) are accepted; unknown languages return a 400 error.
4. **No persistent filesystem** – source files are written to a temporary directory and removed after execution.
5. **Error handling** – any Docker‑related error returns a clear message in the `error` field; the service never crashes.

## Project Structure
```
simple-compiler/
├─ frontend/                     # static site (HTML/CSS/JS)
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
├─ .github/                     # CI workflow
│   └─ workflows/ ci.yml
├─ render.yaml                   # Render service definition
├─ README.md
└─ LICENSE
```

## Getting Started (Local Development)
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

## Running the Frontend
```bash
# From the project root, serve the static files (any HTTP server will do)
cd frontend
python -m http.server 8080   # open http://localhost:8080 in a browser
```
The UI talks to the backend at `http://localhost:5000/compile`.

## Testing
```bash
# Backend unit tests (pytest)
pytest backend/tests
```
All tests pass (`3 passed`). The tests cover:
- Successful Python execution.
- Timeout handling.
- Proper error for unsupported languages.

## Streamlit Interface (Local GUI)
A lightweight local GUI built with **Streamlit** mirrors the web UI, allowing you to run the compiler without a browser.

```bash
# 1️⃣ Install Streamlit UI dependencies
cd streamlit_app
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2️⃣ Ensure the backend API is running (see "Running the Backend")
python ../backend/app.py   # in a separate terminal

# 3️⃣ Launch the Streamlit app
streamlit run app.py
```
The app will open at `http://localhost:8501`. It supports the same language selector, dark/light mode, and Portuguese/English UI toggle.

```bash
# Backend unit tests (pytest)
pytest backend/tests
```
All tests pass (`3 passed`). The tests cover:
- Successful Python execution.
- Timeout handling.
- Proper error for unsupported languages.

## Deployment
### GitHub Pages (frontend)
1. Push the `frontend/` folder to a `gh-pages` branch (or enable GitHub Pages from the `main` branch settings with `/frontend`).
2. The site is automatically served at `https://<username>.github.io/<repo>/`.

### Render (backend)
1. In Render, create a **Web Service**.
2. Connect it to this repository.
3. Choose **Docker** as the environment; Render will build the `backend/Dockerfile`.
4. Set the start command to `python app.py` (Render uses the Docker CMD from the Dockerfile).
5. The service will be exposed at `https://<app>.onrender.com/compile` – update the frontend `script.js` base URL if needed.

## License
This project is released under the **MIT License** – see the `LICENSE` file for details.

---
*If you have any questions or need further customisation, feel free to ask!*