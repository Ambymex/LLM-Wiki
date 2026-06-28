const OpenAI = require('openai');
const fs = require('fs/promises');
const path = require('path');
const wikiEngine = require('./wiki-engine');
const webScraper = require('./web-scraper');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SCHEMA_PATH = path.join(DATA_DIR, 'SCHEMA.md');
const WIKI_DIR = path.join(DATA_DIR, 'wiki');

// Cache for dynamically fetched OpenRouter models
let cachedModels = null;

let currentModel = process.env.LLM_MODEL || 'google/gemini-3.1-pro-preview';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

/**
 * Build the system prompt by combining SCHEMA.md content with the current wiki index.
 */
async function buildSystemPrompt() {
  let schema = '';
  try {
    schema = await fs.readFile(SCHEMA_PATH, 'utf-8');
  } catch {
    schema = '(SCHEMA.md not found — use default wiki conventions.)';
  }

  let index = '';
  try {
    const indexPath = path.join(WIKI_DIR, 'index.md');
    index = await fs.readFile(indexPath, 'utf-8');
  } catch {
    index = '(No wiki pages exist yet.)';
  }

  return [
    'You are the wiki-maintaining AI for LLM Wiki.',
    '',
    '=== SCHEMA & RULES ===',
    schema,
    '',
    '=== CURRENT WIKI INDEX ===',
    index,
    '',
    '=== INSTRUCTIONS ===',
    'When responding to chat questions, cite relevant wiki pages with [[Page Title]] links.',
    'Always include valid YAML frontmatter in every wiki page you create.',
    'If you need to search the web, use the search_web tool.',
    'If you need to read a wiki page, use the read_wiki_page tool.',
    'If you need to create or update a wiki page, please use the write_wiki_page tool (and kindly avoid using <wiki-write> tags during chat).',
  ].join('\n');
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'read_wiki_page',
      description: 'Reads the content of a specific wiki page by its slug (filename without .md).',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'The filename/slug of the page (e.g., "machine-learning")' }
        },
        required: ['slug']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Searches the web for the given query and returns top snippets and URLs.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetches the content of a URL and converts it to Markdown.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to fetch' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_wiki_page',
      description: 'Creates or updates a wiki page. MUST include valid YAML frontmatter at the top.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'The filename/slug of the page to write (e.g., "ai-psychosis")' },
          content: { type: 'string', description: 'The FULL markdown content including YAML frontmatter' }
        },
        required: ['slug', 'content']
      }
    }
  }
];

async function executeTool(name, args) {
  try {
    if (name === 'read_wiki_page') {
      if (!args || typeof args.slug !== 'string') return 'Error: slug must be a string.';
      const page = await wikiEngine.readPage(args.slug);
      if (!page) return `Error: Page ${args.slug} not found.`;
      return page.rawMarkdown;
    }
    if (name === 'search_web') {
      if (!args || typeof args.query !== 'string') return 'Error: query must be a string.';
      const results = await webScraper.searchWeb(args.query);
      return JSON.stringify(results, null, 2);
    }
    if (name === 'fetch_url') {
      if (!args || typeof args.url !== 'string') return 'Error: url must be a string.';
      const result = await webScraper.fetchAndConvert(args.url);
      return result.content;
    }
    if (name === 'write_wiki_page') {
      if (!args || typeof args.slug !== 'string' || typeof args.content !== 'string') return 'Error: slug and content must be strings.';
      await wikiEngine.writeRawPage(args.slug, args.content);
      await wikiEngine.updateIndex();
      
      // Attempt to tell the frontend to reload the wiki index (this happens automatically on page load but we can trigger it)
      return `Successfully wrote wiki page: ${args.slug}.md`;
    }
    return `Error: Unknown tool ${name}`;
  } catch (err) {
    return `Error executing tool: ${err.message}`;
  }
}

/**
 * Stream a chat completion. Calls onToken for each token, onDone with full text, onError on failure.
 * @param {Array} messages - Array of { role, content } message objects
 * @param {Function} onToken - Called with each streamed token string
 * @param {Function} onDone - Called with the full accumulated response text
 * @param {Function} onError - Called with error object
 */
async function streamChat(messages, onToken, onDone, onError) {
  try {
    const systemPrompt = await buildSystemPrompt();

    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const stream = await client.chat.completions.create({
      model: currentModel,
      messages: allMessages,
      tools: tools,
      stream: true,
    });

    let fullText = '';
    let toolCalls = {};

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        fullText += delta.content;
        onToken(delta.content);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCalls[tc.index]) {
            toolCalls[tc.index] = {
              id: tc.id || `call_${tc.index}`,
              type: tc.type || 'function',
              function: { name: tc.function?.name || '', arguments: '' }
            };
          } else {
            if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
          }
          if (tc.function?.arguments) {
            toolCalls[tc.index].function.arguments += tc.function.arguments;
          }
        }
      }
    }

    const toolCallArray = Object.values(toolCalls);
    if (toolCallArray.length > 0) {
      // Append the assistant's tool call request to messages
      messages.push({
        role: 'assistant',
        content: fullText || null,
        tool_calls: toolCallArray
      });

      // Execute all tools concurrently
      for (const tc of toolCallArray) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments); } catch (e) {}
        
        onToken(`\n*[System: Executing tool ${tc.function.name}...]*\n`);
        const resultText = await executeTool(tc.function.name, args);
        
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: resultText
        });
      }

      // Resume stream recursively
      return streamChat(messages, onToken, onDone, onError);
    }

    onDone(fullText);
  } catch (err) {
    onError(err);
  }
}

/**
 * Send a non-streaming chat completion and return the full response text.
 * @param {Array} messages - Array of { role, content } message objects
 * @returns {Promise<string>} The complete response text
 */
async function chatCompletion(messages) {
  const systemPrompt = await buildSystemPrompt();

  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model: currentModel,
    messages: allMessages,
    tools: tools,
  });

  const msg = response.choices?.[0]?.message;
  if (!msg) return '';

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    messages.push({
      role: 'assistant',
      content: msg.content || null,
      tool_calls: msg.tool_calls
    });

    for (const tc of msg.tool_calls) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments); } catch (e) {}
      
      const resultText = await executeTool(tc.function.name, args);
      
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: tc.function.name,
        content: resultText
      });
    }

    return chatCompletion(messages);
  }

  return msg.content || '';
}

function setModel(modelId) {
  currentModel = modelId;
}

function getModel() {
  return currentModel;
}

async function getModels() {
  if (cachedModels) return cachedModels;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    const data = await response.json();
    
    // OpenRouter returns { data: [{ id, name, ... }] }
    cachedModels = data.data
      .map(m => ({ id: m.id, name: m.name || m.id }))
      .sort((a, b) => a.name.localeCompare(b.name));
      
    return cachedModels;
  } catch (err) {
    console.error('[LLM] Failed to fetch models from OpenRouter:', err);
    // Fallback if fetch fails
    return [{ id: currentModel, name: currentModel }];
  }
}

module.exports = {
  streamChat,
  chatCompletion,
  buildSystemPrompt,
  setModel,
  getModel,
  getModels,
};
