import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Mail,
  Pencil,
  Phone,
  UserRound,
} from 'lucide-react';
import { api, dateOnly, initials, timeOnly } from '../lib/api';
import { useResource } from '../lib/useResource';
import type { FollowUp, Student } from '../types';
import { Badge, Empty, ErrorNotice, Loading, Modal } from '../components/ui';
import { TrialFlow, type Flow } from '../components/TrialFlow';
import { CompleteFollowUp } from './FollowUps';
import { useLocale } from '../i18n';

export function StudentDetail({ id, back }: { id: string; back: () => void }) {
  const { t } = useLocale();
  const { data: student, error, loading, reload } = useResource<Student>(`/students/${id}`);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [editing, setEditing] = useState(false);
  const [follow, setFollow] = useState<FollowUp | null>(null);
  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} retry={reload} />;
  if (!student) return null;
  const name = `${student.firstName} ${student.lastName}`;
  const lead = student.leads?.[0];
  const activeTrial = lead?.trials?.some((trial) => trial.status === 'BOOKED');
  return (
    <>
      <button
        onClick={back}
        className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-brand"
      >
        <ArrowLeft size={15} />
        {t('Back to students')}
      </button>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-semibold text-brand">
            {initials(name)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              <Badge value={lead?.stage || student.status} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {student.yearLevel ? t(`Year ${student.yearLevel}`) : t('Year not specified')}{' '}
              <span className="mx-2 text-slate-300">·</span>
              {student.owner?.name}
            </p>
          </div>
        </div>
        {student.canEdit && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="btn-quiet">
              <Pencil size={15} />
              {t('Edit profile')}
            </button>
            {lead && (
              <button
                disabled={activeTrial}
                className="btn-primary"
                onClick={() =>
                  setFlow({ type: 'book', leadId: lead.id, studentId: id, studentName: name })
                }
              >
                <CalendarDays size={16} />
                {activeTrial ? t('Trial already booked') : t('Arrange trial')}
              </button>
            )}
          </div>
        )}
      </div>
      {!student.canEdit && (
        <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          {t(
            'This student is assigned to {{name}}. You can view this profile; their advisor manages changes.',
          ).replace('{{name}}', student.owner?.name || '')}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.55fr)]">
        <section className="space-y-6">
          <div className="panel p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t('Trial lessons')}</h2>
              <span className="text-[11px] text-slate-400">
                {lead?.trials?.length || 0} {t('on record')}
              </span>
            </div>
            {lead?.trials?.length ? (
              <div className="space-y-4">
                {lead.trials.map((trial) => (
                  <div key={trial.id} className="rounded-xl border border-slate-200/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {trial.lessonSession.classGroup?.course.name}
                        </p>
                        <p className="mt-1.5 text-xs text-slate-500">
                          {dateOnly(trial.lessonSession.startsAt)} ·{' '}
                          {timeOnly(trial.lessonSession.startsAt)}–
                          {timeOnly(trial.lessonSession.endsAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {trial.lessonSession.teacher?.name}
                        </p>
                      </div>
                      <Badge value={trial.status} />
                    </div>
                    {trial.notes && (
                      <p className="mt-4 whitespace-pre-wrap rounded-lg bg-paper p-3 text-xs leading-relaxed text-slate-600">
                        {trial.notes}
                      </p>
                    )}
                    {student.canEdit && trial.status === 'BOOKED' && (
                      <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-3">
                        <button
                          onClick={() =>
                            setFlow({ type: 'cancel', trial, studentId: id, studentName: name })
                          }
                          className="text-xs font-medium text-slate-400 hover:text-rose-700"
                        >
                          {t('Cancel trial')}
                        </button>
                        <button
                          onClick={() =>
                            setFlow({ type: 'outcome', trial, studentId: id, studentName: name })
                          }
                          className="btn-quiet text-xs"
                        >
                          {t('Record result')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="Ready for a first class?"
                text="Arrange a trial lesson to find the right learning environment."
                action={
                  student.canEdit &&
                  lead && (
                    <button
                      className="btn-primary"
                      onClick={() =>
                        setFlow({ type: 'book', leadId: lead.id, studentId: id, studentName: name })
                      }
                    >
                      {t('Arrange trial')}
                    </button>
                  )
                }
              />
            )}
          </div>
          <div className="panel p-5 md:p-6">
            <h2 className="mb-5 text-sm font-semibold">{t('Follow-up timeline')}</h2>
            {student.followUps?.length ? (
              <div className="space-y-5">
                {student.followUps.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-brand' : 'bg-amber-50 text-amber-700'}`}
                    >
                      {item.status === 'COMPLETED' ? <Check size={15} /> : <Clock3 size={15} />}
                    </div>
                    <div className="min-w-0 flex-1 border-b border-slate-100 pb-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{item.action}</p>
                        <Badge value={item.status} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {dateOnly(item.dueAt)} · {timeOnly(item.dueAt)}
                      </p>
                      {item.messageDraft && (
                        <div className="mt-3 rounded-lg bg-paper p-3 text-xs leading-relaxed text-slate-600">
                          <p className="mb-1 font-semibold text-slate-400">
                            {t('Reviewed message draft')}
                          </p>
                          <p className="whitespace-pre-wrap">{item.messageDraft}</p>
                        </div>
                      )}
                      {item.completionNote && (
                        <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500">
                          {item.completionNote}
                        </p>
                      )}
                      {item.status === 'OPEN' && student.canEdit && (
                        <button
                          onClick={() => setFollow(item)}
                          className="mt-3 text-xs font-semibold text-brand hover:underline"
                        >
                          {t('Complete follow-up')} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-slate-400">
                {t('Record a trial outcome to schedule the next conversation.')}
              </p>
            )}
          </div>
        </section>
        <aside className="space-y-6">
          <div className="panel p-5 md:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold">
              <UserRound size={17} className="text-brand" />
              {t('Parents & guardians')}
            </h2>
            {student.guardians?.map(({ guardian, relationship, isPrimary }, index) => (
              <div key={index} className="mb-5 last:mb-0">
                <p className="text-sm font-semibold">{guardian.name}</p>
                <p className="mb-4 mt-1 text-[11px] text-slate-400">
                  {relationship}
                  {isPrimary ? ` · ${t('Primary contact')}` : ''}
                </p>
                {guardian.email && (
                  <p className="mb-3 flex items-start gap-2 text-xs text-slate-500">
                    <Mail size={14} className="shrink-0" />
                    <span className="break-all">{guardian.email}</span>
                  </p>
                )}
                {guardian.phone && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={14} />
                    {guardian.phone}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="panel p-5 md:p-6">
            <h2 className="mb-5 text-sm font-semibold">{t('Inquiry details')}</h2>
            <dl className="space-y-4 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">{t('Source')}</dt>
                <dd>{lead?.source ? t(lead.source) : t('Unknown')}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">{t('Created')}</dt>
                <dd>{student.createdAt ? dateOnly(student.createdAt) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">{t('Next follow-up')}</dt>
                <dd>{lead?.nextFollowUpAt ? dateOnly(lead.nextFollowUpAt) : t('Not scheduled')}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
      {flow && (
        <TrialFlow
          flow={flow}
          close={() => setFlow(null)}
          saved={() => {
            setFlow(null);
            reload();
          }}
        />
      )}{' '}
      {follow && (
        <CompleteFollowUp
          item={follow}
          close={() => setFollow(null)}
          saved={() => {
            setFollow(null);
            reload();
          }}
        />
      )}{' '}
      {editing && (
        <EditStudent
          student={student}
          close={() => setEditing(false)}
          saved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
    </>
  );
}
function EditStudent({
  student,
  close,
  saved,
}: {
  student: Student;
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
      await api(`/students/${student.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: values.get('firstName'),
          lastName: values.get('lastName'),
          yearLevel: Number(values.get('yearLevel')),
        }),
      });
      saved();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }
  return (
    <Modal title="Edit student profile" close={close}>
      <form onSubmit={submit} className="space-y-5">
        <ErrorNotice message={error} />
        <div>
          <label htmlFor="editFirst" className="label">
            {t('First name')}
          </label>
          <input
            id="editFirst"
            name="firstName"
            defaultValue={student.firstName}
            required
            maxLength={80}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="editLast" className="label">
            {t('Last name')}
          </label>
          <input
            id="editLast"
            name="lastName"
            defaultValue={student.lastName}
            required
            maxLength={80}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="editYear" className="label">
            {t('Year level')}
          </label>
          <input
            id="editYear"
            name="yearLevel"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={student.yearLevel || 1}
            className="field"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-quiet" onClick={close}>
            {t('Cancel')}
          </button>
          <button disabled={pending} className="btn-primary">
            {pending && <Loader2 size={16} className="animate-spin" />}
            {t('Save changes')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
