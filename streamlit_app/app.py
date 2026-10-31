import streamlit as st
import requests
import json

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

/* Inputs */
.stSelectbox > div > div {
  background: var(--code-bg) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
  border-radius: 6px !important;
}

.stTextArea > div > div > textarea {
  background: var(--code-bg) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace !important;
  border-radius: 6px !important;
}

/* Buttons */
.stButton > button {
  background: var(--accent-red) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
  width: 100% !important;
  padding: 0.75rem !important;
}

.stButton > button:hover {
  background: var(--accent-red-hover) !important;
  box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.2) !important;
}

/* Output code blocks */
.stCode {
  background: var(--code-bg) !important;
  border: 1px solid var(--border) !important;
  border-radius: 6px !important;
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
            .stSelectbox > div > div { background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; color: #111827 !important; }
            .stTextArea > div > div > textarea { background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; color: #111827 !important; }
            .stButton > button { background: #dc2626 !important; color: #ffffff !important; }
            .stButton > button:hover { background: #b91c1c !important; }
            .stCode { background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; }
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
    if st.button(strings["theme_toggle"]):
        toggle_theme()

# Language selector (both UI language and compilation language)
ui_lang = st.selectbox(strings["lang_toggle"], options=["en", "pt"], index=0 if get_locale() == "en" else 1)
st.session_state.locale = ui_lang
strings = get_strings()

# Compiler card
st.markdown('<div class="stCard">', unsafe_allow_html=True)
st.markdown(f'<span class="card-label">{strings["language_label"]}</span>', unsafe_allow_html=True)
compiler_lang = st.selectbox(strings["language_label"], options=[
    "python", "c", "cpp", "csharp", "java", "js", "ts", "sql", "lua", "go", "lean", "r", "latex", "htmlcss"
], label_visibility="collapsed")

code = st.text_area("Code", height=250, placeholder="Write your code here...", label_visibility="collapsed")

if st.button(strings["run_button"]):
    if not code.strip():
        st.error(strings["error"] + ": " + "No code provided.")
    else:
        # Send request to local backend API (expects it to be running on port 5000)
        try:
            resp = requests.post(
                "http://127.0.0.1:5000/compile",
                json={"code": code, "language": compiler_lang},
                timeout=10,
            )
            if resp.status_code != 200:
                st.error(f"{strings['error']}: HTTP {resp.status_code}")
            else:
                data = resp.json()
                if data.get('error'):
                    st.error(f"{strings['error']}: {data['error']}")
                else:
                    st.subheader(strings["output_title"])
                    st.code(data.get('output', ''), language=compiler_lang)
        except Exception as e:
            st.error(f"{strings['error']}: {e}")
st.markdown('</div>', unsafe_allow_html=True)
