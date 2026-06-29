require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');

const wikiRoutes = require('./routes/wiki');
const ingestRoutes = require('./routes/ingest');
const llm = require('./services/llm');
const wiki = require('./services/wiki-engine');
const handleWsConnection = require('./routes/chat');

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function main() {
  // ── Ensure data directories exist ──────────────────────────────────
  await wiki.ensureDirectories();
  console.log('📂 Data directories ready');
  
  // ── Start Git Auto-Sync Watcher ────────────────────────────────────
  const gitSync = require('./services/git-sync');
  gitSync.startWatching();

  // ── Express app ────────────────────────────────────────────────────
  const app = express();
  app.use(express.json());

  // Serve static frontend files from public/
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // ── REST API routes ────────────────────────────────────────────────
  app.use('/api/wiki', wikiRoutes);
  app.use('/api/ingest', ingestRoutes);

  // GET /api/status
  app.get('/api/status', async (req, res) => {
    try {
      const [pageCount, sourceCount] = await Promise.all([
        wiki.getPageCount(),
        wiki.getSourceCount(),
      ]);
      res.json({
        model: llm.getModel(),
        wikiPageCount: pageCount,
        sourceCount,
        models: llm.getPopularModels(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/model
  app.post('/api/model', (req, res) => {
    const { model } = req.body;
    if (!model) {
      return res.status(400).json({ error: 'No model specified' });
    }
    llm.setModel(model);
    res.json({ model: llm.getModel(), message: `Model switched to ${model}` });
  });

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      if (err) {
        res.status(404).send('Not found — place your frontend files in the public/ directory.');
      }
    });
  });

  // ── HTTP + WebSocket server ────────────────────────────────────────
  const server = http.createServer(app);

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const clientAddr = req.socket.remoteAddress || 'unknown';
    console.log(`🔌 WebSocket connected: ${clientAddr}`);

    handleWsConnection(ws);

    ws.on('close', () => {
      console.log(`🔌 WebSocket disconnected: ${clientAddr}`);
    });
  });

  // ── Start listening ────────────────────────────────────────────────
  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  📚 LLM Wiki Server');
    console.log('═══════════════════════════════════════════');
    console.log(`  Model:  ${llm.getModel()}`);
    console.log(`  Port:   ${PORT}`);
    console.log('');
    console.log('  Access from:');
    console.log(`    Local:      http://localhost:${PORT}`);

    // Log all network interfaces so user can find the right IP for their phone
    const interfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const label = addr.address.startsWith('100.')
            ? `${name} (Tailscale)`
            : name;
          console.log(`    ${label.padEnd(12)} http://${addr.address}:${PORT}`);
        }
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('');
  });
}

main().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
