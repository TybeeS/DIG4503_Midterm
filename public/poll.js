// ── Helpers ───────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function showOnly(id) {
  ['poll-loading', 'poll-error', 'poll-expired', 'poll-main'].forEach(s => {
    el(s).classList.toggle('hidden', s !== id);
  });
}

function formatRelativeTime(isoString) {
  const diff = new Date(isoString) - Date.now();
  if (diff <= 0) return 'Closed';
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `Closes in ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `Closes in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `Closes in ${h}h`;
  const d = Math.floor(h / 24);
  return `Closes in ${d}d`;
}

function pluralize(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// ── State ─────────────────────────────────────────────────────────────────────
let poll = null;

// ── Load poll from URL param ──────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const pollId = params.get('id');

if (!pollId) {
  showOnly('poll-error');
  el('poll-error-msg').textContent = 'No poll ID provided.';
} else {
  fetchPoll();
}

async function fetchPoll() {
  try {
    const res  = await fetch(`/api/polls/${pollId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Poll not found.');
    poll = data;
    renderPoll();
  } catch (err) {
    showOnly('poll-error');
    el('poll-error-msg').textContent = err.message;
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderPoll() {
  document.title = `${poll.question} - PollView`;

  const isExpired = poll.expiresAt && new Date(poll.expiresAt) <= new Date();

  if (isExpired) {
    renderExpiredResults();
    showOnly('poll-expired');
    return;
  }

  // Header
  el('view-category').textContent   = poll.category;
  el('view-type-badge').textContent = poll.type === 'multiple-choice' ? 'Multiple Choice' : 'Open Response';
  el('view-question').textContent   = poll.question;

  const totalVotes = poll.type === 'multiple-choice'
    ? poll.options.reduce((sum, o) => sum + o.votes, 0)
    : poll.responses.length;

  el('view-vote-count').textContent = poll.type === 'multiple-choice'
    ? pluralize(totalVotes, 'vote')
    : pluralize(totalVotes, 'response');

  el('view-time-status').textContent = poll.expiresAt
    ? formatRelativeTime(poll.expiresAt)
    : 'No time limit';

  showOnly('poll-main');

  if (poll.type === 'multiple-choice') {
    renderMCVoting();
  } else {
    renderORVoting();
  }
}

// ── Multiple Choice Voting ────────────────────────────────────────────────────
function renderMCVoting() {
  const container = el('mc-options');
  container.innerHTML = '';
  let selected = null;
  const submitBtn = el('mc-submit-btn');

  poll.options.forEach((option, i) => {
    const row = document.createElement('label');
    row.className = 'mc-option-row';
    row.innerHTML = `
      <input type="radio" name="mc-choice" value="${i}" class="mc-radio">
      <span class="mc-option-text">${escapeHtml(option.text)}</span>
    `;
    row.querySelector('input').addEventListener('change', () => {
      selected = i;
      submitBtn.disabled = false;
      container.querySelectorAll('.mc-option-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
    });
    container.appendChild(row);
  });

  submitBtn.addEventListener('click', async () => {
    if (selected === null) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const res  = await fetch(`/api/polls/${poll.id}/vote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ optionIndex: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      poll = data;
      renderMCResults(data);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Vote';
      alert(err.message || 'Something went wrong.');
    }
  });

  el('mc-vote-area').classList.remove('hidden');
}

function renderMCResults(updatedPoll) {
  const total = updatedPoll.options.reduce((sum, o) => sum + o.votes, 0);
  el('mc-total-label').textContent = `· ${pluralize(total, 'vote')}`;

  const list = el('mc-results-list');
  list.innerHTML = '';

  const sorted = [...updatedPoll.options].sort((a, b) => b.votes - a.votes);

  updatedPoll.options.forEach(option => {
    const pct  = total === 0 ? 0 : Math.round((option.votes / total) * 100);
    const isTop = option.text === sorted[0].text;
    const row  = document.createElement('div');
    row.className = 'result-row' + (isTop ? ' result-row-top' : '');
    row.innerHTML = `
      <div class="result-row-header">
        <span class="result-option-text">${escapeHtml(option.text)}</span>
        <span class="result-pct">${pct}%</span>
      </div>
      <div class="result-bar-track">
        <div class="result-bar-fill" style="width: 0%" data-target="${pct}"></div>
      </div>
      <span class="result-vote-count">${pluralize(option.votes, 'vote')}</span>
    `;
    list.appendChild(row);
  });

  el('mc-vote-area').classList.add('hidden');
  el('mc-results-area').classList.remove('hidden');

  // Animate bars after a brief paint delay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      list.querySelectorAll('.result-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.target + '%';
      });
    });
  });
}

// ── Open Response Voting ──────────────────────────────────────────────────────
function renderORVoting() {
  const textarea  = el('or-response-input');
  const counter   = el('or-char-counter');
  const submitBtn = el('or-submit-btn');
  const limit     = poll.charLimit || null;

  if (limit) {
    textarea.maxLength = limit;
    counter.textContent = `0 / ${limit}`;
  } else {
    counter.textContent = '';
  }

  textarea.addEventListener('input', () => {
    const len = textarea.value.trim().length;
    submitBtn.disabled = len === 0;
    if (limit) {
      counter.textContent = `${textarea.value.length} / ${limit}`;
      counter.classList.toggle('or-char-near-limit', textarea.value.length >= limit * 0.9);
    }
  });

  submitBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const res  = await fetch(`/api/polls/${poll.id}/vote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ response: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      poll = data;
      renderORResults(data);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Response';
      alert(err.message || 'Something went wrong.');
    }
  });

  el('or-vote-area').classList.remove('hidden');
}

function renderORResults(updatedPoll) {
  const responses = updatedPoll.responses;
  el('or-total-label').textContent = `· ${pluralize(responses.length, 'response')}`;

  const list = el('or-results-list');
  list.innerHTML = '';

  if (responses.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'no-responses-msg';
    msg.textContent = 'No responses yet. Be the first!';
    list.appendChild(msg);
  } else {
    // Show most recent first
    [...responses].reverse().forEach(text => {
      const card = document.createElement('div');
      card.className = 'or-response-card';
      card.textContent = text;
      list.appendChild(card);
    });
  }

  el('or-vote-area').classList.add('hidden');
  el('or-results-area').classList.remove('hidden');
}

// ── Expired poll results ──────────────────────────────────────────────────────
function renderExpiredResults() {
  const container = el('expired-results');
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'poll-view-header';
  header.innerHTML = `
    <div class="poll-view-meta">
      <span class="poll-category">${escapeHtml(poll.category)}</span>
    </div>
    <h2>${escapeHtml(poll.question)}</h2>
  `;
  container.appendChild(header);

  if (poll.type === 'multiple-choice') {
    const total = poll.options.reduce((sum, o) => sum + o.votes, 0);
    const wrap  = document.createElement('div');
    wrap.className = 'poll-vote-card';
    wrap.innerHTML = `<p class="results-label">Final Results · ${pluralize(total, 'vote')}</p>`;

    const list = document.createElement('div');
    list.className = 'mc-results-list';
    const sorted = [...poll.options].sort((a, b) => b.votes - a.votes);

    poll.options.forEach(option => {
      const pct   = total === 0 ? 0 : Math.round((option.votes / total) * 100);
      const isTop = option.text === sorted[0].text && total > 0;
      const row   = document.createElement('div');
      row.className = 'result-row' + (isTop ? ' result-row-top' : '');
      row.innerHTML = `
        <div class="result-row-header">
          <span class="result-option-text">${escapeHtml(option.text)}</span>
          <span class="result-pct">${pct}%</span>
        </div>
        <div class="result-bar-track">
          <div class="result-bar-fill" style="width: 0%" data-target="${pct}"></div>
        </div>
        <span class="result-vote-count">${pluralize(option.votes, 'vote')}</span>
      `;
      list.appendChild(row);
    });

    wrap.appendChild(list);
    container.appendChild(wrap);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      list.querySelectorAll('.result-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.target + '%';
      });
    }));

  } else {
    const responses = poll.responses;
    const wrap      = document.createElement('div');
    wrap.className  = 'poll-vote-card';
    wrap.innerHTML  = `<p class="results-label">Responses · ${pluralize(responses.length, 'response')}</p>`;

    const list = document.createElement('div');
    list.className = 'or-results-list';

    if (responses.length === 0) {
      list.innerHTML = '<p class="no-responses-msg">No responses were submitted.</p>';
    } else {
      [...responses].reverse().forEach(text => {
        const card = document.createElement('div');
        card.className = 'or-response-card';
        card.textContent = text;
        list.appendChild(card);
      });
    }

    wrap.appendChild(list);
    container.appendChild(wrap);
  }
}

// ── XSS guard ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
