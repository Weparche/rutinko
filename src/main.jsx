import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  Check,
  Clock3,
  Dog,
  Download,
  Footprints,
  Home,
  ListChecks,
  Plus,
  Settings,
  SkipForward,
  Trash2,
  X
} from 'lucide-react';
import './styles.css';
import { CATEGORY_OPTIONS, DEFAULT_SETTINGS, ICONS, REPEAT_OPTIONS, ROUTINES, categoryLabel, repeatLabel } from './data.js';
import { createTask, currentWeekDates, dateKey, dayPart, dueTime, isQuietTime, occurrenceId, occursOn, taskStatus } from './utils.js';

const STORAGE_KEY = 'rutinko-impeccable-polish-v2';
const LOGO = '/brand/rutinko-logo.webp';

function getInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : ROUTINES.slice(0, 10).map(createTask),
        done: parsed.done || {},
        skipped: parsed.skipped || {},
        snoozedUntil: parsed.snoozedUntil || {},
        lastNotified: parsed.lastNotified || {},
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
      };
    } catch {}
  }

  return {
    tasks: ROUTINES.slice(0, 10).map(createTask),
    done: {},
    skipped: {},
    snoozedUntil: {},
    lastNotified: {},
    settings: { ...DEFAULT_SETTINGS }
  };
}

function App() {
  const [tab, setTab] = useState('today');
  const [state, setState] = useState(getInitialState);
  const [toast, setToast] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState(6);
  const [form, setForm] = useState(() => ({ ...ROUTINES[6] }));
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

  const todayTasks = useMemo(() => {
    return state.tasks
      .filter((task) => task.active !== false && occursOn(task, new Date()))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [state.tasks]);

  const doneCount = todayTasks.filter((task) => isTaskDone(task)).length;
  const resolvedCount = todayTasks.filter((task) => isResolved(task)).length;
  const openTasks = todayTasks.filter((task) => !isResolved(task));
  const nextTask = openTasks[0] || null;
  const progress = todayTasks.length ? Math.round((resolvedCount / todayTasks.length) * 100) : 0;
  const groups = groupTasks(openTasks);
  const exerciseToday = getExerciseToday();
  const exerciseWeek = getExerciseWeek();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    if (!('serviceWorker' in navigator)) return undefined;
    navigator.serviceWorker.register('/sw.js');
    const handler = (event) => {
      const data = event.data || {};
      if (!data.occurrenceId) return;
      const id = data.occurrenceId.split('::')[0];
      if (data.action === 'done') completeTask(id);
      if (data.action === 'snooze30') snoozeTask(id, state.settings.snoozeMinutes);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [state.settings.snoozeMinutes]);

  useEffect(() => {
    runReminderCheck();
    const timer = setInterval(runReminderCheck, 60000);
    return () => clearInterval(timer);
  });

  function isTaskDone(task, key = dateKey()) {
    return Boolean(state.done[occurrenceId(task, key)]);
  }

  function isTaskSkipped(task, key = dateKey()) {
    return Boolean(state.skipped[occurrenceId(task, key)]);
  }

  function isResolved(task, key = dateKey()) {
    return isTaskDone(task, key) || isTaskSkipped(task, key);
  }

  function showToast(message) {
    setToast(message);
  }

  function completeTask(id, key = dateKey()) {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
      const occ = occurrenceId(task, key);
      const snoozedUntil = { ...previous.snoozedUntil };
      const skipped = { ...previous.skipped };
      delete snoozedUntil[occ];
      delete skipped[occ];
      return { ...previous, done: { ...previous.done, [occ]: Date.now() }, skipped, snoozedUntil };
    });
  }

  function skipTask(id, key = dateKey()) {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
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
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
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
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
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
    showToast('Izbrisano.');
  }

  function saveTask() {
    if (!form.title.trim()) return showToast('Upiši naziv zadatka.');
    setState((previous) => ({ ...previous, tasks: [...previous.tasks, createTask(form)] }));
    setTab('today');
    showToast('Zadatak dodan.');
  }

  function addRoutine(routine) {
    setState((previous) => ({ ...previous, tasks: [...previous.tasks, createTask(routine)] }));
    setTab('today');
    showToast('Rutina dodana.');
  }

  function resetApp() {
    if (!confirm('Vratiti početne zadatke i obrisati trenutne podatke?')) return;
    setState({ tasks: ROUTINES.slice(0, 10).map(createTask), done: {}, skipped: {}, snoozedUntil: {}, lastNotified: {}, settings: { ...DEFAULT_SETTINGS } });
    setTab('today');
    showToast('Rutinko je resetiran.');
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return showToast('Ovaj browser ne podržava notifikacije.');
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
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (isQuietTime(state.settings)) return;
    todayTasks.forEach((task) => {
      const occ = occurrenceId(task);
      if (state.done[occ] || state.skipped[occ]) return;
      if (Date.now() < dueTime(task).getTime()) return;
      if (state.snoozedUntil[occ] && Date.now() < Number(state.snoozedUntil[occ])) return;
      const last = Number(state.lastNotified[occ] || 0);
      if (last && Date.now() - last < state.settings.reminderIntervalMinutes * 60000) return;
      sendNotification(task, occ);
      setState((previous) => ({ ...previous, lastNotified: { ...previous.lastNotified, [occ]: Date.now() } }));
    });
  }

  async function sendNotification(task, occ) {
    const options = {
      body: 'Stisni Završeno ili odgodi podsjetnik.',
      tag: occ,
      renotify: true,
      icon: LOGO,
      badge: LOGO,
      data: { occurrenceId: occ },
      actions: [
        { action: 'done', title: 'Završeno' },
        { action: 'snooze30', title: `Odgodi ${state.settings.snoozeMinutes} min` }
      ]
    };
    if ('serviceWorker' in navigator) (await navigator.serviceWorker.ready).showNotification(`${task.icon} ${task.title}`, options);
    else new Notification(`${task.icon} ${task.title}`, options);
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
      let group = dayPart(task.time);
      if (task.repeat === 'once' && task.category === 'obaveza') group = 'once';
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
    <Header tab={tab} setTab={setTab} onNotify={requestNotifications} onInstall={installApp} canInstall={!isInstalled && Boolean(installPrompt)} isInstalled={isInstalled} />
    {tab === 'today' && <TodayScreen tasks={todayTasks} groups={groups} nextTask={nextTask} doneCount={doneCount} resolvedCount={resolvedCount} openCount={openTasks.length} progress={progress} exerciseToday={exerciseToday} exerciseWeek={exerciseWeek} isDone={isTaskDone} isSkipped={isTaskSkipped} isResolved={isResolved} onDone={completeTask} onUndo={undoTask} onSnooze={snoozeTask} onSkip={skipTask} onDelete={deleteTask} settings={state.settings} setTab={setTab} onNotify={requestNotifications} />}
    {tab === 'add' && <AddScreen form={form} setForm={setForm} selectedRoutine={selectedRoutine} pickRoutine={pickRoutine} saveTask={saveTask} />}
    {tab === 'routines' && <RoutinesScreen addRoutine={addRoutine} />}
    {tab === 'settings' && <SettingsScreen settings={state.settings} setSettings={(settings) => setState((previous) => ({ ...previous, settings }))} resetApp={resetApp} showToast={showToast} />}
    <FooterNav tab={tab} setTab={setTab} />
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function Header({ tab, setTab, onNotify, onInstall, canInstall, isInstalled }) {
  const title = { today: 'Danas', add: 'Novi zadatak', routines: 'Rutine', settings: 'Postavke' }[tab];
  if (tab === 'add') {
    return <header className="topBar centered"><button className="iconButton subtle" onClick={() => setTab('today')} aria-label="Natrag">←</button><h1>{title}</h1><span /></header>;
  }
  return <header className="topBar stickyTop">
    <button className="brandLockup" onClick={() => setTab('today')} aria-label="Rutinko početna"><img src={LOGO} alt="Rutinko" /><span><b>Rutinko</b><small>Daily autopilot</small></span></button>
    <div className="headerActions">
      <button className="headerAction notify" onClick={onNotify} aria-label="Uključi obavijesti"><Bell size={18} /><span>Obavijesti</span></button>
      {!isInstalled && <button className="headerAction install" onClick={onInstall} aria-label="Instaliraj aplikaciju" disabled={!canInstall}><Download size={18} /><span>Instaliraj</span></button>}
    </div>
  </header>;
}

function TodayScreen(props) {
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  return <>
    <section className="scoreHero">
      <div className="heroCopy"><span>Daily flow</span><h1>{props.openCount ? `${props.openCount} ${props.openCount === 1 ? 'stvar' : 'stvari'} do mirne glave` : 'Mirna glava'}</h1><p>{props.openCount ? 'Jedan fokus, jedan tap, bez držanja svega u glavi.' : 'Danas je riješeno. Zatvori dan bez kaosa.'}</p></div>
      <div className="scoreRing" style={{ '--score': props.progress }}><div className="scoreValue"><strong>{props.progress}</strong><small>%</small></div></div>
      <div className="metricRail"><Metric label="Riješeno" value={`${props.resolvedCount}/${props.tasks.length}`} /><Metric label="Trening" value={`${props.exerciseToday.done}/${props.exerciseToday.total}`} /><Metric label="Tjedan" value={`${props.exerciseWeek.done}/${props.exerciseWeek.total}`} /></div>
    </section>
    {props.nextTask ? <FocusCard task={props.nextTask} onDone={props.onDone} onSnooze={props.onSnooze} onSkip={props.onSkip} onDelete={props.onDelete} settings={props.settings} /> : <AllDoneCard setTab={props.setTab} />}
    <section className="actionDock"><button className="primaryCta" onClick={() => props.setTab('add')}><Plus size={18} /> Dodaj rutinu</button><button className="secondaryCta" onClick={props.onNotify}><Bell size={18} /> {permission === 'granted' ? 'Podsjetnici aktivni' : 'Uključi podsjetnike'}</button></section>
    <TaskSection title="Jutro" tasks={props.groups.morning} {...props} />
    <TaskSection title="Dan" tasks={props.groups.day} {...props} />
    <TaskSection title="Večer" tasks={props.groups.evening} {...props} />
    <TaskSection title="Jednokratno" tasks={props.groups.once} {...props} />
    <TaskSection title="Gotovo" tasks={props.tasks.filter(props.isResolved)} completed {...props} />
  </>;
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function FocusCard({ task, onDone, onSnooze, onSkip, onDelete, settings }) {
  const status = taskStatus(task, false);
  return <section className="focusCard">
    <button className="deleteTop" onClick={() => onDelete(task.id)}><X size={14} /><span>Izbriši</span></button>
    <div className="focusHeader"><span>Sljedeći fokus</span><small>{task.time} · {status.label}</small></div>
    <div className="focusBody"><TaskGlyph task={task} className="focusIcon" /><div><h2>{task.title}</h2><p>Riješi odmah, odgodi ili preskoči za danas.</p></div></div>
    <div className="focusActions"><button onClick={() => onDone(task.id)}><Check size={18} />Završeno</button><button onClick={() => onSnooze(task.id, settings.snoozeMinutes)}><Clock3 size={18} />Odgodi {settings.snoozeMinutes} min</button><button onClick={() => onSkip(task.id)}><SkipForward size={18} />Preskoči</button></div>
  </section>;
}

function AllDoneCard({ setTab }) {
  return <section className="allDoneCard"><span><Check size={26} /></span><div><h2>Sve bitno je riješeno.</h2><p>Dodaj novu rutinu samo ako stvarno treba.</p></div><button onClick={() => setTab('add')}>Dodaj</button></section>;
}

function TaskSection({ title, tasks, isResolved, isSkipped, onDone, onUndo, onSnooze, onSkip, onDelete, settings }) {
  if (!tasks.length) return null;
  const rightLabel = title === 'Gotovo' ? `${tasks.length} riješeno` : `${tasks.length} rutina`;
  return <section className="taskSection"><div className="sectionHeader"><h2>{title}</h2><small>{rightLabel}</small></div><div className="taskStack">{tasks.map((task) => <TaskCard key={task.id} task={task} resolved={isResolved(task)} skipped={isSkipped(task)} onDone={onDone} onUndo={onUndo} onSnooze={onSnooze} onSkip={onSkip} onDelete={onDelete} settings={settings} />)}</div></section>;
}

function TaskCard({ task, resolved, skipped, onDone, onUndo, onSnooze, onSkip, onDelete, settings }) {
  const status = skipped ? { label: 'preskočeno', tone: 'skipped' } : taskStatus(task, resolved);
  return <article className={`taskCard ${status.tone}`}>
    <button className="deleteTop cardDelete" onClick={() => onDelete(task.id)}><X size={13} /><span>Izbriši</span></button>
    <div className="taskMeta"><TaskGlyph task={task} className="taskIcon" /><div><h3>{task.title}</h3><p>{task.time} · {status.label}</p></div></div>
    <div className="quickActions">{resolved ? <><button className="success" onClick={() => onUndo(task.id)}><Check size={16} /><small>Vrati</small></button><button className="danger" onClick={() => onDelete(task.id)}><Trash2 size={16} /><small>Briši</small></button></> : <><button className="success" onClick={() => onDone(task.id)}><Check size={16} /><small>Done</small></button><button onClick={() => onSnooze(task.id, settings.snoozeMinutes)}><Clock3 size={16} /><small>{settings.snoozeMinutes}m</small></button><button onClick={() => onSkip(task.id)}><SkipForward size={16} /><small>Preskoči</small></button></>}</div>
  </article>;
}

function TaskGlyph({ task, className }) {
  const title = task.title.toLowerCase();
  if (title.includes('psa')) return <div className={className}><Dog size={25} strokeWidth={2.4} /></div>;
  if (title.includes('prošetati')) return <div className={className}><Footprints size={25} strokeWidth={2.4} /></div>;
  return <div className={className}>{task.icon}</div>;
}

function AddScreen({ form, setForm, selectedRoutine, pickRoutine, saveTask }) {
  return <>
    <section className="creatorHero"><TaskGlyph task={form} className="creatorIcon" /><div><span>Rutinko builder</span><h1>{form.title || 'Novi zadatak'}</h1><p>{form.time} · {repeatLabel[form.repeat]} · {categoryLabel[form.category]}</p></div></section>
    <section className="presetBlock"><div className="sectionHeader compact"><h2>Brzo iz rutina</h2><small>{ROUTINES.length} rutina</small></div><div className="chips">{ROUTINES.map((routine, index) => <button key={`${routine.title}-${index}`} className={index === selectedRoutine ? 'chip active' : 'chip'} onClick={() => pickRoutine(index)}><TaskGlyph task={routine} className="chipIcon" /><span>{routine.title}</span></button>)}</div></section>
    <section className="formPanel"><Field label="Naziv" icon="✎"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><div className="iconPicker" aria-label="Odabir ikone">{ICONS.map((icon) => <button key={icon} className={icon === form.icon ? 'selected' : ''} onClick={() => setForm({ ...form, icon })}>{icon}</button>)}</div><Field label="Vrijeme" icon="◷"><input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></Field><Field label="Ponavljanje" icon="↻"><select value={form.repeat} onChange={(event) => setForm({ ...form, repeat: event.target.value })}>{REPEAT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Kategorija" icon="◇"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><button className="saveButton" onClick={saveTask}><Check size={18} />Spremi zadatak</button></section>
  </>;
}

function Field({ label, icon, children }) {
  return <label className="field"><span>{icon}</span><div><small>{label}</small>{children}</div></label>;
}

function RoutinesScreen({ addRoutine }) {
  return <><section className="routineHero"><div><span>Programi</span><h1>{ROUTINES.length} rutina</h1><p>Osnovno, trening i obaveze u jednom tapu.</p></div><img src={LOGO} alt="Rutinko" /></section><section className="routineList">{ROUTINES.map((routine, index) => <article className="routineCard" key={`${routine.title}-${index}`}><TaskGlyph task={routine} className="routineIcon" /><div><h3>{routine.title}</h3><p>{routine.time} · {repeatLabel[routine.repeat]}</p></div><button onClick={() => addRoutine(routine)}>Dodaj</button></article>)}</section></>;
}

function SettingsScreen({ settings, setSettings, resetApp, showToast }) {
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  return <section className="formPanel"><Setting title="Ponavljaj podsjetnik" text="Kad ništa ne stisneš."><input type="number" min="1" max="60" value={settings.reminderIntervalMinutes} onChange={(event) => update('reminderIntervalMinutes', Number(event.target.value))} /></Setting><Setting title="Odgoda" text="Brzi gumb za odgodu."><input type="number" min="5" max="240" value={settings.snoozeMinutes} onChange={(event) => update('snoozeMinutes', Number(event.target.value))} /></Setting><Setting title="Tišina od" text="Ne gnjavi dok spavaš."><input type="time" value={settings.quietStart} onChange={(event) => update('quietStart', event.target.value)} /></Setting><Setting title="Tišina do" text="Podsjetnici se nastavljaju poslije."><input type="time" value={settings.quietEnd} onChange={(event) => update('quietEnd', event.target.value)} /></Setting><button className="saveButton" onClick={() => showToast('Postavke spremljene.')}><Check size={18} />Spremi postavke</button><button className="resetButton" onClick={resetApp}><Trash2 size={18} />Vrati početne zadatke</button></section>;
}

function Setting({ title, text, children }) {
  return <label className="setting"><div><strong>{title}</strong><small>{text}</small></div>{children}</label>;
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

createRoot(document.getElementById('root')).render(<App />);
