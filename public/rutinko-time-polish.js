(() => {
  const TIME_RE = /(\d{2}:\d{2}) h/;
  const STORAGE_KEY = 'rutinko-impeccable-polish-v5';
  let queued = false;

  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function occurrenceId(task, key = dateKey()) {
    return `${task.id}::${key}`;
  }

  function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function occursOn(task, date = new Date()) {
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

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function minutesUntil(time) {
    const [hour, minute] = time.split(':').map(Number);
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    return Math.round((target.getTime() - Date.now()) / 60000);
  }

  function durationLabel(minutes) {
    if (minutes === 0) return 'sad je vrijeme';

    const prefix = minutes > 0 ? 'za' : 'kasni';
    const absolute = Math.abs(minutes);
    const hours = Math.floor(absolute / 60);
    const restMinutes = absolute % 60;
    const parts = [];

    if (hours > 0) parts.push(`${hours} h`);
    if (restMinutes > 0 || hours === 0) parts.push(`${restMinutes} min`);

    return `${prefix} ${parts.join(' <span class="dueGlue">i</span> ')}`;
  }

  function dueHtml(time, fallback = '') {
    const remaining = fallback || durationLabel(minutesUntil(time));
    return `<span class="dueTimeLine">${time} h</span><span class="dueRemainingLine">${remaining}</span>`;
  }

  function updateDueNode(node, time, fallback = '') {
    if (!node || !time) return;
    const html = dueHtml(time, fallback);
    if (node.dataset.dueRendered === html) return;
    node.dataset.dueTime = time;
    node.dataset.dueRendered = html;
    node.innerHTML = html;
    node.classList.add('dueMetaFormatted');
  }

  function textFromHtml(node) {
    return node?.textContent || '';
  }

  function timeFromNode(node) {
    const stored = node?.dataset?.dueTime;
    if (stored) return stored;
    const text = textFromHtml(node);
    return text.match(TIME_RE)?.[1] || null;
  }

  function statusFromText(text) {
    const parts = text.split('·').map((part) => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  function renameDoneSection() {
    document.querySelectorAll('.sectionTitle h2').forEach((title) => {
      if (title.textContent.trim() === 'Gotovo') title.textContent = 'Završeno';
    });
  }

  function completedTasksToday() {
    const state = readState();
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const done = state.done || {};
    const skipped = state.skipped || {};
    const today = dateKey();

    return tasks
      .filter((task) => task.active !== false && occursOn(task, new Date()))
      .map((task) => {
        const occ = occurrenceId(task, today);
        if (done[occ]) return { ...task, resolvedLabel: 'završeno', resolvedTone: 'done', resolvedAt: done[occ] };
        if (skipped[occ]) return { ...task, resolvedLabel: 'preskočeno', resolvedTone: 'skipped', resolvedAt: skipped[occ] };
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function completedCardHtml(task) {
    const icon = task.icon || '✅';
    const title = task.title || 'Rutina';
    const time = task.time || '00:00';
    const tone = task.resolvedTone || 'done';
    return `
      <article class="taskCard ${tone} completedMirrorCard" data-due-time="${time}">
        <div class="taskMeta">
          <div class="taskIcon">${icon}</div>
          <div><h3>${title}</h3><p class="taskDueInline" data-original-meta="${time} h · ${task.resolvedLabel}">${dueHtml(time, task.resolvedLabel)}</p></div>
        </div>
      </article>
    `;
  }

  function removeReactCompletedSections() {
    document.querySelectorAll('.taskSection').forEach((section) => {
      if (section.classList.contains('completedPlaceholderSection')) return;
      const title = section.querySelector('.sectionTitle h2')?.textContent?.trim();
      const meta = section.querySelector('.sectionMeta small')?.textContent || '';
      if (title === 'Gotovo' || title === 'Završeno' || meta.includes('riješeno')) section.remove();
    });
  }

  function ensureCompletedSection() {
    const completed = completedTasksToday();
    removeReactCompletedSections();

    const eveningTitle = Array.from(document.querySelectorAll('.sectionTitle h2')).find((title) => title.textContent.trim() === 'Večer');
    const eveningSection = eveningTitle?.closest('.taskSection');
    const anchor = eveningSection || document.querySelector('.actionDock');
    if (!anchor?.parentNode) return;

    let section = document.querySelector('.completedPlaceholderSection');
    if (!section) {
      section = document.createElement('section');
      section.className = 'taskSection sectionPanel done completedPlaceholderSection';
      anchor.insertAdjacentElement(eveningSection ? 'afterend' : 'afterend', section);
    }

    const count = completed.length;
    const wasCount = Number(section.dataset.completedCount || 0);
    const shouldOpen = count > 0 || section.classList.contains('open');
    section.dataset.completedCount = String(count);
    section.classList.toggle('open', shouldOpen);
    section.classList.toggle('collapsed', !shouldOpen);

    section.innerHTML = `
      <button class="sectionHeader sectionToggle" type="button" aria-expanded="${shouldOpen}">
        <span class="sectionTitle"><span class="sectionIcon">✅</span><h2>Završeno</h2></span>
        <span class="sectionMeta"><small>${count} završeno</small><svg class="sectionChevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
      </button>
      ${shouldOpen ? (count ? `<div class="taskStack completedMirrorStack">${completed.map(completedCardHtml).join('')}</div>` : '<div class="completedEmptyText">Još nema završenih rutina danas.</div>') : ''}
    `;

    section.querySelector('button')?.addEventListener('click', () => {
      section.classList.toggle('open');
      section.classList.toggle('collapsed');
      scheduleRun(0);
    });

    if (count !== wasCount) section.classList.add('justSynced');
  }

  function polishFocus() {
    document.querySelectorAll('.focusCard').forEach((card) => {
      const node = card.querySelector('.focusDueMeta') || card.querySelector('.focusHeader small');
      const time = timeFromNode(node);
      if (!time || !node) return;
      node.classList.add('focusDueMeta');
      if (node.parentElement !== card) card.appendChild(node);
      updateDueNode(node, time);
    });
  }

  function polishTaskCards() {
    document.querySelectorAll('.taskCard').forEach((card) => {
      const textNode = card.querySelector('.taskMeta p');
      const originalText = textNode?.dataset?.originalMeta || textFromHtml(textNode);
      const time = card.dataset.dueTime || originalText.match(TIME_RE)?.[1] || textFromHtml(textNode).match(TIME_RE)?.[1];
      if (!time || !textNode) return;

      card.dataset.dueTime = time;
      textNode.dataset.originalMeta = originalText;
      card.querySelector('.taskDueMeta')?.remove();

      const resolved = card.classList.contains('done') || card.classList.contains('skipped');
      const fallback = resolved ? statusFromText(originalText) : '';
      const html = dueHtml(time, fallback);
      if (textNode.dataset.dueRendered === html) return;
      textNode.dataset.dueRendered = html;
      textNode.innerHTML = html;
      textNode.classList.remove('taskStatusOnly');
      textNode.classList.add('taskDueInline');
    });
  }

  function run() {
    queued = false;
    renameDoneSection();
    ensureCompletedSection();
    polishFocus();
    polishTaskCards();
  }

  function scheduleRun(delay = 0) {
    if (queued) return;
    queued = true;
    window.setTimeout(run, delay);
  }

  window.addEventListener('storage', () => scheduleRun(80));
  window.addEventListener('load', () => scheduleRun(120));
  window.addEventListener('pageshow', () => scheduleRun(120));
  document.addEventListener('visibilitychange', () => scheduleRun(120));
  document.addEventListener('click', () => scheduleRun(180), true);
  document.addEventListener('input', () => scheduleRun(180), true);
  window.setInterval(() => scheduleRun(0), 30000);
  scheduleRun(300);
})();