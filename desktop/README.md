# Simple Compiler Desktop

Local desktop application with spellcheck support.

## Features

- Native desktop window using `pywebview`
- Spell check in code comments and strings
- All WebAssembly runtimes from the web version
- Runs completely locally
- Cross-platform: Windows & Linux

## Quick Start

```bash
# Install dependencies
pip install -r desktop/requirements.txt

# Run
python -m desktop

# Or run directly
python desktop/app.py
```

## Building Executables

### Windows
```bash
python desktop/build.py
# or
C:\Users\jluck\AppData\Local\Python\pythoncore-3.14-64\python.exe desktop\build.py
```

### Linux
```bash
chmod +x desktop/build.sh
./desktop/build.sh
```

## Spell Check

The desktop version includes spell checking for code comments and string literals:
- English and Portuguese dictionaries
- Detects misspellings in comments and strings
- Suggests corrections
- Click suggestion to replace in code

## Releases

Binaries are available in GitHub Releases:
- `Simple Compiler-Windows-x64.exe`
- `Simple Compiler-Linux-x64.AppImage` (or tar.gz)

## Development

The desktop app serves the frontend files locally and injects `desktop.js` for spellcheck UI.

API endpoint: `/api/spellcheck` (POST with `{text, language}`)

## Requirements

- Python 3.8+
- `pywebview` (native webview window)
- `pyspellchecker` (spell checking)

For packaging:
- `PyInstaller` (building executables)
