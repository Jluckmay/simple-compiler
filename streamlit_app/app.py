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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #0a0a0a;
  --surface: #111111;
  --surface-hover: #1a1a1a;
  --border: #222222;
  --accent-red: #ff0000;
  --accent-red-hover: #ff3333;
  --accent-yellow: #ffd700;
  --text: #ffffff;
  --text-muted: #a1a1aa;
  --text-dim: #71717a;
  --code-bg: #0d0d0d;
  --output-bg: #0d0d0d;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  --radius: 8px;
  --transition: all 0.2s ease;
}

.stApp {
  background: var(--bg);
  color: var(--text);
}

.block-container {
  padding-top: 2rem;
  max-width: 960px;
  margin: 0 auto;
}

/* Hide Streamlit branding */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}

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
  font-size: 1.5rem;
  line-height: 1;
}

.app-slash {
  color: var(--text-muted);
  font-weight: 700;
  font-size: 1.5rem;
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
  box-shadow: var(--shadow);
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

.card-title {
  color: var(--text);
  font-size: 1rem;
  font-weight: 600;
}

/* Code editor */
.shell-code {
  width: 100%;
  min-height: 240px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  padding: 1rem;
  resize: vertical;
  outline: none;
  transition: var(--transition);
}

/* Output */
.shell-output {
  background: var(--output-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 1rem;
  min-height: 120px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Buttons */
.stButton > button {
  background: var(--accent-red) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  transition: var(--transition) !important;
  width: 100% !important;
  padding: 0.75rem !important;
  font-size: 0.875rem !important;
}

.stButton > button:hover {
  background: var(--accent-red-hover) !important;
  box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.2) !important;
}

.stButton > button[kind="secondary"] {
  background: transparent !important;
  color: var(--text-muted) !important;
  border: 1px solid var(--border) !important;
  width: auto !important;
  padding: 0.6rem !important;
  font-size: 1.25rem !important;
}

.stButton > button[kind="secondary"]:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  border-color: var(--text-dim) !important;
  color: var(--text) !important;
}

/* Responsive */
@media (min-width: 640px) {
  .editor-card,
  .output-card {
    flex: 1;
  }
}
</style>
"""

LIGHT_CSS = """
<style>
.stApp { background: #fafafa; color: #111827; }
.stCard { background: #ffffff; border: 1px solid #e5e7eb; border-top: 3px solid #dc2626; }
.card-label { color: #6b7280; }
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
    st.session_state.dark_mode = not st.session_state.get('dark_mode', False)
    st.rerun()

# ---------------------------------------------------------------------------
# Streamlit page configuration
# ---------------------------------------------------------------------------
st.set_page_config(page_title="Simple Compiler", layout="centered")

# Initialize session state defaults
if 'locale' not in st.session_state:
    st.session_state.locale = 'en'
if 'dark_mode' not in st.session_state:
    st.session_state.dark_mode = True
if 'code' not in st.session_state:
    st.session_state.code = ''
if 'compiler_lang' not in st.session_state:
    st.session_state.compiler_lang = 'python'
if 'last_output' not in st.session_state:
    st.session_state.last_output = ''
if 'last_error' not in st.session_state:
    st.session_state.last_error = ''

dark = st.session_state.dark_mode
if dark:
    st.markdown(MODERN_CSS, unsafe_allow_html=True)
else:
    st.markdown(LIGHT_CSS, unsafe_allow_html=True)

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

# Controls row: theme toggle + language toggle
col1, col2, col3 = st.columns([3, 1, 1])
with col1:
    pass
with col2:
    theme_icon = '🌙' if dark else '☀️'
    if st.button(theme_icon, key="theme_btn", help=strings["theme_toggle"]):
        toggle_theme()
with col3:
    ui_btn_label = st.session_state.locale.upper()
    if st.button(ui_btn_label, key="lang_btn", help=strings["lang_toggle"]):
        st.session_state.locale = 'pt' if st.session_state.locale == 'en' else 'en'
        strings = get_strings()
        st.rerun()

# Language label
st.markdown(f'<span class="card-label">{strings["language_label"]}</span>', unsafe_allow_html=True)

# Language selector (dropdown, matches web frontend)
compiler_lang = st.selectbox(
    strings["language_label"],
    options=[lang for lang, _, _ in LANGUAGES],
    format_func=lambda lang: next(label for _, _, label in LANGUAGES if lang == lang),
    index=[lang for lang, _, _ in LANGUAGES].index(st.session_state.compiler_lang),
    key="compiler_lang_select",
    label_visibility="collapsed",
)
st.session_state.compiler_lang = compiler_lang

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

# Run button
if st.button(strings["run_button"], key="run_btn", use_container_width=True):
    if not st.session_state.code.strip():
        st.session_state.last_error = strings["error"] + ": " + "No code provided."
        st.session_state.last_output = ''
    else:
        cfg = LANG_CONFIG.get(st.session_state.compiler_lang)
        if not cfg:
            st.session_state.last_error = f"{strings['error']}: Language {st.session_state.compiler_lang} not supported."
            st.session_state.last_output = ''
        else:
            ext = cfg.get('ext', '')
            fd, src_path = tempfile.mkstemp(suffix=ext)
            os.write(fd, st.session_state.code.encode())
            os.close(fd)
            try:
                stdout, stderr = execute_code(cfg, src_path)
                st.session_state.last_error = stderr
                st.session_state.last_output = stdout
            except Exception as e:
                st.session_state.last_error = f"{strings['error']}: {e}"
                st.session_state.last_output = ''

# Output card (matches web frontend)
if st.session_state.last_output or st.session_state.last_error:
    st.markdown('<div class="stCard">', unsafe_allow_html=True)
    st.markdown(f'<h2 class="card-title">{strings["output_title"]}</h2>', unsafe_allow_html=True)
    if st.session_state.last_error:
        st.error(f"{strings['error']}: {st.session_state.last_error}")
    if st.session_state.last_output:
        st.code(st.session_state.last_output, language=st.session_state.compiler_lang)
    st.markdown('</div>', unsafe_allow_html=True)
