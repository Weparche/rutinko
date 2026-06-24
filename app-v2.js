const KEY = 'rutinko-state-v2';
const app = document.getElementById('app');
let tab = 'today';
let toastTimer;

const settingsDefault = { reminderIntervalMinutes: 5, snoozeMinutes: 30, quietStart: '22:30', quietEnd: '07:00' };
const templates = [
  ['Oprati zube', '🪥', '07:30', 'daily', 'higijena'],
  ['Pojesti doručak', '🍳', '08:00', 'daily', 'prehrana'],
  ['Popiti tablete', '💊', '08:15', 'daily', 'zdravlje'],
  ['20 trbušnjaka', '💪', '08:20', 'daily', 'tjelovježba'],
  ['20 trbušnjaka navečer', '💪', '20:00', 'daily', 'tjelovježba'],
  ['Otuširati se', '🚿', '20:30', 'daily', 'higijena'],
  ['Oprati zube navečer', '🪥', '21:30', 'daily', 'higijena'],
  ['Popiti vode', '💧', '12:00', 'daily', 'zdravlje'],
  ['Prijaviti porez', '📄', '09:00', 'once', 'obaveza'],
  ['Odvesti auto na servis', '🚗', '09:00', 'once', 'obaveza'],
  ['Platiti račun', '💶', '10:00', 'monthly', 'obaveza'],
  ['Nazvati doktora', '☎️', '10:00', 'once', 'zdravlje']
];

let state = load();
init();

function init() {
  registerSW();
  handleUrlAction();
  render();
  runReminderCheck();
  setInterval(runReminderCheck, 60_000);
  document.addEventListener('visibilitychange', () => !document.hidden && runReminderCheck());
}

function load() {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seedTasks(),
        done: parsed.done || {},
        snoozedUntil: parsed.snoozedUntil || {},
        lastNotified: parsed.lastNotified || {},
        settings: { ...settingsDefault, ...(parsed.settings || {}) }
      };
    } catch {}
  }
  return { tasks: seedTasks(), done: {}, snoozedUntil: {}, lastNotified: {}, settings: { ...settingsDefault } };
}

function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function seedTasks() { return templates.slice(0, 8).map(([title, icon, time, repeat, category]) => task(title, icon, time, repeat, category)); }
function task(title, icon, time, repeat, category) {
  return { id: uid(), title, icon, time, repeat, category, createdAt: new Date().toISOString(), active: true };
}
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function render() {
  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="logo-wrap"><div class="logo">✓</div><div><p class="eyebrow">Rutinko</p><h1>${title()}</h1></div></div>
        <div class="today-date">${new Intl.DateTimeFormat('hr-HR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</div>
      </header>
      ${tab === 'today' ? viewToday() : tab === 'add' ? viewAdd() : tab === 'routines' ? viewRoutines() : viewSettings()}
    </main>
    ${nav()}
  `;
  bind();
}

function title() { return { today: 'Danas', add: 'Dodaj', routines: 'Rutine', settings: 'Postavke' }[tab]; }

function viewToday() {
  const tasks = todayTasks();
  const done = tasks.filter(t => isDone(t)).length;
  const left = tasks.length - done;
  const ex = exerciseToday();
  const week = exerciseWeek();
  const groups = group(tasks.filter(t => !isDone(t)));
  const notice = notificationPermission() === 'granted' ? '' : `<div class="notice"><strong>Uključi podsjetnike.</strong> Browser traži dozvolu za notifikacije. Najbolje radi kad je PWA instaliran na mobitel.</div>`;
  return `
    <section class="hero-card">
      <h2>${left ? `Još ${left} ${left === 1 ? 'stvar' : 'stvari'}.` : 'Mirna glava.'}</h2>
      <p>${left ? 'Rutinko te podsjeća dok ne stisneš završeno ili odgodiš.' : 'Sve osnovno za danas je riješeno.'}</p>
      <div class="progress-grid">
        <div class="progress-pill"><strong>${done}/${tasks.length}</strong><span>Dnevni zadaci</span></div>
        <div class="progress-pill"><strong>${ex.done}/${ex.total}</strong><span>Mini trening danas</span></div>
        <div class="progress-pill"><strong>${week.done}/${week.total}</strong><span>Mini treninzi ovaj tjedan</span></div>
        <div class="progress-pill"><strong>${state.settings.reminderIntervalMinutes} min</strong><span>Ponavljanje</span></div>
      </div>
    </section>
    ${notice}
    <button class="btn btn-primary" data-action="notify" ${notificationPermission() === 'granted' ? 'disabled' : ''}>${notificationPermission() === 'granted' ? 'Podsjetnici uključeni' : 'Uključi podsjetnike'}</button>
    ${section('Jutro', groups.morning)}${section('Dan', groups.day)}${section('Večer', groups.evening)}${section('Jednokratno', groups.once)}${completedSection(tasks)}
  `;
}

function section(name, list) {
  if (!list.length) return '';
  return `<section><div class="section-head"><h3>${name}</h3><span>${list.length}</span></div><div class="task-list">${list.map(card).join('')}</div></section>`;
}

function completedSection(tasks) {
  const list = tasks.filter(t => isDone(t));
  return list.length ? `<section><div class="section-head"><h3>Gotovo</h3><span>${list.length}</span></div><div class="task-list">${list.map(card).join('')}</div></section>` : '';
}

function card(t) {
  const key = occurrenceId(t);
  const done = isDone(t);
  const status = taskStatus(t);
  const snoozed = state.snoozedUntil[key] && Date.now() < Number(state.snoozedUntil[key]);
  return `
    <article class="task-card ${status.className} ${done ? 'done' : ''}">
      <div class="task-main"><div class="task-icon">${esc(t.icon || '✓')}</div><div class="task-info"><div class="task-title-row"><p class="task-title">${esc(t.title)}</p><span class="task-time">${t.time}</span></div><p class="task-meta">${status.label}${snoozed ? ` · odgođeno do ${hhmm(new Date(Number(state.snoozedUntil[key])))}` : ''}</p></div></div>
      <div class="task-actions ${done ? '' : 'three'}">
        ${done
          ? `<button class="btn btn-soft" data-action="undo" data-id="${t.id}">Vrati</button><button class="btn btn-danger-soft" data-action="delete" data-id="${t.id}">Obriši</button>`
          : `<button class="btn btn-primary" data-action="done" data-id="${t.id}">Završeno</button><button class="btn btn-soft" data-action="snooze" data-id="${t.id}">Odgodi ${state.settings.snoozeMinutes} min</button><button class="btn btn-plain" data-action="remind5" data-id="${t.id}">Podsjeti za 5 min</button>`}
      </div>
    </article>`;
}

function viewAdd() {
  return `<section class="panel"><div class="form-grid">
    ${field('Naziv zadatka', '<input id="f-title" placeholder="npr. Popiti tablete" />')}
    <div class="two-col">${field('Ikona', '<input id="f-icon" value="✓" maxlength="4" />')}${field('Vrijeme', '<input id="f-time" type="time" value="09:00" />')}</div>
    <div class="two-col">${field('Ponavljanje', select('f-repeat', [['once','Jednom'],['daily','Svaki dan'],['weekdays','Radnim danom'],['weekly','Tjedno'],['monthly','Mjesečno']], 'daily'))}${field('Kategorija', select('f-category', [['higijena','Higijena'],['prehrana','Prehrana'],['zdravlje','Zdravlje'],['tjelovježba','Tjelovježba'],['obaveza','Obaveza']], 'obaveza'))}</div>
    <button class="btn btn-primary" data-action="save-task">Spremi zadatak</button>
  </div></section>`;
}

function viewRoutines() {
  return `<section class="panel"><p class="task-meta" style="margin-top:0">Dodaj gotove rutine jednim klikom.</p><div class="template-grid">${templates.map((tpl, i) => {
    const [title, icon, time, repeat, category] = tpl;
    return `<div class="template-card"><div><strong>${icon} ${esc(title)}</strong><span>${time} · ${repeatLabel(repeat)} · ${category}</span></div><button class="btn btn-soft" data-action="template" data-index="${i}">Dodaj</button></div>`;
  }).join('')}</div></section>`;
}

function viewSettings() {
  return `<section class="panel">
    ${settingRow('Ponavljaj podsjetnik', 'Kad ništa ne stisneš.', 's-reminder', 'number', state.settings.reminderIntervalMinutes, '1', '60')}
    ${settingRow('Odgoda', 'Brzi gumb za odgodu.', 's-snooze', 'number', state.settings.snoozeMinutes, '5', '240')}
    ${settingRow('Tišina od', 'Ne gnjavi dok spavaš.', 's-quiet-start', 'time', state.settings.quietStart)}
    ${settingRow('Tišina do', 'Podsjetnici se nastavljaju poslije.', 's-quiet-end', 'time', state.settings.quietEnd)}
    <button class="btn btn-primary" data-action="save-settings" style="width:100%;margin-top:14px">Spremi postavke</button>
    <button class="btn btn-danger-soft" data-action="reset" style="width:100%;margin-top:10px">Vrati početne zadatke</button>
  </section>`;
}

function field(label, control) { return `<div class="field"><label>${label}</label>${control}</div>`; }
function select(id, opts, selected) { return `<select id="${id}">${opts.map(([v,l]) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${l}</option>`).join('')}</select>`; }
function settingRow(title, text, id, type, value, min = '', max = '') { return `<div class="settings-row"><div><strong>${title}</strong><p>${text}</p></div><input id="${id}" type="${type}" value="${value}" ${min ? `min="${min}"` : ''} ${max ? `max="${max}"` : ''}/></div>`; }
function nav() { return `<nav class="bottom-nav">${navItem('today','✓','Danas')}${navItem('add','+','Dodaj')}${navItem('routines','↻','Rutine')}${navItem('settings','⚙','Postavke')}</nav>`; }
function navItem(id, icon, label) { return `<button class="nav-btn ${tab === id ? 'active' : ''}" data-tab="${id}"><b>${icon}</b>${label}</button>`; }

function bind() {
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
  document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => action(b.dataset.action, b));
}

async function action(name, el) {
  if (name === 'notify') return requestNotifications();
  if (name === 'save-task') return saveTask();
  if (name === 'save-settings') return saveSettings();
  if (name === 'template') return addTemplate(Number(el.dataset.index));
  if (name === 'reset') return resetApp();
  const id = el.dataset.id;
  if (name === 'done') markDone(id);
  if (name === 'undo') undoDone(id);
  if (name === 'snooze') snooze(id, state.settings.snoozeMinutes);
  if (name === 'remind5') snooze(id, 5);
  if (name === 'delete') deleteTask(id);
  save(); render();
}

function saveTask() {
  const title = val('f-title').trim();
  if (!title) return toast('Upiši naziv zadatka.');
  state.tasks.push(task(title, val('f-icon') || '✓', val('f-time') || '09:00', val('f-repeat'), val('f-category')));
  save(); tab = 'today'; toast('Zadatak dodan.'); render();
}
function saveSettings() {
  state.settings = {
    reminderIntervalMinutes: clamp(Number(val('s-reminder')), 1, 60),
    snoozeMinutes: clamp(Number(val('s-snooze')), 5, 240),
    quietStart: val('s-quiet-start') || '22:30',
    quietEnd: val('s-quiet-end') || '07:00'
  };
  save(); toast('Postavke spremljene.'); render();
}
function addTemplate(i) { const t = templates[i]; if (!t) return; state.tasks.push(task(...t)); save(); tab = 'today'; toast('Rutina dodana.'); render(); }
function resetApp() { if (!confirm('Vratiti početne zadatke i obrisati trenutne podatke?')) return; state = { tasks: seedTasks(), done: {}, snoozedUntil: {}, lastNotified: {}, settings: { ...settingsDefault } }; save(); tab = 'today'; toast('Rutinko je resetiran.'); render(); }

function markDone(id, date = todayKey()) { const t = byId(id); if (!t) return; state.done[occurrenceId(t, date)] = Date.now(); delete state.snoozedUntil[occurrenceId(t, date)]; }
function undoDone(id, date = todayKey()) { const t = byId(id); if (!t) return; delete state.done[occurrenceId(t, date)]; }
function snooze(id, minutes, date = todayKey()) { const t = byId(id); if (!t) return; state.snoozedUntil[occurrenceId(t, date)] = Date.now() + minutes * 60_000; toast(`Odgođeno za ${minutes} min.`); }
function deleteTask(id) { state.tasks = state.tasks.filter(t => t.id !== id); ['done','snoozedUntil','lastNotified'].forEach(bucket => Object.keys(state[bucket]).forEach(k => k.startsWith(`${id}::`) && delete state[bucket][k])); toast('Zadatak obrisan.'); }
function byId(id) { return state.tasks.find(t => t.id === id); }

function todayTasks() { return state.tasks.filter(t => t.active !== false && occursOn(t, new Date())).sort((a,b) => a.time.localeCompare(b.time)); }
function occursOn(t, date) {
  const created = new Date(t.createdAt || Date.now());
  if (startDay(date) < startDay(created)) return false;
  if (t.repeat === 'once') return dateKey(date) === dateKey(created);
  if (t.repeat === 'daily') return true;
  if (t.repeat === 'weekdays') return date.getDay() >= 1 && date.getDay() <= 5;
  if (t.repeat === 'weekly') return date.getDay() === created.getDay();
  if (t.repeat === 'monthly') return date.getDate() === created.getDate();
  return true;
}
function group(list) {
  return list.reduce((g, t) => { let p = dayPart(t.time); if (t.repeat === 'once' && t.category === 'obaveza') p = 'once'; g[p].push(t); return g; }, { morning: [], day: [], evening: [], once: [] });
}
function dayPart(time) { const h = Number(time.slice(0,2)); return h < 12 ? 'morning' : h < 18 ? 'day' : 'evening'; }
function taskStatus(t) { if (isDone(t)) return { label: 'Završeno danas', className: 'done' }; const m = Math.floor((Date.now() - dueTime(t).getTime()) / 60_000); if (m < 0) return { label: `Dolazi za ${Math.abs(m)} min`, className: '' }; if (m >= 30) return { label: `Kasni ${m} min`, className: 'urgent' }; return { label: m ? `Kasni ${m} min` : 'Sad je vrijeme', className: 'overdue' }; }
function exerciseToday() { const e = todayTasks().filter(t => t.category === 'tjelovježba'); return { total: e.length, done: e.filter(isDone).length }; }
function exerciseWeek() { let total = 0, done = 0; const dates = weekDates(); const ex = state.tasks.filter(t => t.category === 'tjelovježba' && t.active !== false); dates.forEach(d => ex.forEach(t => { if (occursOn(t, d)) { total++; if (isDone(t, dateKey(d))) done++; } })); return { total, done }; }

function runReminderCheck() {
  if (notificationPermission() !== 'granted' || quietNow()) return;
  todayTasks().forEach(t => {
    const key = occurrenceId(t);
    if (state.done[key]) return;
    const now = Date.now();
    if (now < dueTime(t).getTime()) return;
    if (state.snoozedUntil[key] && now < Number(state.snoozedUntil[key])) return;
    const last = Number(state.lastNotified[key] || 0);
    if (last && now - last < state.settings.reminderIntervalMinutes * 60_000) return;
    notify(t, key); state.lastNotified[key] = now; save();
  });
}
async function notify(t, key) {
  const options = { body: 'Stisni Završeno ili odgodi podsjetnik.', tag: key, renotify: true, icon: './icons/icon-192.svg', badge: './icons/icon-192.svg', data: { occurrenceId: key }, actions: [{ action: 'done', title: 'Završeno' }, { action: 'snooze30', title: `Odgodi ${state.settings.snoozeMinutes} min` }] };
  if ('serviceWorker' in navigator) (await navigator.serviceWorker.ready).showNotification(`${t.icon || '✓'} ${t.title}`, options);
  else new Notification(`${t.icon || '✓'} ${t.title}`, options);
}
async function requestNotifications() { if (!('Notification' in window)) return toast('Ovaj browser ne podržava notifikacije.'); const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Podsjetnici su uključeni.' : 'Podsjetnici nisu odobreni.'); runReminderCheck(); render(); }
function notificationPermission() { return 'Notification' in window ? Notification.permission : 'unsupported'; }
function registerSW() { if (!('serviceWorker' in navigator)) return; window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js')); navigator.serviceWorker.addEventListener('message', e => handleNotificationAction(e.data?.action, e.data?.occurrenceId)); }
function handleUrlAction() { const p = new URLSearchParams(location.search); if (p.get('action') && p.get('occurrenceId')) { handleNotificationAction(p.get('action'), p.get('occurrenceId')); history.replaceState(null, '', location.pathname); } }
function handleNotificationAction(action, occurrenceId) { if (!occurrenceId) return; const id = occurrenceId.split('::')[0]; if (action === 'done') markDone(id); if (action === 'snooze30') snooze(id, state.settings.snoozeMinutes); save(); render(); }

function isDone(t, date = todayKey()) { return Boolean(state.done[occurrenceId(t, date)]); }
function occurrenceId(t, date = todayKey()) { return `${t.id}::${date}`; }
function dueTime(t, base = new Date()) { const [h,m] = t.time.split(':').map(Number); const d = new Date(base); d.setHours(h,m,0,0); return d; }
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayKey() { return dateKey(new Date()); }
function startDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function weekDates() { const now = new Date(); const day = now.getDay() || 7; const monday = startDay(now); monday.setDate(now.getDate() - day + 1); return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; }); }
function quietNow() { const now = mins(hhmm(new Date())), s = mins(state.settings.quietStart), e = mins(state.settings.quietEnd); return s === e ? false : s < e ? now >= s && now < e : now >= s || now < e; }
function mins(t) { const [h,m] = t.split(':').map(Number); return h * 60 + m; }
function hhmm(d) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function val(id) { return document.getElementById(id)?.value || ''; }
function clamp(n, min, max) { return Number.isNaN(n) ? min : Math.min(max, Math.max(min, n)); }
function repeatLabel(r) { return ({ once: 'jednom', daily: 'svaki dan', weekdays: 'radnim danom', weekly: 'tjedno', monthly: 'mjesečno' })[r] || r; }
function esc(v) { return String(v).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c])); }
function toast(msg) { clearTimeout(toastTimer); document.querySelector('.toast')?.remove(); const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); toastTimer = setTimeout(() => el.remove(), 2600); }
