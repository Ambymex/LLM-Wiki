/* ═══════════════════════════════════════════════════════════════════════════════
   LLM Wiki — Wiki Browser (wiki-browser.js)
   Page list, search, filtering, detail view, navigation stack
   ═══════════════════════════════════════════════════════════════════════════════ */

const WikiBrowser = (() => {
  // ─── DOM (set in init) ───
  let listView, detailView, pageList, searchInput, refreshBtn, filterTabs, emptyState, loadingEl;
  let backBtn, deleteBtn, detailContent;

  // ─── State ───
  let allPages = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let navStack = [];
  let isLoading = false;
  let searchDebounceTimer = null;

  // ─── Initialize ───
  function init() {
    listView      = document.getElementById('wiki-list-view');
    detailView    = document.getElementById('wiki-detail-view');
    pageList      = document.getElementById('wiki-page-list');
    emptyState    = document.getElementById('wiki-empty-state');
    loadingEl     = document.getElementById('wiki-loading');
    searchInput   = document.getElementById('wiki-search-input');
    refreshBtn    = document.getElementById('wiki-refresh-btn');
    filterTabs    = document.getElementById('wiki-filter-tabs');
    backBtn       = document.getElementById('wiki-back-btn');
    deleteBtn     = document.getElementById('wiki-delete-btn');
    detailContent = document.getElementById('wiki-detail-content');

    setupEventListeners();
    registerMessageHandlers();
  }

  // ═══════════════════════════════════════════════════════════════
  // Event Listeners
  // ═══════════════════════════════════════════════════════════════
  function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        if (searchQuery.length > 0) {
          searchPages(searchQuery);
        } else {
          renderPageList(filterPages());
        }
      }, 300);
    });

    // Refresh button
    refreshBtn.addEventListener('click', () => {
      fetchPages();
    });

    // Filter tabs
    filterTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.filter-tab');
      if (!tab) return;

      filterTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderPageList(filterPages());
    });

    // Back button
    backBtn.addEventListener('click', () => {
      goBack();
    });

    // Delete button
    deleteBtn.addEventListener('click', async () => {
      const currentSlug = navStack[navStack.length - 1];
      if (!currentSlug) return;
      
      if (!confirm(`Are you sure you want to delete "${currentSlug}"?`)) {
        return;
      }

      try {
        const response = await fetch(`/api/wiki/pages/${encodeURIComponent(currentSlug)}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        App.showToast('Page deleted');
        
        // Remove from local cache
        allPages = allPages.filter(p => p.slug !== currentSlug);
        
        // Go back and refresh list
        goBack();
        renderPageList(filterPages());
      } catch (err) {
        console.error('Delete failed:', err);
        App.showToast('Failed to delete page');
      }
    });

    // Listen for view change to load pages when wiki tab is opened
    document.addEventListener('viewchange', (e) => {
      if (e.detail.view === 'wiki' && allPages.length === 0) {
        fetchPages();
      }
    });

    // Listen for direct page open requests (from chat wiki links)
    document.addEventListener('openwikipage', (e) => {
      const slug = e.detail.slug;
      openPage(slug);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Data Fetching
  // ═══════════════════════════════════════════════════════════════
  async function fetchPages() {
    if (isLoading) return;
    isLoading = true;

    showLoading();
    refreshBtn.classList.add('spinning');

    try {
      const response = await fetch('/api/wiki/pages');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      allPages = await response.json();
      renderPageList(filterPages());
    } catch (e) {
      console.error('[Wiki] Failed to fetch pages:', e);
      App.showToast('Failed to load wiki pages');
      showEmpty();
    } finally {
      isLoading = false;
      hideLoading();
      refreshBtn.classList.remove('spinning');
    }
  }

  async function fetchPageDetail(slug) {
    try {
      const response = await fetch(`/api/wiki/pages/${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error('[Wiki] Failed to fetch page:', slug, e);
      App.showToast('Failed to load page');
      return null;
    }
  }

  async function searchPages(query) {
    try {
      const response = await fetch(`/api/wiki/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const results = await response.json();
      renderPageList(results);
    } catch (e) {
      console.error('[Wiki] Search failed:', e);
      // Fallback to client-side filter
      const filtered = allPages.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(query.toLowerCase()))
      );
      renderPageList(filtered);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Filtering
  // ═══════════════════════════════════════════════════════════════
  function filterPages() {
    if (currentFilter === 'all') return allPages;
    return allPages.filter(p => p.type === currentFilter);
  }

  // ═══════════════════════════════════════════════════════════════
  // Rendering — Page List
  // ═══════════════════════════════════════════════════════════════
  function renderPageList(pages) {
    pageList.innerHTML = '';

    if (pages.length === 0) {
      showEmpty();
      return;
    }

    emptyState.classList.add('hidden');

    pages.forEach((page, index) => {
      const card = createPageCard(page, index);
      pageList.appendChild(card);
    });
  }

  function createPageCard(page, index) {
    const card = document.createElement('div');
    card.className = 'wiki-page-card';
    card.style.animationDelay = `${index * 40}ms`;

    // Top row: title + badge
    const top = document.createElement('div');
    top.className = 'page-card-top';

    const title = document.createElement('div');
    title.className = 'page-card-title';
    title.textContent = page.title || page.slug;
    top.appendChild(title);

    if (page.type) {
      const badge = document.createElement('span');
      badge.className = `page-type-badge badge-${page.type}`;
      badge.textContent = page.type;
      top.appendChild(badge);
    }

    card.appendChild(top);

    // Excerpt
    if (page.excerpt) {
      const excerpt = document.createElement('div');
      excerpt.className = 'page-card-excerpt';
      excerpt.textContent = page.excerpt;
      card.appendChild(excerpt);
    }

    // Tags
    if (page.tags && page.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'page-card-tags';
      page.tags.slice(0, 4).forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'page-tag';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });
      card.appendChild(tagsContainer);
    }

    // Meta
    const meta = document.createElement('div');
    meta.className = 'page-card-meta';
    if (page.updated) {
      meta.textContent = formatDate(page.updated);
    }
    card.appendChild(meta);

    // Click to open
    card.addEventListener('click', () => {
      openPage(page.slug);
    });

    return card;
  }

  // ═══════════════════════════════════════════════════════════════
  // Rendering — Page Detail
  // ═══════════════════════════════════════════════════════════════
  async function openPage(slug) {
    // Push to nav stack
    navStack.push(slug);

    // Show loading state
    detailContent.innerHTML = '<div style="display:flex;justify-content:center;padding:40px"><div class="spinner"></div></div>';
    showDetailView();

    const page = await fetchPageDetail(slug);
    if (!page) {
      detailContent.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary)">Page not found</div>';
      return;
    }

    renderPageDetail(page);
  }

  function renderPageDetail(page) {
    let html = '';

    // Title
    html += `<h1 class="detail-title">${escapeHtml(page.title || page.slug)}</h1>`;

    // Meta row
    html += '<div class="detail-meta">';
    if (page.type) {
      html += `<span class="page-type-badge badge-${page.type}">${page.type}</span>`;
    }
    if (page.tags && page.tags.length > 0) {
      page.tags.forEach(tag => {
        html += `<span class="page-tag">${escapeHtml(tag)}</span>`;
      });
    }
    if (page.updated) {
      html += `<span class="detail-updated">${formatDate(page.updated)}</span>`;
    }
    html += '</div>';

    // Body content
    if (page.html) {
      html += `<div class="wiki-body">${page.html}</div>`;
    } else if (page.raw) {
      html += `<div class="wiki-body">${renderMarkdown(page.raw)}</div>`;
    } else {
      html += '<div class="wiki-body"><p style="color:var(--text-secondary)">This page has no content yet.</p></div>';
    }

    detailContent.innerHTML = html;

    // Process wiki links in the rendered content
    processDetailWikiLinks(detailContent);
  }

  function processDetailWikiLinks(container) {
    const body = container.querySelector('.wiki-body');
    if (!body) return;

    // Find [[Page Title]] patterns
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
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
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        const link = document.createElement('a');
        link.className = 'wiki-link';
        link.textContent = match[1];
        const slug = match[1].toLowerCase().replace(/\s+/g, '-');
        link.addEventListener('click', (e) => {
          e.preventDefault();
          openPage(slug);
        });
        fragment.appendChild(link);

        lastIndex = match.index + match[0].length;
      }

      if (hasMatch) {
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Navigation
  // ═══════════════════════════════════════════════════════════════
  function showDetailView() {
    listView.classList.remove('active');
    detailView.classList.add('active');
  }

  function showListView() {
    detailView.classList.remove('active');
    listView.classList.add('active');
  }

  function goBack() {
    navStack.pop(); // Remove current page

    if (navStack.length > 0) {
      // Go to previous page in stack
      const prevSlug = navStack.pop(); // Pop again since openPage will push it
      openPage(prevSlug);
    } else {
      showListView();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Loading & Empty States
  // ═══════════════════════════════════════════════════════════════
  function showLoading() {
    loadingEl.classList.remove('hidden');
    emptyState.classList.add('hidden');
    pageList.innerHTML = '';
  }

  function hideLoading() {
    loadingEl.classList.add('hidden');
  }

  function showEmpty() {
    emptyState.classList.remove('hidden');
    pageList.innerHTML = '';
  }

  // ═══════════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════════
  function formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return dateStr;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderMarkdown(text) {
    if (typeof marked !== 'undefined' && text) {
      try {
        return marked.parse(text);
      } catch {
        return escapeHtml(text);
      }
    }
    return escapeHtml(text || '');
  }

  // ═══════════════════════════════════════════════════════════════
  // WebSocket Handlers
  // ═══════════════════════════════════════════════════════════════
  function registerMessageHandlers() {
    App.onMessage('wiki_updated', (data) => {
      // Refresh the page list when wiki is updated
      if (App.currentView === 'wiki') {
        fetchPages();
      } else {
        // Mark as stale — will refresh when user switches to wiki tab
        allPages = [];
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════
  return {
    init,
    fetchPages,
    openPage
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  WikiBrowser.init();
});
