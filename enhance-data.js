let rutinkoSelectedPresetIndex = 3;
let rutinkoSelectedIcon = '💪';

const RUTINKO_EXTRA_ROUTINES = [
  { title: 'Prošetati 10 minuta', icon: '🚶', time: '18:00', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Istezanje', icon: '🧘', time: '21:00', repeat: 'daily', category: 'tjelovježba' },
  { title: 'Baciti smeće', icon: '🗑️', time: '19:00', repeat: 'weekly', category: 'obaveza' },
  { title: 'Nazvati nekoga', icon: '💬', time: '17:00', repeat: 'once', category: 'obaveza' }
];

const RUTINKO_ALL_ROUTINES = [
  ...TEMPLATE_DATA,
  ...RUTINKO_EXTRA_ROUTINES.filter((extra) => !TEMPLATE_DATA.some((item) => item.title === extra.title && item.time === extra.time))
];

const RUTINKO_ICONS = [...new Set([
  ...RUTINKO_ALL_ROUTINES.map((item) => item.icon),
  '💙', '❤️', '⭐', '✅', '⏰', '🧠', '🏠', '🛒', '🧼', '🧴', '🛏️', '📚', '💻', '📞', '📝', '📅', '🎯', '☀️', '🌙', '🔥'
])];

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
