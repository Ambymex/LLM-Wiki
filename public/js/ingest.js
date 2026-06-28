/* ═══════════════════════════════════════════════════════════════════════════════
   LLM Wiki — Ingestion Modals / Bottom Sheets (ingest.js)
   URL ingestion, quick note, sheet animations, swipe-to-dismiss
   ═══════════════════════════════════════════════════════════════════════════════ */

const Ingest = (() => {
  // ─── DOM (set in init) ───
  let backdrop, urlSheet, noteSheet, urlInput, btnIngestUrl;
  let noteTitleInput, noteContent, btnSaveNote;

  // ─── State ───
  let activeSheet = null;
  let touchStartY = 0;
  let touchDeltaY = 0;
  let isDragging = false;

  // ─── Initialize ───
  function init() {
    backdrop       = document.getElementById('sheet-backdrop');
    urlSheet       = document.getElementById('sheet-ingest-url');
    noteSheet      = document.getElementById('sheet-quick-note');
    urlInput       = document.getElementById('ingest-url-input');
    btnIngestUrl   = document.getElementById('btn-ingest-url');
    noteTitleInput = document.getElementById('note-title-input');
    noteContent    = document.getElementById('note-content-input');
    btnSaveNote    = document.getElementById('btn-save-note');

    setupBackdrop();
    setupUrlSheet();
    setupNoteSheet();
    setupSwipeToDismiss();
    setupSettings();
  }

  // ═══════════════════════════════════════════════════════════════
  // Sheet Open / Close
  // ═══════════════════════════════════════════════════════════════
  function openSheet(sheet) {
    activeSheet = sheet;
    backdrop.classList.add('visible');
    sheet.classList.add('open');
    // Focus first input after animation
    setTimeout(() => {
      const firstInput = sheet.querySelector('input, textarea');
      if (firstInput) firstInput.focus();
    }, 350);
  }

  function closeSheet() {
    if (!activeSheet) return;
    backdrop.classList.remove('visible');
    activeSheet.classList.remove('open');
    activeSheet.style.transform = '';
    activeSheet = null;
  }

  function openUrlSheet() {
    urlInput.value = '';
    openSheet(urlSheet);
  }

  function openNoteSheet() {
    noteTitleInput.value = '';
    noteContent.value = '';
    noteContent.style.height = 'auto';
    openSheet(noteSheet);
  }

  // ═══════════════════════════════════════════════════════════════
  // Backdrop
  // ═══════════════════════════════════════════════════════════════
  function setupBackdrop() {
    backdrop.addEventListener('click', () => {
      closeSheet();
    });

    // Also close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeSheet) {
        closeSheet();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // URL Ingestion
  // ═══════════════════════════════════════════════════════════════
  function setupUrlSheet() {
    btnIngestUrl.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) {
        App.showToast('Please enter a URL');
        urlInput.focus();
        return;
      }

      // Basic URL validation
      if (!isValidUrl(url)) {
        App.showToast('Please enter a valid URL');
        urlInput.focus();
        return;
      }

      // Send ingest command
      const sent = App.sendMessage({ type: 'ingest_url', url: url });
      if (sent) {
        closeSheet();
        Chat.addMessage('user', `🔗 Ingest: ${url}`);
        Chat.showThinking();
        App.showToast('Ingesting URL…');
      }
    });

    // Submit on Enter
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnIngestUrl.click();
      }
    });
  }

  function isValidUrl(str) {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Quick Note
  // ═══════════════════════════════════════════════════════════════
  function setupNoteSheet() {
    btnSaveNote.addEventListener('click', () => {
      const title = noteTitleInput.value.trim();
      const content = noteContent.value.trim();

      if (!content) {
        App.showToast('Please enter some content');
        noteContent.focus();
        return;
      }

      const noteTitle = title || 'Untitled Note';

      // Send ingest command
      const sent = App.sendMessage({
        type: 'ingest_text',
        title: noteTitle,
        content: content
      });

      if (sent) {
        closeSheet();
        // Show a brief preview of the note in chat
        const preview = content.length > 80 ? content.substring(0, 80) + '…' : content;
        Chat.addMessage('user', `📝 ${noteTitle}\n\n${preview}`);
        Chat.showThinking();
        App.showToast('Processing note…');
      }
    });

    // Auto-grow textarea
    noteContent.addEventListener('input', () => {
      noteContent.style.height = 'auto';
      noteContent.style.height = Math.min(noteContent.scrollHeight, 240) + 'px';
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Swipe to Dismiss
  // ═══════════════════════════════════════════════════════════════
  function setupSwipeToDismiss() {
    const sheets = [urlSheet, noteSheet];

    sheets.forEach(sheet => {
      const handle = sheet.querySelector('.sheet-handle');

      handle.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        isDragging = true;
        sheet.style.transition = 'none';
      }, { passive: true });

      handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        touchDeltaY = e.touches[0].clientY - touchStartY;
        if (touchDeltaY > 0) {
          sheet.style.transform = `translateY(${touchDeltaY}px)`;
        }
      }, { passive: true });

      handle.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = '';

        if (touchDeltaY > 100) {
          closeSheet();
        } else {
          sheet.style.transform = '';
        }
        touchDeltaY = 0;
      }, { passive: true });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Settings — Model Selector & Status
  // ═══════════════════════════════════════════════════════════════
  function setupSettings() {
    const modelSelector = document.getElementById('model-selector');
    const statPages     = document.getElementById('stat-pages');
    const statSources   = document.getElementById('stat-sources');
    const statModel     = document.getElementById('stat-model');

    // Model change
    modelSelector.addEventListener('change', () => {
      const model = modelSelector.value;
      App.sendMessage({ type: 'set_model', model: model });
      App.showToast(`Model changed to ${getModelDisplayName(model)}`);
    });

    // Helper to rebuild dropdown
    function updateModelSelector(selectEl, models, currentModel) {
      if (!models || !models.length) return;
      selectEl.innerHTML = '';
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        if (m.id === currentModel) opt.selected = true;
        selectEl.appendChild(opt);
      });
    }

    // Handle status updates
    App.onMessage('status', (data) => {
      if (data.models) {
        updateModelSelector(modelSelector, data.models, data.model);
      }
      if (data.model) {
        statModel.textContent = getModelDisplayName(data.model);
        modelSelector.value = data.model;
      }
      if (typeof data.wikiPageCount !== 'undefined') {
        statPages.textContent = data.wikiPageCount;
      }
      if (typeof data.sourceCount !== 'undefined') {
        statSources.textContent = data.sourceCount;
      }
    });

    // Also fetch status via REST on boot
    fetchStatusREST(statPages, statSources, statModel, modelSelector, updateModelSelector);
  }

  async function fetchStatusREST(statPages, statSources, statModel, modelSelector, updateModelSelector) {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) return;
      const data = await response.json();

      if (data.models) {
        updateModelSelector(modelSelector, data.models, data.model);
      }
      if (data.model) {
        statModel.textContent = getModelDisplayName(data.model);
        modelSelector.value = data.model;
      }
      if (typeof data.wikiPageCount !== 'undefined') {
        statPages.textContent = data.wikiPageCount;
      }
      if (typeof data.sourceCount !== 'undefined') {
        statSources.textContent = data.sourceCount;
      }
    } catch (e) {
      console.log('[Ingest] Could not fetch REST status:', e);
    }
  }

  function getModelDisplayName(modelId) {
    if (!modelId) return '—';
    // Take last part and clean up
    const parts = modelId.split('/');
    const name = parts[parts.length - 1];
    return name
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════
  return {
    init,
    openUrlSheet,
    openNoteSheet,
    closeSheet
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  Ingest.init();
});
