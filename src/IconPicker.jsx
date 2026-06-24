import {
  Apple,
  Bed,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Dog,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  Moon,
  NotebookPen,
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
  WalletCards,
  Weight,
  GlassWater,
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
      { value: '💧', label: 'Voda', Icon: GlassWater },
      { value: '💊', label: 'Tablete', Icon: Pill },
      { value: '🧼', label: 'Higijena', Icon: Sparkles }
    ]
  },
  {
    id: 'trening',
    title: 'Trening',
    items: [
      { value: '💪', label: 'Trening', Icon: Dumbbell },
      { value: '🏋️', label: 'Snaga', Icon: Weight },
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
      { value: '💶', label: 'Račun', Icon: WalletCards },
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
      { value: '📝', label: 'Bilješka', Icon: NotebookPen },
      { value: '🧠', label: 'Fokus', Icon: ClipboardList },
      { value: '☀️', label: 'Jutro', Icon: Sun },
      { value: '🌙', label: 'Večer', Icon: Moon },
      { value: '🔥', label: 'Hitno', Icon: Flame },
      { value: '🍎', label: 'Hrana', Icon: Apple },
      { value: '🥗', label: 'Zdravo', Icon: HeartPulse },
      { value: '🩺', label: 'Doktor', Icon: Stethoscope },
      { value: '💼', label: 'Posao', Icon: BriefcaseBusiness }
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

export function IconVisual({ value, title = '', size = 25, strokeWidth = 2.4 }) {
  const meta = findIconMeta(value, title);
  if (!meta?.Icon) return <span className="emojiFallback">{value || '⭐'}</span>;
  const Icon = meta.Icon;
  return <Icon size={size} strokeWidth={strokeWidth} />;
}

export default function IconPicker({ value, onChange }) {
  return (
    <section className="premiumIconPicker" aria-label="Odabir ikone">
      {ICON_GROUPS.map((group) => (
        <div className="iconGroup" key={group.id}>
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
                  onClick={() => onChange(itemValue)}
                >
                  <span className="premiumIconSymbol"><SafeIcon size={23} strokeWidth={2.45} /></span>
                  <small>{label}</small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
