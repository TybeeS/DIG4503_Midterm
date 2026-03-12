const express = require('express');
const path    = require('path');
const crypto  = require('crypto');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Poll persistence ──────────────────────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'polls.json');

// Ensure the data directory exists before any reads or writes
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadPolls() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function savePolls() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(polls, null, 2));
}

// ── In-memory store, seeded from disk ─────────────────────────────────────────
const polls = loadPolls();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Helpers ───────────────────────────────────────────────────────────────────
const DURATION_SECONDS = { minutes: 60, hours: 3600, days: 86400, weeks: 604800 };
const CATEGORIES = [
  'Technology', 'Gaming', 'Music', 'Sports',
  'Food', 'Entertainment', 'Education', 'Lifestyle', 'Other',
];

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/polls — list all polls (summary only)
app.get('/api/polls', (req, res) => {
  const summary = polls.map(({ id, question, type, category, createdAt, expiresAt, votes }) => ({
    id, question, type, category, createdAt, expiresAt, votes,
  }));
  res.json(summary);
});

// GET /api/polls/:id — single poll
app.get('/api/polls/:id', (req, res) => {
  const poll = polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found.' });
  res.json(poll);
});

// POST /api/polls — create a poll
app.post('/api/polls', (req, res) => {
  const { question, type, category, options, charLimit, timeLimit } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'A poll question is required.' });
  }
  if (question.trim().length > 200) {
    return res.status(400).json({ error: 'Question must be 200 characters or fewer.' });
  }

  if (!['multiple-choice', 'open-response'].includes(type)) {
    return res.status(400).json({ error: 'Invalid poll type.' });
  }

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  if (type === 'multiple-choice') {
    if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
      return res.status(400).json({ error: 'Multiple choice polls require 2–10 options.' });
    }
    const cleaned = options.map(o => (typeof o === 'string' ? o.trim() : ''));
    if (cleaned.some(o => !o)) {
      return res.status(400).json({ error: 'All options must be non-empty strings.' });
    }
    const unique = new Set(cleaned.map(o => o.toLowerCase()));
    if (unique.size !== cleaned.length) {
      return res.status(400).json({ error: 'Answer options must be unique.' });
    }
  }

  if (type === 'open-response' && charLimit !== undefined) {
    const limit = Number(charLimit);
    if (!Number.isInteger(limit) || limit < 10 || limit > 10000) {
      return res.status(400).json({ error: 'Character limit must be between 10 and 10,000.' });
    }
  }

  let expiresAt = null;
  if (timeLimit) {
    const { value, unit } = timeLimit;
    const seconds = DURATION_SECONDS[unit];
    if (!seconds || !Number.isInteger(Number(value)) || Number(value) < 1) {
      return res.status(400).json({ error: 'Invalid time limit.' });
    }
    expiresAt = new Date(Date.now() + Number(value) * seconds * 1000).toISOString();
  }

  // ── Build poll object ───────────────────────────────────────────────────────
  const poll = {
    id:        crypto.randomUUID(),
    question:  question.trim(),
    type,
    category,
    createdAt: new Date().toISOString(),
    expiresAt,
    votes:     0,
  };

  if (type === 'multiple-choice') {
    poll.options = options.map(o => ({ text: o.trim(), votes: 0 }));
  }

  if (type === 'open-response') {
    poll.charLimit = charLimit !== undefined ? Number(charLimit) : null;
    poll.responses = [];
  }

  poll.lastVotedAt = null;

  polls.push(poll);
  savePolls();
  res.status(201).json(poll);
});

// POST /api/polls/:id/vote — cast a vote
app.post('/api/polls/:id/vote', (req, res) => {
  const poll = polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found.' });

  if (poll.expiresAt && new Date(poll.expiresAt) <= new Date()) {
    return res.status(403).json({ error: 'This poll has closed.' });
  }

  if (poll.type === 'multiple-choice') {
    const { optionIndex } = req.body;
    if (optionIndex === undefined || !Number.isInteger(Number(optionIndex))) {
      return res.status(400).json({ error: 'A valid option index is required.' });
    }
    const idx = Number(optionIndex);
    if (idx < 0 || idx >= poll.options.length) {
      return res.status(400).json({ error: 'Option index out of range.' });
    }
    poll.options[idx].votes += 1;
    poll.votes += 1;
  }

  if (poll.type === 'open-response') {
    const { response } = req.body;
    if (!response || typeof response !== 'string' || !response.trim()) {
      return res.status(400).json({ error: 'A response is required.' });
    }
    const text = response.trim();
    if (poll.charLimit && text.length > poll.charLimit) {
      return res.status(400).json({ error: `Response exceeds the ${poll.charLimit}-character limit.` });
    }
    poll.responses.push(text);
    poll.votes += 1;
  }

  poll.lastVotedAt = new Date().toISOString();
  savePolls();
  res.json(poll);
});

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`PollView server running at http://localhost:${PORT}`);
});
