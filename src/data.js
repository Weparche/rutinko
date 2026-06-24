export const DEFAULT_SETTINGS = {
  reminderIntervalMinutes: 5,
  snoozeMinutes: 30,
  quietStart: '22:30',
  quietEnd: '07:00'
};

export const ROUTINES = [
  { title: 'Oprati zube', icon: '🪥', time: '07:30', repeat: 'daily', category: 'higijena' },
  { title: 'Pojesti doručak', icon: '🍳', time: '08:00', repeat: 'daily', category: 'prehrana' },
  { title: 'Popiti tablete', icon: '💊', time: '08:15', repeat: 'daily', category: 'zdravlje' },
  { title: '20 trbušnjaka', icon: '💪', time: '08:20', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Popiti vode', icon: '💧', time: '12:00', repeat: 'daily', category: 'zdravlje' },
  { title: 'Prošetati 10 minuta', icon: '🚶', time: '18:00', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Prošetati psa', icon: '🐕', time: '18:30', repeat: 'daily', category: 'obaveza' },
  { title: '20 trbušnjaka navečer', icon: '💪', time: '20:00', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Otuširati se', icon: '🚿', time: '20:30', repeat: 'daily', category: 'higijena' },
  { title: 'Oprati zube navečer', icon: '🪥', time: '21:30', repeat: 'daily', category: 'higijena' },
  { title: 'Istezanje', icon: '🧘', time: '21:00', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Prijaviti porez', icon: '📄', time: '09:00', repeat: 'yearly', category: 'obaveza' },
  { title: 'Odvesti auto na servis', icon: '🚗', time: '09:00', repeat: 'once', category: 'obaveza' },
  { title: 'Platiti račun', icon: '💶', time: '10:00', repeat: 'monthly', category: 'obaveza' },
  { title: 'Baciti smeće', icon: '🗑️', time: '19:00', repeat: 'weekly', category: 'obaveza' },
  { title: 'Nazvati doktora', icon: '☎️', time: '10:00', repeat: 'once', category: 'zdravlje' },
  { title: 'Nazvati nekoga dragog', icon: '❤️', time: '17:00', repeat: 'weekly', category: 'obaveza' }
];

export const ICONS = [
  '🪥', '🍳', '💊', '💪', '💧', '🚶', '🐕', '🐶', '🦮', '🧘', '🚿', '📄', '🚗', '💶', '🗑️', '☎️',
  '💙', '❤️', '⭐', '✅', '⏰', '🧠', '🏠', '🛒', '🧼', '🧴', '🛏️', '📚', '💻', '📞', '📝', '📅', '🎯', '☀️', '🌙', '🔥'
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
