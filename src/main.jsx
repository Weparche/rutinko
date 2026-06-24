import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { CATEGORY_OPTIONS, DEFAULT_SETTINGS, ICONS, REPEAT_OPTIONS, ROUTINES, categoryLabel, repeatLabel } from './data.js';
import { createTask, currentWeekDates, dateKey, dayPart, dueTime, formatTime, isQuietTime, occurrenceId, occursOn, taskStatus } from './utils.js';

const STORAGE_KEY = 'rutinko-react-v1';

function loadInitialState() {
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
  const [state, setState] = useState(loadInitialState);
  const [toast, setToast] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState(3);
  const [form, setForm] = useState(() => ({ ...ROUTINES[3] }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data || {};
        if (!data.occurrenceId) return;
        const id = data.occurrenceId.split('::')[0];
        if (data.action === 'done') markDone(id);
        if (data.action === 'snooze30') snoozeTask(id, state.settings.snoozeMinutes);
      });
    }
  }, [state.settings.snoozeMinutes]);

  useEffect(() => {
    runReminderCheck();
    const timer = setInterval(runReminderCheck, 60000);
    return () => clearInterval(timer);
  });

  const todayTasks = useMemo(() => {
    return state.tasks
      .filter((task) => task.active !== false && occursOn(task, new Date()))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [state.tasks, state.done, state.snoozedUntil]);

  const doneCount = todayTasks.filter((task) => isDone(task)).length;
  const leftCount = todayTasks.length - doneCount;
  const exerciseToday = getExerciseToday();
  const exerciseWeek = getExerciseWeek();

  function isDone(task, key = dateKey()) {
    return Boolean(state.done[occurrenceId(task, key)]);
  }

  function updateState(updater) {
    setState((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return next;
    });
  }

  function showToast(message) {
    setToast(message);
  }

  function markDone(id, key = dateKey()) {
    updateState((previous) => {
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
      const occ = occurrenceId(task, key);
      const nextDone = { ...previous.done, [occ]: Date.now() };
      const nextSnooze = { ...previous.snoozedUntil };
      delete nextSnooze[occ];
      return { ...previous, done: nextDone, snoozedUntil: nextSnooze };
    });
  }

  function undoDone(id, key = dateKey()) {
    updateState((previous) => {
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
      const nextDone = { ...previous.done };
      delete nextDone[occurrenceId(task, key)];
      return { ...previous, done: nextDone };
    });
  }

  function snoozeTask(id, minutes, key = dateKey()) {
    updateState((previous) => {
      const task = previous.tasks.find((item) => item.id === id);
      if (!task) return previous;
      return {
        ...previous,
        snoozedUntil: {
          ...previous.snoozedUntil,
          [occurrenceId(task, key)]: Date.now() + minutes * 60000
        }
      };
    });
    showToast(`Odgođeno za ${minutes} min.`);
  }

  function deleteTask(id) {
    updateState((previous) => {
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
    if (!form.title.trim()) {
      showToast('Upiši naziv zadatka.');
      return;
    }
    updateState((previous) => ({ ...previous, tasks: [...previous.tasks, createTask(form)] }));
    setTab('today');
    showToast('Zadatak dodan.');
  }

  function addRoutine(routine) {
    updateState((previous) => ({ ...previous, tasks: [...previous.tasks, createTask(routine)] }));
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
    if (!('Notification' in window)) {
      showToast('Ovaj browser ne podržava notifikacije.');
      return;
    }
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
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      data: { occurrenceId: occ },
      actions: [
        { action: 'done', title: 'Završeno' },
        { action: 'snooze30', title: `Odgodi ${state.settings.snoozeMinutes} min` }
      ]
    };
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(`${task.icon} ${task.title}`, options);
    } else {
      new Notification(`${task.icon} ${task.title}`, options);
    }
  }

  function getExerciseToday() {
    const exercises = todayTasks.filter((task) => task.category === 'tjelovježba');
    return { total: exercises.length, done: exercises.filter((task) => isDone(task)).length };
  }

  function getExerciseWeek() {
    const exercises = state.tasks.filter((task) => task.category === 'tjelovježba' && task.active !== false);
    let total = 0;
    let done = 0;
    currentWeekDates().forEach((day) => {
      exercises.forEach((task) => {
        if (!occursOn(task, day)) return;
        total += 1;
        if (isDone(task, dateKey(day))) done += 1;
      });
    });
    return { total, done };
  }

  function pickRoutine(index) {
    const routine = ROUTINES[index];
    if (!routine) return;
    setSelectedRoutine(index);
    setForm({ ...routine });
  }

  function groupedOpenTasks() {
    const groups = { morning: [], day: [], evening: [], once: [] };
    todayTasks.filter((task) => !isDone(task)).forEach((task) => {
      let group = dayPart(task.time);
      if (task.repeat === 'once' && task.category === 'obaveza') group = 'once';
      groups[group].push(task);
    });
    return groups;
  }

  const groups = groupedOpenTasks();

  return (
    <div className="app">
      <Header tab={tab} setTab={setTab} onNotify={requestNotifications} />
      {tab === 'today' && (
        <TodayScreen
          tasks={todayTasks}
          groups={groups}
          doneCount={doneCount}
          leftCount={leftCount}
          exerciseToday={exerciseToday}
          exerciseWeek={exerciseWeek}
          isDone={isDone}
          onDone={markDone}
          onUndo={undoDone}
          onSnooze={snoozeTask}
          onDelete={deleteTask}
          settings={state.settings}
          onNotify={requestNotifications}
        />
      )}
      {tab === 'add' && (
        <AddScreen
          form={form}
          setForm={setForm}
          selectedRoutine={selectedRoutine}
          pickRoutine={pickRoutine}
          saveTask={saveTask}
        />
      )}
      {tab === 'routines' && <RoutinesScreen addRoutine={addRoutine} />}
      {tab === 'settings' && (
        <SettingsScreen
          settings={state.settings}
          setSettings={(settings) => setState((previous) => ({ ...previous, settings }))}
          resetApp={resetApp}
          showToast={showToast}
        />
      )}
      <BottomNav tab={tab} setTab={setTab} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Header({ tab, setTab, onNotify }) {
  const title = { today: 'Danas', add: 'Dodaj zadatak', routines: 'Rutine', settings: 'Postavke' }[tab];
  if (tab === 'add') {
    return <header className="top centered"><button className="ghost" onClick={() => setTab('today')}>←</button><h1>{title}</h1><span /></header>;
  }
  return <header className="top"><div><p>Rutinko</p><h1>{title}</h1></div><button className="round" onClick={tab === 'today' ? onNotify : () => setTab('add')}>{tab === 'today' ? '🔔' : '+'}</button></header>;
}

function TodayScreen(props) {
  const total = props.tasks.length;
  const progress = total ? Math.round((props.doneCount / total) * 100) : 0;
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  return <>
    <section className="hero">
      <div className="heroGlow" />
      <div className="heroText"><h2>{props.leftCount ? `Još ${props.leftCount} ${props.leftCount === 1 ? 'stvar' : 'stvari'}.` : 'Mirna glava.'}</h2><p>{props.leftCount ? 'Ti to možeš! 💙' : 'Sve bitno za danas je riješeno.'}</p></div>
      <div className="ring" style={{ '--value': progress }}><strong>{props.doneCount}/{total}</strong><span>završeno</span></div>
      <div className="heroStats"><Stat label="Mini trening danas" value={`${props.exerciseToday.done}/${props.exerciseToday.total}`} percent={props.exerciseToday.total ? props.exerciseToday.done / props.exerciseToday.total * 100 : 0} /><Stat label="Mini treninzi ovaj tjedan" value={`${props.exerciseWeek.done}/${props.exerciseWeek.total}`} percent={props.exerciseWeek.total ? props.exerciseWeek.done / props.exerciseWeek.total * 100 : 0} /></div>
    </section>
    {permission !== 'granted' && <button className="notifyCard" onClick={props.onNotify}>🔔 Uključi podsjetnike</button>}
    <TaskSection title="Jutro ☀️" tasks={props.groups.morning} {...props} />
    <TaskSection title="Dan ☀️" tasks={props.groups.day} {...props} />
    <TaskSection title="Večer 🌙" tasks={props.groups.evening} {...props} />
    <TaskSection title="Jednokratno" tasks={props.groups.once} {...props} />
    <TaskSection title="Gotovo ✅" tasks={props.tasks.filter(props.isDone)} completed {...props} />
  </>;
}

function Stat({ label, value, percent }) {
  return <div><span>{label}</span><strong>{value}</strong><i style={{ '--bar': `${percent}%` }} /></div>;
}

function TaskSection({ title, tasks, completed, isDone, onDone, onUndo, onSnooze, onDelete, settings }) {
  if (!tasks.length) return null;
  return <section className="section"><div className="sectionHead"><h2>{title}</h2><span>{tasks.length}</span></div><div className="taskList">{tasks.map((task) => <TaskCard key={task.id} task={task} done={isDone(task)} completed={completed} onDone={onDone} onUndo={onUndo} onSnooze={onSnooze} onDelete={onDelete} settings={settings} />)}</div></section>;
}

function TaskCard({ task, done, onDone, onUndo, onSnooze, onDelete, settings }) {
  const status = taskStatus(task, done);
  return <article className={`task ${status.tone}`}><div className="taskMain"><div className="taskIcon">{task.icon}</div><div><h3>{task.title}</h3><p>{task.time} · {status.label}</p></div></div><div className="taskActions">{done ? <><button className="mini success" onClick={() => onUndo(task.id)}>↩<span>Vrati</span></button><button className="mini danger" onClick={() => onDelete(task.id)}>×<span>Obriši</span></button></> : <><button className="mini success" onClick={() => onDone(task.id)}>✓<span>Završeno</span></button><button className="mini" onClick={() => onSnooze(task.id, settings.snoozeMinutes)}>◷<span>{settings.snoozeMinutes} min</span></button><button className="mini" onClick={() => onSnooze(task.id, 5)}>♢<span>5 min</span></button></>}</div></article>;
}

function AddScreen({ form, setForm, selectedRoutine, pickRoutine, saveTask }) {
  return <>
    <section className="addHero"><div className="bigIcon">{form.icon}</div><div><span>Novi zadatak</span><strong>{form.title || 'Novi zadatak'}</strong><p>Odaberi rutinu, ikonu i vrijeme.</p></div></section>
    <section className="quick"><div className="sectionHead"><h2>Brzo iz rutina</h2><span>{ROUTINES.length}</span></div><div className="chips">{ROUTINES.map((routine, index) => <button key={`${routine.title}-${index}`} className={index === selectedRoutine ? 'chip active' : 'chip'} onClick={() => pickRoutine(index)}><b>{routine.icon}</b><span>{routine.title}</span></button>)}</div></section>
    <section className="panel form"><Field label="Naziv zadatka" icon="✎"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Ikona" icon={form.icon}><input value={form.icon} readOnly /></Field><div className="iconGrid">{ICONS.map((icon) => <button key={icon} className={icon === form.icon ? 'iconPick active' : 'iconPick'} onClick={() => setForm({ ...form, icon })}>{icon}</button>)}</div><Field label="Vrijeme" icon="◷"><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field><Field label="Ponavljanje" icon="↻"><select value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })}>{REPEAT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Kategorija" icon="◇"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><button className="primary" onClick={saveTask}>Spremi zadatak</button></section>
  </>;
}

function Field({ label, icon, children }) {
  return <label className="field"><span>{icon}</span><div><small>{label}</small>{children}</div></label>;
}

function RoutinesScreen({ addRoutine }) {
  return <><section className="routineHero"><div><span>Gotovi predlošci</span><strong>{ROUTINES.length} rutina</strong><p>Sve osnovno + mini trening + srce.</p></div><b>💙</b></section><section className="routineList">{ROUTINES.map((routine, index) => <article className="routine" key={`${routine.title}-${index}`}><div className="routineIcon">{routine.icon}</div><div><h3>{routine.title}</h3><p>{routine.time} · {repeatLabel[routine.repeat]} · {categoryLabel[routine.category]}</p></div><button onClick={() => addRoutine(routine)}>Dodaj</button></article>)}</section></>;
}

function SettingsScreen({ settings, setSettings, resetApp, showToast }) {
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  return <section className="panel settings"><Setting title="Ponavljaj podsjetnik" text="Kad ništa ne stisneš."><input type="number" min="1" max="60" value={settings.reminderIntervalMinutes} onChange={(e) => update('reminderIntervalMinutes', Number(e.target.value))} /></Setting><Setting title="Odgoda" text="Brzi gumb za odgodu."><input type="number" min="5" max="240" value={settings.snoozeMinutes} onChange={(e) => update('snoozeMinutes', Number(e.target.value))} /></Setting><Setting title="Tišina od" text="Ne gnjavi dok spavaš."><input type="time" value={settings.quietStart} onChange={(e) => update('quietStart', e.target.value)} /></Setting><Setting title="Tišina do" text="Podsjetnici se nastavljaju poslije."><input type="time" value={settings.quietEnd} onChange={(e) => update('quietEnd', e.target.value)} /></Setting><button className="primary" onClick={() => showToast('Postavke spremljene.')}>Spremi postavke</button><button className="dangerBtn" onClick={resetApp}>Vrati početne zadatke</button></section>;
}

function Setting({ title, text, children }) {
  return <label className="setting"><div><strong>{title}</strong><small>{text}</small></div>{children}</label>;
}

function BottomNav({ tab, setTab }) {
  const items = [['today', '▣', 'Danas'], ['add', '+', 'Dodaj'], ['routines', '▤', 'Rutine'], ['settings', '⚙', 'Postavke']];
  return <nav className="nav">{items.map(([id, icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><b>{icon}</b><span>{label}</span></button>)}</nav>;
}

createRoot(document.getElementById('root')).render(<App />);
