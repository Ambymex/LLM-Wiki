/* ═══════════════════════════════════════════════════════════════════════════════
   LLM Wiki — Main Application Controller (app.js)
   WebSocket management, view switching, toast notifications
   ═══════════════════════════════════════════════════════════════════════════════ */

const App = (() => {
  // ─── State ───
  let ws = null;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let currentView = 'chat';
  const MAX_RECONNECT_DELAY = 30000;
  const BASE_RECONNECT_DELAY = 1000;
  const messageHandlers = {};

  // ─── DOM References (set in init) ───
  let statusDot, bottomNav, navTabs, views, toastContainer;

  // ─── Initialize ───
  function init() {
    statusDot      = document.getElementById('connection-status');
    bottomNav      = document.getElementById('bottom-nav');
    navTabs        = bottomNav ? bottomNav.querySelectorAll('.nav-tab') : [];
    views          = document.querySelectorAll('.view');
    toastContainer = document.getElementById('toast-container');

    setupNavigation();
    connectWebSocket();
    handleVisibilityChange();
    console.log('[App] LLM Wiki initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // WebSocket Connection
  // ═══════════════════════════════════════════════════════════════
  function getWsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/ws`;
  }

  function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    setConnectionStatus('reconnecting');

    try {
      ws = new WebSocket(getWsUrl());
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      console.log('[WS] Connected');
      reconnectAttempts = 0;
      setConnectionStatus('connected');
      showToast('Connected to server');
      // Request current status on connect
      sendMessage({ type: 'get_status' });
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.warn('[WS] Invalid JSON received:', event.data);
        return;
      }
      routeMessage(data);
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected, code:', event.code);
      setConnectionStatus('disconnected');
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
    setConnectionStatus('reconnecting');
    reconnectTimer = setTimeout(() => {
      connectWebSocket();
    }, delay);
  }

  function setConnectionStatus(status) {
    statusDot.className = 'status-dot ' + status;
    const titles = {
      connected: 'Connected',
      reconnecting: 'Reconnecting…',
      disconnected: 'Disconnected'
    };
    statusDot.title = titles[status] || status;
  }

  function sendMessage(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    } else {
      showToast('Not connected — retrying…');
      connectWebSocket();
      return false;
    }
  }

  // ─── Route incoming messages to registered handlers ───
  function routeMessage(data) {
    const handlers = messageHandlers[data.type];
    if (handlers && handlers.length > 0) {
      handlers.forEach(fn => {
        try {
          fn(data);
        } catch (e) {
          console.error(`[App] Handler error for "${data.type}":`, e);
        }
      });
    } else {
      console.log('[App] Unhandled message type:', data.type, data);
    }
  }

  function onMessage(type, handler) {
    if (!messageHandlers[type]) {
      messageHandlers[type] = [];
    }
    messageHandlers[type].push(handler);
  }

  // ═══════════════════════════════════════════════════════════════
  // View Switching
  // ═══════════════════════════════════════════════════════════════
  function setupNavigation() {
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const viewName = tab.dataset.view;
        switchView(viewName);
      });
    });
  }

  function switchView(name) {
    if (currentView === name) return;
    currentView = name;

    // Update tabs
    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === name);
    });

    // Update views
    views.forEach(view => {
      const viewId = view.id.replace('view-', '');
      view.classList.toggle('active', viewId === name);
    });

    // Notify view-specific handlers
    const event = new CustomEvent('viewchange', { detail: { view: name } });
    document.dispatchEvent(event);
  }

  // ═══════════════════════════════════════════════════════════════
  // Toast Notifications
  // ═══════════════════════════════════════════════════════════════
  function showToast(text, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  }

  // ═══════════════════════════════════════════════════════════════
  // Visibility Change (phone lock/unlock)
  // ═══════════════════════════════════════════════════════════════
  function handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // When the user returns to the app, check connection
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.log('[App] App visible again, reconnecting…');
          connectWebSocket();
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════
  return {
    init,
    sendMessage,
    switchView,
    showToast,
    onMessage,
    get ws() { return ws; },
    get currentView() { return currentView; }
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
