import streamlit as st
import os
import sys
import tempfile
import streamlit.components.v1 as components

# ---------------------------------------------------------------------------
# Import execution logic from backend (no separate server required)
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app import execute_code, LANG_CONFIG  # noqa: E402

# ---------------------------------------------------------------------------
# UI strings (i18n)
# ---------------------------------------------------------------------------
I18N = {
    "en": {
        "title": "Simple Compiler",
        "language_label": "Language",
        "run_button": "Run",
        "output_title": "Output",
        "error": "Error",
        "theme_toggle": "Toggle dark/light mode",
        "lang_toggle": "Language (English / Português)"
    },
    "pt": {
        "title": "Compilador Simples",
        "language_label": "Linguagem",
        "run_button": "Executar",
        "output_title": "Saída",
        "error": "Erro",
        "theme_toggle": "Alternar modo escuro/claro",
        "lang_toggle": "Idioma (English / Português)"
    }
}

# ---------------------------------------------------------------------------
# Modern dark theme CSS (matches web frontend identity)
# ---------------------------------------------------------------------------
MODERN_CSS = """
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
:root {
  --bg: #0a0a0a;
  --surface: #111111;
  --border: #222222;
  --accent-red: #ff0000;
  --accent-red-hover: #ff3333;
  --accent-yellow: #ffd700;
  --text: #ffffff;
  --text-muted: #a1a1aa;
  --text-dim: #71717a;
  --code-bg: #0d0d0d;
  --radius: 8px;
}

.stApp {
  background: var(--bg);
  color: var(--text);
}

.block-container {
  padding-top: 2rem;
  max-width: 960px;
}

/* Header */
.app-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.app-prompt {
  color: var(--accent-red);
  font-weight: 700;
  font-size: 1.75rem;
  line-height: 1;
}

.app-slash {
  color: var(--text-muted);
  font-weight: 700;
  font-size: 1.75rem;
  line-height: 1;
}

.app-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

/* Cards */
.stCard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 3px solid var(--accent-red);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
}

.card-label {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  display: block;
}

/* Editor wrapper */
.editor-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

/* Language sidebar */
.lang-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

.lang-btn {
  background: var(--code-bg);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 6px;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  padding: 0.6rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.lang-btn:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

.lang-btn.active {
  border-color: var(--accent-red);
  color: var(--accent-red);
  background: rgba(255, 0, 0, 0.05);
}

.lang-btn i {
  pointer-events: none;
}

/* Hide Streamlit branding */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}
</style>
"""

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
def get_locale():
    """Return the selected locale (en or pt). Stored in session_state."""
    return st.session_state.get('locale', 'en')

def get_strings():
    return I18N[get_locale()]

def toggle_theme():
    # Store theme flag in session_state; True = dark, False = light
    st.session_state.dark_mode = not st.session_state.get('dark_mode', False)
    # Force a rerun to apply CSS
    st.rerun()

def apply_theme():
    dark = st.session_state.get('dark_mode', False)
    if dark:
        st.markdown(MODERN_CSS, unsafe_allow_html=True)
    else:
        st.markdown(
            """
            <style>
            .stApp { background: #fafafa; color: #111827; }
            .stCard { background: #ffffff; border: 1px solid #e5e7eb; border-top: 3px solid #dc2626; }
            .card-label { color: #6b7280; }
            #MainMenu {visibility: hidden;}
            footer {visibility: hidden;}
            header {visibility: hidden;}
            </style>
            """,
            unsafe_allow_html=True,
        )

# ---------------------------------------------------------------------------
# Streamlit page configuration
# ---------------------------------------------------------------------------
st.set_page_config(page_title="Simple Compiler", layout="centered")

# Initialize session state defaults
if 'locale' not in st.session_state:
    # Detect browser language from query params if present, fallback to en
    st.session_state.locale = 'en'
if 'dark_mode' not in st.session_state:
    st.session_state.dark_mode = True
if 'code' not in st.session_state:
    st.session_state.code = ''
if 'compiler_lang' not in st.session_state:
    st.session_state.compiler_lang = 'python'

apply_theme()

strings = get_strings()

# Header with title and UI controls
st.markdown(
    f"""
    <div class="app-header">
      <span class="app-prompt">~</span><span class="app-slash">/</span>
      <span class="app-title">{strings['title']}</span>
    </div>
    """,
    unsafe_allow_html=True,
)

col1, col2 = st.columns([3, 1])
with col1:
    pass  # title already rendered in header
with col2:
    theme_icon = '🌙' if st.session_state.dark_mode else '☀️'
    if st.button(theme_icon, key="theme_btn", help=strings["theme_toggle"]):
        toggle_theme()

# Language toggle (EN/PT)
lang_col1, lang_col2 = st.columns([3, 1])
with lang_col1:
    pass
with lang_col2:
    ui_btn_label = st.session_state.locale.upper()
    if st.button(ui_btn_label, key="lang_btn", help=strings["lang_toggle"]):
        next_locale = 'pt' if st.session_state.locale == 'en' else 'en'
        st.session_state.locale = next_locale
        strings = get_strings()
        st.rerun()

# Language selection sidebar with FontAwesome icons (matches web frontend)
LANGUAGES = [
    ("python", "fa-brands fa-python", "Python"),
    ("c", "fa-solid fa-code", "C"),
    ("cpp", "fa-solid fa-code", "C++"),
    ("csharp", "fa-brands fa-csharp", "C#"),
    ("java", "fa-brands fa-java", "Java"),
    ("js", "fa-brands fa-js", "JavaScript"),
    ("ts", "fa-brands fa-ts", "TypeScript"),
    ("sql", "fa-solid fa-database", "SQL"),
    ("lua", "fa-solid fa-moon", "Lua"),
    ("go", "fa-brands fa-gofore", "Go"),
    ("lean", "fa-solid fa-calculator", "Lean"),
    ("r", "fa-solid fa-chart-pie", "R"),
    ("latex", "fa-solid fa-file-code", "LaTeX"),
    ("htmlcss", "fa-brands fa-html5", "HTML/CSS"),
]

st.markdown(f'<span class="card-label">{strings["language_label"]}</span>', unsafe_allow_html=True)

# Editor wrapper with language sidebar + code editor
st.markdown('<div class="editor-wrapper">', unsafe_allow_html=True)

# Language sidebar
st.markdown('<div class="lang-sidebar">', unsafe_allow_html=True)
for lang, icon_class, label in LANGUAGES:
    is_active = st.session_state.compiler_lang == lang
    btn_type = "primary" if is_active else "secondary"
    icon_html = f'<i class="{icon_class}"></i>'
    if st.button(icon_html, key=f"lang_{lang}", help=label, type=btn_type):
        st.session_state.compiler_lang = lang
        st.rerun()
st.markdown('</div>', unsafe_allow_html=True)

# Code editor (custom HTML component for Tab indentation support)
code_html = f"""
<textarea id="code" style="width:100%;height:260px;background:var(--code-bg,#0d0d0d);color:var(--text,#fff);border:1px solid var(--border,#222);border-radius:6px;font-family:'JetBrains Mono','Fira Code','Courier New',monospace;font-size:0.9rem;line-height:1.6;padding:1rem;resize:vertical;outline:none;">{st.session_state.code}</textarea>
<script>
const ta = document.getElementById('code');
ta.addEventListener('keydown', function(e) {{
    if (e.key === 'Tab') {{
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
        this.dispatchEvent(new Event('input', {{bubbles: true}}));
    }}
}});
ta.addEventListener('input', function() {{
    Streamlit.setComponentValue(this.value);
}});
</script>
"""
new_code = components.html(code_html, height=300)
if new_code is not None:
    st.session_state.code = new_code

st.markdown('</div>', unsafe_allow_html=True)

# Run button
if st.button(strings["run_button"], key="run_btn", use_container_width=True):
    if not st.session_state.code.strip():
        st.error(strings["error"] + ": " + "No code provided.")
    else:
        cfg = LANG_CONFIG.get(st.session_state.compiler_lang)
        if not cfg:
            st.error(f"{strings['error']}: Language {st.session_state.compiler_lang} not supported.")
        else:
            ext = cfg.get('ext', '')
            fd, src_path = tempfile.mkstemp(suffix=ext)
            os.write(fd, st.session_state.code.encode())
            os.close(fd)
            try:
                stdout, stderr = execute_code(cfg, src_path)
                if stderr:
                    st.error(f"{strings['error']}: {stderr}")
                else:
                    st.subheader(strings["output_title"])
                    st.code(stdout, language=st.session_state.compiler_lang)
            except Exception as e:
                st.error(f"{strings['error']}: {e}")
