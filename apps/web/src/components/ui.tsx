import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, Loader2, X } from 'lucide-react';
import { useLocale } from '../i18n';

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  const { t } = useLocale();
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{t(message)}</div>
      {retry && (
        <button className="underline" onClick={retry}>
          {t('Retry')}
        </button>
      )}
    </div>
  );
}
export function Loading() {
  const { t } = useLocale();
  return (
    <div role="status" className="flex items-center gap-3 py-16 text-sm text-slate-500">
      <Loader2 size={19} className="animate-spin" />
      {t('Loading your workspace…')}
    </div>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-brand">
        <ArrowRight size={22} />
      </div>
      <h3 className="font-semibold text-ink">{t(title)}</h3>
      <p className="mx-auto mb-5 mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{t(text)}</p>
      {action}
    </div>
  );
}
const labels: Record<string, string> = {
  NEW: 'New inquiry',
  CONTACTED: 'Contacted',
  TRIAL_BOOKED: 'Trial booked',
  TRIAL_DONE: 'Trial completed',
  ENROLLED: 'Enrolled',
  LOST: 'Closed',
  BOOKED: 'Booked',
  ATTENDED: 'Attended',
  NO_SHOW: 'No show',
  CANCELLED: 'Cancelled',
  OPEN: 'Open',
  COMPLETED: 'Completed',
  ACTIVE: 'Active',
  PROSPECT: 'Prospect',
  INACTIVE: 'Inactive',
};
export function Badge({ value }: { value: string }) {
  const { t } = useLocale();
  const color = ['ATTENDED', 'COMPLETED', 'ENROLLED', 'ACTIVE'].includes(value)
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
    : ['NO_SHOW', 'LOST', 'CANCELLED'].includes(value)
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : ['BOOKED', 'TRIAL_BOOKED'].includes(value)
        ? 'bg-blue-50 text-blue-700 ring-blue-100'
        : 'bg-amber-50 text-amber-800 ring-amber-100';
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${color}`}
    >
      {t(labels[value] || value)}
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  close,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
}) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const elements = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, [tabindex="0"]',
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === ref.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="max-h-[92dvh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl outline-none md:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-5">
          <div>
            <h2 id="dialog-title" className="text-xl font-semibold tracking-tight">
              {t(title)}
            </h2>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500">{t(subtitle)}</p>}
          </div>
          <button
            aria-label={t('Close dialog')}
            onClick={close}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string | ReactNode;
  action?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-brand">
          {t(eyebrow)}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t(title)}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {typeof text === 'string' ? t(text) : text}
        </p>
      </div>
      {action}
    </div>
  );
}
