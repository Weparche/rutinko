import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { CATEGORY_OPTIONS, DEFAULT_SETTINGS, ICONS, REPEAT_OPTIONS, ROUTINES, categoryLabel, repeatLabel } from './data.js';
import { createTask, currentWeekDates, dateKey, dayPart, dueTime, isQuietTime, occurrenceId, occursOn, taskStatus } from './utils.js';

const STORAGE_KEY = 'rutinko-impeccable-remaster-v1';
const LOGO = '/brand/rutinko-logo.webp';

function getInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : ROUTINES.slice(0, 9).map(createTask),
        done: parsed.done || {},
        snoozedUntil: parsed.snoozedUntil || {},
        lastNotified: parsed.lastNotified || {},
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
      };
    } catch {}
  }

  return {
    tasks: ROUTINES.slice(0, 9).map(createTask),
    done: {},
    snoozedUntil: {},
    lastNotified: {},
    settings: { ...DEFAULT_SETTINGS }
  };
}

function App() {
  const [tab, setTab] = useState('today');
  const [state, setState] = useState(getInitialState);
  const [toast, setToast] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState(3);
  const [form, setForm] = useState(() => ({ ...ROUTINES[3] }));

  const todayTasks = useMemo(() => {
    return state.tasks
      .filter((task) => task.active !== false && occursOn(task, new Date()))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [state.tasks]);

  const doneCount = todayTasks.filter((task) => isTaskDone(task)).length;
  const openTasks = todayTasks.filter((task) => !isTaskDone(task));
  const nextTask = openTasks[0] || null;
  const progress = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0;
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

  function showToast(message) {
    setToast(message);
  }

  function completeTask(id, key = dateKey()) {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
      const occ = occurrenceId(task, key);
      const snoozedUntil = { ...previous.snoozedUntil };
      delete snoozedUntil[occ];
      return { ...previous, done: { ...previous.done, [occ]: Date.now() }, snoozedUntil };
    });
  }

  function undoTask(id, key = dateKey()) {
    setState((previous) => {
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
      const done = { ...previous.done };
      delete done[occurrenceId(task, key)];
      return { ...previous, done };
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
        snoozedUntil: clean(previous.snoozedUntil),
        lastNotified: clean(previous.lastNotified)
      };
    });
    showToast('Zadatak obrisan.');
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
    setState({ tasks: ROUTINES.slice(0, 9).map(createTask), done: {}, snoozedUntil: {}, lastNotified: {}, settings: { ...DEFAULT_SETTINGS } });
    setTab('today');
    showToast('Rutinko je resetiran.');
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return showToast('Ovaj browser ne podržava notifikacije.');
    const permission = await Notification.requestPermission();
    showToast(permission === 'granted' ? 'Podsjetnici su uključeni.' : 'Podsjetnici nisu odobreni.');
  }

  function runReminderCheck() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (isQuietTime(state.settings)) return;
    todayTasks.forEach((task) => {
      const occ = occurrenceId(task);
      if (state.done[occ]) return;
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
    <Header tab={tab} setTab={setTab} onNotify={requestNotifications} />
    {tab === 'today' && <TodayScreen tasks={todayTasks} groups={groups} nextTask={nextTask} doneCount={doneCount} openCount={openTasks.length} progress={progress} exerciseToday={exerciseToday} exerciseWeek={exerciseWeek} isDone={isTaskDone} onDone={completeTask} onUndo={undoTask} onSnooze={snoozeTask} onDelete={deleteTask} settings={state.settings} setTab={setTab} onNotify={requestNotifications} />}
    {tab === 'add' && <AddScreen form={form} setForm={setForm} selectedRoutine={selectedRoutine} pickRoutine={pickRoutine} saveTask={saveTask} />}
    {tab === 'routines' && <RoutinesScreen addRoutine={addRoutine} />}
    {tab === 'settings' && <SettingsScreen settings={state.settings} setSettings={(settings) => setState((previous) => ({ ...previous, settings }))} resetApp={resetApp} showToast={showToast} />}
    <FooterNav tab={tab} setTab={setTab} />
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function Header({ tab, setTab, onNotify }) {
  const title = { today: 'Danas', add: 'Novi zadatak', routines: 'Rutine', settings: 'Postavke' }[tab];
  if (tab === 'add') {
    return <header className="topBar centered"><button className="iconButton subtle" onClick={() => setTab('today')} aria-label="Natrag">←</button><h1>{title}</h1><span /></header>;
  }
  return <header className="topBar">
    <button className="brandLockup" onClick={() => setTab('today')} aria-label="Rutinko početna"><img src={LOGO} alt="Rutinko" /><span><b>Rutinko</b><small>Daily autopilot</small></span></button>
    <button className="iconButton" onClick={tab === 'today' ? onNotify : () => setTab('add')} aria-label={tab === 'today' ? 'Podsjetnici' : 'Dodaj'}>{tab === 'today' ? '🔔' : '+'}</button>
  </header>;
}

function TodayScreen(props) {
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  return <>
    <section className="scoreHero">
      <div className="heroCopy"><span>Impeccable daily flow</span><h1>{props.openCount ? `${props.openCount} ${props.openCount === 1 ? 'stvar' : 'stvari'} do mirne glave` : 'Mirna glava'}</h1><p>{props.openCount ? 'Jedan fokus, jedan tap, bez držanja svega u glavi.' : 'Danas je riješeno. Zatvori dan bez kaosa.'}</p></div>
      <div className="scoreRing" style={{ '--score': props.progress }}><strong>{props.progress}</strong><small>%</small></div>
      <div className="metricRail"><Metric label="Zadaci" value={`${props.doneCount}/${props.tasks.length}`} /><Metric label="Trening" value={`${props.exerciseToday.done}/${props.exerciseToday.total}`} /><Metric label="Tjedan" value={`${props.exerciseWeek.done}/${props.exerciseWeek.total}`} /></div>
    </section>
    {props.nextTask ? <FocusCard task={props.nextTask} onDone={props.onDone} onSnooze={props.onSnooze} settings={props.settings} /> : <AllDoneCard setTab={props.setTab} />}
    <section className="actionDock"><button className="primaryCta" onClick={() => props.setTab('add')}>＋ Dodaj rutinu</button><button className="secondaryCta" onClick={props.onNotify}>{permission === 'granted' ? 'Podsjetnici aktivni' : 'Uključi podsjetnike'}</button></section>
    <TaskSection title="Jutro" badge="AM" tasks={props.groups.morning} {...props} />
    <TaskSection title="Dan" badge="DAY" tasks={props.groups.day} {...props} />
    <TaskSection title="Večer" badge="PM" tasks={props.groups.evening} {...props} />
    <TaskSection title="Jednokratno" badge="1X" tasks={props.groups.once} {...props} />
    <TaskSection title="Gotovo" badge="OK" tasks={props.tasks.filter(props.isDone)} completed {...props} />
  </>;
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function FocusCard({ task, onDone, onSnooze, settings }) {
  const status = taskStatus(task, false);
  return <section className="focusCard">
    <div className="focusHeader"><span>Sljedeći fokus</span><small>{task.time} · {status.label}</small></div>
    <div className="focusBody"><div className="focusIcon">{task.icon}</div><div><h2>{task.title}</h2><p>Riješi odmah ili odgodi bez razmišljanja.</p></div></div>
    <div className="focusActions"><button onClick={() => onDone(task.id)}>Završeno</button><button onClick={() => onSnooze(task.id, settings.snoozeMinutes)}>Odgodi {settings.snoozeMinutes} min</button><button onClick={() => onSnooze(task.id, 5)}>Za 5 min</button></div>
  </section>;
}

function AllDoneCard({ setTab }) {
  return <section className="allDoneCard"><span>✓</span><div><h2>Sve bitno je riješeno.</h2><p>Dodaj novu rutinu samo ako stvarno treba.</p></div><button onClick={() => setTab('add')}>Dodaj</button></section>;
}

function TaskSection({ title, badge, tasks, isDone, onDone, onUndo, onSnooze, onDelete, settings }) {
  if (!tasks.length) return null;
  return <section className="taskSection"><div className="sectionHeader"><div><span>{badge}</span><h2>{title}</h2></div><small>{tasks.length}</small></div><div className="taskStack">{tasks.map((task) => <TaskCard key={task.id} task={task} done={isDone(task)} onDone={onDone} onUndo={onUndo} onSnooze={onSnooze} onDelete={onDelete} settings={settings} />)}</div></section>;
}

function TaskCard({ task, done, onDone, onUndo, onSnooze, onDelete, settings }) {
  const status = taskStatus(task, done);
  return <article className={`taskCard ${status.tone}`}><div className="taskMeta"><div className="taskIcon">{task.icon}</div><div><h3>{task.title}</h3><p>{task.time} · {status.label}</p></div></div><div className="quickActions">{done ? <><button className="success" onClick={() => onUndo(task.id)}>↩<small>Vrati</small></button><button className="danger" onClick={() => onDelete(task.id)}>×<small>Briši</small></button></> : <><button className="success" onClick={() => onDone(task.id)}>✓<small>Done</small></button><button onClick={() => onSnooze(task.id, settings.snoozeMinutes)}>◷<small>{settings.snoozeMinutes}m</small></button><button onClick={() => onSnooze(task.id, 5)}>⏱<small>5m</small></button></>}</div></article>;
}

function AddScreen({ form, setForm, selectedRoutine, pickRoutine, saveTask }) {
  return <>
    <section className="creatorHero"><div className="creatorIcon">{form.icon}</div><div><span>Rutinko builder</span><h1>{form.title || 'Novi zadatak'}</h1><p>{form.time} · {repeatLabel[form.repeat]} · {categoryLabel[form.category]}</p></div></section>
    <section className="presetBlock"><div className="sectionHeader compact"><div><span>PRESET</span><h2>Brzo iz rutina</h2></div><small>{ROUTINES.length}</small></div><div className="chips">{ROUTINES.map((routine, index) => <button key={`${routine.title}-${index}`} className={index === selectedRoutine ? 'chip active' : 'chip'} onClick={() => pickRoutine(index)}><b>{routine.icon}</b><span>{routine.title}</span></button>)}</div></section>
    <section className="formPanel"><Field label="Naziv" icon="✎"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><div className="iconPicker" aria-label="Odabir ikone">{ICONS.map((icon) => <button key={icon} className={icon === form.icon ? 'selected' : ''} onClick={() => setForm({ ...form, icon })}>{icon}</button>)}</div><Field label="Vrijeme" icon="◷"><input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></Field><Field label="Ponavljanje" icon="↻"><select value={form.repeat} onChange={(event) => setForm({ ...form, repeat: event.target.value })}>{REPEAT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Kategorija" icon="◇"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><button className="saveButton" onClick={saveTask}>Spremi zadatak</button></section>
  </>;
}

function Field({ label, icon, children }) {
  return <label className="field"><span>{icon}</span><div><small>{label}</small>{children}</div></label>;
}

function RoutinesScreen({ addRoutine }) {
  return <><section className="routineHero"><div><span>Programi</span><h1>{ROUTINES.length} rutina</h1><p>Osnovno, trening i obaveze u jednom tapu.</p></div><img src={LOGO} alt="Rutinko" /></section><section className="routineList">{ROUTINES.map((routine, index) => <article className="routineCard" key={`${routine.title}-${index}`}><div className="routineIcon">{routine.icon}</div><div><h3>{routine.title}</h3><p>{routine.time} · {repeatLabel[routine.repeat]}</p></div><button onClick={() => addRoutine(routine)}>Dodaj</button></article>)}</section></>;
}

function SettingsScreen({ settings, setSettings, resetApp, showToast }) {
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  return <section className="formPanel"><Setting title="Ponavljaj podsjetnik" text="Kad ništa ne stisneš."><input type="number" min="1" max="60" value={settings.reminderIntervalMinutes} onChange={(event) => update('reminderIntervalMinutes', Number(event.target.value))} /></Setting><Setting title="Odgoda" text="Brzi gumb za odgodu."><input type="number" min="5" max="240" value={settings.snoozeMinutes} onChange={(event) => update('snoozeMinutes', Number(event.target.value))} /></Setting><Setting title="Tišina od" text="Ne gnjavi dok spavaš."><input type="time" value={settings.quietStart} onChange={(event) => update('quietStart', event.target.value)} /></Setting><Setting title="Tišina do" text="Podsjetnici se nastavljaju poslije."><input type="time" value={settings.quietEnd} onChange={(event) => update('quietEnd', event.target.value)} /></Setting><button className="saveButton" onClick={() => showToast('Postavke spremljene.')}>Spremi postavke</button><button className="resetButton" onClick={resetApp}>Vrati početne zadatke</button></section>;
}

function Setting({ title, text, children }) {
  return <label className="setting"><div><strong>{title}</strong><small>{text}</small></div>{children}</label>;
}

function FooterNav({ tab, setTab }) {
  const items = [['today', '⌁', 'Danas'], ['add', '+', 'Dodaj'], ['routines', '◇', 'Rutine'], ['settings', '⚙', 'Postavke']];
  return <nav className="footerNav">{items.map(([id, icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><b>{icon}</b><span>{label}</span></button>)}</nav>;
}

createRoot(document.getElementById('root')).render(<App />);
