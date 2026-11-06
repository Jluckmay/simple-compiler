#!/bin/bash
# Build script for Simple Compiler Desktop - Linux
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="${PYTHON:-python3}"

echo "Building Simple Compiler Desktop for Linux..."
echo "=============================================="

cd "$PROJECT_ROOT"

echo "Installing dependencies..."
$PYTHON -m pip install -U pip
$PYTHON -m pip install -r "$DESKTOP_DIR/requirements.txt"
$PYTHON -m pip install pyinstaller

echo "Building with PyInstaller..."
cd "$DESKTOP_DIR"
$PYTHON -m PyInstaller pyinstaller.spec --noconfirm --clean

echo ""
echo "=============================================="
echo "Build successful!"
echo "Executable: dist/Simple Compiler"
echo "=============================================="
