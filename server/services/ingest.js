const fs = require('fs/promises');
const path = require('path');
const scraper = require('./web-scraper');
const wiki = require('./wiki-engine');
const llm = require('./llm');
const { PDFParse } = require('pdf-parse');

/**
 * Send a WebSocket message (safe — no-ops if ws is not open).
 */
function wsSend(ws, data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Ingest a URL: fetch, convert, save raw, then process with LLM.
 */
async function ingestUrl(url, ws) {
  try {
    wsSend(ws, { type: 'ingest_progress', step: 'Fetching URL...', current: 1, total: 4 });

    const result = await scraper.fetchAndConvert(url);

    wsSend(ws, { type: 'ingest_progress', step: 'Saving raw source...', current: 2, total: 4 });

    // Save to raw/
    const slug = slugify(result.title);
    const rawFilename = `${slug}-${Date.now()}.md`;
    const rawPath = path.join(wiki.RAW_DIR, rawFilename);

    const rawContent = [
      `# ${result.title}`,
      '',
      `> Source: ${url}`,
      `> Fetched: ${result.fetchedAt}`,
      '',
      result.content,
    ].join('\n');

    await fs.writeFile(rawPath, rawContent, 'utf-8');

    wsSend(ws, { type: 'ingest_progress', step: 'Processing with LLM...', current: 3, total: 4 });

    const metadata = {
      title: result.title,
      sourceUrl: url,
      fetchedAt: result.fetchedAt,
      rawFile: rawFilename,
    };

    const updatedPages = await processSource(rawContent, metadata, ws);

    wsSend(ws, { type: 'ingest_progress', step: 'Done!', current: 4, total: 4 });
    wsSend(ws, { type: 'wiki_updated', pages: updatedPages });

    return updatedPages;
  } catch (err) {
    wsSend(ws, { type: 'error', message: `Ingestion failed: ${err.message}` });
    throw err;
  }
}

/**
 * Ingest raw text: save to raw/, then process with LLM.
 */
async function ingestText(title, content, ws) {
  try {
    wsSend(ws, { type: 'ingest_progress', step: 'Saving raw source...', current: 1, total: 3 });

    const slug = slugify(title);
    const rawFilename = `${slug}-${Date.now()}.md`;
    const rawPath = path.join(wiki.RAW_DIR, rawFilename);

    const rawContent = [
      `# ${title}`,
      '',
      content,
    ].join('\n');

    await fs.writeFile(rawPath, rawContent, 'utf-8');

    wsSend(ws, { type: 'ingest_progress', step: 'Processing with LLM...', current: 2, total: 3 });

    const metadata = {
      title,
      rawFile: rawFilename,
    };

    const updatedPages = await processSource(rawContent, metadata, ws);

    wsSend(ws, { type: 'ingest_progress', step: 'Done!', current: 3, total: 3 });
    wsSend(ws, { type: 'wiki_updated', pages: updatedPages });

    return updatedPages;
  } catch (err) {
    wsSend(ws, { type: 'error', message: `Text ingestion failed: ${err.message}` });
    throw err;
  }
}

/**
 * Ingest an uploaded file: save to raw/, then process with LLM.
 * `file` is a multer file object with { originalname, buffer, mimetype }.
 */
async function ingestFile(file, ws) {
  try {
    wsSend(ws, { type: 'ingest_progress', step: 'Saving uploaded file...', current: 1, total: 3 });

    const rawFilename = `upload-${Date.now()}-${file.originalname}`;
    const rawPath = path.join(wiki.RAW_DIR, rawFilename);
    await fs.writeFile(rawPath, file.buffer);

    wsSend(ws, { type: 'ingest_progress', step: 'Processing with LLM...', current: 2, total: 3 });

    // Read the content as text or parse if it's a PDF/Image
    let rawContent = '';
    let isImage = false;
    let base64 = null;

    try {
      if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
        const parser = new PDFParse({ data: file.buffer });
        const pdfData = await parser.getText();
        rawContent = pdfData.text;
      } else if (file.mimetype.startsWith('image/') || file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        isImage = true;
        base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        rawContent = '[Image File]';
      } else {
        rawContent = file.buffer.toString('utf-8');
      }
    } catch (e) {
      console.error('File parsing error:', e);
      rawContent = `[Binary file: ${file.originalname}, ${file.size} bytes, type: ${file.mimetype}]`;
    }

    const title = file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    const metadata = {
      title,
      originalFilename: file.originalname,
      rawFile: rawFilename,
      mimetype: file.mimetype,
      isImage,
      base64,
    };

    const result = await processSource(rawContent, metadata, ws);

    wsSend(ws, { type: 'ingest_progress', step: 'Done!', current: 3, total: 3 });
    wsSend(ws, { type: 'wiki_updated', pages: result.updatedPages });

    return result;
  } catch (err) {
    wsSend(ws, { type: 'error', message: `File ingestion failed: ${err.message}` });
    throw err;
  }
}

/**
 * Core processing: send the source + schema + wiki index to the LLM
 * and parse its response for <wiki-write> blocks to create/update pages.
 */
async function processSource(rawContent, metadata, ws) {
  const ingestPrompt = buildIngestPrompt(rawContent, metadata);
  const updatedPages = [];

  let contentBlock = ingestPrompt;
  if (metadata.isImage && metadata.base64) {
    contentBlock = [
      { type: 'text', text: ingestPrompt },
      { type: 'image_url', image_url: { url: metadata.base64 } }
    ];
  }

  const messages = [
    { role: 'user', content: contentBlock },
  ];

  // Stream the LLM response
  let fullResponse = '';

  await new Promise((resolve, reject) => {
    llm.streamChat(
      messages,
      // onToken — stream tokens to client for transparency
      (token) => {
        fullResponse += token;
        wsSend(ws, { type: 'stream_token', token });
      },
      // onDone
      async (completeText) => {
        fullResponse = completeText;
        resolve();
      },
      // onError
      (err) => {
        reject(err);
      }
    );
  });

  // Parse <wiki-write> blocks from the response
  const wikiWrites = parseWikiWrites(fullResponse);

  for (const write of wikiWrites) {
    try {
      await wiki.writeRawPage(write.path, write.content);
      const slug = write.path.replace(/\.md$/, '');
      updatedPages.push(slug);

      await wiki.appendLog('ingest', `Created/updated page: ${slug} (source: ${metadata.title || 'unknown'})`);
    } catch (err) {
      console.error(`Failed to write wiki page ${write.path}:`, err.message);
    }
  }

  // Update the index after all pages are written
  if (updatedPages.length > 0) {
    await wiki.updateIndex();
    await wiki.appendLog('index', `Rebuilt index after ingesting "${metadata.title || 'unknown'}"`);
  }

  return { updatedPages, fullResponse };
}

/**
 * Build the ingestion prompt for the LLM.
 */
function buildIngestPrompt(rawContent, metadata) {
  const metaLines = Object.entries(metadata)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return [
    '## Ingestion Task',
    '',
    'A new source has been provided. Follow the Ingest Workflow from the schema:',
    '',
    '1. Read and analyze the source carefully.',
    '2. Create a **source summary** page.',
    '3. Create or update **entity pages** for notable people, organizations, products, etc.',
    '4. Create or update **concept pages** for important ideas.',
    '5. Add cross-references ([[links]]) between all relevant pages.',
    '',
    'For EACH page you want to create or update, wrap the FULL page content (including YAML frontmatter) in a <wiki-write> tag:',
    '',
    '```',
    '<wiki-write path="page-slug.md">',
    '---',
    'title: "Page Title"',
    'type: source',
    'tags: [tag1, tag2]',
    'sources: [raw-filename]',
    `created: ${new Date().toISOString().split('T')[0]}`,
    `updated: ${new Date().toISOString().split('T')[0]}`,
    '---',
    '',
    '# Page Title',
    '',
    'Page content with [[Wiki Links]] to other pages...',
    '</wiki-write>',
    '```',
    '',
    'Please wrap each new page in a <wiki-write path="slug.md"> tag — this helps us save them properly!',
    'Use kebab-case filenames. Source summaries should be prefixed with `source-`.',
    '',
    '### Source Metadata',
    metaLines,
    '',
    '### Source Content',
    '',
    rawContent.slice(0, 30000), // Truncate very long sources
    '',
    rawContent.length > 30000 ? `\n[... truncated, total ${rawContent.length} characters ...]` : '',
  ].join('\n');
}

/**
 * Parse <wiki-write path="...">...</wiki-write> blocks from LLM output.
 */
function parseWikiWrites(text) {
  const writes = [];
  const regex = /<wiki-write\s+path=["']([^"']+)["']>([\s\S]*?)<\/wiki-write>/gi;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const pagePath = match[1].trim();
    let content = match[2].trim();

    // Clean up: the LLM sometimes wraps content in code fences
    if (content.startsWith('```')) {
      content = content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    }

    if (pagePath && content) {
      writes.push({ path: pagePath, content });
    }
  }

  return writes;
}

/**
 * Convert a title to a URL-safe slug.
 */
function slugify(text) {
  return (text || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

module.exports = {
  ingestUrl,
  ingestText,
  ingestFile,
  processSource,
};
