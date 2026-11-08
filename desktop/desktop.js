// desktop.js — Spellcheck UI for Simple Compiler Desktop
// Injected into the frontend when running as a desktop app.
// Adds a spellcheck button, runs spellcheck via local /api/spellcheck endpoint,
// and shows misspelled words with suggestions.

(function () {
  'use strict';

  const SPELLCHECK_API = '/api/spellcheck';
  const LANGUAGE_MAP = {
    python: 'en',
    javascript: 'en',
    typescript: 'en',
    c: 'en',
    cpp: 'en',
    csharp: 'en',
    java: 'en',
    go: 'en',
    lua: 'en',
    r: 'en',
    sql: 'en',
    lean: 'en',
    latex: 'en',
    htmlcss: 'en',
  };

  let spellcheckEnabled = false;
  let spellcheckButton = null;
  let spellcheckPanel = null;
  let debounceTimer = null;

  // Add spellcheck button to the header controls
  function addSpellcheckButton() {
    const controls = document.querySelector('.shell-controls');
    if (!controls || spellcheckButton) return;

    spellcheckButton = document.createElement('button');
    spellcheckButton.id = 'spellcheck-toggle';
    spellcheckButton.className = 'shell-btn shell-btn-icon';
    spellcheckButton.title = 'Spell check';
    spellcheckButton.textContent = 'ABC';
    spellcheckButton.style.background = 'transparent';
    spellcheckButton.style.border = '1px solid var(--border)';
    spellcheckButton.style.color = 'var(--text)';
    spellcheckButton.style.width = '2.5rem';
    spellcheckButton.style.height = '2.5rem';
    spellcheckButton.style.display = 'inline-flex';
    spellcheckButton.style.alignItems = 'center';
    spellcheckButton.style.justifyContent = 'center';
    spellcheckButton.style.fontSize = '1rem';

    spellcheckButton.addEventListener('click', toggleSpellcheck);
    controls.appendChild(spellcheckButton);

    addSpellcheckStyles();
  }

  function addSpellcheckStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #spellcheck-toggle.active {
        background: var(--accent-red);
        color: #ffffff;
        border-color: var(--accent-red);
      }
      .spellcheck-panel {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--surface);
        border: 1px solid var(--border);
        border-top: none;
        border-radius: 0 0 6px 6px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4);
        z-index: 100;
        max-height: 300px;
        overflow-y: auto;
        font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        font-size: 0.875rem;
      }
      .spellcheck-item {
        display: flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        transition: background 0.2s;
      }
      .spellcheck-item:last-child { border-bottom: none; }
      .spellcheck-item:hover { background: rgba(255,0,0,0.05); }
      .spellcheck-word {
        flex: 1;
        color: var(--text);
        font-weight: 600;
      }
      .spellcheck-suggestions {
        color: var(--text-muted);
        font-size: 0.75rem;
      }
      .spellcheck-suggestions span {
        margin-right: 0.5rem;
        cursor: pointer;
        color: var(--accent-red);
        text-decoration: underline;
      }
      .spellcheck-suggestions span:hover { color: var(--accent-red-hover); }
      .spellcheck-header {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--border);
        font-weight: 600;
        color: var(--text-muted);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    `;
    document.head.appendChild(style);
  }

  function addSpellcheckPanel() {
    if (spellcheckPanel) return;
    spellcheckPanel = document.createElement('div');
    spellcheckPanel.id = 'spellcheck-panel';
    spellcheckPanel.className = 'spellcheck-panel';
    spellcheckPanel.style.display = 'none';
    document.body.appendChild(spellcheckPanel);
  }

  function toggleSpellcheck() {
    spellcheckEnabled = !spellcheckEnabled;
    spellcheckButton.classList.toggle('active', spellcheckEnabled);
    if (spellcheckEnabled) {
      runSpellcheck();
    } else {
      hidePanel();
    }
  }

  function hidePanel() {
    if (spellcheckPanel) spellcheckPanel.style.display = 'none';
  }

  function runSpellcheck() {
    const codeEl = document.getElementById('code');
    if (!codeEl) return;
    const code = (codeEl.innerText !== undefined ? codeEl.innerText : codeEl.textContent) || codeEl.value || '';
    const language = document.getElementById('language')?.value || 'python';
    const langCode = LANGUAGE_MAP[language] || 'en';

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetch(SPELLCHECK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: code, language: langCode }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.misspelled && data.misspelled.length > 0) {
            showPanel(data.misspelled);
          } else {
            showPanel([]);
          }
        })
        .catch(() => {
          showPanel([]);
        });
    }, 800);
  }

  function showPanel(misspelled) {
    addSpellcheckPanel();
    spellcheckPanel.style.display = 'block';

    const header = document.createElement('div');
    header.className = 'spellcheck-header';
    header.textContent = misspelled.length === 0
      ? 'No spelling errors found'
      : `${misspelled.length} spelling error(s)`;
    spellcheckPanel.innerHTML = '';
    spellcheckPanel.appendChild(header);

    const codeEl = document.getElementById('code');
    misspelled.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'spellcheck-item';

      const wordSpan = document.createElement('span');
      wordSpan.className = 'spellcheck-word';
      wordSpan.textContent = item.word;

      const suggestionsSpan = document.createElement('span');
      suggestionsSpan.className = 'spellcheck-suggestions';
      if (item.suggestions && item.suggestions.length > 0) {
        item.suggestions.forEach((sugg, i) => {
          const s = document.createElement('span');
          s.textContent = sugg;
          s.addEventListener('click', (e) => {
            e.stopPropagation();
            replaceWord(item.word, sugg);
          });
          suggestionsSpan.appendChild(s);
          if (i < item.suggestions.length - 1) {
            const sep = document.createTextNode(', ');
            suggestionsSpan.appendChild(sep);
          }
        });
      } else {
        suggestionsSpan.textContent = '(no suggestions)';
      }

      row.appendChild(wordSpan);
      row.appendChild(suggestionsSpan);
      spellcheckPanel.appendChild(row);
    });
  }

  function replaceWord(oldWord, newWord) {
    const codeEl = document.getElementById('code');
    if (!codeEl) return;
    const text = (codeEl.innerText !== undefined ? codeEl.innerText : codeEl.textContent) || codeEl.value || '';
    const regex = new RegExp(`\\b${escapeRegExp(oldWord)}\\b`, 'g');
    const newText = text.replace(regex, newWord);
    codeEl.innerText = newText;
    if (codeEl.dispatchEvent) {
      codeEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    runSpellcheck();
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSpellcheckButton);
  } else {
    addSpellcheckButton();
  }
})();
