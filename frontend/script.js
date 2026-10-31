// script.js
const i18n = {
  en: {
    title: "Simple Compiler",
    languageLabel: "Language",
    runButton: "Run",
    outputTitle: "Output",
    error: "Error",
  },
  pt: {
    title: "Compilador Simples",
    languageLabel: "Linguagem",
    runButton: "Executar",
    outputTitle: "Saída",
    error: "Erro",
  },
};

function setLang(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) el.textContent = i18n[lang][key];
  });
}

function loadLangFromPref() {
  const stored = localStorage.getItem('lang') || navigator.language.slice(0,2);
  const lang = stored.startsWith('pt') ? 'pt' : 'en';
  document.getElementById('lang-select').value = lang;
  setLang(lang);
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

function loadThemeFromPref() {
  const stored = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', stored);
}

async function runCode() {
  const code = document.getElementById('code').value;
  const language = document.getElementById('language').value;
  const resultEl = document.getElementById('result');
  resultEl.textContent = '';
  try {
    const resp = await fetch('http://localhost:5000/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });
    const data = await resp.json();
    if (data.error) {
      resultEl.textContent = i18n[document.getElementById('lang-select').value].error + ': ' + data.error;
    } else {
      resultEl.textContent = data.output;
    }
  } catch (e) {
    resultEl.textContent = 'Network error: ' + e;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadThemeFromPref();
  loadLangFromPref();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('lang-select').addEventListener('change', (e) => {
    const lang = e.target.value;
    localStorage.setItem('lang', lang);
    setLang(lang);
  });
  document.getElementById('run').addEventListener('click', runCode);
});
