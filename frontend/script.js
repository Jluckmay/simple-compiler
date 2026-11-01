// script.js
const i18n = {
  en: {
    title: "Simple Compiler",
    languageLabel: "Language",
    runButton: "Run",
    outputTitle: "Output",
    error: "Error",
    placeholder: "Write your code here...",
  },
  pt: {
    title: "Compilador Simples",
    languageLabel: "Linguagem",
    runButton: "Executar",
    outputTitle: "Saída",
    error: "Erro",
    placeholder: "Escreva seu código aqui...",
  },
};

function setLang(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) el.textContent = i18n[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[lang][key]) el.placeholder = i18n[lang][key];
  });
}

function loadLangFromPref() {
  const stored = localStorage.getItem('lang') || navigator.language.slice(0,2);
  const lang = stored.startsWith('pt') ? 'pt' : 'en';
  document.getElementById('lang-toggle').textContent = lang === 'pt' ? 'PT' : 'EN';
  setLang(lang);
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon();
}

function loadThemeFromPref() {
  const stored = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', stored);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle');
  const theme = document.documentElement.getAttribute('data-theme');
  btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleLang() {
  const btn = document.getElementById('lang-toggle');
  const current = btn.textContent.trim();
  const next = current === 'EN' ? 'PT' : 'EN';
  btn.textContent = next;
  const lang = next === 'PT' ? 'pt' : 'en';
  localStorage.setItem('lang', lang);
  setLang(lang);
}

function handleCodeKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    // Insert 2 spaces at cursor
    const value = textarea.value;
    textarea.value = value.substring(0, start) + '  ' + value.substring(end);
    // Move cursor after inserted spaces
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  }
}

function getApiUrl() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000/compile';
  }
  return 'https://simple-compiler-ldj7.onrender.com/compile';
}

async function runCode() {
  const code = document.getElementById('code').value;
  const language = document.getElementById('language').value;
  const resultEl = document.getElementById('result');
  resultEl.textContent = '';
  try {
    const resp = await fetch(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });
    const data = await resp.json();
    if (data.error) {
      resultEl.textContent = i18n[document.getElementById('lang-toggle').textContent.trim() === 'PT' ? 'pt' : 'en'].error + ': ' + data.error;
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
  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  document.getElementById('code').addEventListener('keydown', handleCodeKeydown);
  document.getElementById('run').addEventListener('click', runCode);
});
