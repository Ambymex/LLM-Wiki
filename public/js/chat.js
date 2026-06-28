/* ═══════════════════════════════════════════════════════════════════════════════
   LLM Wiki — Chat Interface (chat.js)
   Message rendering, streaming, markdown, FAB, wiki links, progress cards
   ═══════════════════════════════════════════════════════════════════════════════ */

const Chat = (() => {
  // ─── DOM References (set in init) ───
  let messagesContainer, chatInput, btnSend;
  let fabToggle, fabMenu, fabIngestUrl, fabQuickNote, fabLint, fabIngestFile, ingestFileInput;

  // ─── State ───
  let isStreaming = false;
  let streamingBubble = null;
  let streamedText = '';
  let userHasScrolledUp = false;
  let progressCards = {};

  // ─── Configure marked.js ───
  function configureMarked() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
      });
    }
  }

  // ─── Initialize ───
  function init() {
    messagesContainer = document.getElementById('chat-messages');
    chatInput         = document.getElementById('chat-input');
    btnSend           = document.getElementById('btn-send');
    fabToggle         = document.getElementById('fab-toggle');
    fabMenu           = document.getElementById('fab-menu');
    fabIngestUrl      = document.getElementById('fab-ingest-url');
    fabQuickNote      = document.getElementById('fab-quick-note');
    fabLint           = document.getElementById('fab-lint');
    fabIngestFile     = document.getElementById('fab-ingest-file');
    ingestFileInput   = document.getElementById('ingest-file-input');

    configureMarked();
    setupInputHandlers();
    setupFAB();
    setupScrollDetection();
    registerMessageHandlers();
    addWelcomeMessage();
  }

  // ═══════════════════════════════════════════════════════════════
  // Input Handling
  // ═══════════════════════════════════════════════════════════════
  function setupInputHandlers() {
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      btnSend.disabled = chatInput.value.trim().length === 0;
    });

    // Send on Ctrl+Enter (Enter inserts newline)
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        sendUserMessage();
      }
    });

    // Send button
    btnSend.addEventListener('click', () => {
      sendUserMessage();
    });
  }

  function sendUserMessage() {
    const text = chatInput.value.trim();
    if (!text || isStreaming) return;

    // Add user bubble
    addMessage('user', text);

    // Send over WebSocket
    App.sendMessage({ type: 'chat', message: text });

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    btnSend.disabled = true;

    // Show thinking indicator
    showThinking();
  }

  // ═══════════════════════════════════════════════════════════════
  // Message Rendering
  // ═══════════════════════════════════════════════════════════════
  function addMessage(role, content, options = {}) {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;

    if (options.isError) {
      msgEl.classList.add('error');
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (role === 'bot') {
      bubble.innerHTML = renderMarkdown(content);
      processWikiLinks(bubble);
    } else {
      bubble.textContent = content;
    }

    if (options.delay) {
      msgEl.style.animationDelay = options.delay + 'ms';
    }
    if (options.skipAnimation) {
      msgEl.style.animation = 'none';
    }

    msgEl.appendChild(bubble);
    messagesContainer.appendChild(msgEl);
    autoScroll();
    return bubble;
  }

  function renderMarkdown(text) {
    if (typeof marked !== 'undefined' && text) {
      try {
        return marked.parse(text);
      } catch (e) {
        console.warn('[Chat] Markdown parse error:', e);
        return escapeHtml(text);
      }
    }
    return escapeHtml(text || '');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Wiki Link Detection & Rendering ───
  function processWikiLinks(element) {
    // Find [[Page Title]] patterns in the rendered HTML and make them clickable
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes('[[')) {
        textNodes.push(node);
      }
    }

    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const regex = /\[\[([^\]]+)\]\]/g;
      let match;
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let hasMatch = false;

      while ((match = regex.exec(text)) !== null) {
        hasMatch = true;
        // Add text before the match
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        // Create wiki link
        const link = document.createElement('a');
        link.className = 'wiki-link';
        link.textContent = match[1];
        link.dataset.slug = match[1].toLowerCase().replace(/\s+/g, '-');
        link.addEventListener('click', (e) => {
          e.preventDefault();
          openWikiPage(link.dataset.slug);
        });
        fragment.appendChild(link);

        lastIndex = match.index + match[0].length;
      }

      if (hasMatch) {
        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });
  }

  function openWikiPage(slug) {
    App.switchView('wiki');
    // Notify wiki browser to open this page
    const event = new CustomEvent('openwikipage', { detail: { slug } });
    document.dispatchEvent(event);
  }

  // ═══════════════════════════════════════════════════════════════
  // Streaming
  // ═══════════════════════════════════════════════════════════════
  function handleStreamStart() {
    isStreaming = true;
    streamedText = '';
    hideThinking();

    // Create bot message container
    const msgEl = document.createElement('div');
    msgEl.className = 'message bot';
    msgEl.style.animation = 'none'; // Animate once finalized

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = '<span class="stream-cursor">▊</span>';

    msgEl.appendChild(bubble);
    messagesContainer.appendChild(msgEl);
    streamingBubble = bubble;

    // Trigger animation
    requestAnimationFrame(() => {
      msgEl.style.animation = '';
    });

    autoScroll();
  }

  function handleStreamToken(data) {
    if (!streamingBubble) return;
    streamedText += data.token;
    // Render current streamed text as markdown
    streamingBubble.innerHTML = renderMarkdown(streamedText) + '<span class="stream-cursor" style="opacity:0.6;font-size:0.85em;animation:typing-bounce 0.8s ease-in-out infinite">▊</span>';
    autoScroll();
  }

  function handleStreamEnd(data) {
    if (!streamingBubble) return;
    const finalText = data.fullMessage || streamedText;
    streamingBubble.innerHTML = renderMarkdown(finalText);
    processWikiLinks(streamingBubble);
    streamingBubble = null;
    streamedText = '';
    isStreaming = false;
    autoScroll();
  }

  // ═══════════════════════════════════════════════════════════════
  // Thinking Indicator
  // ═══════════════════════════════════════════════════════════════
  function showThinking() {
    hideThinking(); // Remove any existing
    const el = document.createElement('div');
    el.className = 'message bot';
    el.id = 'thinking-indicator';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    bubble.style.display = 'flex';
    bubble.style.alignItems = 'center';
    bubble.style.gap = '5px';
    bubble.style.padding = '14px 20px';

    el.appendChild(bubble);
    messagesContainer.appendChild(el);
    autoScroll();
  }

  function hideThinking() {
    const el = document.getElementById('thinking-indicator');
    if (el) el.remove();
  }

  // ═══════════════════════════════════════════════════════════════
  // Special Cards
  // ═══════════════════════════════════════════════════════════════
  function showWikiUpdateCard(data) {
    const pages = data.pages || [];
    if (pages.length === 0) return;

    const card = document.createElement('div');
    card.className = 'chat-card wiki-update';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.innerHTML = `📚 Updated ${pages.length} wiki page${pages.length > 1 ? 's' : ''}`;
    card.appendChild(title);

    const pageContainer = document.createElement('div');
    pageContainer.className = 'card-pages';

    pages.forEach(slug => {
      const link = document.createElement('a');
      link.className = 'card-page-link';
      link.textContent = slug.replace(/-/g, ' ');
      link.addEventListener('click', () => openWikiPage(slug));
      pageContainer.appendChild(link);
    });

    card.appendChild(pageContainer);
    messagesContainer.appendChild(card);
    autoScroll();

    App.showToast(`📚 Wiki updated! ${pages.length} page${pages.length > 1 ? 's' : ''} changed`);
  }

  function showIngestProgress(data) {
    const key = 'ingest-progress';
    let card = progressCards[key];

    if (!card) {
      card = document.createElement('div');
      card.className = 'chat-card ingest-progress';
      card.innerHTML = `
        <div class="card-title">⏳ Ingesting content…</div>
        <div class="progress-step"></div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill"></div>
        </div>
      `;
      messagesContainer.appendChild(card);
      progressCards[key] = card;
    }

    const stepEl = card.querySelector('.progress-step');
    const fillEl = card.querySelector('.progress-bar-fill');
    const titleEl = card.querySelector('.card-title');

    stepEl.textContent = data.step || 'Processing…';

    if (data.total && data.total > 0) {
      const pct = Math.round((data.current / data.total) * 100);
      fillEl.style.width = pct + '%';
    }

    // Mark complete if this is the last step
    if (data.current >= data.total && data.total > 0) {
      titleEl.innerHTML = '✅ Ingestion complete';
      card.style.borderLeftColor = 'var(--success)';
      // Clean up reference after a delay
      setTimeout(() => {
        delete progressCards[key];
      }, 2000);
    }

    autoScroll();
  }

  function showErrorMessage(data) {
    addMessage('bot', `⚠️ ${data.message || 'An error occurred.'}`, { isError: true });
  }

  // ═══════════════════════════════════════════════════════════════
  // Scroll Management
  // ═══════════════════════════════════════════════════════════════
  function setupScrollDetection() {
    messagesContainer.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      // User is "scrolled up" if they're more than 100px from the bottom
      userHasScrolledUp = (scrollHeight - scrollTop - clientHeight) > 100;
    });
  }

  function autoScroll() {
    if (!userHasScrolledUp) {
      requestAnimationFrame(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FAB Menu
  // ═══════════════════════════════════════════════════════════════
  function setupFAB() {
    fabToggle.addEventListener('click', () => {
      const isOpen = fabToggle.classList.toggle('open');
      fabMenu.classList.toggle('open', isOpen);
    });

    // Close FAB when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.fab-container')) {
        fabToggle.classList.remove('open');
        fabMenu.classList.remove('open');
      }
    });

    fabIngestUrl.addEventListener('click', () => {
      closeFAB();
      Ingest.openUrlSheet();
    });

    fabQuickNote.addEventListener('click', () => {
      closeFAB();
      Ingest.openNoteSheet();
    });

    fabLint.addEventListener('click', () => {
      closeFAB();
      runLint();
    });

    if (fabIngestFile && ingestFileInput) {
      fabIngestFile.addEventListener('click', () => {
        closeFAB();
        ingestFileInput.click();
      });

      ingestFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Visual feedback in chat
        addMessage('user', `📄 Uploading file: ${file.name} (${Math.round(file.size / 1024)} KB)`);
        showThinking();
        App.showToast('Uploading file...');

        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch('/api/ingest/file', {
            method: 'POST',
            body: formData
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          
          if (data.fullResponse) {
            addMessage('bot', data.fullResponse);
          }
          if (data.pages && data.pages.length > 0 && typeof window.WikiBrowser !== 'undefined') {
            window.WikiBrowser.loadIndex();
          }
          
          App.showToast('File processed successfully!');
        } catch (err) {
          console.error('[Upload]', err);
          App.showToast('Upload failed: ' + err.message);
          addMessage('bot', `❌ Upload failed: ${err.message}`);
        } finally {
          hideThinking();
          showIngestProgress({ step: 'Done!', current: 3, total: 3 });
          ingestFileInput.value = ''; // Reset input
        }
      });
    }
  }

  function closeFAB() {
    fabToggle.classList.remove('open');
    fabMenu.classList.remove('open');
  }

  function runLint() {
    addMessage('user', '🩺 Run wiki lint check');
    App.sendMessage({ type: 'lint' });
    showThinking();
  }

  // ═══════════════════════════════════════════════════════════════
  // Welcome Message
  // ═══════════════════════════════════════════════════════════════
  function addWelcomeMessage() {
    const welcome = `👋 **Welcome to your LLM Wiki!**

Send me a URL to ingest, ask a question, or paste some notes. I'll build a rich, interconnected knowledge base for you.

Here's what you can do:
- 🔗 **Ingest a URL** — tap the + button
- 📝 **Add notes** — paste text to process
- 🩺 **Lint your wiki** — check for issues
- 💬 **Ask questions** — about anything in your wiki`;
    addMessage('bot', welcome, { delay: 300 });
  }

  // ═══════════════════════════════════════════════════════════════
  // Register WebSocket Handlers
  // ═══════════════════════════════════════════════════════════════
  function handleChatHistory(data) {
    if (!data.history || !Array.isArray(data.history)) return;
    
    // Clear the chat (except the first welcome message if it exists, but the easiest is just clearing everything and re-adding welcome)
    messagesContainer.innerHTML = '';
    addWelcomeMessage();
    
    // Render the history array
    data.history.forEach(msg => {
      addMessage(msg.role, msg.content, { skipAnimation: true });
    });
    autoScroll();
  }

  function registerMessageHandlers() {
    App.onMessage('chat_history', handleChatHistory);
    App.onMessage('stream_start', handleStreamStart);
    App.onMessage('stream_token', handleStreamToken);
    App.onMessage('stream_end', handleStreamEnd);
    App.onMessage('wiki_updated', showWikiUpdateCard);
    App.onMessage('ingest_progress', showIngestProgress);
    App.onMessage('error', showErrorMessage);

    // Handle lint responses that come as chat responses
    App.onMessage('status', (data) => {
      // Status updates are handled by settings, but we don't interfere
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════
  return {
    init,
    addMessage,
    showThinking,
    hideThinking,
    autoScroll
  };
})();

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Chat.init();
});
