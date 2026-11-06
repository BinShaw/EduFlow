import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  Plus,
  Users,
} from 'lucide-react';
import { dateOnly, timeOnly } from '../lib/api';
import { useResource } from '../lib/useResource';
import type { DashboardData, SessionUser } from '../types';
import { Badge, Empty, ErrorNotice, Loading, PageTitle } from '../components/ui';
import { useLocale } from '../i18n';

export function Dashboard({
  user,
  openStudent,
  createStudent,
}: {
  user: SessionUser;
  openStudent: (id: string) => void;
  createStudent: () => void;
}) {
  const { t } = useLocale();
  const [scope, setScope] = useState('mine');
  const all = scope === 'all';
  const { data, error, loading, reload } = useResource<DashboardData>(
    `/students/dashboard/summary?scope=${all ? 'all' : 'mine'}`,
  );
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <PageTitle
          eyebrow="Your workspace"
          title="Good morning"
          text="A clear view of the next conversations and classes."
        />
        <ErrorNotice message={error} retry={reload} />
      </>
    );
  const stats = data?.counts;
  const firstName = user.name.split(' ')[0];
  const metrics = [
    {
      label: t('Students'),
      value: stats?.students || 0,
      note: all ? t('Across your team') : t('Currently assigned'),
      icon: Users,
      color: 'text-emerald-700 bg-emerald-50',
    },
    {
      label: t('Overdue follow-ups'),
      value: stats?.overdue || 0,
      note: t('Need a response'),
      icon: CircleAlert,
      color: 'text-rose-700 bg-rose-50',
    },
    {
      label: t('Due today'),
      value: stats?.dueToday || 0,
      note: t('Your daily queue'),
      icon: CheckCheck,
      color: 'text-amber-800 bg-amber-50',
    },
    {
      label: t('Upcoming trials'),
      value: stats?.upcomingTrials || 0,
      note: t('Next seven days'),
      icon: CalendarDays,
      color: 'text-sky-700 bg-sky-50',
    },
  ];
  const empty =
    !data?.overdue.length &&
    !data?.dueToday.length &&
    !data?.upcoming.length &&
    !data?.recentTrials.length;
  return (
    <>
      <PageTitle
        eyebrow={all ? 'Admin workspace' : 'Your workspace'}
        title={t(`Good morning, ${firstName}`)}
        text="Here’s what needs your attention today."
        action={
          <div className="flex gap-3">
            <select
              aria-label={t('Dashboard scope')}
              className="field w-auto"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="mine">{t('My students')}</option>
              <option value="all">{t('All students')}</option>
            </select>
            <button className="btn-primary" onClick={createStudent}>
              <Plus size={17} />
              {t('New inquiry')}
            </button>
          </div>
        }
      />
      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, color }) => (
          <div key={label} className="panel p-4 md:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
                  {value}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${color}`}>
                <Icon size={18} />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">{note}</p>
          </div>
        ))}
      </div>
      {empty ? (
        <div className="panel">
          <Empty
            title={t('Your next step starts here')}
            text={t(
              "Create an inquiry to begin tracking a student's journey from first contact to first class.",
            )}
            action={
              <div className="flex gap-3">
                <select
                  aria-label={t('Dashboard scope')}
                  className="field w-auto"
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                >
                  <option value="mine">{t('My students')}</option>
                  <option value="all">{t('All students')}</option>
                </select>
                <button className="btn-primary" onClick={createStudent}>
                  <Plus size={17} />
                  {t('Add first inquiry')}
                </button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.8fr)]">
          <section className="space-y-6">
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-50 p-2 text-rose-700">
                    <CircleAlert size={17} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{t('Needs attention')}</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {t('Follow-ups waiting for a response')}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                  {data?.overdue.length || 0}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {data?.overdue.length ? (
                  data.overdue.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <button
                          className="truncate text-left text-sm font-semibold text-ink hover:text-brand"
                          onClick={() => openStudent(item.student.id)}
                        >
                          {item.student.firstName} {item.student.lastName}
                        </button>
                        <p className="mt-1 truncate text-xs text-slate-500">{item.action}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-rose-700">{dateOnly(item.dueAt)}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {all ? item.student.owner?.name || t('Assigned advisor') : t('Overdue')}
                        </p>
                      </div>
                      <ArrowUpRight size={16} className="text-slate-300" />
                    </div>
                  ))
                ) : (
                  <p className="px-5 py-7 text-sm text-slate-400">
                    {t('No overdue follow-ups. Nice work.')}
                  </p>
                )}
              </div>
            </div>
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-800">
                    <CheckCheck size={17} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{t('Today’s follow-ups')}</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {t('Planned conversations for today')}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {data?.dueToday.length || 0}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {data?.dueToday.length ? (
                  data.dueToday.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-4">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => openStudent(item.student.id)}
                      >
                        <p className="truncate text-sm font-semibold">
                          {item.student.firstName} {item.student.lastName}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">{item.action}</p>
                      </button>
                      <span className="text-xs text-slate-400">{timeOnly(item.dueAt)}</span>
                    </div>
                  ))
                ) : (
                  <p className="px-5 py-7 text-sm text-slate-400">
                    {t('No follow-ups are scheduled for today.')}
                  </p>
                )}
              </div>
            </div>
          </section>
          <section className="space-y-6">
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-sky-50 p-2 text-sky-700">
                    <CalendarDays size={17} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{t('Upcoming trials')}</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">{t('The next seven days')}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </div>
              {data?.upcoming.length ? (
                <div className="divide-y divide-slate-100">
                  {data.upcoming.slice(0, 6).flatMap((session) =>
                    session.trials?.map((trial) => (
                      <div key={trial.id} className="flex items-center gap-3 px-5 py-4">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-paper text-[10px] font-semibold leading-tight text-slate-500">
                          <span>{dateOnly(session.startsAt).split(' ')[0]}</span>
                          <span className="mt-0.5 text-sm text-ink">
                            {dateOnly(session.startsAt).match(/\d+/)?.[0]}
                          </span>
                        </div>
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => openStudent(trial.lead.student.id)}
                        >
                          <p className="truncate text-sm font-semibold">
                            {trial.lead.student.firstName} {trial.lead.student.lastName}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-slate-500">
                            {session.classGroup?.course.name} · {timeOnly(session.startsAt)}
                          </p>
                        </button>
                        <button
                          className="text-xs font-semibold text-brand hover:underline"
                          onClick={() => openStudent(trial.lead.student.id)}
                        >
                          {t('View')}
                        </button>
                      </div>
                    )),
                  )}
                </div>
              ) : (
                <div className="px-5 py-8 text-sm text-slate-400">
                  {t('No trials scheduled this week.')}
                </div>
              )}
            </div>
            <div className="panel p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-brand">
                  <Activity size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{t('Recently completed')}</h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {t('The latest trial outcomes')}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {data?.recentTrials.slice(0, 4).map((trial) => (
                  <button
                    key={trial.id}
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() => openStudent(trial.lead.student.id)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-semibold text-brand">
                      {trial.lead.student.firstName[0]}
                      {trial.lead.student.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {trial.lead.student.firstName} {trial.lead.student.lastName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {trial.lessonSession.classGroup?.course.name} ·{' '}
                        {dateOnly(trial.lessonSession.startsAt)}
                      </p>
                    </div>
                    <Badge value={trial.status} />
                  </button>
                ))}
                {!data?.recentTrials.length && (
                  <p className="text-sm text-slate-400">{t('No trial outcomes yet.')}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
