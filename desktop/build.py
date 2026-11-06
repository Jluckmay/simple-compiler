#!/usr/bin/env python3
"""
Build script for Simple Compiler Desktop
Builds Windows executable using PyInstaller
"""
import os
import sys
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DESKTOP_DIR = os.path.abspath(os.path.dirname(__file__))
PYTHON = sys.executable

os.chdir(PROJECT_ROOT)

print("Building Simple Compiler Desktop for Windows...")
print("=" * 60)

# Install dependencies if needed
print("Installing dependencies...")
subprocess.run([PYTHON, '-m', 'pip', 'install', '-r', os.path.join(DESKTOP_DIR, 'requirements.txt')])

# Build with PyInstaller
spec_file = os.path.join(DESKTOP_DIR, 'pyinstaller.spec')
print(f"\nRunning PyInstaller with {spec_file}...")
result = subprocess.run(
    [PYTHON, '-m', 'PyInstaller', spec_file, '--noconfirm', '--clean'],
    cwd=PROJECT_ROOT
)

if result.returncode == 0:
    print("\n" + "=" * 60)
    print("Build successful!")
    print("Executable: dist/Simple Compiler/Simple Compiler.exe")
    print("=" * 60)
else:
    print("\nBuild failed!")
    sys.exit(1)
