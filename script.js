const API_BASE = 'http://127.0.0.1:8000';

const form = document.getElementById('predict-form');
const submitBtn = document.getElementById('submit-btn');
const apiErrorEl = document.getElementById('api-error');
const resultSection = document.getElementById('result');
const resetBtn = document.getElementById('reset-btn');

const gaugeFill = document.getElementById('gauge-fill');
const gaugeScore = document.getElementById('gauge-score');
const resultLabel = document.getElementById('result-label');
const resultNote = document.getElementById('result-note');

const GAUGE_CIRCUMFERENCE = 283; // matches stroke-dasharray in CSS

// ---------- Stress level chips ----------
const chipContainer = document.getElementById('stress-chips');
const stressInput = document.getElementById('stress_level');

chipContainer.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  chipContainer.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  stressInput.value = chip.dataset.value;
  clearFieldError('stress_level');
});

// ---------- Field-level error helpers ----------
function setFieldError(name, message) {
  const field = form.querySelector(`[name="${name}"]`)?.closest('.field') || form.querySelector(`#${name}`)?.closest('fieldset');
  const msgEl = form.querySelector(`.error-msg[data-for="${name}"]`);
  if (field && field.classList) field.classList.add('invalid');
  if (msgEl) msgEl.textContent = message;
}

function clearFieldError(name) {
  const field = form.querySelector(`[name="${name}"]`)?.closest('.field') || form.querySelector(`#${name}`)?.closest('fieldset');
  const msgEl = form.querySelector(`.error-msg[data-for="${name}"]`);
  if (field && field.classList) field.classList.remove('invalid');
  if (msgEl) msgEl.textContent = '';
}

function clearAllErrors() {
  form.querySelectorAll('.error-msg').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  apiErrorEl.textContent = '';
}

// ---------- Client-side validation (mirrors the Pydantic constraints) ----------
const FIELD_RULES = {
  age: { type: 'number', min: 10, max: 100, label: 'Age' },
  gender: { type: 'select', label: 'Gender' },
  country: { type: 'text', label: 'Country' },
  academic_level: { type: 'select', label: 'Academic level' },
  most_used_platform: { type: 'select', label: 'Platform' },
  purpose_of_use: { type: 'select', label: 'Purpose of use' },
  avg_daily_usage_hours: { type: 'number', min: 0, max: 24, label: 'Daily screen time' },
  daily_unlocks: { type: 'number', min: 0, label: 'Phone unlocks' },
  study_hours: { type: 'number', min: 0, max: 24, label: 'Study time' },
  physical_activity_hours: { type: 'number', min: 0, max: 24, label: 'Physical activity' },
  sleep_hours_per_night: { type: 'number', min: 0, max: 24, label: 'Sleep' },
  stress_level: { type: 'hidden', label: 'Stress level' },
};

function validateForm(payload) {
  let firstInvalid = null;
  clearAllErrors();

  for (const [name, rule] of Object.entries(FIELD_RULES)) {
    const raw = payload[name];

    if (raw === '' || raw === null || raw === undefined) {
      setFieldError(name, `${rule.label} is required.`);
      firstInvalid = firstInvalid || name;
      continue;
    }

    if (rule.type === 'number') {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        setFieldError(name, `Enter a valid number.`);
        firstInvalid = firstInvalid || name;
      } else if (rule.min !== undefined && num < rule.min) {
        setFieldError(name, `Must be at least ${rule.min}.`);
        firstInvalid = firstInvalid || name;
      } else if (rule.max !== undefined && num > rule.max) {
        setFieldError(name, `Must be at most ${rule.max}.`);
        firstInvalid = firstInvalid || name;
      }
    }
  }

  return firstInvalid;
}

// ---------- Build request payload ----------
function collectPayload() {
  const fd = new FormData(form);
  return {
    age: fd.get('age') ? parseInt(fd.get('age'), 10) : '',
    gender: fd.get('gender') || '',
    country: (fd.get('country') || '').trim(),
    academic_level: fd.get('academic_level') || '',
    most_used_platform: fd.get('most_used_platform') || '',
    purpose_of_use: fd.get('purpose_of_use') || '',
    avg_daily_usage_hours: fd.get('avg_daily_usage_hours') !== '' ? parseFloat(fd.get('avg_daily_usage_hours')) : '',
    daily_unlocks: fd.get('daily_unlocks') !== '' ? parseInt(fd.get('daily_unlocks'), 10) : '',
    study_hours: fd.get('study_hours') !== '' ? parseFloat(fd.get('study_hours')) : '',
    physical_activity_hours: fd.get('physical_activity_hours') !== '' ? parseFloat(fd.get('physical_activity_hours')) : '',
    sleep_hours_per_night: fd.get('sleep_hours_per_night') !== '' ? parseFloat(fd.get('sleep_hours_per_night')) : '',
    stress_level: fd.get('stress_level') || '',
  };
}

// ---------- Backend 422 error mapping ----------
function applyServerValidationErrors(detail) {
  if (!Array.isArray(detail)) return false;
  let mapped = false;
  detail.forEach((err) => {
    const field = err.loc?.[err.loc.length - 1];
    if (field && FIELD_RULES[field]) {
      setFieldError(field, err.msg || 'Invalid value.');
      mapped = true;
    }
  });
  return mapped;
}

// ---------- Gauge rendering ----------
function renderGauge(score) {
  const clamped = Math.max(0, Math.min(10, score));
  const fraction = clamped / 10;

  const offset = GAUGE_CIRCUMFERENCE * (1 - fraction);

  requestAnimationFrame(() => {
    gaugeFill.style.strokeDashoffset = offset;
  });

  gaugeScore.textContent = score.toFixed(2);

  let label, note;
  if (clamped < 3.34) {
    label = 'Low end of the scale';
    note = "This is one model's estimate based on the habits you entered — not a clinical read on how you're doing.";
  } else if (clamped < 6.67) {
    label = 'Middle of the scale';
    note = "This is one model's estimate based on the habits you entered — not a clinical read on how you're doing.";
  } else {
    label = 'High end of the scale';
    note = "This is one model's estimate based on the habits you entered — not a clinical read on how you're doing.";
  }
  resultLabel.textContent = label;
  resultNote.textContent = note;
}

// ---------- Submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  apiErrorEl.textContent = '';

  const payload = collectPayload();
  const firstInvalid = validateForm(payload);
  if (firstInvalid) {
    document.getElementById(firstInvalid)?.focus();
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 422) {
      const body = await res.json().catch(() => null);
      const mapped = body?.detail ? applyServerValidationErrors(body.detail) : false;
      if (!mapped) {
        apiErrorEl.textContent = 'The server rejected some of the values entered. Please check the form.';
      }
      return;
    }

    if (!res.ok) {
      apiErrorEl.textContent = `The prediction server returned an error (status ${res.status}). Please try again.`;
      return;
    }

    const data = await res.json();
    if (typeof data.predicted_mental_health_score !== 'number') {
      apiErrorEl.textContent = 'The server response was missing a score. Please try again.';
      return;
    }

    showResult(data.predicted_mental_health_score);
  } catch (err) {
    apiErrorEl.textContent = `We couldn't reach the prediction server. Make sure the backend is running at ${API_BASE}, then try again.`;
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle('loading', isLoading);
}

function showResult(score) {
  form.hidden = true;
  resultSection.hidden = false;
  renderGauge(score);
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

resetBtn.addEventListener('click', () => {
  resultSection.hidden = true;
  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});