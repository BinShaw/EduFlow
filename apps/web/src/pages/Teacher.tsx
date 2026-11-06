import { BookOpen, Clock3, Users } from 'lucide-react';
import { dateOnly, timeOnly } from '../lib/api';
import { useResource } from '../lib/useResource';
import type { LessonSession } from '../types';
import { Empty, ErrorNotice, Loading, PageTitle } from '../components/ui';
import { useLocale } from '../i18n';

export function Teacher() {
  const { t } = useLocale();
  const { data, loading, error, reload } = useResource<LessonSession[]>('/schedule/teacher/today');
  return (
    <>
      <PageTitle
        eyebrow="Teacher workspace"
        title="Today’s classes"
        text={
          <>
            {t('Your teaching day, at a glance')} · {dateOnly(new Date())}
          </>
        }
      />
      <ErrorNotice message={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : data?.length ? (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {data.map((session) => (
            <section key={session.id} className="panel overflow-hidden">
              <div className="border-b border-slate-100 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-xl bg-emerald-50 p-3 text-brand">
                    <BookOpen size={21} />
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                    {session.classGroup?.code}
                  </span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {session.classGroup?.course.name}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock3 size={14} />
                    {timeOnly(session.startsAt)}–{timeOnly(session.endsAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    {t(`${session.roster?.length || 0} students`)}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {t('Class roster')}
                </p>
                <div className="space-y-4">
                  {session.roster?.map((student) => (
                    <div key={student.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {t(`Year ${student.yearLevel}`)}
                        </p>
                      </div>
                      {student.isTrial && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                          {t('New · Trial')}
                        </span>
                      )}
                    </div>
                  ))}
                  {!session.roster?.length && (
                    <p className="py-4 text-sm text-slate-400">
                      {t('No students on this session’s roster.')}
                    </p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        !error && (
          <div className="panel">
            <Empty
              title="A clear day ahead"
              text="You have no classes scheduled for today. Your classes and trial students will appear here on teaching days."
            />
          </div>
        )
      )}
    </>
  );
}
