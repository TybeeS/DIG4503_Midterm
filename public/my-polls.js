// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = 'pollview_my_polls';

function getMyPollIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function removePollId(id) {
  const ids = getMyPollIds().filter(i => i !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTimeStatus(expiresAt) {
  if (!expiresAt) return { label: 'No time limit', closed: false };
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return { label: 'Closed', closed: true };
  const s = Math.floor(diff / 1000);
  if (s < 60)  return { label: `Closes in ${s}s`, closed: false };
  const m = Math.floor(s / 60);
  if (m < 60)  return { label: `Closes in ${m}m`, closed: false };
  const h = Math.floor(m / 60);
  if (h < 24)  return { label: `Closes in ${h}h`, closed: false };
  const d = Math.floor(h / 24);
  return { label: `Closes in ${d}d`, closed: false };
}

function voteCount(poll) {
  const total = poll.votes ?? 0;
  if (poll.type === 'multiple-choice') {
    return `${total} vote${total !== 1 ? 's' : ''}`;
  }
  return `${total} response${total !== 1 ? 's' : ''}`;
}

function copyPollLink(id) {
  const url = `${location.origin}/poll.html?id=${id}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied!');
  }).catch(() => {
    prompt('Copy this link:', url);
  });
}

function showToast(msg) {
  let toast = document.getElementById('pv-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pv-toast';
    toast.className = 'pv-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('pv-toast-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('pv-toast-visible'), 2200);
}

// ── State ─────────────────────────────────────────────────────────────────────
let allPolls = [];

// ── Render ────────────────────────────────────────────────────────────────────
function renderPolls(polls) {
  const grid      = document.getElementById('my-polls-grid');
  const noResults = document.getElementById('no-results');

  if (polls.length === 0) {
    grid.classList.add('hidden');
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = '';

  polls.forEach(poll => {
    const { label: timeLabel, closed } = formatTimeStatus(poll.expiresAt);
    const statusClass = closed ? 'status-closed' : 'status-active';
    const statusText  = closed ? 'Closed' : 'Active';

    const card = document.createElement('div');
    card.className = 'my-poll-card';
    card.innerHTML = `
      <div class="my-poll-card-top">
        <div class="my-poll-badges">
          <span class="poll-category">${escapeHtml(poll.category)}</span>
          <span class="poll-type-badge">${poll.type === 'multiple-choice' ? 'Multiple Choice' : 'Open Response'}</span>
        </div>
        <span class="my-poll-status ${statusClass}">${statusText}</span>
      </div>
      <h3 class="my-poll-question">${escapeHtml(poll.question)}</h3>
      <div class="my-poll-meta">
        <span>${voteCount(poll)}</span>
        <span class="meta-divider">·</span>
        <span>${timeLabel}</span>
      </div>
      <div class="my-poll-actions">
        <a href="poll.html?id=${poll.id}" class="btn btn-primary btn-sm">View Poll</a>
        <button class="btn btn-outline btn-sm" data-copy="${poll.id}">Copy Link</button>
        <button class="btn btn-ghost btn-sm" data-remove="${poll.id}">Remove</button>
      </div>
    `;

    card.querySelector('[data-copy]').addEventListener('click', () => copyPollLink(poll.id));
    card.querySelector('[data-remove]').addEventListener('click', function () {
      const removeBtn  = this;
      const actionsDiv = removeBtn.closest('.my-poll-actions');

      // Hide existing action buttons and show inline confirmation
      [...actionsDiv.children].forEach(c => c.classList.add('hidden'));

      const label   = document.createElement('span');
      label.style.cssText = 'font-size:0.85rem;color:var(--text-light);align-self:center;';
      label.textContent   = 'Remove from dashboard?';

      const yesBtn  = document.createElement('button');
      yesBtn.className   = 'btn btn-ghost btn-sm';
      yesBtn.textContent = 'Yes, remove';

      const noBtn   = document.createElement('button');
      noBtn.className   = 'btn btn-outline btn-sm';
      noBtn.textContent = 'Cancel';

      actionsDiv.append(label, yesBtn, noBtn);
      yesBtn.focus();

      noBtn.addEventListener('click', () => {
        label.remove();
        yesBtn.remove();
        noBtn.remove();
        [...actionsDiv.children].forEach(c => c.classList.remove('hidden'));
        removeBtn.focus();
      });

      yesBtn.addEventListener('click', () => {
        removePollId(poll.id);
        allPolls = allPolls.filter(p => p.id !== poll.id);
        card.classList.add('my-poll-card-exit');
        card.addEventListener('transitionend', () => {
          card.remove();
          if (allPolls.length === 0) {
            grid.classList.add('hidden');
            document.getElementById('polls-controls').classList.add('hidden');
            document.getElementById('dashboard-empty').classList.remove('hidden');
          } else if (!grid.querySelector('.my-poll-card')) {
            applyFilters();
          }
        }, { once: true });
      });
    });

    grid.appendChild(card);
  });
}

// ── Search / Filter / Sort ────────────────────────────────────────────────────
function getTotalVotes(poll) {
  return poll.votes ?? 0;
}

function applyFilters() {
  const query    = document.getElementById('search-input').value.trim().toLowerCase();
  const category = document.getElementById('category-filter').value;
  const sort     = document.getElementById('sort-select').value;

  let results = allPolls;

  if (query) {
    results = results.filter(p => p.question.toLowerCase().includes(query));
  }

  if (category) {
    results = results.filter(p => p.category === category);
  }

  results = [...results].sort((a, b) => {
    switch (sort) {
      case 'newest':     return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':     return new Date(a.createdAt) - new Date(b.createdAt);
      case 'most-voted': return getTotalVotes(b) - getTotalVotes(a);
      case 'least-voted':return getTotalVotes(a) - getTotalVotes(b);
      case 'last-voted': {
        // Polls never voted on sink to the bottom
        if (!a.lastVotedAt && !b.lastVotedAt) return 0;
        if (!a.lastVotedAt) return 1;
        if (!b.lastVotedAt) return -1;
        return new Date(b.lastVotedAt) - new Date(a.lastVotedAt);
      }
      default: return 0;
    }
  });

  renderPolls(results);
}

// ── Controls wiring ───────────────────────────────────────────────────────────
function initControls() {
  const input      = document.getElementById('search-input');
  const clearBtn   = document.getElementById('search-clear');
  const catFilter  = document.getElementById('category-filter');

  // Populate category dropdown with only the categories present in the user's polls
  const categories = [...new Set(allPolls.map(p => p.category))].sort();
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catFilter.appendChild(opt);
  });

  input.addEventListener('input', () => {
    clearBtn.classList.toggle('hidden', input.value === '');
    applyFilters();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    input.focus();
    applyFilters();
  });

  catFilter.addEventListener('change', applyFilters);
  document.getElementById('sort-select').addEventListener('change', applyFilters);
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const loading  = document.getElementById('dashboard-loading');
  const empty    = document.getElementById('dashboard-empty');
  const controls = document.getElementById('polls-controls');

  const ids = getMyPollIds();

  if (ids.length === 0) {
    loading.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  const idSet = new Set(ids);

  try {
    const res  = await fetch('/api/polls');
    const data = await res.json();
    allPolls = data.filter(p => idSet.has(p.id));

    // Clean up any stored IDs that no longer exist on the server
    const foundIds = new Set(allPolls.map(p => p.id));
    ids.filter(id => !foundIds.has(id)).forEach(removePollId);
  } catch {
    allPolls = [];
  }

  loading.classList.add('hidden');

  if (allPolls.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  controls.classList.remove('hidden');
  initControls();
  renderPolls(allPolls);
}

loadDashboard();
