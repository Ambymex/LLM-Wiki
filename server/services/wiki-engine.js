const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const WIKI_DIR = path.join(DATA_DIR, 'wiki');
const RAW_DIR = path.join(DATA_DIR, 'raw');

/**
 * Ensure the data directories exist.
 */
async function ensureDirectories() {
  await fs.mkdir(WIKI_DIR, { recursive: true });
  await fs.mkdir(RAW_DIR, { recursive: true });
}

/**
 * Read a wiki page by slug. Returns { slug, content, data (frontmatter), rawMarkdown }.
 */
async function readPage(slug) {
  const filename = slug.endsWith('.md') ? slug : `${slug}.md`;
  const filePath = path.join(WIKI_DIR, filename);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(raw);
    return {
      slug: slug.replace(/\.md$/, ''),
      content: parsed.content,
      data: parsed.data,
      rawMarkdown: raw,
    };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Write a wiki page. `content` is the markdown body, `frontmatter` is an object for YAML.
 */
async function writePage(slug, content, frontmatter = {}) {
  const filename = slug.endsWith('.md') ? slug : `${slug}.md`;
  const filePath = path.join(WIKI_DIR, filename);

  // Set updated timestamp
  const now = new Date().toISOString().split('T')[0];
  const fm = {
    ...frontmatter,
    updated: now,
  };
  if (!fm.created) {
    // Check if file already exists to preserve created date
    const existing = await readPage(slug);
    fm.created = existing?.data?.created || now;
  }

  const fileContent = matter.stringify(content, fm);
  await fs.writeFile(filePath, fileContent, 'utf-8');

  return { slug: slug.replace(/\.md$/, ''), data: fm };
}

/**
 * Delete a wiki page by slug.
 */
async function deletePage(slug) {
  const filename = slug.endsWith('.md') ? slug : `${slug}.md`;
  const filePath = path.join(WIKI_DIR, filename);

  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

/**
 * List all wiki pages. Returns array of metadata objects.
 */
async function listPages() {
  await ensureDirectories();

  let files;
  try {
    files = await fs.readdir(WIKI_DIR);
  } catch {
    return [];
  }

  const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md' && f !== 'log.md');
  const pages = [];

  for (const file of mdFiles) {
    try {
      const raw = await fs.readFile(path.join(WIKI_DIR, file), 'utf-8');
      const parsed = matter(raw);
      const slug = file.replace(/\.md$/, '');

      // Extract a short excerpt from the content
      const excerpt = parsed.content
        .replace(/^#+\s+.*$/gm, '') // strip headings
        .replace(/\n+/g, ' ')       // collapse newlines
        .trim()
        .slice(0, 200);

      pages.push({
        slug,
        title: parsed.data.title || slug,
        type: parsed.data.type || 'unknown',
        tags: parsed.data.tags || [],
        created: parsed.data.created || null,
        updated: parsed.data.updated || null,
        excerpt,
      });
    } catch {
      // Skip files that can't be parsed
    }
  }

  // Sort by updated date descending
  pages.sort((a, b) => {
    if (!a.updated) return 1;
    if (!b.updated) return -1;
    return String(b.updated).localeCompare(String(a.updated));
  });

  return pages;
}

/**
 * Simple case-insensitive text search across all wiki pages.
 */
async function searchPages(query) {
  if (!query || !query.trim()) return [];

  const pages = await listPages();
  const lowerQuery = query.toLowerCase();
  const results = [];

  for (const page of pages) {
    const fullPage = await readPage(page.slug);
    if (!fullPage) continue;

    const haystack = [
      fullPage.data.title || '',
      fullPage.content,
      (fullPage.data.tags || []).join(' '),
    ].join(' ').toLowerCase();

    if (haystack.includes(lowerQuery)) {
      // Find the matching snippet
      const idx = haystack.indexOf(lowerQuery);
      const start = Math.max(0, idx - 60);
      const end = Math.min(haystack.length, idx + query.length + 60);
      const snippet = '...' + haystack.slice(start, end).trim() + '...';

      results.push({
        ...page,
        snippet,
      });
    }
  }

  return results;
}

/**
 * Regenerate index.md from current pages.
 */
async function updateIndex() {
  const pages = await listPages();

  const grouped = {};
  for (const p of pages) {
    const type = p.type || 'other';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(p);
  }

  const lines = [
    '# Wiki Index',
    '',
    `*Auto-generated — ${pages.length} pages — ${new Date().toISOString().split('T')[0]}*`,
    '',
  ];

  const typeOrder = ['source', 'entity', 'concept', 'synthesis', 'other', 'unknown'];
  const typeLabels = {
    source: '📄 Sources',
    entity: '👤 Entities',
    concept: '💡 Concepts',
    synthesis: '🔗 Syntheses',
    other: '📝 Other',
    unknown: '❓ Uncategorized',
  };

  for (const type of typeOrder) {
    const group = grouped[type];
    if (!group || group.length === 0) continue;

    lines.push(`## ${typeLabels[type] || type}`);
    lines.push('');
    for (const p of group) {
      const tags = p.tags.length ? ` — *${p.tags.join(', ')}*` : '';
      lines.push(`- [[${p.title}]] (\`${p.slug}.md\`)${tags}`);
    }
    lines.push('');
  }

  const indexPath = path.join(WIKI_DIR, 'index.md');
  await fs.writeFile(indexPath, lines.join('\n'), 'utf-8');
}

/**
 * Append an entry to log.md with timestamp.
 */
async function appendLog(action, description) {
  const logPath = path.join(WIKI_DIR, 'log.md');
  const timestamp = new Date().toISOString();

  let existing = '';
  try {
    existing = await fs.readFile(logPath, 'utf-8');
  } catch {
    existing = '# Wiki Activity Log\n\n';
  }

  const entry = `- **${timestamp}** — \`${action}\` — ${description}\n`;
  const updated = existing + entry;

  await fs.writeFile(logPath, updated, 'utf-8');
}

/**
 * Get the count of wiki pages (excluding index.md and log.md).
 */
async function getPageCount() {
  const pages = await listPages();
  return pages.length;
}

/**
 * Get the count of raw source files.
 */
async function getSourceCount() {
  try {
    const files = await fs.readdir(RAW_DIR);
    return files.length;
  } catch {
    return 0;
  }
}

/**
 * Resolve [[Wiki Links]] in rendered HTML to clickable anchor tags.
 */
function resolveWikiLinks(html) {
  // Match [[Page Title]] patterns
  return html.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    return `<a href="/wiki/${slug}" class="wiki-link" data-slug="${slug}">${title}</a>`;
  });
}

/**
 * Render a wiki page's markdown to HTML, resolving wiki links.
 */
async function renderPage(slug) {
  const page = await readPage(slug);
  if (!page) return null;

  let html = marked(page.content);
  html = resolveWikiLinks(html);

  return {
    slug: page.slug,
    data: page.data,
    html,
    rawMarkdown: page.rawMarkdown,
  };
}

/**
 * Write a complete page from raw markdown (with frontmatter included in the string).
 * Used by the ingest pipeline where the LLM outputs full page content with frontmatter.
 */
async function writeRawPage(slug, rawMarkdown) {
  const filename = slug.endsWith('.md') ? slug : `${slug}.md`;
  const filePath = path.join(WIKI_DIR, filename);
  await fs.writeFile(filePath, rawMarkdown, 'utf-8');
  return { slug: slug.replace(/\.md$/, '') };
}

module.exports = {
  ensureDirectories,
  readPage,
  writePage,
  writeRawPage,
  deletePage,
  listPages,
  searchPages,
  updateIndex,
  appendLog,
  getPageCount,
  getSourceCount,
  resolveWikiLinks,
  renderPage,
  DATA_DIR,
  WIKI_DIR,
  RAW_DIR,
};
