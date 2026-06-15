'use client';
/**
 * BoostBadgex component.
 */
import { FaBolt, FaStar, FaCrown } from 'react-icons/fa';

const BADGE_STYLES = {
  boosted: {
    icon: FaBolt,
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
  },
  pro: {
    icon: FaStar,
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
  },
  verified: {
    icon: FaCrown,
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
  },
};

/** BoostBadge React component. */
export default function BoostBadge({ badge, label, size = 'md', inline = false, iconOnly = false }) {
  if (!badge || !BADGE_STYLES[badge]) return null;

  const style = BADGE_STYLES[badge];
  const Icon = style.icon;

  if (iconOnly) {
    return (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${style.bg} ${style.text} ${style.border} border`} title={label}>
        <Icon className="text-[10px]" />
      </span>
    );
  }

  if (inline) {
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-semibold border ${style.bg} ${style.text} ${style.border}`}>
        <Icon className="text-[8px]" />
        {label}
      </span>
    );
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      <Icon className={size === 'sm' ? 'text-[10px]' : 'text-xs'} />
      {label}
    </span>
  );
}
