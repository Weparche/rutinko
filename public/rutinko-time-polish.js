(() => {
  const TIME_RE = /(\d{2}:\d{2}) h/;
  let queued = false;

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

  function polishFocus() {
    document.querySelectorAll('.focusHeader small').forEach((node) => {
      const time = timeFromNode(node);
      if (!time) return;
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
    polishFocus();
    polishTaskCards();
  }

  function scheduleRun(delay = 0) {
    if (queued) return;
    queued = true;
    window.setTimeout(run, delay);
  }

  window.addEventListener('load', () => scheduleRun(120));
  window.addEventListener('pageshow', () => scheduleRun(120));
  document.addEventListener('visibilitychange', () => scheduleRun(120));
  document.addEventListener('click', () => scheduleRun(180), true);
  document.addEventListener('input', () => scheduleRun(180), true);
  window.setInterval(() => scheduleRun(0), 30000);
  scheduleRun(300);
})();
