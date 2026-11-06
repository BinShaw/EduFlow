import { useState, type FormEvent } from 'react';
import { Check, Clock3, Loader2 } from 'lucide-react';
import { api, dateOnly, timeOnly } from '../lib/api';
import { useResource } from '../lib/useResource';
import type { FollowUp } from '../types';
import { Badge, Empty, ErrorNotice, Loading, Modal, PageTitle } from '../components/ui';
import { useLocale } from '../i18n';

export function FollowUps({
  userId,
  openStudent,
}: {
  userId: string;
  openStudent: (id: string) => void;
}) {
  const { t } = useLocale();
  const [status, setStatus] = useState('OPEN');
  const [selected, setSelected] = useState<FollowUp | null>(null);
  const { data, error, loading, reload } = useResource<FollowUp[]>(`/follow-ups?status=${status}`);
  return (
    <>
      <PageTitle
        eyebrow="Conversations that count"
        title="Follow-ups"
        text="Keep the next step clear and the conversation moving."
      />
      <div className="mb-5 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {['OPEN', 'COMPLETED'].map((value) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`rounded-lg px-5 py-2 text-xs font-semibold ${status === value ? 'bg-emerald-50 text-brand' : 'text-slate-500'}`}
          >
            {value === 'OPEN' ? t('To do') : t('Completed')}
          </button>
        ))}
      </div>
      <ErrorNotice message={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : (
        <div className="panel divide-y divide-slate-100">
          {data?.length ? (
            data.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-4 p-5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-brand' : 'bg-amber-50 text-amber-700'}`}
                >
                  {item.status === 'COMPLETED' ? <Check size={19} /> : <Clock3 size={19} />}
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => openStudent(item.student.id)}
                    className="text-sm font-semibold hover:text-brand"
                  >
                    {item.student.firstName} {item.student.lastName}
                  </button>
                  <p className="mt-1 text-xs text-slate-500">{item.action}</p>
                  {item.completionNote && (
                    <p className="mt-2 max-w-xl whitespace-pre-wrap text-xs text-slate-400">
                      {item.completionNote}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-600">{dateOnly(item.dueAt)}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeOnly(item.dueAt)}</p>
                </div>
                {item.status === 'OPEN' && item.student.ownerAdminId === userId ? (
                  <button className="btn-quiet text-xs" onClick={() => setSelected(item)}>
                    <Check size={15} />
                    {t('Complete')}
                  </button>
                ) : (
                  <Badge value={item.status} />
                )}
              </div>
            ))
          ) : (
            <Empty
              title={status === 'OPEN' ? t('All caught up') : t('No completed follow-ups')}
              text={
                status === 'OPEN'
                  ? t(
                      'Your scheduled follow-ups will appear here when a trial outcome is recorded.',
                    )
                  : t('Complete a follow-up and your notes will be kept here.')
              }
            />
          )}
        </div>
      )}
      {selected && (
        <CompleteFollowUp
          item={selected}
          close={() => setSelected(null)}
          saved={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}

export function CompleteFollowUp({
  item,
  close,
  saved,
}: {
  item: Pick<FollowUp, 'id' | 'action'>;
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
      await api(`/follow-ups/${item.id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ completionNote: values.get('note') }),
      });
      saved();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }
  return (
    <Modal title="Complete follow-up" subtitle={item.action} close={close}>
      <form onSubmit={submit} className="space-y-5">
        <ErrorNotice message={error} />
        <div>
          <label htmlFor="completion" className="label">
            {t('What happened?')}
          </label>
          <textarea
            id="completion"
            name="note"
            required
            minLength={3}
            maxLength={500}
            rows={5}
            className="field"
            placeholder={t('Record the outcome of your conversation…')}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={close} className="btn-quiet">
            {t('Cancel')}
          </button>
          <button disabled={pending} className="btn-primary">
            {pending && <Loader2 size={16} className="animate-spin" />}
            {t('Mark complete')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
