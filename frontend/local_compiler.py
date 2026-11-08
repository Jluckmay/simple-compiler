"""
Local Compiler Engine
Executes supported languages using locally installed compilers/tools on the host system.
Returns dict with {'output': str, 'error': str} if handled, or None if no local compiler is found.
"""
import os
import sys
import shutil
import tempfile
import subprocess
import re
import base64
import sqlite3

def run_local_sql(code):
    try:
        conn = sqlite3.connect(':memory:')
        cursor = conn.cursor()
        out = []
        statements = [s.strip() for s in code.split(';') if s.strip()]
        for stmt in statements:
            res = cursor.execute(stmt)
            if res.description:
                rows = res.fetchall()
                for r in rows:
                    out.append('|'.join(str(x) for x in r))
        conn.commit()
        conn.close()
        return {'output': '\n'.join(out) + ('\n' if out else ''), 'error': ''}
    except Exception as e:
        return {'output': '', 'error': str(e)}

def try_local_execute(code, language, timeout=15):
    """Execute code locally if compiler is installed on the host machine.
    Returns dict {'output': str, 'error': str} if handled, or None if no compiler.
    """
    lang = (language or '').lower()
    
    if lang == 'sql':
        return run_local_sql(code)
    
    temp_dir = tempfile.mkdtemp()
    try:
        if lang == 'c' and shutil.which('gcc'):
            src = os.path.join(temp_dir, 'main.c')
            out = os.path.join(temp_dir, 'main.exe' if os.name == 'nt' else 'main')
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            c_res = subprocess.run(['gcc', src, '-o', out], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            if c_res.returncode != 0:
                return {'output': '', 'error': c_res.stderr or c_res.stdout}
            r_res = subprocess.run([out], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': r_res.stdout, 'error': r_res.stderr}
            
        elif lang == 'cpp' and shutil.which('g++'):
            src = os.path.join(temp_dir, 'main.cpp')
            out = os.path.join(temp_dir, 'main.exe' if os.name == 'nt' else 'main')
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            c_res = subprocess.run(['g++', src, '-o', out], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            if c_res.returncode != 0:
                return {'output': '', 'error': c_res.stderr or c_res.stdout}
            r_res = subprocess.run([out], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': r_res.stdout, 'error': r_res.stderr}
            
        elif lang == 'java' and shutil.which('javac') and shutil.which('java'):
            match = re.search(r'public\s+class\s+([A-Za-z0-9_]+)', code)
            class_name = match.group(1) if match else 'Main'
            src = os.path.join(temp_dir, f"{class_name}.java")
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            c_res = subprocess.run(['javac', src], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            if c_res.returncode != 0:
                return {'output': '', 'error': c_res.stderr or c_res.stdout}
            r_res = subprocess.run(['java', class_name], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': r_res.stdout, 'error': r_res.stderr}
            
        elif lang == 'csharp' and shutil.which('dotnet'):
            proj_file = os.path.join(temp_dir, 'App.csproj')
            with open(proj_file, 'w', encoding='utf-8') as f:
                f.write('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>')
            src = os.path.join(temp_dir, 'Program.cs')
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            res = subprocess.run(['dotnet', 'run', '--project', temp_dir], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': res.stdout, 'error': res.stderr}
            
        elif lang in ('ts', 'typescript') and shutil.which('node'):
            src = os.path.join(temp_dir, 'main.ts')
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            res = subprocess.run(['node', src], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': res.stdout, 'error': res.stderr}

        elif lang in ('js', 'javascript') and shutil.which('node'):
            src = os.path.join(temp_dir, 'main.js')
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            res = subprocess.run(['node', src], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': res.stdout, 'error': res.stderr}

        elif lang == 'latex' and shutil.which('pdflatex'):
            src = os.path.join(temp_dir, 'main.tex')
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            res = subprocess.run(['pdflatex', '-interaction=nonstopmode', 'main.tex'], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            pdf_path = os.path.join(temp_dir, 'main.pdf')
            output_text = res.stdout
            if os.path.exists(pdf_path):
                with open(pdf_path, 'rb') as pf:
                    b64 = base64.b64encode(pf.read()).decode('ascii')
                pdf_data_url = f'data:application/pdf;base64,{b64}'
                output_text = (output_text + '\n' + pdf_data_url).strip() if output_text else pdf_data_url
                return {'output': output_text, 'error': ''}
            else:
                return {'output': output_text, 'error': res.stderr or 'Failed to generate PDF'}
                
        elif lang == 'go' and shutil.which('go'):
            src = os.path.join(temp_dir, 'main.go')
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            res = subprocess.run(['go', 'run', src], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': res.stdout, 'error': res.stderr}
            
        elif lang == 'lean' and shutil.which('lean'):
            src = os.path.join(temp_dir, 'main.lean')
            with open(src, 'w', encoding='utf-8') as f:
                f.write(code)
            res = subprocess.run(['lean', src], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': res.stdout, 'error': res.stderr}
            
        elif lang == 'python' and shutil.which(sys.executable):
            res = subprocess.run([sys.executable, '-c', code], cwd=temp_dir, capture_output=True, text=True, timeout=timeout)
            return {'output': res.stdout, 'error': res.stderr}

        return None
    except subprocess.TimeoutExpired:
        return {'output': '', 'error': 'Execution timed out'}
    except Exception as e:
        return {'output': '', 'error': str(e)}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
