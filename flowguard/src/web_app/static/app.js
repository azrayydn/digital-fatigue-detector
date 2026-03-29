/* ═══════════════════════════════════════════════════════════════
   FlowGuard AI — app.js v3.0  (tek dosya, tam sıfırdan)

   Mimari:
   - Oturum geçmişi: localStorage (fg_sessions) — sayfa yenilemede kalır
   - Streak: localStorage (fg_login_days)
   - Backend: /status /control /activity — oturum mantığı
   - Grafik: canvas bezier + tooltip
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── DOM REF'LERİ ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const statusPill    = $('status-pill');
const statusText    = $('status-text');
const sessionTimer  = $('session-timer');
const scoreNum      = $('score-num');
const ringFill      = $('ring-fill');
const ringPct       = $('ring-pct');
const scoreBarFill  = $('score-bar-fill');
const scoreBarWrap  = $('score-bar-wrap');
const scoreHint     = $('score-hint');
const valFatigue    = $('val-fatigue');
const fillFatigue   = $('fill-fatigue');
const valWriting    = $('val-writing');
const subWriting    = $('sub-writing');
const valSession    = $('val-session');
const subSession    = $('sub-session');
const valActRate    = $('val-activity-rate');
const subActRate    = $('sub-activity-rate');
const aiSubtitle    = $('ai-subtitle');
const aiBadge       = $('ai-badge');
const aiBody        = $('ai-body');
const btnStart      = $('btn-start');
const btnPause      = $('btn-pause');
const btnResume     = $('btn-resume');
const btnFinish     = $('btn-finish');
const noticeEl      = $('notice');
const trendCanvas   = $('trend-chart');
const trendCtx      = trendCanvas ? trendCanvas.getContext('2d') : null;
const historyCanvas = $('history-chart');
const historyCtx    = historyCanvas ? historyCanvas.getContext('2d') : null;
const chartEmpty    = $('chart-empty');
const analyticsGrid = $('analytics-grid');
const histSubtitle  = $('history-subtitle');
const astatSessions = $('astat-sessions');
const astatAvg      = $('astat-avg');
const astatBest     = $('astat-best');
const astatTime     = $('astat-time');

// ─── CONSTANTS ─────────────────────────────────────────────────
const LS_SESSIONS = 'fg_sessions';   // localStorage key
const LS_STREAK   = 'fg_login_days'; // localStorage key
const MAX_SESSIONS = 50;             // localStorage'da tutulacak max oturum

// ─── UYGULAMA DURUMU ──────────────────────────────────────────
const state = {
  isRunning:  false,
  status:     'idle',
  accumulated: 0,
  segmentStart: null,
  // Aktivite sayaçları
  keystrokes:  0,
  mouseEvents: 0,
  isActive:    false,
  // Anlık skor geçmişi (trend mini grafik)
  scoreHistory: [],
  prevScore: null,
  // Birikimli ortalama için
  scoreSum:   0,
  scoreCount: 0,
  // Grafik
  chartMetric: 'avg_score',
  hoveredIdx: -1,
  tooltip: null,
};

// ═══════════════════════════════════════════════════════════════
// BÖLÜM 1: OTURUM GEÇMİŞİ (localStorage)
// ═══════════════════════════════════════════════════════════════

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSIONS) || '[]');
  } catch (_) { return []; }
}

function saveSessions(list) {
  try {
    // En yeni MAX_SESSIONS kadar tut
    const trimmed = list.slice(-MAX_SESSIONS);
    localStorage.setItem(LS_SESSIONS, JSON.stringify(trimmed));
  } catch (_) {}
}

function saveSession(record) {
  const list = loadSessions();
  list.push(record);
  saveSessions(list);
}

/**
 * Mevcut oturumu localStorage'a kaydet.
 * @param {object} data - backend'den gelen son /status verisi
 * @param {number} durationS - toplam aktif süre (sn)
 */
function finishAndSave(data, durationS) {
  const avgScore  = state.scoreCount > 0 ? Math.round(state.scoreSum / state.scoreCount) : (data.focus_score || 0);
  const m         = data.metrics || {};
  const totalInt  = (m.active_intervals || 0) + (m.idle_intervals || 0);
  const activePct = totalInt > 0 ? Math.round((m.active_intervals / totalInt) * 100) : 0;
  const idleS     = (m.idle_intervals || 0) * 5; // 5sn'lik periyot

  const record = {
    id:          Date.now(),
    date:        new Date().toISOString().slice(0, 10),
    started_at:  new Date(Date.now() - durationS * 1000).toISOString(),
    ended_at:    new Date().toISOString(),
    duration_s:  durationS,
    duration_min: Math.round(durationS / 60 * 10) / 10,
    avg_score:   avgScore,
    focus_score: data.focus_score || 0,
    peak_score:  data.peak_score  || avgScore,
    fatigue:     data.fatigue_level || 'Düşük',
    active_pct:  activePct,
    idle_s:      idleS,
  };

  saveSession(record);
  return record;
}

// ═══════════════════════════════════════════════════════════════
// BÖLÜM 2: AKTİVİTE YAKALAMA + TIMER
// ═══════════════════════════════════════════════════════════════

document.addEventListener('keydown', () => {
  if (!state.isRunning) return;
  state.keystrokes++;
  state.isActive = true;
});
document.addEventListener('mousemove', () => {
  if (!state.isRunning) return;
  state.mouseEvents++;
  state.isActive = true;
});
document.addEventListener('click', e => {
  if (e.target.closest('.btn')) return;
  if (!state.isRunning) return;
  state.keystrokes++;
  state.isActive = true;
});

let timerRAF = null;

function formatDuration(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function getElapsed() {
  if (!state.segmentStart) return state.accumulated;
  return state.accumulated + Math.floor((Date.now() - state.segmentStart) / 1000);
}

function tickTimer() {
  sessionTimer.textContent = formatDuration(getElapsed());
  timerRAF = requestAnimationFrame(tickTimer);
}

function startClientTimer(accumulated) {
  state.accumulated  = accumulated;
  state.segmentStart = Date.now();
  sessionTimer.classList.add('active');
  if (timerRAF) cancelAnimationFrame(timerRAF);
  timerRAF = requestAnimationFrame(tickTimer);
}

function pauseClientTimer(accumulated) {
  state.accumulated  = accumulated;
  state.segmentStart = null;
  if (timerRAF) { cancelAnimationFrame(timerRAF); timerRAF = null; }
  sessionTimer.textContent = formatDuration(state.accumulated);
  sessionTimer.classList.remove('active');
}

function resetClientTimer() {
  state.accumulated  = 0;
  state.segmentStart = null;
  if (timerRAF) { cancelAnimationFrame(timerRAF); timerRAF = null; }
  sessionTimer.textContent = '00:00';
  sessionTimer.classList.remove('active');
}

// ═══════════════════════════════════════════════════════════════
// BÖLÜM 3: TREND MİNİ GRAFİĞİ (anlık skor geçmişi)
// ═══════════════════════════════════════════════════════════════

function scoreColor(score) {
  if (score >= 70) return '#34d399';
  if (score >= 45) return '#4f9cf9';
  if (score >= 20) return '#fbbf24';
  return '#f87171';
}

function drawTrend(history) {
  if (!trendCtx) return;
  const W = trendCanvas.width, H = trendCanvas.height;
  trendCtx.clearRect(0, 0, W, H);
  if (history.length < 2) {
    trendCtx.fillStyle = 'rgba(255,255,255,.06)';
    trendCtx.fillRect(0, H / 2 - 1, W, 2);
    return;
  }
  const pad = 6, drawH = H - pad * 2, step = (W - pad * 2) / (history.length - 1);
  const grad = trendCtx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(79,156,249,.22)');
  grad.addColorStop(1, 'rgba(79,156,249,0)');
  trendCtx.beginPath();
  history.forEach((v, i) => {
    const x = pad + i * step, y = pad + drawH - (v / 100) * drawH;
    i === 0 ? trendCtx.moveTo(x, y) : trendCtx.lineTo(x, y);
  });
  trendCtx.lineTo(pad + (history.length - 1) * step, H);
  trendCtx.lineTo(pad, H);
  trendCtx.closePath();
  trendCtx.fillStyle = grad;
  trendCtx.fill();
  trendCtx.beginPath();
  history.forEach((v, i) => {
    const x = pad + i * step, y = pad + drawH - (v / 100) * drawH;
    i === 0 ? trendCtx.moveTo(x, y) : trendCtx.lineTo(x, y);
  });
  trendCtx.strokeStyle = scoreColor(history[history.length - 1]);
  trendCtx.lineWidth = 2; trendCtx.lineJoin = 'round'; trendCtx.stroke();
  const lx = pad + (history.length - 1) * step;
  const lv = history[history.length - 1];
  const ly = pad + drawH - (lv / 100) * drawH;
  trendCtx.beginPath();
  trendCtx.arc(lx, ly, 4, 0, Math.PI * 2);
  trendCtx.fillStyle = scoreColor(lv); trendCtx.fill();
}

// ═══════════════════════════════════════════════════════════════
// BÖLÜM 4: GEÇMİŞ OTURUM GRAFİĞİ
// ═══════════════════════════════════════════════════════════════

const METRIC_CONFIG = {
  avg_score:   { label: 'Ort. Odak Skoru', unit: '',   max: 100, color: '#4f9cf9', fill: 'rgba(79,156,249,.18)' },
  duration_min:{ label: 'Süre',            unit: 'dk', max: null,color: '#34d399', fill: 'rgba(52,211,153,.15)' },
  active_pct:  { label: 'Aktiflik',        unit: '%',  max: 100, color: '#a78bfa', fill: 'rgba(167,139,250,.15)' },
};

document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
    tab.classList.add('active'); tab.setAttribute('aria-selected','true');
    state.chartMetric = tab.dataset.metric;
    renderHistoryChart();
  });
});

function updateHistoryUI() {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    histSubtitle.textContent = 'Henüz oturum kaydedilmedi';
    chartEmpty.style.display = 'flex';
    if (analyticsGrid) analyticsGrid.style.display = 'none';
    return;
  }
  chartEmpty.style.display = 'none';
  if (analyticsGrid) analyticsGrid.style.display = 'grid';

  const last = sessions.slice(-20);
  const count    = sessions.length;
  const avgScore = Math.round(sessions.reduce((a, s) => a + (s.avg_score || s.focus_score || 0), 0) / count);
  const best     = Math.max(...sessions.map(s => s.avg_score || s.focus_score || 0));
  const totalMin = sessions.reduce((a, s) => a + (s.duration_min || 0), 0);

  histSubtitle.textContent = `Son ${Math.min(count, 20)} oturum`;
  if (astatSessions) astatSessions.textContent = String(count);
  if (astatAvg)      astatAvg.textContent      = String(avgScore);
  if (astatBest)     astatBest.textContent      = String(best);
  if (astatTime)     astatTime.textContent      = totalMin < 60
    ? `${Math.round(totalMin)}dk`
    : `${Math.floor(totalMin/60)}s ${Math.round(totalMin%60)}dk`;

  renderHistoryChart(last);
}

function renderHistoryChart(sessions) {
  const data = sessions || loadSessions().slice(-20);
  if (!historyCtx || data.length === 0) return;

  const metric = state.chartMetric;
  const cfg    = METRIC_CONFIG[metric] || METRIC_CONFIG.avg_score;

  // HiDPI
  const dpr  = window.devicePixelRatio || 1;
  const rect = historyCanvas.getBoundingClientRect();
  const W    = rect.width  || historyCanvas.parentElement.clientWidth || 600;
  const H    = rect.height || 180;
  historyCanvas.width  = W * dpr;
  historyCanvas.height = H * dpr;
  historyCanvas.style.width  = W + 'px';
  historyCanvas.style.height = H + 'px';
  historyCtx.scale(dpr, dpr);
  historyCtx.clearRect(0, 0, W, H);

  const values = data.map(s => Number(s[metric] ?? 0));
  const maxVal = cfg.max !== null ? cfg.max : Math.max(...values, 1) * 1.15;
  const padL = 36, padR = 16, padT = 16, padB = 36;
  const drawW = W - padL - padR, drawH = H - padT - padB;
  const n = values.length;
  const stepX = n > 1 ? drawW / (n - 1) : drawW;
  const toX = i => padL + i * stepX;
  const toY = v => padT + drawH - (v / maxVal) * drawH;

  // Grid
  historyCtx.save();
  historyCtx.strokeStyle = 'rgba(255,255,255,.05)'; historyCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (drawH / 4) * i;
    historyCtx.beginPath(); historyCtx.moveTo(padL, y); historyCtx.lineTo(padL + drawW, y); historyCtx.stroke();
    const val = Math.round(maxVal - (maxVal / 4) * i);
    historyCtx.fillStyle = 'rgba(93,112,153,.7)';
    historyCtx.font = "10px 'DM Mono', monospace"; historyCtx.textAlign = 'right';
    historyCtx.fillText(val + cfg.unit, padL - 5, y + 3.5);
  }
  historyCtx.restore();

  // Fill
  const grad = historyCtx.createLinearGradient(0, padT, 0, padT + drawH);
  grad.addColorStop(0, cfg.fill); grad.addColorStop(1, 'rgba(0,0,0,0)');
  historyCtx.beginPath();
  values.forEach((v, i) => {
    const x = toX(i), y = toY(v);
    if (i === 0) { historyCtx.moveTo(x, y); }
    else { historyCtx.bezierCurveTo(toX(i-1)+stepX*.45, toY(values[i-1]), x-stepX*.45, y, x, y); }
  });
  historyCtx.lineTo(toX(n-1), padT+drawH); historyCtx.lineTo(toX(0), padT+drawH);
  historyCtx.closePath(); historyCtx.fillStyle = grad; historyCtx.fill();

  // Line
  historyCtx.beginPath(); historyCtx.lineWidth = 2.2; historyCtx.strokeStyle = cfg.color; historyCtx.lineJoin = 'round';
  values.forEach((v, i) => {
    const x = toX(i), y = toY(v);
    if (i === 0) { historyCtx.moveTo(x, y); }
    else { historyCtx.bezierCurveTo(toX(i-1)+stepX*.45, toY(values[i-1]), x-stepX*.45, y, x, y); }
  });
  historyCtx.stroke();

  // Dots
  values.forEach((v, i) => {
    const x = toX(i), y = toY(v), isHov = i === state.hoveredIdx;
    historyCtx.beginPath(); historyCtx.arc(x, y, isHov ? 6 : 4, 0, Math.PI*2); historyCtx.fillStyle = cfg.color; historyCtx.fill();
    historyCtx.beginPath(); historyCtx.arc(x, y, isHov ? 3 : 2, 0, Math.PI*2); historyCtx.fillStyle = '#0f1623'; historyCtx.fill();
  });

  // X labels
  historyCtx.fillStyle = 'rgba(93,112,153,.75)';
  historyCtx.font = "10px 'DM Mono', monospace"; historyCtx.textAlign = 'center';
  const labelStep = n > 10 ? Math.ceil(n / 7) : 1;
  data.forEach((s, i) => {
    if (i % labelStep !== 0 && i !== n-1) return;
    let label = s.date || '';
    try { const d = new Date(s.started_at); label = d.toLocaleDateString('tr-TR',{month:'short',day:'numeric'}); } catch(_){}
    historyCtx.fillText(label, toX(i), padT + drawH + 20);
  });
}

// Tooltip
function showTooltip(x, y, session, metric) {
  removeTooltip();
  const cfg = METRIC_CONFIG[metric] || METRIC_CONFIG.avg_score;
  const val = session[metric] ?? '--';
  let dateStr = session.date || '';
  try { const d = new Date(session.started_at); dateStr = d.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}); } catch(_){}
  const tip = document.createElement('div');
  tip.className = 'chart-tooltip';
  tip.innerHTML = `<strong>${val}${cfg.unit}</strong><span>${cfg.label} · ${dateStr}</span>`;
  const wrap = $('chart-wrap');
  if (!wrap) return;
  wrap.appendChild(tip);
  const tipW = tip.offsetWidth, wrapW = wrap.offsetWidth;
  let left = x - tipW / 2;
  if (left < 4) left = 4;
  if (left + tipW > wrapW - 4) left = wrapW - tipW - 4;
  tip.style.left = left + 'px';
  tip.style.top  = (y - 8) + 'px';
  state.tooltip = tip;
}

function removeTooltip() {
  if (state.tooltip) { state.tooltip.remove(); state.tooltip = null; }
}

if (historyCanvas) {
  historyCanvas.addEventListener('mousemove', e => {
    const sessions = loadSessions().slice(-20);
    if (sessions.length === 0) return;
    const rect = historyCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
    const n = sessions.length, padL = 36, padR = 16;
    const stepX = n > 1 ? (rect.width - padL - padR) / (n - 1) : rect.width - padL - padR;
    let closest = -1, minDist = 9999;
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(mouseX - (padL + i * stepX));
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    if (minDist < 30 && closest !== state.hoveredIdx) {
      state.hoveredIdx = closest;
      renderHistoryChart(sessions);
      showTooltip(padL + closest * stepX, mouseY, sessions[closest], state.chartMetric);
    } else if (minDist >= 30) {
      state.hoveredIdx = -1;
      removeTooltip();
      renderHistoryChart(sessions);
    }
  });
  historyCanvas.addEventListener('mouseleave', () => {
    state.hoveredIdx = -1; removeTooltip(); renderHistoryChart();
  });
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderHistoryChart(), 200);
});

// ═══════════════════════════════════════════════════════════════
// BÖLÜM 5: STREAK / HAFTALIK GİRİŞ
// ═══════════════════════════════════════════════════════════════

function loadLoginDays() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_STREAK) || '[]')); }
  catch(_) { return new Set(); }
}
function saveLoginDays(days) {
  try { localStorage.setItem(LS_STREAK, JSON.stringify([...days])); } catch(_) {}
}
function todayStr() {
  const d = new Date(), y = d.getFullYear(),
        m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function dateAtOffset(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function calcStreak(days) {
  if (days.size === 0) return 0;
  let streak = 0, offset = days.has(todayStr()) ? 0 : -1;
  while (streak < 365) {
    if (days.has(dateAtOffset(offset))) { streak++; offset--; }
    else break;
  }
  return streak;
}
function getWeekDates() {
  const today = new Date(), dow = today.getDay();
  const mondayOff = dow === 0 ? -6 : 1 - dow;
  return Array.from({length: 7}, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOff + i);
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    return { dateStr: `${y}-${m}-${day}`, label: ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][(d.getDay()+6)%7] };
  });
}

function renderStreak() {
  const days = loadLoginDays(), streak = calcStreak(days), today = todayStr(), week = getWeekDates();
  const doneThisWeek = week.filter(w => days.has(w.dateStr)).length;

  const countEl = $('streak-count');
  if (countEl) {
    countEl.textContent = String(streak);
    countEl.className = 'streak-count' + (streak >= 14 ? ' streak-epic' : streak >= 7 ? ' streak-hot' : '');
  }
  const sumEl = $('streak-summary');
  if (sumEl) sumEl.textContent = `Bu hafta ${doneThisWeek}/7 gün aktif`;

  const cont = document.querySelector('.streak-days');
  if (!cont) return;
  cont.innerHTML = '';
  week.forEach(({ dateStr, label }) => {
    const isToday = dateStr === today, isDone = days.has(dateStr);
    const w = document.createElement('div');
    w.className = 'streak-day' + (isDone ? ' done' : '') + (isToday ? ' is-today' : '');
    w.setAttribute('role','listitem');
    w.setAttribute('aria-label', `${label}${isToday ? ' (bugün)' : ''}${isDone ? ' — giriş yapıldı' : ''}`);
    const lbl = document.createElement('div'); lbl.className = 'streak-day-label'; lbl.textContent = label;
    const dot = document.createElement('div'); dot.className = 'streak-day-dot';
    w.appendChild(lbl); w.appendChild(dot); cont.appendChild(w);
  });
}

function markTodayLogin() {
  const days = loadLoginDays(), t = todayStr();
  if (!days.has(t)) { days.add(t); saveLoginDays(days); }
  renderStreak();
}

// ═══════════════════════════════════════════════════════════════
// BÖLÜM 6: UI GÜNCELLEME
// ═══════════════════════════════════════════════════════════════

function clsScore(s) { return s >= 70 ? 'high' : s >= 45 ? 'mid' : s >= 20 ? 'low' : 'danger'; }
function fatigueWidth(l)  { return {'Düşük':'18%','Orta':'48%','Yüksek':'78%','Çok Yüksek':'100%'}[l]||'18%'; }
function fatigueColor(l)  { return {'Düşük':'#34d399','Orta':'#4f9cf9','Yüksek':'#f97316','Çok Yüksek':'#f87171'}[l]||'#34d399'; }

function setRing(pct) {
  const offset = 314 - (pct / 100) * 314;
  ringFill.style.strokeDashoffset = offset;
  const col = scoreColor(pct);
  ringFill.style.stroke = col;
  ringFill.style.filter = `drop-shadow(0 0 8px ${col}88)`;
}

function updateButtons(status, isRunning, canResume) {
  btnStart.disabled  = isRunning || status === 'paused';
  btnPause.disabled  = !isRunning;
  btnResume.disabled = !canResume;
  btnFinish.disabled = (!isRunning && status !== 'paused') || status === 'idle';
}

function updateUI(data) {
  const status    = String(data.status ?? 'idle');
  const isRunning = Boolean(data.is_running);
  const score     = Number(data.focus_score ?? 0);
  const fatigue   = String(data.fatigue_level ?? 'Düşük');
  const writing   = String(data.writing_activity ?? 'Pasif');
  const durS      = Number(data.session_duration_s ?? 0);
  const acc       = Number(data.accumulated_duration_s ?? 0);
  const canResume = Boolean(data.can_resume);

  state.isRunning = isRunning;
  state.status    = status;

  // Timer
  if (isRunning) {
    const segElapsed = durS - acc;
    state.accumulated  = acc;
    state.segmentStart = Date.now() - segElapsed * 1000;
    if (!timerRAF) { sessionTimer.classList.add('active'); timerRAF = requestAnimationFrame(tickTimer); }
  } else if (status === 'paused') {
    pauseClientTimer(acc);
  } else {
    resetClientTimer();
  }

  // Status pill
  statusPill.className = 'status-pill';
  if (status === 'tracking')        { statusPill.classList.add('running'); statusText.textContent = 'Aktif'; }
  else if (status === 'paused')     { statusPill.classList.add('paused');  statusText.textContent = 'Duraklatıldı'; }
  else if (status === 'fatigue_warning') { statusPill.classList.add('warning'); statusText.textContent = 'Yorgunluk Uyarısı'; }
  else                              { statusText.textContent = 'Bekleniyor'; }

  // Skor / ring / bar
  const cls = clsScore(score);
  if (isRunning) {
    scoreNum.textContent = String(score); scoreNum.className = `score-num score-${cls}`;
    ringPct.textContent  = String(score); setRing(score);
    scoreBarFill.style.width = score + '%'; scoreBarFill.className = `score-bar-fill bar-${cls}`;
    scoreBarWrap.setAttribute('aria-valuenow', score);
    // Ortalama takibi
    state.scoreSum += score; state.scoreCount++;
  } else {
    const disp = status === 'paused' ? String(score) : '--';
    scoreNum.textContent = disp; scoreNum.className = status === 'paused' ? `score-num score-${cls}` : 'score-num';
    ringPct.textContent  = disp; setRing(status === 'paused' ? score : 0);
    scoreBarFill.style.width = (status === 'paused' ? score : 0) + '%';
  }

  // Trend
  if (isRunning && score !== state.prevScore) {
    state.scoreHistory.push(score);
    if (state.scoreHistory.length > 10) state.scoreHistory.shift();
    state.prevScore = score;
  }
  drawTrend(state.scoreHistory);

  // Score hint
  if (!isRunning && status !== 'paused') {
    scoreHint.textContent = 'Takibi başlatmak için Başlat butonuna bas'; scoreHint.style.color = '';
  } else if (status === 'paused') {
    scoreHint.textContent = '⏸ Oturum duraklatıldı'; scoreHint.style.color = 'var(--amber)';
  } else if (score >= 70) {
    scoreHint.textContent = '🔥 Harika akış — verimlilik zirvede'; scoreHint.style.color = 'var(--green)';
  } else if (score >= 45) {
    scoreHint.textContent = '👍 İyi gidiyorsun, tempoyu koru'; scoreHint.style.color = 'var(--accent)';
  } else if (score >= 20) {
    scoreHint.textContent = '⚠️ Dikkat dağılıyor — kısa bir mola iyi gelebilir'; scoreHint.style.color = 'var(--amber)';
  } else {
    scoreHint.textContent = '🛑 Yorgunluk yüksek — mutlaka mola ver'; scoreHint.style.color = 'var(--red)';
  }

  // Metrikler
  valFatigue.textContent      = fatigue;
  valFatigue.style.color      = fatigueColor(fatigue);
  fillFatigue.style.width     = fatigueWidth(fatigue);
  fillFatigue.style.background= fatigueColor(fatigue);
  valWriting.textContent      = writing;
  valWriting.style.color      = writing === 'Aktif' ? 'var(--green)' : 'var(--text)';
  subWriting.textContent      = writing === 'Aktif' ? 'Son 10 sn içinde aktivite' : 'Etkileşim bekleniyor';
  if (isRunning) {
    valSession.textContent    = 'Aktif'; valSession.style.color = 'var(--green)';
    subSession.textContent    = durS > 0 ? formatDuration(durS) + ' aktif süre' : 'Yeni başladı';
  } else if (status === 'paused') {
    valSession.textContent    = 'Duraklatıldı'; valSession.style.color = 'var(--amber)';
    subSession.textContent    = 'Devam etmek için Devam Et\'e bas';
  } else {
    valSession.textContent    = 'Hazır'; valSession.style.color = 'var(--text)';
    subSession.textContent    = 'Takip başlatılmadı';
  }
  valActRate.textContent = '--';
  subActRate.textContent = isRunning ? (writing === 'Aktif' ? 'Şu an yazılıyor' : 'Beklemede') : 'Oturum başlatılmadı';

  // Butonlar
  updateButtons(status, isRunning, canResume);

  // AI
  updateAI(score, fatigue, writing, isRunning, status, durS);
}

// ═══════════════════════════════════════════════════════════════
// BÖLÜM 7: AI ANALİZİ (dinamik, nedenli)
// ═══════════════════════════════════════════════════════════════

function trendDir() {
  const h = state.scoreHistory;
  if (h.length < 3) return null;
  const diff = h[h.length-1] - h[h.length-3];
  return diff >= 5 ? 'up' : diff <= -5 ? 'down' : 'stable';
}

// Skor değişim açıklaması
function scoreDeltaReason(dir, writing, fatigue) {
  if (dir === 'up') {
    if (writing === 'Aktif') return '✍️ Yazma aktivitesi arttığı için skor yükseldi.';
    return '📈 Aktiviten arttığı için skor yükseldi.';
  }
  if (dir === 'down') {
    if (writing === 'Pasif') return '💤 Pasif kaldığın için skor düştü.';
    if (fatigue === 'Yüksek' || fatigue === 'Çok Yüksek') return '😓 Uzun çalışma yorgunluk yarattığı için skor düştü.';
    return '📉 Aktivite azaldığı için skor düştü.';
  }
  return '➡️ Skor stabil seyrediyor.';
}

function updateAI(score, fatigue, writing, isRunning, status, durS) {
  if (!isRunning && status !== 'paused') {
    aiSubtitle.textContent = 'Bekleniyor';
    aiBadge.className = 'ai-badge';
    aiBody.innerHTML = `
      <p class="ai-onboarding">👋 Merhaba! İlk oturumunu başlatmak için <strong>Başlat</strong> butonuna bas.</p>
      <p class="ai-onboarding-sub">Klavye ve fare hareketlerini izleyerek sana kişisel odak analizi sunacağım.</p>
    `;
    return;
  }
  if (status === 'paused') {
    aiSubtitle.textContent = 'Oturum duraklatıldı';
    aiBadge.className = 'ai-badge badge-warn visible'; aiBadge.textContent = 'Duraklatıldı';
    aiBody.innerHTML = `
      <p>Oturumun duraklatıldı. Aktif süren <strong>${formatDuration(durS)}</strong> korunuyor.</p>
      <p>Devam etmeye hazır olduğunda <strong>Devam Et</strong>'e bas — süre kaldığın yerden devam eder.</p>
      <div class="ai-reason">💡 Kısa bir mola sonrası odak genellikle toparlanır.</div>
    `;
    return;
  }

  const dir = trendDir();
  const reason = scoreDeltaReason(dir, writing, fatigue);
  let title, badgeCls, badgeTxt, body;

  // Senaryo: Aktif kullanıcı (score >= 70)
  if (score >= 70) {
    title = '✨ Odak akışındasın'; badgeCls = 'badge-good'; badgeTxt = 'Mükemmel';
    body = `
      <p>Odak skorun <strong>${score}</strong> — bu harika bir seviye!</p>
      <p>${durS > 2700
        ? `${Math.round(durS/60)} dk çalıştın; enerjiyi korumak için kısa bir su molası düşünebilirsin.`
        : 'Şu an zorlu ve önemli işler için en verimli zamanın. Bu tempoyu sürdür.'}</p>
    `;
  }
  // Senaryo: Düzenli kullanıcı (score >= 45)
  else if (score >= 45) {
    title = '👍 İyi gidiyorsun'; badgeCls = 'badge-mid'; badgeTxt = 'Normal';
    body = `
      <p>Odak skorun <strong>${score}</strong> — dengeli bir ritim.</p>
      <p>${writing === 'Aktif'
        ? 'Yazma aktiviten devam ediyor, bu iyi bir işaret.'
        : 'Dağıtıcı sekmeleri kapatmak veya müzik açmak odağını artırabilir.'}</p>
    `;
  }
  // Senaryo: Pasif kullanıcı (score >= 20)
  else if (score >= 20) {
    title = '📉 Dikkat dağılıyor'; badgeCls = 'badge-warn'; badgeTxt = 'Dikkat';
    body = `
      <p>Odak skorun <strong>${score}</strong> — biraz düşük.</p>
      <p>Küçük bir hedef belirle ve sadece ona odaklan. Pomodoro (25dk çalış / 5dk mola) işe yarayabilir.</p>
    `;
  }
  // Senaryo: Düzensiz / çok yorgun kullanıcı (score < 20)
  else {
    title = '⚠️ Yorgunluk uyarısı'; badgeCls = 'badge-danger'; badgeTxt = 'Kritik';
    body = `
      <p>Odak skorun <strong>${score}</strong> — ciddi bir düşüş yaşıyorsun.</p>
      <p>5–10 dakikalık gerçek bir mola ver: ekrandan uzaklaş, su iç, hareket et. Zorlamak şu an işe yaramaz.</p>
    `;
  }

  aiSubtitle.textContent = title;
  aiBadge.className = `ai-badge ${badgeCls} visible`; aiBadge.textContent = badgeTxt;
  aiBody.innerHTML = `${body}<div class="ai-reason">${reason}</div>`;
}

// ═══════════════════════════════════════════════════════════════
// BÖLÜM 8: API + BUTON HANDLER'LARI
// ═══════════════════════════════════════════════════════════════

function setNotice(msg, type = '') {
  noticeEl.textContent = msg;
  noticeEl.className   = 'notice-inline' + (type ? ` ${type}` : '');
}

async function apiStatus() {
  const r = await fetch('/status', {headers:{Accept:'application/json'}});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiControl(action) {
  const r = await fetch('/control', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({action}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiActivity() {
  if (!state.isRunning) return;
  const payload = {keystrokes: state.keystrokes, mouse_events: state.mouseEvents, active: state.isActive};
  state.keystrokes = 0; state.mouseEvents = 0; state.isActive = false;
  try {
    const r = await fetch('/activity', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (r.ok) updateUI(await r.json());
  } catch(_) {}
}

async function onStart() {
  setNotice('Başlatılıyor…');
  updateButtons('idle', true, false);
  // Yeni oturumda ortalama sayaçları sıfırla
  state.scoreSum = 0; state.scoreCount = 0; state.scoreHistory = []; state.prevScore = null;
  try {
    const data = await apiControl('start');
    updateUI(data);
    setNotice('Takip başlatıldı ✓', 'ok');
    setTimeout(() => setNotice(''), 2500);
    updateHistoryUI();  // grafik güncelle
  } catch(e) {
    setNotice('Başlatma başarısız oldu. Tekrar dene.', 'error');
    try { updateUI(await apiStatus()); } catch(_) {}
  }
}

async function onPause() {
  setNotice('Duraklatılıyor…');
  updateButtons('tracking', false, false);
  try {
    const data = await apiControl('pause');
    updateUI(data);
    setNotice('Oturum duraklatıldı ✓', 'ok');
    setTimeout(() => setNotice(''), 2500);
  } catch(e) {
    setNotice('Duraklatma başarısız oldu.', 'error');
    try { updateUI(await apiStatus()); } catch(_) {}
  }
}

async function onResume() {
  setNotice('Devam ediliyor…');
  updateButtons('paused', false, false);
  try {
    const data = await apiControl('resume');
    updateUI(data);
    setNotice('Oturum devam ediyor ✓', 'ok');
    setTimeout(() => setNotice(''), 2500);
  } catch(e) {
    setNotice('Devam ettirme başarısız oldu.', 'error');
    try { updateUI(await apiStatus()); } catch(_) {}
  }
}

async function onFinish() {
  if (btnFinish.disabled) return;
  setNotice('Oturum kaydediliyor…');
  updateButtons('idle', false, false);
  try {
    // Anlık durumu al
    const data = await apiStatus();
    const durationS = getElapsed();  // client-side timer değeri

    // localStorage'a kaydet
    finishAndSave(data, durationS);

    // Backend'e bitir komutu gönder
    await apiControl('finish').catch(() => {});

    // Timer durdur
    resetClientTimer();

    // Durum güncelle
    const newData = await apiStatus();
    updateUI(newData);

    // Grafiği güncelle
    updateHistoryUI();

    setNotice('✅ Oturum kaydedildi!', 'save');
    setTimeout(() => setNotice(''), 3500);
  } catch(e) {
    setNotice('Kayıt sırasında hata oluştu.', 'error');
    try { updateUI(await apiStatus()); } catch(_) {}
  }
}

btnStart .addEventListener('click', onStart);
btnPause .addEventListener('click', onPause);
btnResume.addEventListener('click', onResume);
btnFinish.addEventListener('click', onFinish);

// ─── Periyodik döngüler ────────────────────────────────────────
setInterval(apiActivity, 5000);

async function statusRefresh() {
  try { updateUI(await apiStatus()); }
  catch(_) { setNotice('Sunucuya bağlanılamadı…', 'error'); }
}

// ─── BAŞLANGIÇ ─────────────────────────────────────────────────
markTodayLogin();    // streak: bugünü işaretle
updateHistoryUI();   // grafik: localStorage'dan yükle
statusRefresh();     // durum: backend'den al
setInterval(statusRefresh, 10000);
