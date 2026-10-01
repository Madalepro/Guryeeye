import clsx from 'clsx';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-brand-700" />
      <path d="M8 15.5 16 9l8 6.5V24a1 1 0 0 1-1 1h-4.5v-5.5h-5V25H9a1 1 0 0 1-1-1v-8.5Z" className="fill-white" />
      <circle cx="16" cy="15.5" r="1.8" className="fill-sand-400" />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={clsx('font-display text-lg font-bold tracking-tight', inverted ? 'text-white' : 'text-ink')}>
        Guryeeye
      </span>
    </span>
  );
}
