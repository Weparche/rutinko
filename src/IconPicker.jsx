import React from 'react';
import {
  Apple,
  Bed,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Dog,
  Droplet,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  Moon,
  Phone,
  Pill,
  ShoppingCart,
  ShowerHead,
  Sparkles,
  Stethoscope,
  Sun,
  Target,
  Trash2,
  Trophy,
  Utensils,
  FileText,
  Smile
} from 'lucide-react';

export const ICON_GROUPS = [
  {
    id: 'osnovno',
    title: 'Osnovno',
    items: [
      { value: '🪥', label: 'Zubi', defaultTitle: 'Oprati zube', category: 'higijena', Icon: Sparkles },
      { value: '🚿', label: 'Tuš', defaultTitle: 'Otuširati se', category: 'higijena', Icon: ShowerHead },
      { value: '🍳', label: 'Doručak', defaultTitle: 'Pojesti doručak', category: 'prehrana', Icon: Utensils },
      { value: '💧', label: 'Voda', defaultTitle: 'Popiti vode', category: 'zdravlje', scheduleType: 'water-2h', startTime: '08:00', endTime: '22:00', intervalMinutes: 120, Icon: Droplet },
      { value: '💊', label: 'Tablete', defaultTitle: 'Popiti tablete', category: 'zdravlje', Icon: Pill },
      { value: '🚶', label: 'Šetnja', defaultTitle: 'Prošetati se', category: 'tjelovježba', Icon: Footprints }
    ]
  },
  {
    id: 'trening',
    title: 'Trening',
    items: [
      { value: '💪', label: 'Trening', defaultTitle: '20 trbušnjaka', category: 'tjelovježba', Icon: Dumbbell },
      { value: '🏋️', label: 'Snaga', defaultTitle: 'Kratki trening snage', category: 'tjelovježba', Icon: Dumbbell },
      { value: '🚶', label: 'Šetnja', defaultTitle: 'Prošetati se', category: 'tjelovježba', Icon: Footprints },
      { value: '❤️', label: 'Puls', defaultTitle: 'Lagani cardio', category: 'tjelovježba', Icon: HeartPulse },
      { value: '🎯', label: 'Cilj', defaultTitle: 'Dnevni cilj', category: 'obaveza', Icon: Target },
      { value: '🏆', label: 'Score', defaultTitle: 'Provjeriti napredak', category: 'tjelovježba', Icon: Trophy }
    ]
  },
  {
    id: 'obaveze',
    title: 'Obaveze',
    items: [
      { value: '📄', label: 'Dokument', defaultTitle: 'Riješiti dokument', category: 'obaveza', Icon: FileText },
      { value: '💶', label: 'Račun', defaultTitle: 'Platiti račun', category: 'obaveza', Icon: CreditCard },
      { value: '🚗', label: 'Auto', defaultTitle: 'Provjeriti auto', category: 'obaveza', Icon: Car },
      { value: '☎️', label: 'Poziv', defaultTitle: 'Nazvati', category: 'obaveza', Icon: Phone },
      { value: '🗑️', label: 'Smeće', defaultTitle: 'Baciti smeće', category: 'obaveza', Icon: Trash2 },
      { value: '📅', label: 'Termin', defaultTitle: 'Provjeriti termin', category: 'obaveza', Icon: CalendarDays }
    ]
  },
  {
    id: 'dom',
    title: 'Dom',
    items: [
      { value: '🏠', label: 'Dom', defaultTitle: 'Srediti dom', category: 'obaveza', Icon: Home },
      { value: '🛒', label: 'Kupnja', defaultTitle: 'Obaviti kupnju', category: 'obaveza', Icon: ShoppingCart },
      { value: '🛏️', label: 'Spavanje', defaultTitle: 'Spremiti se za spavanje', category: 'higijena', Icon: Bed },
      { value: '🧴', label: 'Njega', defaultTitle: 'Njega kože', category: 'higijena', Icon: Sparkles },
      { value: '📚', label: 'Čitanje', defaultTitle: 'Čitati 10 minuta', category: 'obaveza', Icon: BookOpen },
      { value: '💻', label: 'Laptop', defaultTitle: 'Provjeriti laptop', category: 'obaveza', Icon: Laptop }
    ]
  },
  {
    id: 'pas',
    title: 'Pas',
    items: [
      { value: '🐕', label: 'Pas', defaultTitle: 'Prošetati psa', category: 'obaveza', Icon: Dog },
      { value: '🐶', label: 'Nuki', defaultTitle: 'Prošetati Nukija', category: 'obaveza', Icon: Smile },
      { value: '🦮', label: 'Šetnja psa', defaultTitle: 'Šetnja psa', category: 'obaveza', Icon: Footprints },
      { value: '💙', label: 'Ljubimac', defaultTitle: 'Briga za ljubimca', category: 'obaveza', Icon: Heart }
    ]
  },
  {
    id: 'ostalo',
    title: 'Ostalo',
    items: [
      { value: '⭐', label: 'Bitno', defaultTitle: 'Bitna stvar', category: 'obaveza', Icon: CheckCircle2 },
      { value: '⏰', label: 'Podsjetnik', defaultTitle: 'Podsjetnik', category: 'obaveza', Icon: Bell },
      { value: '📝', label: 'Bilješka', defaultTitle: 'Zapisati bilješku', category: 'obaveza', Icon: FileText },
      { value: '🧠', label: 'Fokus', defaultTitle: 'Fokus bez ometanja', category: 'obaveza', Icon: ClipboardList },
      { value: '☀️', label: 'Jutro', defaultTitle: 'Jutarnja rutina', category: 'obaveza', Icon: Sun },
      { value: '🌙', label: 'Večer', defaultTitle: 'Večernja rutina', category: 'obaveza', Icon: Moon },
      { value: '🔥', label: 'Hitno', defaultTitle: 'Hitna obaveza', category: 'obaveza', Icon: Flame },
      { value: '🍎', label: 'Hrana', defaultTitle: 'Pojesti obrok', category: 'prehrana', Icon: Apple },
      { value: '🥗', label: 'Zdravo', defaultTitle: 'Pojesti zdravi obrok', category: 'prehrana', Icon: HeartPulse },
      { value: '🩺', label: 'Doktor', defaultTitle: 'Nazvati doktora', category: 'zdravlje', Icon: Stethoscope },
      { value: '💼', label: 'Posao', defaultTitle: 'Riješiti posao', category: 'obaveza', Icon: Briefcase }
    ]
  }
];

const FLAT_ICONS = ICON_GROUPS.flatMap((group) => group.items);

export function findIconMeta(value, title = '') {
  const text = `${value || ''} ${title || ''}`.toLowerCase();
  if (text.includes('psa') || text.includes('pas') || text.includes('🐕') || text.includes('🐶') || text.includes('🦮')) return FLAT_ICONS.find((item) => item.value === '🐕');
  if (text.includes('prošetati') || text.includes('šetnja') || text.includes('🚶')) return FLAT_ICONS.find((item) => item.value === '🚶');
  return FLAT_ICONS.find((item) => item.value === value) || null;
}

export function IconVisual({ value, title = '' }) {
  const meta = findIconMeta(value, title);
  return <span className="emojiIconVisual" aria-hidden="true">{meta?.value || value || '⭐'}</span>;
}

export default function IconPicker({ value, onChange }) {
  const [openGroupId, setOpenGroupId] = React.useState(null);

  const toggleGroup = (groupId) => setOpenGroupId((current) => current === groupId ? null : groupId);

  const onDropdownKeyDown = (event, groupId) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleGroup(groupId);
  };

  const selectIcon = (event, item) => {
    event.stopPropagation();
    onChange(item.value, item);
  };

  const renderGroup = (group) => (
    <div className="iconGroup" key={group.id}>
      <div className="iconGroupTitle">{group.title}</div>
      <div className="premiumIconGrid">
        {group.items.map((item) => {
          const selected = value === item.value;
          const SafeIcon = item.Icon || CheckCircle2;
          return (
            <button
              type="button"
              key={`${group.id}-${item.value}-${item.label}`}
              className={selected ? 'premiumIconButton selected' : 'premiumIconButton'}
              onClick={(event) => selectIcon(event, item)}
            >
              <span className="premiumIconSymbol">
                <span className="premiumIconEmoji" aria-hidden="true">{item.value}</span>
                <SafeIcon className="premiumIconAccent" size={14} strokeWidth={2.6} aria-hidden="true" />
              </span>
              <small>{item.label}</small>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDropdown = (group) => {
    const expanded = openGroupId === group.id;
    return (
      <div
        className={`iconDropdown ${expanded ? 'expanded' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => toggleGroup(group.id)}
        onKeyDown={(event) => onDropdownKeyDown(event, group.id)}
        key={group.id}
      >
        <div className="iconDropdownHeader">
          <div className="iconDropdownPreview" aria-hidden="true">
            {group.items.slice(0, 3).map((item) => <span key={`${group.id}-preview-${item.value}`}>{item.value}</span>)}
          </div>
          <div>
            <strong>{group.title}</strong>
            <small>{group.items.length} ikona</small>
          </div>
          <ChevronDown className="iconDropdownChevron" size={20} strokeWidth={2.8} />
        </div>

        {expanded && (
          <div className="iconDropdownContent" onClick={(event) => event.stopPropagation()}>
            {renderGroup(group)}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="premiumIconPicker" aria-label="Odabir ikone">
      {ICON_GROUPS.map(renderDropdown)}
    </section>
  );
}
