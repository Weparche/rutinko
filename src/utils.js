export function createId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

export function createTask(template) {
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

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dueTime(task, base = new Date()) {
  const parts = task.time.split(':').map(Number);
  const date = new Date(base);
  date.setHours(parts[0], parts[1], 0, 0);
  return date;
}

export function occurrenceId(task, key = dateKey()) {
  return `${task.id}::${key}`;
}

export function occursOn(task, date = new Date()) {
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

export function dayPart(time) {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

export function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function currentWeekDates() {
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

export function toMinutes(time) {
  const parts = time.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

export function isQuietTime(settings, date = new Date()) {
  const current = toMinutes(formatTime(date));
  const start = toMinutes(settings.quietStart);
  const end = toMinutes(settings.quietEnd);
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export function taskStatus(task, done) {
  if (done) return { label: 'završeno', tone: 'done' };
  const minutes = Math.floor((Date.now() - dueTime(task).getTime()) / 60000);
  if (minutes < 0) return { label: `za ${Math.abs(minutes)} min`, tone: 'upcoming' };
  if (minutes >= 30) return { label: `kasni ${minutes} min`, tone: 'urgent' };
  if (minutes > 0) return { label: `kasni ${minutes} min`, tone: 'overdue' };
  return { label: 'sad je vrijeme', tone: 'overdue' };
}

export function canNotify() {
  return typeof window !== 'undefined' && 'Notification' in window;
}
