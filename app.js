const STORAGE_KEY = 'rutinko-state-v1';

const DEFAULT_SETTINGS = {
  reminderIntervalMinutes: 5,
  snoozeMinutes: 30,
  quietStart: '22:30',
  quietEnd: '07:00'
};

const DEFAULT_TASKS = [
  makeTask('Oprati zube', '🪥', '07:30', 'daily', 'higijena'),
  makeTask('Pojesti doručak', '🍳', '08:00', 'daily', 'prehrana'),
  makeTask('Popiti tablete', '💊', '08:15', 'daily', 'zdravlje'),
  makeTask('20 trbušnjaka', '💪', '08:20', 'daily', 'tjelovježba'),
  makeTask('Popiti vode', '💧', '12:00', 'daily', 'zdravlje'),
  makeTask('20 trbušnjaka', '💪', '20:00', 'daily', 'tjelovježba'),
  makeTask('Otuširati se', '🚿', '20:30', 'daily', 'higijena'),
  makeTask('Oprati zube', '🪥', '21:30', 'daily', 'higijena')
];

const TEMPLATES = [
  makeTemplate('Oprati zube', '🪥', '07:30', 'daily', 'higijena'),
  makeTemplate('Pojesti doručak', '🍳', '08:00', 'daily', 'prehrana'),
  makeTemplate('Popiti tablete', '💊', '08:15', 'daily', 'zdravlje'),
  makeTemplate('20 trbušnjaka', '💪', '08:20', 'daily', 'tjelovježba'),
  makeTemplate('20 trbušnjaka navečer', '💪', '20:00', 'daily', 'tjelovježba'),
  makeTemplate('Otuširati se', '🚿', '20:30', 'daily', 'higijena'),
  makeTemplate('Prijaviti porez', '📄', '09:00', 'once', 'obaveza'),
  makeTemplate('Odvesti auto na servis', '🚗', '09:00', 'once', 'obaveza'),
  makeTemplate('Platiti račun', '💶', '10:00', 'monthly', 'obaveza'),
  makeTemplate('Nazvati doktora', '☎️', '10:00', 'once', 'zdravlje')
];

let state = loadState();
let activeTab = 'today';
let toastTimer = null;

const app = document.getElementById('app');

init();

function init() {
  registerServiceWorker();
  handleUrlAction();
  render();
  startReminderLoop();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) runReminderCheck();
  });
}

function makeTask(title, icon, time, repeat, category) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title,
    icon,
    time,
    repeat,
    category,
    createdAt: new Date().toISOString(),
    active: true
  };
}

function makeTemplate(title, icon, time, repeat, category) {
  return { title, icon, time, repeat, category };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      tasks: DEFAULT_TASKS,
      done: {},
      snoozedUntil: {},
      lastNotified: {},
      settings: DEFAULT_SETTINGS
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_TASKS,
      done: parsed.done || {},
      snoozedUntil: parsed.snoozedUntil || {},
      lastNotified: parsed.lastNotified || {},
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
    };
  } catch {
    return {
      tasks: DEFAULT_TASKS,
      done: {},
      snoozedUntil: {},
      lastNotified: {},
      settings: DEFAULT_SETTINGS
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="logo-wrap">
          <div class="logo">✓</div>
          <div>
            <p class="eyebrow">Rutinko</p>
            <h1>${tabTitle()}</h1>
          </div>
        </div>
        <div class="today-date">${formatDateLong(new Date())}</div>
      </header>
      ${renderActiveTab()}
    </main>
    ${renderBottomNav()}
  `;
  attachEvents();
}

function tabTitle() {
  if (activeTab === 'today') return 'Danas';
  if (activeTab === 'add') return 'Dodaj';
  if (activeTab === 'routines') return 'Rutine';
  return 'Postavke';
}

function renderActiveTab() {
  if (activeTab === 'today') return renderToday();
  if (activeTab === 'add') return renderAddTask();
  if (activeTab === 'routines') return renderRoutines();
  return renderSettings();
}

function renderToday() {
  const todayTasks = getTodayTasks();
  const completed = todayTasks.filter((task) => isDone(task, todayKey())).length;
  const open = todayTasks.length - completed;
  const exerciseProgress = getExerciseProgress();
  const weeklyProgress = getWeeklyExerciseProgress();
  const groups = groupTasks(todayTasks);
  const notificationNotice = Notification.permission === 'granted'
    ? ''
    : `<div class="notice"><strong>Uključi podsjetnike.</strong> Bez dozvole za notifikacije Rutinko može podsjećati samo dok gledaš aplikaciju.</div>`;

  return `
    <section class="hero-card">
      <h2>${open === 0 ? 'Mirna glava.' : `Još ${open} ${open === 1 ? 'stvar' : open < 5 ? 'stvari' : 'stvari'}.`}</h2>
      <p>${open === 0 ? 'Sve bitno za danas je riješeno.' : 'Riješi osnovne stvari bez držanja svega u glavi.'}</p>
      <div class="progress-grid">
        <div class="progress-pill"><strong>${completed}/${todayTasks.length}</strong><span>Dnevni zadaci</span></div>
        <div class="progress-pill"><strong>${exerciseProgress.done}/${exerciseProgress.total}</strong><span>Mini trening danas</span></div>
        <div class="progress-pill"><strong>${weeklyProgress.done}/${weeklyProgress.total}</strong><span>Mini treninzi ovaj tjedan</span></div>
        <div class="progress-pill"><strong>${state.settings.reminderIntervalMinutes} min</strong><span>Ponavljanje podsjetnika</span></div>
      </div>
    </section>
    ${notificationNotice}
    <button class="btn btn-primary" data-action="request-notifications" ${Notification.permission === 'granted' ? 'disabled' : ''}>${Notification.permission === 'granted' ? 'Podsjetnici uključeni' : 'Uključi podsjetnike'}</button>
    ${renderTaskGroup('Jutro', groups.morning)}
    ${renderTaskGroup('Dan', groups.day)}
    ${renderTaskGroup('Večer', groups.evening)}
    ${renderTaskGroup('Jednokratno', groups.once)}
    ${renderCompleted(todayTasks)}
  `;
}

function renderTaskGroup(title, tasks) {
  const visible = tasks.filter((task) => !isDone(task, todayKey()));
  if (!visible.length) return '';
  return `
    <section>
      <div class="section-head"><h3>${title}</h3><span>${visible.length}</span></div>
      <div class="task-list">${visible.map(renderTaskCard).join('')}</div>
    </section>
  `;
}

function renderCompleted(tasks) {
  const completed = tasks.filter((task) => isDone(task, todayKey()));
  if (!completed.length) return '';
  return `
    <section>
      <div class="section-head"><h3>Gotovo</h3><span>${completed.length}</span></div>
      <div class="task-list">${completed.map(renderTaskCard).join('')}</div>
    </section>
  `;
}

function renderTaskCard(task) {
  const key = occurrenceId(task, todayKey());
  const status = getTaskStatus(task);
  const done = isDone(task, todayKey());
  const snoozed = state.snoozedUntil[key] && Number(state.snoozedUntil[key]) > Date.now();
  const actionsClass = done ? '' : 'three';

  return `
    <article class="task-card ${status.className} ${done ? 'done' : ''}" data-task-id="${task.id}">
      <div class="task-main">
        <div class="task-icon">${escapeHtml(task.icon || '✓')}</div>
        <div class="task-info">
          <div class="task-title-row">
            <p class="task-title">${escapeHtml(task.title)}</p>
            <span class="task-time">${task.time}</span>
          </div>
          <p class="task-meta">${status.label}${snoozed ? ` · odgođeno do ${formatTime(new Date(Number(state.snoozedUntil[key])))}` : ''}</p>
        </div>
      </div>
      <div class="task-actions ${actionsClass}">
        ${done
          ? `<button class="btn btn-soft" data-action="undo" data-task-id="${task.id}">Vrati</button><button class="btn btn-danger-soft" data-action="delete" data-task-id="${task.id}">Obriši</button>`
          : `<button class="btn btn-primary" data-action="done" data-task-id="${task.id}">Završeno</button><button class="btn btn-soft" data-action="snooze" data-task-id="${task.id}">Odgodi ${state.settings.snoozeMinutes} min</button><button class="btn btn-plain" data-action="remind5" data-task-id="${task.id}">Podsjeti za 5 min</button>`
        }
      </div>
    </article>
  `;
}

function renderAddTask(prefill = {}) {
  return `
    <section class="panel">
      <div class="form-grid">
        <div class="field">
          <label for="task-title">Naziv zadatka</label>
          <input id="task-title" value="${escapeAttr(prefill.title || '')}" placeholder="npr. Popiti tablete" />
        </div>
        <div class="two-col">
          <div class="field">
            <label for="task-icon">Ikona</label>
            <input id="task-icon" value="${escapeAttr(prefill.icon || '✓')}" maxlength="4" />
          </div>
          <div class="field">
            <label for="task-time">Vrijeme</label>
            <input id="task-time" type="time" value="${escapeAttr(prefill.time || '09:00')}" />
          </div>
        </div>
        <div class="two-col">
          <div class="field">
            <label for="task-repeat">Ponavljanje</label>
            <select id="task-repeat">
              ${option('once', 'Jednom', prefill.repeat)}
              ${option('daily', 'Svaki dan', prefill.repeat || 'daily')}
              ${option('weekdays', 'Radnim danom', prefill.repeat)}
              ${option('weekly', 'Tjedno', prefill.repeat)}
              ${option('monthly', 'Mjesečno', prefill.repeat)}
            </select>
          </div>
          <div class="field">
            <label for="task-category">Kategorija</label>
            <select id="task-category">
              ${option('higijena', 'Higijena', prefill.category)}
              ${option('prehrana', 'Prehrana', prefill.category)}
              ${option('zdravlje', 'Zdravlje', prefill.category)}
              ${option('tjelovježba', 'Tjelovježba', prefill.category)}
              ${option('obaveza', 'Obaveza', prefill.category)}
            </select>
          </div>
        </div>
        <button class="btn btn-primary" data-action="save-task">Spremi zadatak</button>
      </div>
    </section>
  `;
}

function renderRoutines() {
  return `
    <section class="panel">
      <p class="task-meta" style="margin-top:0">Dodaj najčešće zadatke jednim klikom. Sve kasnije možeš urediti kroz današnju listu.</p>
      <div class="template-grid">
        ${TEMPLATES.map((template, index) => `
          <div class="template-card">
            <div><strong>${template.icon} ${escapeHtml(template.title)}</strong><span>${template.time} · ${repeatLabel(template.repeat)} · ${template.category}</span></div>
            <button class="btn btn-soft" data-action="add-template" data-template-index="${index}">Dodaj</button>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="panel">
      <div class="settings-row">
        <div><strong>Ponavljaj podsjetnik</strong><p>Kad ništa ne stisneš.</p></div>
        <input id="setting-reminder" type="number" min="1" max="60" value="${state.settings.reminderIntervalMinutes}" />
      </div>
      <div class="settings-row">
        <div><strong>Odgoda</strong><p>Brzi gumb za odgodu.</p></div>
        <input id="setting-snooze" type="number" min="5" max="240" step="5" value="${state.settings.snoozeMinutes}" />
      </div>
      <div class="settings-row">
        <div><strong>Tišina od</strong><p>Ne gnjavi dok spavaš.</p></div>
        <input id="setting-quiet-start" type="time" value="${state.settings.quietStart}" />
      </div>
      <div class="settings-row">
        <div><strong>Tišina do</strong><p>Podsjetnici se nastavljaju poslije.</p></div>
        <input id="setting-quiet-end" type="time" value="${state.settings.quietEnd}" />
      </div>
      <button class="btn btn-primary" data-action="save-settings" style="width:100%;margin-top:14px">Spremi postavke</button>
      <button class="btn btn-danger-soft" data-action="reset-app" style="width:100%;margin-top:10px">Vrati početne zadatke</button>
    </section>
  `;
}

function renderBottomNav() {
  const item = (tab, icon, label) => `<button class="nav-btn ${activeTab === tab ? 'active' : ''}" data-tab="${tab}"><b>${icon}</b>${label}</button>`;
  return `<nav class="bottom-nav">${item('today', '✓', 'Danas')}${item('add', '+', 'Dodaj')}${item('routines', '↻', 'Rutine')}${item('settings', '⚙', 'Postavke')}</nav>`;
}

function attachEvents() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      render();
    });
  });

  document.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', () => handleAction(el.dataset.action, el));
  });
}

async function handleAction(action, el) {
  const taskId = el.dataset.taskId;
  if (action === 'request-notifications') return requestNotifications();
  if (action === 'save-task') return saveTaskFromForm();
  if (action === 'save-settings') return saveSettingsFromForm();
  if (action === 'reset-app') return resetApp();
  if (action === 'add-template') return addTemplate(Number(el.dataset.templateIndex));
  if (!taskId) return;

  if (action === 'done') markDone(taskId);
  if (action === 'undo') undoDone(taskId);
  if (action === 'snooze') snooze(taskId, state.settings.snoozeMinutes);
  if (action === 'remind5') snooze(taskId, 5);
  if (action === 'delete') deleteTask(taskId);
  saveState();
  render();
}

function saveTaskFromForm() {
  const title = document.getElementById('task-title').value.trim();
  const icon = document.getElementById('task-icon').value.trim() || '✓';
  const time = document.getElementById('task-time').value || '09:00';
  const repeat = document.getElementById('task-repeat').value;
  const category = document.getElementById('task-category').value;

  if (!title) {
    showToast('Upiši naziv zadatka.');
    return;
  }

  state.tasks.push(makeTask(title, icon, time, repeat, category));
  saveState();
  activeTab = 'today';
  showToast('Zadatak dodan.');
  render();
}

function saveSettingsFromForm() {
  state.settings = {
    reminderIntervalMinutes: clamp(Number(document.getElementById('setting-reminder').value), 1, 60),
    snoozeMinutes: clamp(Number(document.getElementById('setting-snooze').value), 5, 240),
    quietStart: document.getElementById('setting-quiet-start').value || '22:30',
    quietEnd: document.getElementById('setting-quiet-end').value || '07:00'
  };
  saveState();
  showToast('Postavke spremljene.');
  render();
}

function addTemplate(index) {
  const template = TEMPLATES[index];
  if (!template) return;
  state.tasks.push(makeTask(template.title, template.icon, template.time, template.repeat, template.category));
  saveState();
  showToast('Rutina dodana.');
  activeTab = 'today';
  render();
}

function resetApp() {
  if (!confirm('Vratiti početne zadatke i obrisati trenutne podatke?')) return;
  state = {
    tasks: DEFAULT_TASKS,
    done: {},
    snoozedUntil: {},
    lastNotified: {},
    settings: DEFAULT_SETTINGS
  };
  saveState();
  activeTab = 'today';
  showToast('Rutinko je resetiran.');
  render();
}

function markDone(taskId, date = todayKey()) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  state.done[occurrenceId(task, date)] = Date.now();
  delete state.snoozedUntil[occurrenceId(task, date)];
}

function undoDone(taskId, date = todayKey()) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  delete state.done[occurrenceId(task, date)];
}

function snooze(taskId, minutes, date = todayKey()) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  state.snoozedUntil[occurrenceId(task, date)] = Date.now() + minutes * 60 * 1000;
  showToast(`Odgođeno za ${minutes} min.`);
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  Object.keys(state.done).forEach((key) => key.startsWith(`${taskId}-`) && delete state.done[key]);
  Object.keys(state.snoozedUntil).forEach((key) => key.startsWith(`${taskId}-`) && delete state.snoozedUntil[key]);
  Object.keys(state.lastNotified).forEach((key) => key.startsWith(`${taskId}-`) && delete state.lastNotified[key]);
  showToast('Zadatak obrisan.');
}

function getTodayTasks() {
  const today = new Date();
  return state.tasks.filter((task) => task.active !== false && occursOn(task, today));
}

function occursOn(task, date) {
  const created = new Date(task.createdAt || Date.now());
  const createdDay = startOfDay(created);
  const currentDay = startOfDay(date);
  if (currentDay < createdDay && task.repeat !== 'daily') return false;

  if (task.repeat === 'once') return dateKey(date) === dateKey(created);
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekdays') return date.getDay() >= 1 && date.getDay() <= 5;
  if (task.repeat === 'weekly') return date.getDay() === created.getDay();
  if (task.repeat === 'monthly') return date.getDate() === created.getDate();
  return true;
}

function groupTasks(tasks) {
  return tasks.reduce((groups, task) => {
    let group = getDayPart(task.time);
    if (task.repeat === 'once' && task.category === 'obaveza') group = 'once';
    groups[group].push(task);
    return groups;
  }, { morning: [], day: [], evening: [], once: [] });
}

function getDayPart(time) {
  const hour = Number(time.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

function getTaskStatus(task) {
  if (isDone(task, todayKey())) return { label: 'Završeno danas', className: 'done' };
  const due = dueTime(task, new Date());
  const diffMinutes = Math.floor((Date.now() - due.getTime()) / 60000);
  if (diffMinutes < 0) return { label: `Dolazi za ${Math.abs(diffMinutes)} min`, className: '' };
  if (diffMinutes === 0) return { label: 'Sad je vrijeme', className: 'overdue' };
  if (diffMinutes >= 30) return { label: `Kasni ${diffMinutes} min`, className: 'urgent' };
  return { label: `Kasni ${diffMinutes} min`, className: 'overdue' };
}

function getExerciseProgress() {
  const exercises = getTodayTasks().filter((task) => task.category === 'tjelovježba');
  return {
    total: exercises.length,
    done: exercises.filter((task) => isDone(task, todayKey())).length
  };
}

function getWeeklyExerciseProgress() {
  const dates = currentWeekDates();
  let total = 0;
  let done = 0;
  const exercises = state.tasks.filter((task) => task.category === 'tjelovježba' && task.active !== false);
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
  if (Notification.permission !== 'granted') return;
  if (isQuietTime(new Date())) return;

  getTodayTasks().forEach((task) => {
    const date = todayKey();
    const key = occurrenceId(task, date);
    if (state.done[key]) return;

    const due = dueTime(task, new Date()).getTime();
    const now = Date.now();
    if (now < due) return;
    if (state.snoozedUntil[key] && now < Number(state.snoozedUntil[key])) return;

    const last = Number(state.lastNotified[key] || 0);
    const interval = state.settings.reminderIntervalMinutes * 60 * 1000;
    if (last && now - last < interval) return;

    sendNotification(task, key);
    state.lastNotified[key] = now;
    saveState();
  });
}

function startReminderLoop() {
  runReminderCheck();
  setInterval(runReminderCheck, 60 * 1000);
}

async function sendNotification(task, occurrence) {
  const title = `${task.icon || '✓'} ${task.title}`;
  const body = 'Stisni Završeno ili odgodi podsjetnik.';
  const options = {
    body,
    tag: occurrence,
    renotify: true,
    icon: './icons/icon-192.svg',
    badge: './icons/icon-192.svg',
    data: { occurrenceId: occurrence },
    actions: [
      { action: 'done', title: 'Završeno' },
      { action: 'snooze30', title: `Odgodi ${state.settings.snoozeMinutes} min` }
    ]
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
}

async function requestNotifications() {
  if (!('Notification' in window)) {
    showToast('Ovaj browser ne podržava notifikacije.');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showToast('Podsjetnici su uključeni.');
    runReminderCheck();
  } else {
    showToast('Podsjetnici nisu odobreni.');
  }
  render();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data || {};
    handleNotificationAction(data.action, data.occurrenceId);
  });
}

function handleUrlAction() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const occurrence = params.get('occurrenceId');
  if (action && occurrence) {
    handleNotificationAction(action, occurrence);
    history.replaceState(null, '', window.location.pathname);
  }
}

function handleNotificationAction(action, occurrence) {
  if (!occurrence) return;
  const taskId = occurrence.split('-').slice(0, -1).join('-');
  if (!taskId) return;
  if (action === 'done') markDone(taskId);
  if (action === 'snooze30') snooze(taskId, state.settings.snoozeMinutes);
  saveState();
  render();
}

function dueTime(task, date) {
  const [hours, minutes] = task.time.split(':').map(Number);
  const due = new Date(date);
  due.setHours(hours, minutes, 0, 0);
  return due;
}

function isDone(task, date) {
  return Boolean(state.done[occurrenceId(task, date)]);
}

function occurrenceId(task, date) {
  return `${task.id}-${date}`;
}

function todayKey(date = new Date()) {
  return dateKey(date);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function currentWeekDates() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function isQuietTime(date) {
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

function repeatLabel(repeat) {
  return {
    once: 'jednom',
    daily: 'svaki dan',
    weekdays: 'radnim danom',
    weekly: 'tjedno',
    monthly: 'mjesečno'
  }[repeat] || repeat;
}

function option(value, label, selected) {
  return `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`;
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat('hr-HR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function showToast(message) {
  clearTimeout(toastTimer);
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
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

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
