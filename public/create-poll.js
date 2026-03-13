// ── Selectors ────────────────────────────────────────────────────────────────
const form            = document.getElementById('create-poll-form');
const questionInput   = document.getElementById('poll-question');
const questionCounter = document.getElementById('question-counter');
const pollTypeInput   = document.getElementById('poll-type');
const typeBtns        = document.querySelectorAll('.type-btn');
const mcSection       = document.getElementById('mc-section');
const orSection       = document.getElementById('or-section');
const optionsList     = document.getElementById('options-list');
const addOptionBtn    = document.getElementById('add-option-btn');
const optionsCountNote = document.getElementById('options-count-note');
const charLimitToggle = document.getElementById('char-limit-toggle');
const charLimitGroup  = document.getElementById('char-limit-group');
const charLimitInput  = document.getElementById('char-limit');
const categorySelect  = document.getElementById('poll-category');
const timeLimitToggle = document.getElementById('time-limit-toggle');
const timeLimitGroup  = document.getElementById('time-limit-group');
const timeLimitValue  = document.getElementById('time-limit-value');
const timeLimitUnit   = document.getElementById('time-limit-unit');
const timeLimitPreview = document.getElementById('time-limit-preview');
const formError       = document.getElementById('form-error');
const submitBtn       = document.getElementById('submit-btn');

// Preview selectors
const previewCategory  = document.getElementById('preview-category');
const previewQuestion  = document.getElementById('preview-question');
const previewMC        = document.getElementById('preview-mc');
const previewOR        = document.getElementById('preview-or');
const previewTextarea  = document.getElementById('preview-textarea');
const previewCharNote  = document.getElementById('preview-char-note');
const previewTime      = document.getElementById('preview-time');

// Modal selectors
const successModal  = document.getElementById('success-modal');
const modalMessage  = document.getElementById('modal-message');
const modalViewBtn  = document.getElementById('modal-view-btn');
const modalNewBtn   = document.getElementById('modal-new-btn');

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

// ── Poll Type Toggle ──────────────────────────────────────────────────────────
typeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    typeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.type;
    pollTypeInput.value = type;

    if (type === 'multiple-choice') {
      mcSection.classList.remove('hidden');
      orSection.classList.add('hidden');
      previewMC.classList.remove('hidden');
      previewOR.classList.add('hidden');
    } else {
      mcSection.classList.add('hidden');
      orSection.classList.remove('hidden');
      previewMC.classList.add('hidden');
      previewOR.classList.remove('hidden');
    }
    updatePreview();
  });
});

// ── Question character counter ────────────────────────────────────────────────
questionInput.addEventListener('input', () => {
  const len = questionInput.value.length;
  questionCounter.textContent = `${len} / 200`;
  questionCounter.classList.toggle('near-limit', len >= 180);
  updatePreview();
});

// ── Multiple Choice: add / remove options ────────────────────────────────────
function getOptionRows() {
  return optionsList.querySelectorAll('.option-row');
}

function updateOptionButtons() {
  const rows = getOptionRows();
  const count = rows.length;
  rows.forEach((row, i) => {
    const removeBtn = row.querySelector('.remove-option-btn');
    const input = row.querySelector('.option-input');
    input.placeholder = `Option ${i + 1}`;
    removeBtn.disabled = count <= MIN_OPTIONS;
  });
  addOptionBtn.disabled = count >= MAX_OPTIONS;
  optionsCountNote.textContent = `${count} of ${MAX_OPTIONS} options used`;
  updatePreview();
}

function attachOptionListeners(row) {
  row.querySelector('.option-input').addEventListener('input', updatePreview);
  row.querySelector('.remove-option-btn').addEventListener('click', () => {
    if (getOptionRows().length > MIN_OPTIONS) {
      row.remove();
      updateOptionButtons();
    }
  });

  // Drag-and-drop reorder
  row.addEventListener('dragstart', onDragStart);
  row.addEventListener('dragover', onDragOver);
  row.addEventListener('drop', onDrop);
  row.addEventListener('dragend', onDragEnd);

  // Keyboard reorder via drag handle
  const handle = row.querySelector('.drag-handle');
  handle.tabIndex = 0;
  handle.setAttribute('role', 'button');
  handle.setAttribute('aria-label', 'Reorder option. Press Arrow Up or Arrow Down to move.');
  handle.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const rows = [...getOptionRows()];
    const idx  = rows.indexOf(row);
    if (e.key === 'ArrowUp' && idx > 0) {
      rows[idx - 1].before(row);
    } else if (e.key === 'ArrowDown' && idx < rows.length - 1) {
      rows[idx + 1].after(row);
    } else {
      return;
    }
    updateOptionButtons();
    handle.focus();
  });
}

// Init existing rows
getOptionRows().forEach(attachOptionListeners);
updateOptionButtons();

addOptionBtn.addEventListener('click', () => {
  if (getOptionRows().length >= MAX_OPTIONS) return;
  const row = document.createElement('div');
  row.className = 'option-row';
  row.draggable = true;
  row.innerHTML = `
    <span class="drag-handle" title="Drag to reorder">&#8942;</span>
    <input type="text" class="option-input" placeholder="" maxlength="150">
    <button type="button" class="remove-option-btn" aria-label="Remove option" title="Remove">&#10005;</button>
  `;
  optionsList.appendChild(row);
  attachOptionListeners(row);
  updateOptionButtons();
  row.querySelector('.option-input').focus();
});

// ── Drag-to-reorder ───────────────────────────────────────────────────────────
let dragSrc = null;

function onDragStart(e) {
  dragSrc = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function onDrop(e) {
  e.stopPropagation();
  if (dragSrc !== this) {
    const allRows = [...getOptionRows()];
    const srcIdx  = allRows.indexOf(dragSrc);
    const tgtIdx  = allRows.indexOf(this);
    if (srcIdx < tgtIdx) {
      this.after(dragSrc);
    } else {
      this.before(dragSrc);
    }
    updateOptionButtons();
  }
}

function onDragEnd() {
  document.querySelectorAll('.option-row').forEach(r => {
    r.classList.remove('dragging', 'drag-over');
  });
  dragSrc = null;
}

// ── Open Response: character limit toggle ────────────────────────────────────
charLimitToggle.addEventListener('change', () => {
  charLimitGroup.classList.toggle('hidden', !charLimitToggle.checked);
  if (!charLimitToggle.checked) charLimitInput.value = '';
  updatePreview();
});

charLimitInput.addEventListener('input', updatePreview);

// ── Time Limit toggle ─────────────────────────────────────────────────────────
timeLimitToggle.addEventListener('change', () => {
  timeLimitGroup.classList.toggle('hidden', !timeLimitToggle.checked);
  if (!timeLimitToggle.checked) {
    timeLimitValue.value = '';
    timeLimitPreview.textContent = '';
  }
  updatePreview();
});

timeLimitValue.addEventListener('input', updateTimeLimitPreview);
timeLimitUnit.addEventListener('change', updateTimeLimitPreview);

function updateTimeLimitPreview() {
  const val  = parseInt(timeLimitValue.value, 10);
  const unit = timeLimitUnit.value;
  if (!val || val < 1) {
    timeLimitPreview.textContent = '';
    updatePreview();
    return;
  }
  const now     = new Date();
  const seconds = durationToSeconds(val, unit);
  const closes  = new Date(now.getTime() + seconds * 1000);
  timeLimitPreview.textContent = `Closes: ${closes.toLocaleString()}`;
  updatePreview();
}

function durationToSeconds(val, unit) {
  const map = { minutes: 60, hours: 3600, days: 86400, weeks: 604800 };
  return val * (map[unit] || 86400);
}

// ── Category preview ──────────────────────────────────────────────────────────
categorySelect.addEventListener('change', updatePreview);

// ── Live Preview updater ──────────────────────────────────────────────────────
function updatePreview() {
  const q    = questionInput.value.trim();
  const type = pollTypeInput.value;
  const cat  = categorySelect.value;

  previewQuestion.textContent = q || 'Your question will appear here…';
  previewCategory.textContent = cat || 'Category';

  // Options preview
  if (type === 'multiple-choice') {
    const inputs  = [...optionsList.querySelectorAll('.option-input')];
    const filled  = inputs.map(i => i.value.trim()).filter(Boolean);
    previewMC.innerHTML = '';
    const displayList = filled.length ? filled : ['Option 1', 'Option 2'];
    displayList.forEach(text => {
      const div = document.createElement('div');
      div.className = 'preview-option-placeholder';
      div.textContent = text;
      previewMC.appendChild(div);
    });
  }

  // Open response preview
  if (type === 'open-response') {
    const limit = charLimitToggle.checked && charLimitInput.value
      ? parseInt(charLimitInput.value, 10)
      : null;
    previewTextarea.maxLength = limit || -1;
    previewTextarea.placeholder = limit
      ? `Respondents will type their answer here… (max ${limit} chars)`
      : 'Respondents will type their answer here…';
    previewCharNote.textContent = limit ? `Character limit: ${limit}` : '';
  }

  // Time preview
  if (timeLimitToggle.checked && timeLimitValue.value && parseInt(timeLimitValue.value, 10) >= 1) {
    const val  = parseInt(timeLimitValue.value, 10);
    const unit = timeLimitUnit.value;
    const label = `${val} ${unit}`;
    previewTime.textContent = `Closes in ${label}`;
  } else {
    previewTime.textContent = 'No time limit';
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate() {
  const errors = [];
  const type = pollTypeInput.value;

  if (!questionInput.value.trim()) {
    errors.push('Please enter a poll question.');
  }

  if (type === 'multiple-choice') {
    const filled = [...optionsList.querySelectorAll('.option-input')]
      .map(i => i.value.trim())
      .filter(Boolean);
    if (filled.length < MIN_OPTIONS) {
      errors.push(`Please provide at least ${MIN_OPTIONS} answer options.`);
    }
    const unique = new Set(filled.map(v => v.toLowerCase()));
    if (unique.size !== filled.length) {
      errors.push('Answer options must be unique.');
    }
  }

  if (type === 'open-response' && charLimitToggle.checked) {
    const limit = parseInt(charLimitInput.value, 10);
    if (!charLimitInput.value || isNaN(limit) || limit < 10 || limit > 10000) {
      errors.push('Character limit must be between 10 and 10,000.');
    }
  }

  if (!categorySelect.value) {
    errors.push('Please select a category.');
  }

  if (timeLimitToggle.checked) {
    const val = parseInt(timeLimitValue.value, 10);
    if (!timeLimitValue.value || isNaN(val) || val < 1) {
      errors.push('Please enter a valid time limit (minimum 1).');
    }
    if (timeLimitUnit.value === 'minutes' && val > 1440) {
      errors.push('Minute-based limits cannot exceed 1,440 (24 hours). Use hours or days instead.');
    }
  }

  return errors;
}

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
  formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearError() {
  formError.textContent = '';
  formError.classList.add('hidden');
}

// ── Form Submission ───────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const errors = validate();
  if (errors.length) {
    showError(errors[0]);
    return;
  }

  const type = pollTypeInput.value;

  const payload = {
    question:  questionInput.value.trim(),
    type,
    category:  categorySelect.value,
  };

  if (type === 'multiple-choice') {
    payload.options = [...optionsList.querySelectorAll('.option-input')]
      .map(i => i.value.trim())
      .filter(Boolean);
  }

  if (type === 'open-response' && charLimitToggle.checked) {
    payload.charLimit = parseInt(charLimitInput.value, 10);
  }

  if (timeLimitToggle.checked && timeLimitValue.value) {
    payload.timeLimit = {
      value: parseInt(timeLimitValue.value, 10),
      unit:  timeLimitUnit.value,
    };
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing…';

  try {
    const res = await fetch('/api/polls', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to create poll.');
    }

    // Save poll ID to localStorage so it shows in the dashboard
    try {
      const stored = JSON.parse(localStorage.getItem('pollview_my_polls')) || [];
      stored.push(data.id);
      localStorage.setItem('pollview_my_polls', JSON.stringify(stored));
    } catch { /* storage unavailable */ }

    // Show success modal
    modalMessage.textContent = `"${data.question}" is now live!`;
    modalViewBtn.onclick  = () => window.location.href = `poll.html?id=${data.id}`;
    modalNewBtn.onclick   = () => {
      successModal.classList.add('hidden');
      form.reset();
      // reset dynamic state
      timeLimitGroup.classList.add('hidden');
      charLimitGroup.classList.add('hidden');
      optionsList.querySelectorAll('.option-row:not(:nth-child(-n+2))').forEach(r => r.remove());
      getOptionRows().forEach(r => r.querySelector('.option-input').value = '');
      updateOptionButtons();
      pollTypeInput.value = 'multiple-choice';
      typeBtns.forEach(b => b.classList.toggle('active', b.dataset.type === 'multiple-choice'));
      mcSection.classList.remove('hidden');
      orSection.classList.add('hidden');
      updatePreview();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish Poll';
    };
    successModal.classList.remove('hidden');

  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish Poll';
  }
});
