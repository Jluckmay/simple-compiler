"""
Simple Compiler Desktop - Entry point
Launches the desktop app with native window and spellcheck support
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from .app import main

if __name__ == '__main__':
    main()
