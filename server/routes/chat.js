const llm = require('../services/llm');
const wiki = require('../services/wiki-engine');
const ingestService = require('../services/ingest');
const fs = require('fs/promises');
const path = require('path');

const MAX_HISTORY = 20;
const HISTORY_FILE = path.join(__dirname, '..', '..', 'data', 'chat_history.json');

async function loadHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveHistory(history) {
  try {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Failed to save chat history:', err);
  }
}

/**
 * Handle a new WebSocket connection.
 * @param {WebSocket} ws
 */
function handleConnection(ws) {
  // Per-connection conversation history
  let history = [];

  // Load persistent history
  loadHistory().then(loaded => {
    history = loaded;
    sendJson(ws, { type: 'chat_history', history });
  });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendJson(ws, { type: 'error', message: 'Invalid JSON message' });
      return;
    }

    try {
      switch (msg.type) {
        case 'chat':
          await handleChat(ws, msg, history);
          break;

        case 'ingest_url':
          await handleIngestUrl(ws, msg);
          break;

        case 'ingest_text':
          await handleIngestText(ws, msg);
          break;

        case 'lint':
          await handleLint(ws, history);
          break;

        case 'set_model':
          handleSetModel(ws, msg);
          break;

        case 'get_status':
          await handleGetStatus(ws);
          break;

        default:
          sendJson(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
      }
    } catch (err) {
      console.error(`WebSocket handler error (${msg.type}):`, err);
      sendJson(ws, { type: 'error', message: err.message });
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
}

/**
 * Handle a chat message — stream LLM response back.
 */
async function handleChat(ws, msg, history) {
  const userMessage = (msg.message || '').trim();
  if (!userMessage) {
    sendJson(ws, { type: 'error', message: 'Empty chat message' });
    return;
  }

  // Add user message to history
  history.push({ role: 'user', content: userMessage });

  // Trim history to last N messages
  while (history.length > MAX_HISTORY) {
    history.shift();
  }
  
  await saveHistory(history);

  sendJson(ws, { type: 'stream_start' });

  await llm.streamChat(
    history,
    (token) => {
      sendJson(ws, { type: 'stream_token', token });
    },
    (fullMessage) => {
      // Add assistant response to history
      history.push({ role: 'assistant', content: fullMessage });
      while (history.length > MAX_HISTORY) {
        history.shift();
      }
      saveHistory(history);
      sendJson(ws, { type: 'stream_end', fullMessage });
    },
    (err) => {
      console.error('LLM stream error:', err);
      sendJson(ws, { type: 'stream_end', fullMessage: '' });
      sendJson(ws, { type: 'error', message: `LLM error: ${err.message}` });
    }
  );
}

/**
 * Handle URL ingestion.
 */
async function handleIngestUrl(ws, msg) {
  const url = (msg.url || '').trim();
  if (!url) {
    sendJson(ws, { type: 'error', message: 'No URL provided' });
    return;
  }

  sendJson(ws, { type: 'stream_start' });

  try {
    const pages = await ingestService.ingestUrl(url, ws);
    sendJson(ws, {
      type: 'stream_end',
      fullMessage: `✅ Ingested URL and created/updated ${pages.length} wiki page(s): ${pages.join(', ')}`,
    });
  } catch (err) {
    sendJson(ws, { type: 'stream_end', fullMessage: '' });
  }
}

/**
 * Handle text ingestion.
 */
async function handleIngestText(ws, msg) {
  const title = (msg.title || '').trim();
  const content = (msg.content || '').trim();

  if (!content) {
    sendJson(ws, { type: 'error', message: 'No content provided' });
    return;
  }

  sendJson(ws, { type: 'stream_start' });

  try {
    const pages = await ingestService.ingestText(title || 'Untitled', content, ws);
    sendJson(ws, {
      type: 'stream_end',
      fullMessage: `✅ Ingested text and created/updated ${pages.length} wiki page(s): ${pages.join(', ')}`,
    });
  } catch (err) {
    sendJson(ws, { type: 'stream_end', fullMessage: '' });
  }
}

/**
 * Handle wiki lint request — health-check the wiki.
 */
async function handleLint(ws, history) {
  const pages = await wiki.listPages();

  let pagesOverview = 'No wiki pages exist yet.';
  if (pages.length > 0) {
    pagesOverview = pages.map(p => {
      const tags = p.tags.length ? ` [${p.tags.join(', ')}]` : '';
      return `- ${p.title} (${p.type}, ${p.slug}.md)${tags}`;
    }).join('\n');
  }

  const lintPrompt = [
    '## Wiki Lint / Health Check',
    '',
    'Please perform a thorough health check of the wiki. Analyze the following page inventory',
    'and report on:',
    '',
    '1. **Contradictions** — conflicting claims between pages',
    '2. **Stale content** — claims superseded by newer sources',
    '3. **Orphan pages** — pages with no inbound links from other pages',
    '4. **Missing pages** — concepts or entities mentioned but lacking their own page',
    '5. **Missing cross-references** — pages that should link to each other but don\'t',
    '6. **Suggestions** — new questions to investigate or sources to find',
    '',
    '### Current Wiki Pages',
    pagesOverview,
    '',
    'Be specific and actionable. Reference page slugs so the user can find them.',
  ].join('\n');

  const lintMessages = [
    ...history.slice(-4), // Include a bit of recent context
    { role: 'user', content: lintPrompt },
  ];

  sendJson(ws, { type: 'stream_start' });

  await llm.streamChat(
    lintMessages,
    (token) => {
      sendJson(ws, { type: 'stream_token', token });
    },
    (fullMessage) => {
      sendJson(ws, { type: 'stream_end', fullMessage });
    },
    (err) => {
      console.error('Lint error:', err);
      sendJson(ws, { type: 'stream_end', fullMessage: '' });
      sendJson(ws, { type: 'error', message: `Lint error: ${err.message}` });
    }
  );
}

/**
 * Handle model switch.
 */
function handleSetModel(ws, msg) {
  const model = (msg.model || '').trim();
  if (!model) {
    sendJson(ws, { type: 'error', message: 'No model specified' });
    return;
  }

  llm.setModel(model);
  sendJson(ws, {
    type: 'status',
    model: llm.getModel(),
    message: `Model switched to ${model}`,
  });
}

/**
 * Handle status request.
 */
async function handleGetStatus(ws) {
  const [pageCount, sourceCount, models] = await Promise.all([
    wiki.getPageCount(),
    wiki.getSourceCount(),
    llm.getModels(),
  ]);

  sendJson(ws, {
    type: 'status',
    model: llm.getModel(),
    wikiPageCount: pageCount,
    sourceCount,
    models,
  });
}

/**
 * Safely send JSON over WebSocket.
 */
function sendJson(ws, data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

module.exports = handleConnection;
