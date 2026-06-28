const OpenAI = require('openai');
const fs = require('fs/promises');
const path = require('path');

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
    'When performing ingestion, output wiki page operations wrapped in <wiki-write> tags.',
    'Format: <wiki-write path="slug.md">full markdown content including frontmatter</wiki-write>',
    'You may output multiple <wiki-write> blocks in a single response.',
    'Always include valid YAML frontmatter in every wiki page.',
  ].join('\n');
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
      stream: true,
    });

    let fullText = '';

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onToken(delta);
      }
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
  });

  return response.choices?.[0]?.message?.content || '';
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
