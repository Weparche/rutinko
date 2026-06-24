export const DEFAULT_SETTINGS = {
  remindersEnabled: true,
  reminderIntervalMinutes: 5,
  snoozeMinutes: 30,
  quietStart: '22:30',
  quietEnd: '07:00'
};

export const ROUTINES = [
  { title: 'Oprati zube', icon: '🪥', time: '07:30', repeat: 'daily', category: 'higijena' },
  { title: 'Otuširati se', icon: '🚿', time: '07:40', repeat: 'daily', category: 'higijena' },
  { title: 'Pojesti doručak', icon: '🍳', time: '08:00', repeat: 'daily', category: 'prehrana' },
  { title: 'Popiti vode', icon: '💧', time: '08:00', repeat: 'daily', category: 'zdravlje', scheduleType: 'water-2h', startTime: '08:00', endTime: '22:00', intervalMinutes: 120 },
  { title: 'Popiti tablete', icon: '💊', time: '08:15', repeat: 'daily', category: 'zdravlje' },
  { title: '20 trbušnjaka', icon: '💪', time: '08:20', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Prošetati se', icon: '🚶', time: '10:00', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Pojesti ručak', icon: '🥗', time: '12:30', repeat: 'daily', category: 'prehrana' },
  { title: 'Večera', icon: '🍎', time: '19:00', repeat: 'daily', category: 'prehrana' },
  { title: 'Večernja šetnja', icon: '🚶', time: '20:00', repeat: 'daily', category: 'tjelovježba' }
];

export const ICONS = [
  '🪥', '🍳', '💊', '💪', '💧', '🚶', '🐕', '🐶', '🦮', '🧘', '🚿', '📄', '🚗', '💶', '🗑️', '☎️',
  '💙', '❤️', '⭐', '✅', '⏰', '🧠', '🏠', '🛒', '🧼', '🧴', '🛏️', '📚', '💻', '📞', '📝', '📅', '🎯', '☀️', '🌙', '🔥', '🥗', '🍎'
];

export const REPEAT_OPTIONS = [
  ['once', 'Jednom'],
  ['daily', 'Svaki dan'],
  ['weekdays', 'Radnim danom'],
  ['weekly', 'Svaki tjedan'],
  ['monthly', 'Svaki mjesec'],
  ['yearly', 'Svake godine']
];

export const CATEGORY_OPTIONS = [
  ['higijena', 'Higijena'],
  ['prehrana', 'Prehrana'],
  ['zdravlje', 'Zdravlje'],
  ['tjelovježba', 'Tjelovježba'],
  ['obaveza', 'Obaveza']
];

export const repeatLabel = Object.fromEntries(REPEAT_OPTIONS);
export const categoryLabel = Object.fromEntries(CATEGORY_OPTIONS);
