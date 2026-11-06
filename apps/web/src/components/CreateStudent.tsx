import { useRef, useState, type FormEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Student } from '../types';
import { ErrorNotice, Modal } from './ui';
import { useLocale } from '../i18n';

export function CreateStudent({
  close,
  saved,
}: {
  close: () => void;
  saved: (id: string) => void;
}) {
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const requestKey = useRef(crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const result = await api<Student>('/students', {
        method: 'POST',
        headers: { 'Idempotency-Key': requestKey.current },
        body: JSON.stringify({
          firstName: values.get('firstName'),
          lastName: values.get('lastName'),
          yearLevel: Number(values.get('yearLevel')),
          source: values.get('source'),
          notes: values.get('notes'),
          guardian: {
            name: values.get('guardianName'),
            ...(values.get('email') ? { email: values.get('email') } : {}),
            phone: values.get('phone'),
          },
        }),
      });
      saved(result.id);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }
  return (
    <Modal
      title="New student inquiry"
      subtitle="Start with the student and their primary contact."
      close={close}
    >
      <form onSubmit={submit} className="space-y-5">
        <ErrorNotice message={error} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="label">
              {t('First name')}
            </label>
            <input id="firstName" name="firstName" required maxLength={80} className="field" />
          </div>
          <div>
            <label htmlFor="lastName" className="label">
              {t('Last name')}
            </label>
            <input id="lastName" name="lastName" required maxLength={80} className="field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="yearLevel" className="label">
              {t('School year')}
            </label>
            <select id="yearLevel" name="yearLevel" className="field">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {t(`Year ${i + 1}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="source" className="label">
              {t('Inquiry source')}
            </label>
            <select id="source" name="source" className="field">
              {['Website', 'Phone', 'Referral', 'Walk-in', 'Other'].map((source) => (
                <option key={source} value={source}>
                  {t(source)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="mb-4 text-sm font-semibold">{t('Primary parent / guardian')}</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="guardianName" className="label">
                {t('Contact name')}
              </label>
              <input
                id="guardianName"
                name="guardianName"
                required
                maxLength={120}
                className="field"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contactEmail" className="label">
                  {t('Email (optional)')}
                </label>
                <input
                  id="contactEmail"
                  name="email"
                  type="email"
                  maxLength={254}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="phone" className="label">
                  {t('Phone (optional)')}
                </label>
                <input id="phone" name="phone" type="tel" maxLength={40} className="field" />
              </div>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="label">
            {t('Inquiry notes (optional)')}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={4000}
            className="field"
            placeholder={t('What is the family looking for?')}
          />
        </div>
        <p className="text-xs text-slate-400">
          {t(
            "This inquiry will be assigned to you. You can arrange a trial from the student's profile.",
          )}
        </p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" className="btn-quiet" onClick={close}>
            {t('Cancel')}
          </button>
          <button disabled={pending} className="btn-primary">
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {t('Create inquiry')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
