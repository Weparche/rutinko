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
      { value: '🪥', label: 'Zubi', Icon: Sparkles },
      { value: '🚿', label: 'Tuš', Icon: ShowerHead },
      { value: '🍳', label: 'Doručak', Icon: Utensils },
      { value: '💧', label: 'Voda', Icon: Droplet },
      { value: '💊', label: 'Tablete', Icon: Pill },
      { value: '🧼', label: 'Higijena', Icon: Sparkles }
    ]
  },
  {
    id: 'trening',
    title: 'Trening',
    items: [
      { value: '💪', label: 'Trening', Icon: Dumbbell },
      { value: '🏋️', label: 'Snaga', Icon: Dumbbell },
      { value: '🚶', label: 'Šetnja', Icon: Footprints },
      { value: '❤️', label: 'Puls', Icon: HeartPulse },
      { value: '🎯', label: 'Cilj', Icon: Target },
      { value: '🏆', label: 'Score', Icon: Trophy }
    ]
  },
  {
    id: 'obaveze',
    title: 'Obaveze',
    items: [
      { value: '📄', label: 'Dokument', Icon: FileText },
      { value: '💶', label: 'Račun', Icon: CreditCard },
      { value: '🚗', label: 'Auto', Icon: Car },
      { value: '☎️', label: 'Poziv', Icon: Phone },
      { value: '🗑️', label: 'Smeće', Icon: Trash2 },
      { value: '📅', label: 'Termin', Icon: CalendarDays }
    ]
  },
  {
    id: 'dom',
    title: 'Dom',
    items: [
      { value: '🏠', label: 'Dom', Icon: Home },
      { value: '🛒', label: 'Kupnja', Icon: ShoppingCart },
      { value: '🛏️', label: 'Spavanje', Icon: Bed },
      { value: '🧴', label: 'Njega', Icon: Sparkles },
      { value: '📚', label: 'Čitanje', Icon: BookOpen },
      { value: '💻', label: 'Laptop', Icon: Laptop }
    ]
  },
  {
    id: 'pas',
    title: 'Pas',
    items: [
      { value: '🐕', label: 'Pas', Icon: Dog },
      { value: '🐶', label: 'Nuki', Icon: Smile },
      { value: '🦮', label: 'Šetnja psa', Icon: Footprints },
      { value: '💙', label: 'Ljubimac', Icon: Heart }
    ]
  },
  {
    id: 'ostalo',
    title: 'Ostalo',
    items: [
      { value: '⭐', label: 'Bitno', Icon: CheckCircle2 },
      { value: '⏰', label: 'Podsjetnik', Icon: Bell },
      { value: '📝', label: 'Bilješka', Icon: FileText },
      { value: '🧠', label: 'Fokus', Icon: ClipboardList },
      { value: '☀️', label: 'Jutro', Icon: Sun },
      { value: '🌙', label: 'Večer', Icon: Moon },
      { value: '🔥', label: 'Hitno', Icon: Flame },
      { value: '🍎', label: 'Hrana', Icon: Apple },
      { value: '🥗', label: 'Zdravo', Icon: HeartPulse },
      { value: '🩺', label: 'Doktor', Icon: Stethoscope },
      { value: '💼', label: 'Posao', Icon: Briefcase }
    ]
  }
];

const FLAT_ICONS = ICON_GROUPS.flatMap((group) => group.items);
const BASIC_GROUP_ID = 'osnovno';

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
  const basicGroup = ICON_GROUPS.find((group) => group.id === BASIC_GROUP_ID) || ICON_GROUPS[0];
  const extraGroups = ICON_GROUPS.filter((group) => group.id !== basicGroup.id);
  const selectedIsBasic = basicGroup.items.some((item) => item.value === value);
  const [expanded, setExpanded] = React.useState(() => !selectedIsBasic);

  React.useEffect(() => {
    if (!selectedIsBasic) setExpanded(true);
  }, [selectedIsBasic]);

  const toggleExpanded = () => setExpanded((current) => !current);

  const onDropdownKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleExpanded();
  };

  const renderGroup = (group) => (
    <div className={`iconGroup ${group.id === BASIC_GROUP_ID ? 'basicGroup' : ''}`} key={group.id}>
      <div className="iconGroupTitle">{group.title}</div>
      <div className="premiumIconGrid">
        {group.items.map(({ value: itemValue, label, Icon }) => {
          const selected = value === itemValue;
          const SafeIcon = Icon || CheckCircle2;
          return (
            <button
              type="button"
              key={`${group.id}-${itemValue}-${label}`}
              className={selected ? 'premiumIconButton selected' : 'premiumIconButton'}
              onClick={(event) => {
                event.stopPropagation();
                onChange(itemValue);
              }}
            >
              <span className="premiumIconSymbol">
                <span className="premiumIconEmoji" aria-hidden="true">{itemValue}</span>
                <SafeIcon className="premiumIconAccent" size={14} strokeWidth={2.6} aria-hidden="true" />
              </span>
              <small>{label}</small>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="premiumIconPicker" aria-label="Odabir ikone">
      {renderGroup(basicGroup)}

      <div
        className={`iconDropdown ${expanded ? 'expanded' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggleExpanded}
        onKeyDown={onDropdownKeyDown}
      >
        <div className="iconDropdownHeader">
          <div>
            <strong>Ostale ikone</strong>
            <small>Trening, obaveze, dom, pas i ostalo</small>
          </div>
          <ChevronDown className="iconDropdownChevron" size={20} strokeWidth={2.8} />
        </div>

        {expanded && (
          <div className="iconDropdownContent" onClick={(event) => event.stopPropagation()}>
            {extraGroups.map(renderGroup)}
          </div>
        )}
      </div>
    </section>
  );
}
