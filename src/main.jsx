import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Home,
  ListChecks,
  Pencil,
  Plus,
  RefreshCcw,
  Settings,
  SkipForward,
  Trash2,
  X
} from 'lucide-react';
import './styles.css';
import './impeccable-upgrades.css';
import './premium-icons.css';
import './lottie-layer.css';
import AnimatedMoment from './AnimatedMoment.jsx';
import IconPicker, { IconVisual } from './IconPicker.jsx';
import { CATEGORY_OPTIONS, DEFAULT_SETTINGS, REPEAT_OPTIONS, ROUTINES, categoryLabel, repeatLabel } from './data.js';
import { createTask, currentWeekDates, dateKey, dayPart, dueTime, isQuietTime, occurrenceId, occursOn, taskStatus } from './utils.js';

const STORAGE_KEY = 'rutinko-impeccable-polish-v5';
const LOGO = '/brand/rutinko-logo.webp';
const WATER_TIMES = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});
const SECTION_META = {
  Jutro: { icon: '☀️', tone: 'morning' },
  Dan: { icon: '🌤️', tone: 'day' },
  Večer: { icon: '🌙', tone: 'evening' },
  Jednokratno: { icon: '📌', tone: 'once' },
  Gotovo: { icon: '✅', tone: 'done' }
};

function formatTimeLabel(time) {
  return `${time} h`;
}

function messageSw(payload) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage(payload)).catch(() => {});
}

function formatRangeLabel(start, end) {
  return `${start}–${end} h`;
}

function getInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        done: parsed.done || {},
        skipped: parsed.skipped || {},
        snoozedUntil: parsed.snoozedUntil || {},
        lastNotified: parsed.lastNotified || {},
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
      };
    } catch {}
  }

  return {
    tasks: [],
    done: {},
    skipped: {},
    snoozedUntil: {},
    lastNotified: {},
    settings: { ...DEFAULT_SETTINGS }
  };
}

function applyIconChoice(current, icon, meta = {}) {
  const next = {
    ...current,
    icon,
    title: meta.defaultTitle || meta.label || current.title,
    category: meta.category || current.category
  };

  if (meta.scheduleType === 'water-2h') {
    next.scheduleType = 'water-2h';
    next.startTime = '08:00';
    next.endTime = '22:00';
    next.intervalMinutes = 120;
    next.time = '08:00';
    next.repeat = 'daily';
    next.category = 'zdravlje';
    return next;
  }

  delete next.scheduleType;
  delete next.startTime;
  delete next.endTime;
  delete next.intervalMinutes;
  return next;
}

function createRoutineTasks(template) {
  if (template.scheduleType !== 'water-2h') return [createTask(template)];

  return WATER_TIMES.map((time) => createTask({
    ...template,
    time,
    repeat: 'daily',
    category: 'zdravlje',
    scheduleType: 'water-2h-occurrence',
    startTime: '08:00',
    endTime: '22:00',
    intervalMinutes: 120
  }));
}

function routineMetaLine(task) {
  if (task.scheduleType === 'water-2h') return `${formatRangeLabel('08:00', '22:00')} · svakih 2 h`;
  if (task.scheduleType === 'water-2h-occurrence') return `${formatTimeLabel(task.time)} · voda svaka 2 h`;
  return `${formatTimeLabel(task.time)} · ${repeatLabel[task.repeat]}`;
}

function App() {
  const [tab, setTab] = useState('today');
  const [state, setState] = useState(getInitialState);
  const [toast, setToast] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState(0);
  const [form, setForm] = useState(() => ({ ...ROUTINES[0] }));
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
  const [newDayOpen, setNewDayOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [doneOpenSignal, setDoneOpenSignal] = useState(0);

  const todayTasks = useMemo(() => {
    return state.tasks
      .filter((task) => task.active !== false && occursOn(task, new Date()))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [state.tasks]);

  const resolvedCount = todayTasks.filter((task) => isResolved(task)).length;
  const openTasks = todayTasks
    .filter((task) => !isResolved(task))
    .sort((a, b) => effectiveTime(a) - effectiveTime(b));
  const nextTask = openTasks[0] || null;
  const progress = todayTasks.length ? Math.round((resolvedCount / todayTasks.length) * 100) : 0;
  const groups = groupTasks(openTasks);
  const exerciseToday = getExerciseToday();
  const exerciseWeek = getExerciseWeek();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    messageSw({ type: 'sync-state', state });
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const beforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installed = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      showToast('Rutinko je instaliran.');
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  useEffect(() => {
    const standaloneQuery = window.matchMedia?.('(display-mode: standalone)');
    const syncInstalledState = () => setIsInstalled(Boolean(standaloneQuery?.matches || window.navigator.standalone === true));
    syncInstalledState();
    standaloneQuery?.addEventListener?.('change', syncInstalledState);
    return () => standaloneQuery?.removeEventListener?.('change', syncInstalledState);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    navigator.serviceWorker.register('/sw.js');
    navigator.serviceWorker.ready.then(async (registration) => {
      if ('periodicSync' in registration) {
        try {
          await registration.periodicSync.register('rutinko-reminders', { minInterval: 60 * 60 * 1000 });
        } catch {}
      }
    }).catch(() => {});

    const applyAction = (action, occurrenceId) => {
      if (!occurrenceId) return;
      const [id, key] = occurrenceId.split('::');
      if (action === 'done') completeTask(id, key || dateKey());
      if (action === 'snooze30') snoozeTask(id, state.settings.snoozeMinutes, key || dateKey());
    };
    const handler = (event) => {
      const data = event.data || {};
      if (data.type === 'pending-actions') {
        (data.actions || []).forEach((item) => applyAction(item.action, item.occurrenceId));
        return;
      }
      applyAction(data.action, data.occurrenceId);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    messageSw({ type: 'drain-pending' });
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [state.settings.snoozeMinutes]);

  useEffect(() => {
    runReminderCheck();
    const timer = setInterval(runReminderCheck, 60000);
    return () => clearInterval(timer);
  }, [state.settings.remindersEnabled, state.settings.reminderIntervalMinutes, state.settings.snoozeMinutes, state.settings.quietStart, state.settings.quietEnd, todayTasks, state.done, state.skipped, state.snoozedUntil, state.lastNotified]);

  function isTaskDone(task, key = dateKey()) {
    return Boolean(state.done[occurrenceId(task, key)]);
  }

  function isTaskSkipped(task, key = dateKey()) {
    return Boolean(state.skipped[occurrenceId(task, key)]);
  }

  function isResolved(task, key = dateKey()) {
    return isTaskDone(task, key) || isTaskSkipped(task, key);
  }

  function effectiveTime(task) {
    const occ = occurrenceId(task);
    const snoozeUntil = Number(state.snoozedUntil[occ] || 0);
    if (snoozeUntil && Date.now() < snoozeUntil) return snoozeUntil;
    return dueTime(task).getTime();
  }

  function statusFor(task) {
    const occ = occurrenceId(task);
    const snoozeUntil = Number(state.snoozedUntil[occ] || 0);
    if (task.active === false) return { label: 'pauzirana rutina', tone: 'paused' };
    if (isTaskSkipped(task)) return { label: 'preskočeno', tone: 'skipped' };
    if (snoozeUntil && Date.now() < snoozeUntil) return { label: `odgođeno do ${formatClock(snoozeUntil)}`, tone: 'snoozed' };
    return taskStatus(task, isTaskDone(task));
  }

  function showToast(message) {
    setToast(message);
  }

  function completeTask(id, key = dateKey()) {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === id) || { id };
      const occ = occurrenceId(task, key);
      const snoozedUntil = { ...previous.snoozedUntil };
      const skipped = { ...previous.skipped };
      delete snoozedUntil[occ];
      delete skipped[occ];
      return { ...previous, done: { ...previous.done, [occ]: Date.now() }, skipped, snoozedUntil };
    });
    setDoneOpenSignal(Date.now());
  }

  function skipTask(id, key = dateKey()) {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === id) || { id };
      const occ = occurrenceId(task, key);
      const snoozedUntil = { ...previous.snoozedUntil };
      const done = { ...previous.done };
      delete snoozedUntil[occ];
      delete done[occ];
      return { ...previous, done, skipped: { ...previous.skipped, [occ]: Date.now() }, snoozedUntil };
    });
    showToast('Preskočeno za danas.');
  }

  function undoTask(id, key = dateKey()) {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === id) || { id };
      const occ = occurrenceId(task, key);
      const done = { ...previous.done };
      const skipped = { ...previous.skipped };
      delete done[occ];
      delete skipped[occ];
      return { ...previous, done, skipped };
    });
  }

  function snoozeTask(id, minutes, key = dateKey()) {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === id) || { id };
      return {
        ...previous,
        snoozedUntil: { ...previous.snoozedUntil, [occurrenceId(task, key)]: Date.now() + minutes * 60000 }
      };
    });
    showToast(`Odgođeno za ${minutes} min.`);
  }

  function deleteTask(id) {
    setState((previous) => {
      const clean = (bucket) => Object.fromEntries(Object.entries(bucket).filter(([key]) => !key.startsWith(id + '::')));
      return {
        ...previous,
        tasks: previous.tasks.filter((task) => task.id !== id),
        done: clean(previous.done),
        skipped: clean(previous.skipped),
        snoozedUntil: clean(previous.snoozedUntil),
        lastNotified: clean(previous.lastNotified)
      };
    });
    setEditingTask(null);
    showToast('Rutina izbrisana.');
  }

  function saveTask() {
    if (!form.title.trim()) return showToast('Upiši naziv rutine.');
    const createdTasks = createRoutineTasks(form);
    setState((previous) => ({ ...previous, tasks: [...previous.tasks, ...createdTasks] }));
    setTab('today');
    showToast(form.scheduleType === 'water-2h' ? 'Voda dodana svakih 2 h od 08 do 22.' : 'Rutina dodana.');
  }

  function addRoutine(routine) {
    const createdTasks = createRoutineTasks(routine);
    setState((previous) => ({ ...previous, tasks: [...previous.tasks, ...createdTasks] }));
    setTab('today');
    showToast(routine.scheduleType === 'water-2h' ? 'Voda dodana svakih 2 h od 08 do 22.' : 'Rutina dodana.');
  }

  function addDayTemplate() {
    const createdTasks = ROUTINES.flatMap(createRoutineTasks);
    setState((previous) => ({ ...previous, tasks: [...previous.tasks, ...createdTasks] }));
    setTab('today');
    showToast('Predložak dana je dodan.');
  }

  function editTask(task) {
    setEditingTask({ active: true, ...task });
  }

  function saveEditedTask() {
    if (!editingTask?.title?.trim()) return showToast('Upiši naziv rutine.');
    setState((previous) => ({
      ...previous,
      tasks: previous.tasks.map((task) => task.id === editingTask.id ? { ...task, ...editingTask } : task)
    }));
    setEditingTask(null);
    showToast(editingTask.active === false ? 'Rutina je pauzirana.' : 'Rutina ažurirana.');
  }

  function resetToday() {
    setState((previous) => ({
      ...previous,
      tasks: [],
      done: {},
      skipped: {},
      snoozedUntil: {},
      lastNotified: {}
    }));
    setNewDayOpen(false);
    setTab('add');
    showToast('Danas je prazan. Odaberi rutine iz prijedloga.');
  }

  function resetApp() {
    if (!confirm('Obrisati lokalne podatke i vratiti prazan Danas?')) return;
    setState({ tasks: [], done: {}, skipped: {}, snoozedUntil: {}, lastNotified: {}, settings: { ...DEFAULT_SETTINGS } });
    setTab('today');
    showToast('Lokalni podaci su obrisani.');
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return showToast('Ovaj browser ne podržava notifikacije.');
    setState((previous) => ({ ...previous, settings: { ...previous.settings, remindersEnabled: true } }));
    const permission = await Notification.requestPermission();
    showToast(permission === 'granted' ? 'Podsjetnici su uključeni.' : 'Podsjetnici nisu odobreni.');
  }

  async function installApp() {
    if (isInstalled) return;
    if (!installPrompt) {
      showToast('Ako se gumb ne pojavi, instaliraj iz izbornika browsera.');
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function runReminderCheck() {
    if (!state.settings.remindersEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    if ('serviceWorker' in navigator) {
      messageSw({ type: 'check-reminders' });
      return;
    }

    if (isQuietTime(state.settings)) return;
    const due = todayTasks.filter((task) => {
      const occ = occurrenceId(task);
      if (state.done[occ] || state.skipped[occ]) return false;
      if (Date.now() < dueTime(task).getTime()) return false;
      if (state.snoozedUntil[occ] && Date.now() < Number(state.snoozedUntil[occ])) return false;
      const last = Number(state.lastNotified[occ] || 0);
      return !(last && Date.now() - last < state.settings.reminderIntervalMinutes * 60000);
    });
    if (!due.length) return;
    sendGroupedNotification(due);
    setState((previous) => {
      const lastNotified = { ...previous.lastNotified };
      due.forEach((task) => { lastNotified[occurrenceId(task)] = Date.now(); });
      return { ...previous, lastNotified };
    });
  }

  function sendGroupedNotification(due) {
    const shared = { tag: 'rutinko-reminders', renotify: true, icon: LOGO, badge: LOGO };
    if (due.length === 1) {
      const task = due[0];
      new Notification(`${task.icon} ${task.title}`, {
        ...shared,
        body: 'Označi kao završeno, odgodi ili preskoči u aplikaciji.',
        data: { occurrenceId: occurrenceId(task) }
      });
      return;
    }
    const verb = due.length % 10 >= 2 && due.length % 10 <= 4 && (due.length % 100 < 12 || due.length % 100 > 14) ? 'rutine čekaju' : 'rutina čeka';
    new Notification(`⏰ ${due.length} ${verb}`, {
      ...shared,
      body: due.map((task) => `${task.icon} ${task.title} · ${task.time}`).join('\n')
    });
  }

  function getExerciseToday() {
    const exercises = todayTasks.filter((task) => task.category === 'tjelovježba');
    return { total: exercises.length, done: exercises.filter((task) => isTaskDone(task)).length };
  }

  function getExerciseWeek() {
    const exercises = state.tasks.filter((task) => task.category === 'tjelovježba' && task.active !== false);
    let total = 0;
    let done = 0;
    currentWeekDates().forEach((day) => exercises.forEach((task) => {
      if (!occursOn(task, day)) return;
      total += 1;
      if (isTaskDone(task, dateKey(day))) done += 1;
    }));
    return { total, done };
  }

  function groupTasks(tasks) {
    const result = { morning: [], day: [], evening: [], once: [] };
    tasks.forEach((task) => {
      const group = task.repeat === 'once' ? 'once' : dayPart(task.time);
      result[group].push(task);
    });
    return result;
  }

  function pickRoutine(index) {
    const routine = ROUTINES[index];
    if (!routine) return;
    setSelectedRoutine(index);
    setForm({ ...routine });
  }

  return <div className="appShell">
    <Header tab={tab} setTab={setTab} onNotify={requestNotifications} onInstall={installApp} canInstall={!isInstalled && Boolean(installPrompt)} isInstalled={isInstalled} remindersEnabled={state.settings.remindersEnabled} />
    {tab === 'today' && <TodayScreen tasks={todayTasks} groups={groups} nextTask={nextTask} doneOpenSignal={doneOpenSignal} resolvedCount={resolvedCount} openCount={openTasks.length} progress={progress} exerciseToday={exerciseToday} exerciseWeek={exerciseWeek} isDone={isTaskDone} isSkipped={isTaskSkipped} isResolved={isResolved} statusFor={statusFor} onDone={completeTask} onUndo={undoTask} onSnooze={snoozeTask} onSkip={skipTask} onDelete={deleteTask} onEdit={editTask} onNewDay={() => setNewDayOpen(true)} settings={state.settings} setTab={setTab} />}
    {tab === 'add' && <AddScreen form={form} setForm={setForm} selectedRoutine={selectedRoutine} pickRoutine={pickRoutine} saveTask={saveTask} />}
    {tab === 'routines' && <RoutinesScreen addRoutine={addRoutine} addDayTemplate={addDayTemplate} tasks={state.tasks} onEdit={editTask} />}
    {tab === 'settings' && <SettingsScreen settings={state.settings} setSettings={(settings) => setState((previous) => ({ ...previous, settings }))} resetApp={resetApp} showToast={showToast} />}
    <FooterNav tab={tab} setTab={setTab} />
    {newDayOpen && <NewDayDialog onCancel={() => setNewDayOpen(false)} onConfirm={resetToday} />}
    {editingTask && <EditTaskModal task={editingTask} setTask={setEditingTask} onSave={saveEditedTask} onDelete={() => deleteTask(editingTask.id)} onClose={() => setEditingTask(null)} />}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function Header({ tab, setTab, onNotify, onInstall, canInstall, isInstalled, remindersEnabled }) {
  const title = { today: 'Danas', add: 'Nova rutina', routines: 'Rutine', settings: 'Postavke' }[tab];
  if (tab === 'add') {
    return <header className="topBar centered"><button className="iconButton subtle" onClick={() => setTab('today')} aria-label="Natrag">←</button><h1>{title}</h1><span /></header>;
  }
  return <header className="topBar stickyTop">
    <button className="brandLockup" onClick={() => setTab('today')} aria-label="Rutinko početna"><img src={LOGO} alt="Rutinko" /><span><b>Rutinko</b><small>Dnevni autopilot</small></span></button>
    <div className="headerActions">
      <button className={`headerAction notify ${remindersEnabled ? 'isOn' : 'isOff'}`} onClick={onNotify} aria-label="Uključi obavijesti"><Bell size={18} /><span>{remindersEnabled ? 'Podsjetnici' : 'Uključiti'}</span></button>
      {!isInstalled && <button className="headerAction install" onClick={onInstall} aria-label="Instaliraj aplikaciju" disabled={!canInstall}><Download size={18} /><span>Instaliraj</span></button>}
    </div>
  </header>;
}

function TodayScreen(props) {
  return <>
    <section className="scoreHero">
      <div className="heroCopy"><span>Dnevni tok</span><h1>{props.openCount ? `${props.openCount} ${props.openCount === 1 ? 'stvar' : 'stvari'} do mirne glave` : 'Mirna glava'}</h1><p>{props.openCount ? 'Jedan fokus, jedan tap, bez držanja svega u glavi.' : 'Danas je riješeno. Zatvori dan bez kaosa.'}</p></div>
      <div className="scoreRing" style={{ '--score': props.progress }}><div className="scoreValue"><strong>{props.progress}</strong><small>%</small></div></div>
      <AnimatedMoment name="dailyScore" className="heroAnimation" />
      <div className="metricRail"><Metric label="Riješeno" value={`${props.resolvedCount}/${props.tasks.length}`} /><Metric label="Trening" value={`${props.exerciseToday.done}/${props.exerciseToday.total}`} /><Metric label="Tjedan" value={`${props.exerciseWeek.done}/${props.exerciseWeek.total}`} /></div>
    </section>
    {props.nextTask ? <FocusCard task={props.nextTask} status={props.statusFor(props.nextTask)} onDone={props.onDone} onSnooze={props.onSnooze} onSkip={props.onSkip} onDelete={props.onDelete} onEdit={props.onEdit} settings={props.settings} /> : <AllDoneCard setTab={props.setTab} hasTasks={props.tasks.length > 0} />}
    <section className="actionDock"><button className="primaryCta" onClick={() => props.setTab('add')}><Plus size={18} /> Dodaj rutinu</button><button className="secondaryCta resetDayCta" onClick={props.onNewDay}><RefreshCcw size={18} /> Izradi novi dan</button></section>
    <TaskSection {...props} title="Jutro" tasks={props.groups.morning} icon="☀️" defaultCollapsed />
    <TaskSection {...props} title="Dan" tasks={props.groups.day} icon="🌤️" defaultCollapsed />
    <TaskSection {...props} title="Večer" tasks={props.groups.evening} icon="🌙" defaultCollapsed />
    <TaskSection {...props} title="Jednokratno" tasks={props.groups.once} icon="📌" defaultCollapsed />
    <TaskSection {...props} title="Gotovo" tasks={props.tasks.filter(props.isResolved)} icon="✅" defaultCollapsed completed openSignal={props.doneOpenSignal} />
  </>;
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function FocusCard({ task, status, onDone, onSnooze, onSkip, onDelete, onEdit, settings }) {
  const dog = isDogTask(task);
  return <section className={`focusCard ${status.tone}`}>
    <button className="editTop" onClick={() => onEdit(task)}><Pencil size={14} /><span>Uredi</span></button>
    <button className="deleteTop" onClick={() => onDelete(task.id)}><X size={14} /><span>Izbriši</span></button>
    <div className="focusHeader"><span className="focusLabel">⚡ Sljedeći fokus</span><small>{formatTimeLabel(task.time)} · {status.label}</small></div>
    <div className="focusBody"><TaskGlyph task={task} className="focusIcon" /><div><h2>{task.title}</h2><p>Riješi odmah, odgodi ili preskoči za danas.</p></div></div>
    {dog && <AnimatedMoment name="dogWalk" className="focusDogAnimation" />}
    <div className="focusActions"><button onClick={() => onDone(task.id)}><Check size={18} />Završeno</button><button onClick={() => onSnooze(task.id, settings.snoozeMinutes)}><Clock3 size={18} />Odgodi {settings.snoozeMinutes} min</button><button onClick={() => onSkip(task.id)}><SkipForward size={18} />Preskoči</button></div>
  </section>;
}

function AllDoneCard({ setTab, hasTasks }) {
  return <section className="allDoneCard"><AnimatedMoment name="doneCheck" className="doneAnimation" loop={false} /><div><h2>{hasTasks ? 'Sve bitno je riješeno.' : 'Danas je prazan.'}</h2><p>{hasTasks ? 'Dodaj novu rutinu samo ako stvarno treba.' : 'Odaberi rutine iz prijedloga i kreni čisto.'}</p></div><button onClick={() => setTab('add')}>{hasTasks ? 'Dodaj' : 'Prijedlozi'}</button></section>;
}

function TaskSection({ title, tasks, icon, isResolved, isSkipped, statusFor, onDone, onUndo, onSnooze, onSkip, onDelete, onEdit, settings, defaultCollapsed = true, openSignal = 0 }) {
  const [open, setOpen] = useState(!defaultCollapsed);
  useEffect(() => {
    if (openSignal) setOpen(true);
  }, [openSignal]);
  if (!tasks.length) return null;
  const rightLabel = title === 'Gotovo' ? `${tasks.length} riješeno` : `${tasks.length} rutina`;
  const meta = SECTION_META[title] || { icon, tone: 'default' };
  return <section className={`taskSection sectionPanel ${open ? 'open' : 'collapsed'} ${meta.tone}`}>
    <button className="sectionHeader sectionToggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span className="sectionTitle"><span className="sectionIcon">{icon || meta.icon}</span><h2>{title}</h2></span>
      <span className="sectionMeta"><small>{rightLabel}</small><ChevronDown className="sectionChevron" size={18} /></span>
    </button>
    {open && <div className="taskStack">{tasks.map((task) => <TaskCard key={task.id} task={task} resolved={isResolved(task)} skipped={isSkipped(task)} status={statusFor(task)} onDone={onDone} onUndo={onUndo} onSnooze={onSnooze} onSkip={onSkip} onDelete={onDelete} onEdit={onEdit} settings={settings} />)}</div>}
  </section>;
}

function TaskCard({ task, resolved, status, onDone, onUndo, onSnooze, onSkip, onDelete, onEdit, settings }) {
  const dog = isDogTask(task);
  return <article className={`taskCard ${status.tone}`}>
    <button className="editTop cardEdit" onClick={() => onEdit(task)}><Pencil size={13} /><span>Uredi</span></button>
    <button className="deleteTop cardDelete" onClick={() => onDelete(task.id)}><X size={13} /><span>Izbriši</span></button>
    <div className="taskMeta"><TaskGlyph task={task} className="taskIcon" /><div><h3>{task.title}</h3><p>{formatTimeLabel(task.time)} · {status.label}</p></div></div>
    {dog && <AnimatedMoment name="dogWalk" className="taskDogAnimation" />}
    <div className="quickActions">{resolved ? <><button className="success" onClick={() => onUndo(task.id)}><Check size={16} /><small>Vrati</small></button><button className="danger" onClick={() => onDelete(task.id)}><Trash2 size={16} /><small>Briši</small></button></> : <><button className="success" onClick={() => onDone(task.id)}><Check size={16} /><small>Završeno</small></button><button onClick={() => onSnooze(task.id, settings.snoozeMinutes)}><Clock3 size={16} /><small>{settings.snoozeMinutes}m</small></button><button onClick={() => onSkip(task.id)}><SkipForward size={16} /><small>Preskoči</small></button></>}</div>
  </article>;
}

function TaskGlyph({ task, className }) {
  return <div className={className}><IconVisual value={task.icon} title={task.title} /></div>;
}

function AddScreen({ form, setForm, selectedRoutine, pickRoutine, saveTask }) {
  const isWaterRoutine = form.scheduleType === 'water-2h';
  const handleIconChange = (icon, meta) => setForm(applyIconChoice(form, icon, meta));
  return <>
    <section className="creatorHero"><TaskGlyph task={form} className="creatorIcon" /><div><span>Dodavanje rutine</span><h1>{form.title || 'Nova rutina'}</h1><p>{isWaterRoutine ? `${formatRangeLabel('08:00', '22:00')} · svakih 2 h` : `${formatTimeLabel(form.time)} · ${repeatLabel[form.repeat]} · ${categoryLabel[form.category]}`}</p></div></section>
    <section className="presetBlock"><div className="sectionHeader compact"><h2>Brzo iz rutina</h2><small>{ROUTINES.length} rutina</small></div><div className="chips">{ROUTINES.map((routine, index) => <button key={`${routine.title}-${index}`} className={index === selectedRoutine ? 'chip active' : 'chip'} onClick={() => pickRoutine(index)}><TaskGlyph task={routine} className="chipIcon" /><span>{routine.title}</span></button>)}</div></section>
    <section className="formPanel"><IconPicker value={form.icon} onChange={handleIconChange} /><Field label="Naziv" icon="✎"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>{isWaterRoutine ? <Field label="Raspored" icon="💧"><div className="fieldText">{formatRangeLabel('08:00', '22:00')} · podsjetnik svaka 2 h</div></Field> : <Field label="Vrijeme" icon="🕘"><TimeSelect value={form.time} onChange={(time) => setForm({ ...form, time })} /></Field>}{!isWaterRoutine && <Field label="Ponavljanje" icon="🔁"><select value={form.repeat} onChange={(event) => setForm({ ...form, repeat: event.target.value })}>{REPEAT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>}<Field label="Kategorija" icon="🏷️"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><button className="saveButton" onClick={saveTask}><Check size={18} />Spremi rutinu</button></section>
  </>;
}

function Field({ label, icon, children }) {
  return <label className="field"><span>{icon}</span><div><small>{label}</small>{children}</div></label>;
}

function TimeSelect({ value, onChange }) {
  return <select className="timeSelect24" value={value} onChange={(event) => onChange(event.target.value)}>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{formatTimeLabel(time)}</option>)}</select>;
}

function RoutinesScreen({ addRoutine, addDayTemplate, tasks, onEdit }) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const ownTasks = tasks.slice().sort((a, b) => Number(a.active === false) - Number(b.active === false) || a.time.localeCompare(b.time));
  const previewTemplates = ROUTINES.slice(0, 3);
  return <>
    <section className="routineHero"><div><span>Rutine</span><h1>Predložak dana</h1><p>Jedan tap za osnovni dan, bez ručnog slaganja svake rutine.</p></div><img src={LOGO} alt="Rutinko" /></section>
    <section className="dayTemplateCard">
      <div className="templatePreviewIcons" aria-hidden="true">{previewTemplates.map((routine) => <span key={`template-${routine.title}`}>{routine.icon}</span>)}</div>
      <div><h2>Dodaj predložak dana</h2><p>Zubi, tuš, doručak, voda, tablete, trening, šetnja i obroci.</p></div>
      <button onClick={addDayTemplate}>Dodaj</button>
    </section>
    <section className={`templateDrawer ${templatesOpen ? 'open' : 'collapsed'}`}>
      <button className="templateDrawerHeader" onClick={() => setTemplatesOpen((current) => !current)} aria-expanded={templatesOpen}>
        <span className="templatePreviewIcons small" aria-hidden="true">{previewTemplates.map((routine) => <span key={`drawer-${routine.title}`}>{routine.icon}</span>)}</span>
        <span><strong>Predlošci rutina</strong><small>{ROUTINES.length} prijedloga</small></span>
        <ChevronDown className="sectionChevron" size={20} />
      </button>
      {templatesOpen && <div className="routineList templateList">{ROUTINES.map((routine, index) => <article className="routineCard" key={`${routine.title}-${index}`}><TaskGlyph task={routine} className="routineIcon" /><div><h3>{routine.title}</h3><p>{routineMetaLine(routine)}</p></div><button onClick={() => addRoutine(routine)}>Dodaj</button></article>)}</div>}
    </section>
    <section className="taskSection routineManager"><div className="sectionHeader"><h2>Moje rutine</h2><small>{ownTasks.length} rutina</small></div><div className="routineList">{ownTasks.map((task) => <article className={`routineCard ${task.active === false ? 'paused' : ''}`} key={task.id}><TaskGlyph task={task} className="routineIcon" /><div><h3>{task.title}</h3><p>{routineMetaLine(task)} · {task.active === false ? 'pauzirana' : 'aktivna'}</p></div><button onClick={() => onEdit(task)}>Uredi</button></article>)}</div></section>
  </>;
}

function SettingsScreen({ settings, setSettings, resetApp, showToast }) {
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  return <section className="formPanel"><Setting title="Podsjetnici" text={settings.remindersEnabled ? 'Rutinko šalje podsjetnike kad browser ima dozvolu.' : 'Podsjetnici su ugašeni unutar Rutinka.'}><button type="button" className={`switchButton ${settings.remindersEnabled ? 'on' : ''}`} onClick={() => update('remindersEnabled', !settings.remindersEnabled)}><span>{settings.remindersEnabled ? 'ON' : 'OFF'}</span></button></Setting><Setting title="Ponavljaj podsjetnik" text="Kad ništa ne stisneš."><div className="numberWithUnit"><input type="number" min="1" max="60" value={settings.reminderIntervalMinutes} onChange={(event) => update('reminderIntervalMinutes', Number(event.target.value))} /><span>min</span></div></Setting><Setting title="Odgoda" text="Brzi gumb za odgodu."><div className="numberWithUnit"><input type="number" min="5" max="240" value={settings.snoozeMinutes} onChange={(event) => update('snoozeMinutes', Number(event.target.value))} /><span>min</span></div></Setting><Setting title="Tišina od" text="Ne gnjavi dok spavaš."><TimeSelect value={settings.quietStart} onChange={(time) => update('quietStart', time)} /></Setting><Setting title="Tišina do" text="Podsjetnici se nastavljaju poslije."><TimeSelect value={settings.quietEnd} onChange={(time) => update('quietEnd', time)} /></Setting><button className="saveButton" onClick={() => showToast('Postavke spremljene.')}><Check size={18} />Spremi postavke</button><button className="resetButton" onClick={resetApp}><Trash2 size={18} />Obriši lokalne podatke</button></section>;
}

function Setting({ title, text, children }) {
  return <label className="setting"><div><strong>{title}</strong><small>{text}</small></div>{children}</label>;
}

function NewDayDialog({ onCancel, onConfirm }) {
  return <div className="modalBackdrop" role="dialog" aria-modal="true"><div className="confirmModal"><AnimatedMoment name="newDay" className="newDayAnimation" /><h2>Izraditi novi dan?</h2><p>Danas će biti potpuno prazan. Nakon toga biraš rutine iz prijedloga.</p><div className="modalActions"><button className="modalCancel" onClick={onCancel}>Odustani</button><button className="modalPrimary" onClick={onConfirm}>Izradi prazan dan</button></div></div></div>;
}

function EditTaskModal({ task, setTask, onSave, onDelete, onClose }) {
  const isWaterRoutine = task.scheduleType === 'water-2h';
  const handleIconChange = (icon, meta) => setTask(applyIconChoice(task, icon, meta));
  return <div className="modalBackdrop" role="dialog" aria-modal="true"><div className="editModal"><button className="modalClose" onClick={onClose}><X size={18} /></button><div className="creatorHero modalPreview"><TaskGlyph task={task} className="creatorIcon" /><div><span>Uredi rutinu</span><h1>{task.title || 'Rutina'}</h1><p>{isWaterRoutine ? `${formatRangeLabel('08:00', '22:00')} · svakih 2 h` : `${formatTimeLabel(task.time)} · ${repeatLabel[task.repeat]} · ${task.active === false ? 'pauzirana' : categoryLabel[task.category]}`}</p></div></div><div className="formPanel modalForm"><Setting title="Rutina aktivna" text={task.active === false ? 'Pauzirana rutina se ne prikazuje na Danas.' : 'Aktivna rutina se prikazuje kada dođe njezin dan.'}><button type="button" className={`switchButton ${task.active !== false ? 'on' : ''}`} onClick={() => setTask({ ...task, active: task.active === false })}><span>{task.active !== false ? 'ON' : 'OFF'}</span></button></Setting><IconPicker value={task.icon} onChange={handleIconChange} /><Field label="Naziv" icon="✎"><input value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} /></Field>{isWaterRoutine ? <Field label="Raspored" icon="💧"><div className="fieldText">{formatRangeLabel('08:00', '22:00')} · podsjetnik svaka 2 h</div></Field> : <Field label="Vrijeme" icon="🕘"><TimeSelect value={task.time} onChange={(time) => setTask({ ...task, time })} /></Field>}{!isWaterRoutine && <Field label="Ponavljanje" icon="🔁"><select value={task.repeat} onChange={(event) => setTask({ ...task, repeat: event.target.value })}>{REPEAT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>}<Field label="Kategorija" icon="🏷️"><select value={task.category} onChange={(event) => setTask({ ...task, category: event.target.value })}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><button className="saveButton" onClick={onSave}><Check size={18} />Spremi izmjene</button><button className="resetButton" onClick={onDelete}><Trash2 size={18} />Izbriši rutinu</button></div></div></div>;
}

function FooterNav({ tab, setTab }) {
  const items = [
    ['today', Home, 'Danas', '#b7ff38'],
    ['add', Plus, 'Dodaj', '#00c2ff'],
    ['routines', ListChecks, 'Rutine', '#ffb020'],
    ['settings', Settings, 'Postavke', '#ff6b9d']
  ];
  return <nav className="footerNav">{items.map(([id, Icon, label, color]) => <button key={id} className={tab === id ? 'active' : ''} style={{ '--item-color': color }} onClick={() => setTab(id)}><Icon size={22} strokeWidth={2.4} /><span>{label}</span></button>)}</nav>;
}

function isDogTask(task) {
  const text = `${task?.title || ''} ${task?.icon || ''}`.toLowerCase();
  return text.includes('psa') || text.includes('pas') || text.includes('🐕') || text.includes('🐶') || text.includes('🦮');
}

function formatClock(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} h`;
}

createRoot(document.getElementById('root')).render(<App />);
