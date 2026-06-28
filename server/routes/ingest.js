const express = require('express');
const multer = require('multer');
const ingestService = require('../services/ingest');

const router = express.Router();

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
});

/**
 * POST /api/ingest/file
 * Handle multipart file upload for ingestion.
 * The uploaded file is processed by the ingestion pipeline.
 */
router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process the file (no WebSocket for REST uploads — pass null)
    const result = await ingestService.ingestFile(req.file, null);

    res.json({
      success: true,
      message: `Ingested file and created/updated ${result.updatedPages.length} wiki page(s)`,
      pages: result.updatedPages,
      fullResponse: result.fullResponse,
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (err) {
    console.error('File ingestion error:', err);
    res.status(500).json({ error: `File ingestion failed: ${err.message}` });
  }
});

module.exports = router;
