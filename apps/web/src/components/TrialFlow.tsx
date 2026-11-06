import { useState, type FormEvent } from 'react';
import { CalendarDays, Loader2, Sparkles } from 'lucide-react';
import { api, dateOnly, timeOnly } from '../lib/api';
import { useResource } from '../lib/useResource';
import type { AiDraft, LessonSession, TrialBooking } from '../types';
import { Empty, ErrorNotice, Loading, Modal } from './ui';
import { useLocale } from '../i18n';

export type Flow =
  | { type: 'book'; leadId: string; studentId: string; studentName: string }
  | { type: 'outcome'; trial: TrialBooking; studentId: string; studentName: string }
  | { type: 'cancel'; trial: TrialBooking; studentId: string; studentName: string };
export function TrialFlow({
  flow,
  close,
  saved,
}: {
  flow: Flow;
  close: () => void;
  saved: () => void;
}) {
  return flow.type === 'book' ? (
    <Booking flow={flow} close={close} saved={saved} />
  ) : flow.type === 'outcome' ? (
    <Outcome trial={flow.trial} name={flow.studentName} close={close} saved={saved} />
  ) : (
    <Cancellation trial={flow.trial} name={flow.studentName} close={close} saved={saved} />
  );
}
function Booking({
  flow,
  close,
  saved,
}: {
  flow: Extract<Flow, { type: 'book' }>;
  close: () => void;
  saved: () => void;
}) {
  const { t } = useLocale();
  const { data, error, loading, reload } = useResource<{ items: LessonSession[] }>(
    `/schedule/available?studentId=${flow.studentId}`,
  );
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setPending(true);
    setSaveError('');
    try {
      await api('/trials', {
        method: 'POST',
        body: JSON.stringify({ leadId: flow.leadId, lessonSessionId: selected }),
      });
      saved();
    } catch (err) {
      setSaveError((err as Error).message);
      setSelected('');
      reload();
      setPending(false);
    }
  }
  return (
    <Modal
      title={t('Arrange a trial')}
      subtitle={`${flow.studentName} · ${t('Times in Australia/Melbourne')}`}
      close={close}
    >
      <form onSubmit={submit} className="space-y-5">
        <ErrorNotice message={error} retry={reload} />
        <ErrorNotice message={saveError} />
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <fieldset className="max-h-80 space-y-2 overflow-y-auto">
            <legend className="mb-3 text-xs text-slate-500">
              {t(
                'Choose a class in the next 21 days. Availability is checked again when you book.',
              )}
            </legend>
            {data.items.map((session) => (
              <label
                key={session.id}
                className={`flex items-start gap-3 rounded-xl border p-4 ${!session.bookable ? 'cursor-not-allowed bg-slate-50 opacity-60' : selected === session.id ? 'border-brand bg-emerald-50/50' : 'cursor-pointer border-slate-200 hover:border-brand/40'}`}
              >
                <input
                  type="radio"
                  name="session"
                  value={session.id}
                  checked={selected === session.id}
                  disabled={!session.bookable}
                  onChange={() => setSelected(session.id)}
                  className="mt-1 accent-brand"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{session.course?.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dateOnly(session.startsAt)} · {timeOnly(session.startsAt)}–
                    {timeOnly(session.endsAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {session.teacher?.name} ·{' '}
                    {session.unavailableReason
                      ? t(session.unavailableReason)
                      : `${session.availableSeats} ${t('places available')}`}
                  </p>
                </div>
              </label>
            ))}
          </fieldset>
        ) : (
          !error && (
            <Empty
              title={t('No sessions available')}
              text={t(
                'There are no scheduled classes in the next 21 days. Ask your administrator to add sessions, then retry.',
              )}
            />
          )
        )}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={close} className="btn-quiet">
            {t('Cancel')}
          </button>
          <button disabled={!selected || pending || loading} className="btn-primary">
            {pending ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
            {t('Confirm trial')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Outcome({
  trial,
  name,
  close,
  saved,
}: {
  trial: TrialBooking;
  name: string;
  close: () => void;
  saved: () => void;
}) {
  const { locale, t } = useLocale();
  const [status, setStatus] = useState('ATTENDED');
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState('Call parent after trial');
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState('');
  const [due, setDue] = useState('');
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');
  const ended = new Date(trial.lessonSession.endsAt) <= new Date();
  async function generate() {
    setAiPending(true);
    setAiError('');
    try {
      const draft = await api<AiDraft>('/ai/follow-up-draft', {
        method: 'POST',
        body: JSON.stringify({
          trialBookingId: trial.id,
          outputLanguage: locale,
          notes: `${status === 'ATTENDED' ? 'Attendance recorded by advisor: attended.' : 'Attendance recorded by advisor: did not attend.'} Feedback: ${notes}`,
        }),
      });
      setSummary(draft.summary);
      setAction(t(draft.nextActionLabel));
      setMessage(draft.messageDraft);
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiPending(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await api(`/trials/${trial.id}/outcome`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          notes,
          nextFollowUpAt: due,
          followUpAction: action,
          messageDraft: message,
        }),
      });
      saved();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }
  return (
    <Modal
      title={t('Record trial outcome')}
      subtitle={`${name} · ${dateOnly(trial.lessonSession.startsAt)} ${timeOnly(trial.lessonSession.startsAt)}`}
      close={close}
    >
      <form onSubmit={submit} className="space-y-5">
        <ErrorNotice message={error} />
        {!ended && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            {t('You can record a result once this session has ended.')}
          </p>
        )}
        <div>
          <label htmlFor="outcome" className="label">
            {t('Attendance')}
          </label>
          <select
            id="outcome"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="field"
          >
            <option value="ATTENDED">{t('Attended')}</option>
            <option value="NO_SHOW">{t('Did not attend')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="feedback" className="label">
            {t('Trial feedback')}
          </label>
          <textarea
            id="feedback"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={4000}
            className="field"
            placeholder={t(
              'What went well? What should we follow up on? Avoid personal details in AI feedback.',
            )}
          />
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand">
                {t('A little help with the next step')}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {t('Generate a draft, review it, then make it yours.')}
              </p>
            </div>
            <button
              type="button"
              onClick={generate}
              disabled={aiPending || notes.trim().length < 3}
              className="btn-quiet shrink-0 text-xs disabled:opacity-40"
            >
              {aiPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {t('Draft')}
            </button>
          </div>
          {aiError && (
            <p role="status" className="mt-3 text-xs leading-relaxed text-amber-800">
              {aiError}
            </p>
          )}
          {summary && (
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold">{t('Draft summary: ')}</span>
              {summary}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="followAction" className="label">
            {t('Next action')}
          </label>
          <input
            id="followAction"
            required
            minLength={3}
            maxLength={300}
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="followDate" className="label">
            {t('Follow-up date (Melbourne)')}
          </label>
          <input
            id="followDate"
            type="date"
            required
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="field"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            {t('Scheduled for 9:00 am Melbourne time.')}
          </p>
        </div>
        <div>
          <label htmlFor="messageDraft" className="label">
            {t('Parent message draft (optional)')}
          </label>
          <textarea
            id="messageDraft"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={1200}
            className="field"
            placeholder={t('Write a message manually or edit the generated draft…')}
          />
          <p className="mt-2 text-[11px] text-slate-400">
            {t('Saving records your draft. It does not send a message.')}
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={close} className="btn-quiet">
            {t('Cancel')}
          </button>
          <button disabled={pending || !ended} className="btn-primary">
            {pending && <Loader2 size={16} className="animate-spin" />}
            {t('Save result & follow-up')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Cancellation({
  trial,
  name,
  close,
  saved,
}: {
  trial: TrialBooking;
  name: string;
  close: () => void;
  saved: () => void;
}) {
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      await api(`/trials/${trial.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: values.get('reason') }),
      });
      saved();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }
  return (
    <Modal
      title={t('Cancel trial')}
      subtitle={`${name} · ${dateOnly(trial.lessonSession.startsAt)}`}
      close={close}
    >
      <form onSubmit={submit} className="space-y-5">
        <ErrorNotice message={error} />
        <p className="text-sm text-slate-500">
          {t('This releases the place. You can arrange another trial afterwards.')}
        </p>
        <div>
          <label htmlFor="cancelReason" className="label">
            {t('Reason for cancellation')}
          </label>
          <textarea
            id="cancelReason"
            name="reason"
            required
            minLength={3}
            maxLength={500}
            rows={3}
            className="field"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-quiet" onClick={close}>
            {t('Keep trial')}
          </button>
          <button disabled={pending} className="btn-primary">
            {pending && <Loader2 size={16} className="animate-spin" />}
            {t('Cancel trial')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
