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
        st.markdown(
            """
            <style>
            body {background-color: #1e1e1e; color: #eee;}
            .stButton>button {background-color: #0066ff; color: white;}
            </style>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            """
            <style>
            body {background-color: #fafafa; color: #222;}
            .stButton>button {background-color: #0066ff; color: white;}
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
    st.session_state.dark_mode = False

apply_theme()

strings = get_strings()

# Header with title and UI controls
col1, col2 = st.columns([3, 1])
with col1:
    st.title(strings["title"])
with col2:
    if st.button(strings["theme_toggle"]):
        toggle_theme()

# Language selector (both UI language and compilation language)
ui_lang = st.selectbox(strings["lang_toggle"], options=["en", "pt"], index=0 if get_locale() == "en" else 1)
st.session_state.locale = ui_lang
strings = get_strings()

compiler_lang = st.selectbox(strings["language_label"], options=[
    "python", "c", "cpp", "csharp", "java", "js", "ts", "sql", "lua", "go", "lean", "r", "latex", "htmlcss"
])

code = st.text_area("Code", height=250, placeholder="Write your code here...")

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
