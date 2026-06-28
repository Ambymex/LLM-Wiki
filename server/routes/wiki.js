const express = require('express');
const wiki = require('../services/wiki-engine');
const llm = require('../services/llm');

const router = express.Router();

/**
 * GET /api/wiki/status
 * Get wiki stats and current model config
 */
router.get('/status', async (req, res) => {
  try {
    const pages = await wiki.getAllPages();
    const { sourceCount } = await wiki.getIndex();
    const models = await llm.getModels();
    
    res.json({
      model: llm.getModel(),
      wikiPageCount: pages.length,
      sourceCount: sourceCount,
      models: models
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/wiki/pages
 * List all wiki pages with metadata.
 */
router.get('/pages', async (req, res) => {
  try {
    const pages = await wiki.listPages();
    res.json(pages);
  } catch (err) {
    console.error('Error listing pages:', err);
    res.status(500).json({ error: 'Failed to list wiki pages' });
  }
});

/**
 * GET /api/wiki/pages/:slug
 * Get a single wiki page rendered as HTML + metadata.
 */
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const rendered = await wiki.renderPage(slug);

    if (!rendered) {
      return res.status(404).json({ error: `Page not found: ${slug}` });
    }

    res.json({
      slug: rendered.slug,
      title: rendered.data.title || rendered.slug,
      type: rendered.data.type || 'unknown',
      tags: rendered.data.tags || [],
      created: rendered.data.created || null,
      updated: rendered.data.updated || null,
      sources: rendered.data.sources || [],
      html: rendered.html,
    });
  } catch (err) {
    console.error(`Error reading page ${req.params.slug}:`, err);
    res.status(500).json({ error: 'Failed to read wiki page' });
  }
});

/**
 * DELETE /api/wiki/pages/:slug
 * Delete a specific wiki page.
 */
router.delete('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const success = await wiki.deletePage(slug);
    
    if (!success) {
      return res.status(404).json({ error: `Page not found or could not be deleted: ${slug}` });
    }

    res.json({ success: true, message: `Deleted ${slug}` });
  } catch (err) {
    console.error(`Error deleting page ${req.params.slug}:`, err);
    res.status(500).json({ error: 'Failed to delete wiki page' });
  }
});

/**
 * GET /api/wiki/search?q=query
 * Search wiki pages by query string.
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.json([]);
    }

    const results = await wiki.searchPages(query);
    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
