const STORAGE_KEY = 'rutinko-state-v3';
const app = document.getElementById('app');
let activeTab = 'today';
let toastTimer = null;

const DEFAULT_SETTINGS = {
  reminderIntervalMinutes: 5,
  snoozeMinutes: 30,
  quietStart: '22:30',
  quietEnd: '07:00'
};

const TEMPLATE_DATA = [
  { title: 'Oprati zube', icon: '🪥', time: '07:30', repeat: 'daily', category: 'higijena' },
  { title: 'Pojesti doručak', icon: '🍳', time: '08:00', repeat: 'daily', category: 'prehrana' },
  { title: 'Popiti tablete', icon: '💊', time: '08:15', repeat: 'daily', category: 'zdravlje' },
  { title: '20 trbušnjaka', icon: '💪', time: '08:20', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Popiti vode', icon: '💧', time: '12:00', repeat: 'daily', category: 'zdravlje' },
  { title: '20 trbušnjaka', icon: '💪', time: '20:00', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Otuširati se', icon: '🚿', time: '20:30', repeat: 'daily', category: 'higijena' },
  { title: 'Oprati zube navečer', icon: '🪥', time: '21:30', repeat: 'daily', category: 'higijena' },
  { title: 'Prijaviti porez', icon: '📄', time: '09:00', repeat: 'yearly', category: 'obaveza' },
  { title: 'Odvesti auto na servis', icon: '🚗', time: '09:00', repeat: 'once', category: 'obaveza' },
  { title: 'Platiti račun', icon: '💶', time: '10:00', repeat: 'monthly', category: 'obaveza' },
  { title: 'Nazvati doktora', icon: '☎️', time: '10:00', repeat: 'once', category: 'zdravlje' }
];

let state = loadState();

init();

function init() {
  registerServiceWorker();
  handleUrlAction();
  render();
  runReminderCheck();
  setInterval(runReminderCheck, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) runReminderCheck();
  });
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seedTasks(),
        done: parsed.done || {},
        snoozedUntil: parsed.snoozedUntil || {},
        lastNotified: parsed.lastNotified || {},
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
      };
    } catch {}
  }

  return {
    tasks: seedTasks(),
    done: {},
    snoozedUntil: {},
    lastNotified: {},
    settings: { ...DEFAULT_SETTINGS }
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedTasks() {
  return TEMPLATE_DATA.slice(0, 8).map((template) => createTask(template));
}

function createTask(template) {
  return {
    id: createId(),
    title: template.title,
    icon: template.icon,
    time: template.time,
    repeat: template.repeat,
    category: template.category,
    createdAt: new Date().toISOString(),
    active: true
  };
}

function createId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function render() {
  app.innerHTML = `
    <main class="app-shell">
      ${renderHeader()}
      ${activeTab === 'today' ? renderToday() : ''}
      ${activeTab === 'add' ? renderAddTask() : ''}
      ${activeTab === 'routines' ? renderRoutines() : ''}
      ${activeTab === 'settings' ? renderSettings() : ''}
    </main>
    ${renderNav()}
  `;
  bindEvents();
}

function renderHeader() {
  const label = {
    today: 'Danas',
    add: 'Dodaj zadatak',
    routines: 'Rutine',
    settings: 'Postavke'
  }[activeTab];

  if (activeTab === 'add') {
    return `
      <header class="screen-header centered">
        <button class="icon-button ghost" data-tab="today" aria-label="Natrag">←</button>
        <h1>${label}</h1>
        <span class="header-spacer"></span>
      </header>
    `;
  }

  return `
    <header class="screen-header">
      <div>
        <p class="app-name">Rutinko</p>
        <h1>${label}</h1>
      </div>
      ${activeTab === 'today'
        ? `<button class="icon-button" data-action="notify" aria-label="Podsjetnici">🔔</button>`
        : `<button class="fab-small" data-tab="add" aria-label="Dodaj">+</button>`}
    </header>
  `;
}

function renderToday() {
  const tasks = getTodayTasks();
  const doneCount = tasks.filter((task) => isDone(task)).length;
  const leftCount = tasks.length - doneCount;
  const exerciseToday = getExerciseToday();
  const exerciseWeek = getExerciseWeek();
  const progressPercent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const groups = groupTasks(tasks.filter((task) => !isDone(task)));
  const permission = getNotificationPermission();

  return `
    <section class="hero-card">
      <div class="hero-copy">
        <h2>${leftCount ? `Još ${leftCount} ${leftCount === 1 ? 'stvar' : 'stvari'}.` : 'Mirna glava.'}</h2>
        <p>${leftCount ? 'Ti to možeš! 💙' : 'Sve bitno za danas je riješeno.'}</p>
      </div>
      <div class="ring" style="--value:${progressPercent}">
        <span>${doneCount}/${tasks.length}</span>
        <small>završeno</small>
      </div>
      <div class="hero-stats">
        <div>
          <span>Mini trening danas</span>
          <strong>${exerciseToday.done}/${exerciseToday.total}</strong>
          <i style="--bar:${exerciseToday.total ? (exerciseToday.done / exerciseToday.total) * 100 : 0}%"></i>
        </div>
        <div>
          <span>Mini treninzi ovaj tjedan</span>
          <strong>${exerciseWeek.done}/${exerciseWeek.total}</strong>
          <i style="--bar:${exerciseWeek.total ? (exerciseWeek.done / exerciseWeek.total) * 100 : 0}%"></i>
        </div>
      </div>
    </section>

    ${permission === 'granted' ? '' : `<button class="enable-card" data-action="notify">🔔 Uključi podsjetnike</button>`}

    ${renderTaskSection('Jutro ☀️', groups.morning)}
    ${renderTaskSection('Dan ☀️', groups.day)}
    ${renderTaskSection('Večer 🌙', groups.evening)}
    ${renderTaskSection('Jednokratno', groups.once)}
    ${renderCompleted(tasks)}
  `;
}

function renderTaskSection(title, tasks) {
  if (!tasks.length) return '';
  return `
    <section class="task-section">
      <div class="section-title">
        <h2>${title}</h2>
        <button class="collapse-dot" aria-label="Sekcija">⌃</button>
      </div>
      <div class="task-list">${tasks.map(renderTaskCard).join('')}</div>
    </section>
  `;
}

function renderCompleted(tasks) {
  const completed = tasks.filter((task) => isDone(task));
  if (!completed.length) return '';

  return `
    <section class="task-section completed-section">
      <div class="section-title">
        <h2>Gotovo ✅</h2>
        <span>${completed.length}</span>
      </div>
      <div class="task-list">${completed.map(renderTaskCard).join('')}</div>
    </section>
  `;
}

function renderTaskCard(task) {
  const done = isDone(task);
  const status = getTaskStatus(task);
  const key = occurrenceId(task);
  const snoozed = state.snoozedUntil[key] && Date.now() < Number(state.snoozedUntil[key]);
  const snoozeLabel = snoozed ? ` · odgođeno do ${formatTime(new Date(Number(state.snoozedUntil[key])))}` : '';

  return `
    <article class="task-card ${status.className} ${done ? 'done' : ''}">
      <div class="task-left">
        <div class="task-icon">${escapeHtml(task.icon || '✓')}</div>
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p>${task.time} ${status.label ? `· ${status.label}` : ''}${snoozeLabel}</p>
        </div>
      </div>
      <div class="task-actions">
        ${done
          ? `<button class="mini-action success" data-action="undo" data-id="${task.id}"><strong>↩</strong><span>Vrati</span></button><button class="mini-action danger" data-action="delete" data-id="${task.id}"><strong>×</strong><span>Obriši</span></button>`
          : `<button class="mini-action success" data-action="done" data-id="${task.id}"><strong>✓</strong><span>Završeno</span></button><button class="mini-action" data-action="snooze" data-id="${task.id}"><strong>◷</strong><span>Odgodi<br>${state.settings.snoozeMinutes} min</span></button><button class="mini-action" data-action="remind5" data-id="${task.id}"><strong>♢</strong><span>Podsjeti<br>za 5 min</span></button>`}
      </div>
    </article>
  `;
}

function renderAddTask() {
  return `
    <section class="form-stack">
      <label class="form-row">
        <span class="row-icon">✎</span>
        <span><small>Naziv zadatka</small><input id="task-title" value="20 trbušnjaka" /></span>
      </label>
      <label class="form-row">
        <span class="row-icon">💪</span>
        <span><small>Ikona</small><input id="task-icon" value="💪" maxlength="4" /></span>
      </label>
      <label class="form-row">
        <span class="row-icon">◷</span>
        <span><small>Vrijeme</small><input id="task-time" type="time" value="20:00" /></span>
      </label>
      <label class="form-row">
        <span class="row-icon">↻</span>
        <span><small>Ponavljanje</small>${renderSelect('task-repeat', [['once','Jednom'],['daily','Svaki dan'],['weekdays','Radnim danom'],['weekly','Tjedno'],['monthly','Mjesečno'],['yearly','Svake godine']], 'daily')}</span>
      </label>
      <label class="form-row">
        <span class="row-icon">◇</span>
        <span><small>Kategorija</small>${renderSelect('task-category', [['higijena','Higijena'],['prehrana','Prehrana'],['zdravlje','Zdravlje'],['tjelovježba','Tjelovježba'],['obaveza','Obaveza']], 'tjelovježba')}</span>
      </label>
      <button class="primary-cta" data-action="save-task">Spremi zadatak</button>
    </section>
  `;
}

function renderRoutines() {
  return `
    <section class="routine-list">
      ${TEMPLATE_DATA.map((template, index) => `
        <article class="routine-card">
          <div class="routine-icon">${escapeHtml(template.icon)}</div>
          <div>
            <h3>${escapeHtml(template.title)}</h3>
            <p>${repeatDisplayDate(template)} · ${repeatLabel(template.repeat)}</p>
          </div>
          <button data-action="template" data-index="${index}">Dodaj</button>
        </article>
      `).join('')}
      <div class="info-card">✦ Rutine su gotovi zadaci koje možeš brzo dodati u svoj dan.</div>
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="settings-stack">
      ${renderSetting('Ponavljaj podsjetnik', 'Kad ništa ne stisneš.', 'setting-reminder', 'number', state.settings.reminderIntervalMinutes, '1', '60')}
      ${renderSetting('Odgoda', 'Brzi gumb za odgodu.', 'setting-snooze', 'number', state.settings.snoozeMinutes, '5', '240')}
      ${renderSetting('Tišina od', 'Ne gnjavi dok spavaš.', 'setting-quiet-start', 'time', state.settings.quietStart)}
      ${renderSetting('Tišina do', 'Podsjetnici se nastavljaju poslije.', 'setting-quiet-end', 'time', state.settings.quietEnd)}
      <button class="primary-cta" data-action="save-settings">Spremi postavke</button>
      <button class="danger-cta" data-action="reset">Vrati početne zadatke</button>
    </section>
  `;
}

function renderSetting(title, description, id, type, value, min = '', max = '') {
  return `
    <label class="setting-row">
      <span><strong>${title}</strong><small>${description}</small></span>
      <input id="${id}" type="${type}" value="${value}" ${min ? `min="${min}"` : ''} ${max ? `max="${max}"` : ''} />
    </label>
  `;
}

function renderSelect(id, options, selected) {
  return `<select id="${id}">${options.map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
}

function renderNav() {
  return `
    <nav class="bottom-nav">
      ${renderNavItem('today', '▣', 'Danas')}
      ${renderNavItem('add', '+', 'Dodaj')}
      ${renderNavItem('routines', '▤', 'Rutine')}
      ${renderNavItem('settings', '⚙', 'Postavke')}
    </nav>
  `;
}

function renderNavItem(tab, icon, label) {
  return `<button class="nav-item ${activeTab === tab ? 'active' : ''}" data-tab="${tab}"><strong>${icon}</strong><span>${label}</span></button>`;
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => handleAction(button.dataset.action, button));
  });
}

async function handleAction(action, element) {
  if (action === 'notify') return requestNotifications();
  if (action === 'save-task') return saveTaskFromForm();
  if (action === 'save-settings') return saveSettingsFromForm();
  if (action === 'template') return addTemplate(Number(element.dataset.index));
  if (action === 'reset') return resetApp();

  const id = element.dataset.id;
  if (!id) return;

  if (action === 'done') markDone(id);
  if (action === 'undo') undoDone(id);
  if (action === 'snooze') snooze(id, state.settings.snoozeMinutes);
  if (action === 'remind5') snooze(id, 5);
  if (action === 'delete') deleteTask(id);

  saveState();
  render();
}

function saveTaskFromForm() {
  const title = valueOf('task-title').trim();
  if (!title) return showToast('Upiši naziv zadatka.');

  state.tasks.push(createTask({
    title,
    icon: valueOf('task-icon') || '✓',
    time: valueOf('task-time') || '09:00',
    repeat: valueOf('task-repeat') || 'daily',
    category: valueOf('task-category') || 'obaveza'
  }));

  saveState();
  activeTab = 'today';
  showToast('Zadatak dodan.');
  render();
}

function saveSettingsFromForm() {
  state.settings = {
    reminderIntervalMinutes: clamp(Number(valueOf('setting-reminder')), 1, 60),
    snoozeMinutes: clamp(Number(valueOf('setting-snooze')), 5, 240),
    quietStart: valueOf('setting-quiet-start') || '22:30',
    quietEnd: valueOf('setting-quiet-end') || '07:00'
  };

  saveState();
  showToast('Postavke spremljene.');
  render();
}

function addTemplate(index) {
  const template = TEMPLATE_DATA[index];
  if (!template) return;
  state.tasks.push(createTask(template));
  saveState();
  activeTab = 'today';
  showToast('Rutina dodana.');
  render();
}

function resetApp() {
  if (!confirm('Vratiti početne zadatke i obrisati trenutne podatke?')) return;
  state = {
    tasks: seedTasks(),
    done: {},
    snoozedUntil: {},
    lastNotified: {},
    settings: { ...DEFAULT_SETTINGS }
  };
  saveState();
  activeTab = 'today';
  showToast('Rutinko je resetiran.');
  render();
}

function markDone(id, date = todayKey()) {
  const task = findTask(id);
  if (!task) return;
  state.done[occurrenceId(task, date)] = Date.now();
  delete state.snoozedUntil[occurrenceId(task, date)];
}

function undoDone(id, date = todayKey()) {
  const task = findTask(id);
  if (!task) return;
  delete state.done[occurrenceId(task, date)];
}

function snooze(id, minutes, date = todayKey()) {
  const task = findTask(id);
  if (!task) return;
  state.snoozedUntil[occurrenceId(task, date)] = Date.now() + minutes * 60 * 1000;
  showToast(`Odgođeno za ${minutes} min.`);
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  for (const bucket of ['done', 'snoozedUntil', 'lastNotified']) {
    Object.keys(state[bucket]).forEach((key) => {
      if (key.startsWith(`${id}::`)) delete state[bucket][key];
    });
  }
  showToast('Zadatak obrisan.');
}

function findTask(id) {
  return state.tasks.find((task) => task.id === id);
}

function getTodayTasks() {
  return state.tasks
    .filter((task) => task.active !== false && occursOn(task, new Date()))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function occursOn(task, date) {
  const created = new Date(task.createdAt || Date.now());
  if (startOfDay(date) < startOfDay(created)) return false;

  if (task.repeat === 'once') return dateKey(date) === dateKey(created);
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekdays') return date.getDay() >= 1 && date.getDay() <= 5;
  if (task.repeat === 'weekly') return date.getDay() === created.getDay();
  if (task.repeat === 'monthly') return date.getDate() === created.getDate();
  if (task.repeat === 'yearly') return date.getDate() === created.getDate() && date.getMonth() === created.getMonth();
  return true;
}

function groupTasks(tasks) {
  return tasks.reduce((groups, task) => {
    let part = getDayPart(task.time);
    if (task.repeat === 'once' && task.category === 'obaveza') part = 'once';
    groups[part].push(task);
    return groups;
  }, { morning: [], day: [], evening: [], once: [] });
}

function getDayPart(time) {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

function getTaskStatus(task) {
  if (isDone(task)) return { label: 'završeno', className: 'done' };

  const minutes = Math.floor((Date.now() - dueTime(task).getTime()) / 60000);
  if (minutes < 0) return { label: `za ${Math.abs(minutes)} min`, className: '' };
  if (minutes >= 30) return { label: `kasni ${minutes} min`, className: 'urgent' };
  if (minutes > 0) return { label: `kasni ${minutes} min`, className: 'overdue' };
  return { label: 'sad', className: 'overdue' };
}

function getExerciseToday() {
  const exercises = getTodayTasks().filter((task) => task.category === 'tjelovježba');
  return {
    total: exercises.length,
    done: exercises.filter((task) => isDone(task)).length
  };
}

function getExerciseWeek() {
  const exercises = state.tasks.filter((task) => task.category === 'tjelovježba' && task.active !== false);
  const dates = currentWeekDates();
  let total = 0;
  let done = 0;

  dates.forEach((date) => {
    exercises.forEach((task) => {
      if (!occursOn(task, date)) return;
      total += 1;
      if (isDone(task, dateKey(date))) done += 1;
    });
  });

  return { total, done };
}

function runReminderCheck() {
  if (getNotificationPermission() !== 'granted') return;
  if (isQuietTime()) return;

  getTodayTasks().forEach((task) => {
    const key = occurrenceId(task);
    if (state.done[key]) return;

    const now = Date.now();
    if (now < dueTime(task).getTime()) return;
    if (state.snoozedUntil[key] && now < Number(state.snoozedUntil[key])) return;

    const last = Number(state.lastNotified[key] || 0);
    const interval = state.settings.reminderIntervalMinutes * 60 * 1000;
    if (last && now - last < interval) return;

    sendNotification(task, key);
    state.lastNotified[key] = now;
    saveState();
  });
}

async function sendNotification(task, key) {
  const options = {
    body: 'Stisni Završeno ili odgodi podsjetnik.',
    tag: key,
    renotify: true,
    icon: './icons/icon-192.svg',
    badge: './icons/icon-192.svg',
    data: { occurrenceId: key },
    actions: [
      { action: 'done', title: 'Završeno' },
      { action: 'snooze30', title: `Odgodi ${state.settings.snoozeMinutes} min` }
    ]
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(`${task.icon || '✓'} ${task.title}`, options);
  } else {
    new Notification(`${task.icon || '✓'} ${task.title}`, options);
  }
}

async function requestNotifications() {
  if (!('Notification' in window)) return showToast('Ovaj browser ne podržava notifikacije.');

  const permission = await Notification.requestPermission();
  showToast(permission === 'granted' ? 'Podsjetnici su uključeni.' : 'Podsjetnici nisu odobreni.');
  runReminderCheck();
  render();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    handleNotificationAction(event.data?.action, event.data?.occurrenceId);
  });
}

function handleUrlAction() {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('action') || !params.get('occurrenceId')) return;

  handleNotificationAction(params.get('action'), params.get('occurrenceId'));
  history.replaceState(null, '', window.location.pathname);
}

function handleNotificationAction(action, occurrence) {
  if (!occurrence) return;
  const id = occurrence.split('::')[0];
  if (action === 'done') markDone(id);
  if (action === 'snooze30') snooze(id, state.settings.snoozeMinutes);
  saveState();
  render();
}

function getNotificationPermission() {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

function isDone(task, date = todayKey()) {
  return Boolean(state.done[occurrenceId(task, date)]);
}

function occurrenceId(task, date = todayKey()) {
  return `${task.id}::${date}`;
}

function dueTime(task, base = new Date()) {
  const [hours, minutes] = task.time.split(':').map(Number);
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function todayKey() {
  return dateKey(new Date());
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function currentWeekDates() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = startOfDay(now);
  monday.setDate(now.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function isQuietTime(date = new Date()) {
  const current = toMinutes(formatTime(date));
  const start = toMinutes(state.settings.quietStart);
  const end = toMinutes(state.settings.quietEnd);

  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function repeatDisplayDate(template) {
  if (template.repeat === 'yearly') return '1. ožu';
  return template.time;
}

function repeatLabel(repeat) {
  return {
    once: 'Jednom',
    daily: 'Svaki dan',
    weekdays: 'Radnim danom',
    weekly: 'Svaki tjedan',
    monthly: 'Svaki mjesec',
    yearly: 'Svake godine'
  }[repeat] || repeat;
}

function valueOf(id) {
  return document.getElementById(id)?.value || '';
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function showToast(message) {
  clearTimeout(toastTimer);
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => toast.remove(), 2600);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[char]));
}
