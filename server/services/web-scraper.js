const cheerio = require('cheerio');
const { PDFParse } = require('pdf-parse');

/**
 * Fetch a URL and convert its main content to clean markdown.
 * @param {string} url - The URL to fetch
 * @returns {{ title: string, content: string, url: string, fetchedAt: string }}
 */
async function fetchAndConvert(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LLMWikiBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    const arrayBuffer = await response.arrayBuffer();
    const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
    const pdfData = await parser.getText();
    return {
      title: url.split('/').pop() || 'PDF Document',
      content: pdfData.text,
      url,
      fetchedAt: new Date().toISOString(),
    };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract title
  const title = $('meta[property="og:title"]').attr('content')
    || $('title').text().trim()
    || $('h1').first().text().trim()
    || 'Untitled';

  // Remove unwanted elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe',
    'nav', 'header', 'footer',
    '.nav', '.navbar', '.navigation', '.menu',
    '.header', '.footer', '.site-header', '.site-footer',
    '.sidebar', '.aside', '#sidebar',
    '.ad', '.ads', '.advertisement', '.adsbygoogle',
    '.cookie', '.cookies', '.cookie-banner',
    '.popup', '.modal', '.overlay',
    '.social', '.share', '.sharing',
    '.comments', '.comment-section', '#comments',
    '.related', '.recommended', '.suggestion',
    'form', 'button',
  ];

  for (const sel of removeSelectors) {
    $(sel).remove();
  }

  // Try to find the main content area
  const mainContent = $('article').first()
    || $('main').first()
    || $('[role="main"]').first()
    || $('.post-content').first()
    || $('.article-content').first()
    || $('.entry-content').first()
    || $('.content').first()
    || $('body');

  const target = mainContent.length ? mainContent : $('body');

  // Convert HTML to markdown
  const markdown = htmlToMarkdown($, target);

  return {
    title: cleanText(title),
    content: markdown,
    url,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Convert a cheerio element subtree to markdown.
 */
function htmlToMarkdown($, element) {
  const lines = [];

  function processNode(node) {
    if (node.type === 'text') {
      const text = $(node).text();
      if (text.trim()) {
        lines.push(text.trim());
      }
      return;
    }

    if (node.type !== 'tag') return;

    const tag = node.tagName?.toLowerCase();
    const el = $(node);

    switch (tag) {
      case 'h1':
        lines.push('', `# ${cleanText(el.text())}`, '');
        break;
      case 'h2':
        lines.push('', `## ${cleanText(el.text())}`, '');
        break;
      case 'h3':
        lines.push('', `### ${cleanText(el.text())}`, '');
        break;
      case 'h4':
        lines.push('', `#### ${cleanText(el.text())}`, '');
        break;
      case 'h5':
        lines.push('', `##### ${cleanText(el.text())}`, '');
        break;
      case 'h6':
        lines.push('', `###### ${cleanText(el.text())}`, '');
        break;
      case 'p':
        lines.push('', cleanText(el.text()), '');
        break;
      case 'br':
        lines.push('');
        break;
      case 'hr':
        lines.push('', '---', '');
        break;
      case 'strong':
      case 'b':
        lines.push(`**${cleanText(el.text())}**`);
        break;
      case 'em':
      case 'i':
        lines.push(`*${cleanText(el.text())}*`);
        break;
      case 'a': {
        const href = el.attr('href') || '';
        const text = cleanText(el.text());
        if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          lines.push(`[${text}](${href})`);
        } else if (text) {
          lines.push(text);
        }
        break;
      }
      case 'img': {
        const src = el.attr('src') || '';
        const alt = el.attr('alt') || 'image';
        if (src) {
          lines.push(`![${alt}](${src})`);
        }
        break;
      }
      case 'ul':
      case 'ol': {
        lines.push('');
        el.children('li').each((i, li) => {
          const prefix = tag === 'ol' ? `${i + 1}.` : '-';
          lines.push(`${prefix} ${cleanText($(li).text())}`);
        });
        lines.push('');
        break;
      }
      case 'blockquote':
        lines.push('', ...cleanText(el.text()).split('\n').map(l => `> ${l}`), '');
        break;
      case 'pre': {
        const code = el.find('code');
        const lang = (code.attr('class') || '').replace(/^language-/, '').split(' ')[0] || '';
        const codeText = code.length ? code.text() : el.text();
        lines.push('', `\`\`\`${lang}`, codeText, '```', '');
        break;
      }
      case 'code':
        // Inline code (only if not inside a <pre>)
        if (!el.parent('pre').length) {
          lines.push(`\`${el.text()}\``);
        }
        break;
      case 'table': {
        const rows = [];
        el.find('tr').each((_, tr) => {
          const cells = [];
          $(tr).find('th, td').each((__, cell) => {
            cells.push(cleanText($(cell).text()));
          });
          rows.push(cells);
        });
        if (rows.length > 0) {
          lines.push('');
          lines.push('| ' + rows[0].join(' | ') + ' |');
          lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
          for (let r = 1; r < rows.length; r++) {
            lines.push('| ' + rows[r].join(' | ') + ' |');
          }
          lines.push('');
        }
        break;
      }
      default:
        // Recurse into children for divs, spans, sections, etc.
        el.contents().each((_, child) => {
          processNode(child);
        });
        break;
    }
  }

  const target = element;
  if (typeof target.each === 'function') {
    target.contents().each((_, child) => {
      processNode(child);
    });
  }

  // Clean up excessive blank lines
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean text by collapsing whitespace and trimming.
 */
function cleanText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Search the web using DuckDuckGo HTML.
 * Returns an array of { title, url, snippet }.
 */
async function searchWeb(query) {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    $('.result__body').each((i, el) => {
      if (i >= 5) return false; // top 5 results
      const title = $(el).find('.result__title').text().trim();
      const href = $(el).find('.result__url').attr('href') || '';
      const snippet = $(el).find('.result__snippet').text().trim();
      
      // DuckDuckGo redirects links via //duckduckgo.com/l/?uddg=<encoded>
      // We can try to extract the real URL if needed, but often the snippet is enough.
      // Or we just return the DuckDuckGo redirect link.
      results.push({ title, url: href, snippet });
    });

    return results;
  } catch (err) {
    console.error('Web search error:', err);
    return [];
  }
}

module.exports = {
  fetchAndConvert,
  searchWeb,
};
