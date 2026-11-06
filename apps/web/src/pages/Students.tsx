import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useResource } from '../lib/useResource';
import { dateOnly, initials } from '../lib/api';
import type { StudentPage } from '../types';
import { Badge, Empty, ErrorNotice, Loading, PageTitle } from '../components/ui';
import { useLocale } from '../i18n';

export function Students({
  openStudent,
  createStudent,
}: {
  openStudent: (id: string) => void;
  createStudent: () => void;
}) {
  const { t, locale } = useLocale();
  const [scope, setScope] = useState('mine');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(input);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);
  const { data, error, loading, reload } = useResource<StudentPage>(
    `/students?scope=${scope}&search=${encodeURIComponent(search)}&page=${page}`,
  );
  return (
    <>
      <PageTitle
        eyebrow="Student directory"
        title="Students"
        text="Every inquiry, every relationship, all in one place."
        action={
          <button className="btn-primary" onClick={createStudent}>
            <Plus size={17} />
            {t('New inquiry')}
          </button>
        }
      />
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4">
          <div className="inline-flex rounded-lg bg-paper p-1">
            {[
              { value: 'mine', label: t('My students') },
              { value: 'all', label: t('All students') },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setScope(item.value);
                  setPage(1);
                }}
                className={`rounded-md px-4 py-2 text-xs font-semibold ${scope === item.value ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              aria-label={t('Search students or parents')}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('Search student or parent…')}
              className="field pl-9"
            />
          </div>
        </div>
        <div className="px-5">
          <ErrorNotice message={error} retry={reload} />
          {loading ? (
            <Loading />
          ) : data?.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-4 font-semibold">{t('Student')}</th>
                    <th className="px-3 py-4 font-semibold">{t('Parent / guardian')}</th>
                    <th className="px-3 py-4 font-semibold">{t('Stage')}</th>
                    <th className="px-3 py-4 font-semibold">{t('Next follow-up')}</th>
                    <th className="px-3 py-4 font-semibold">{t('Advisor')}</th>
                    <th aria-label={t('Open profile')} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((student) => (
                    <tr key={student.id} className="group hover:bg-paper/60">
                      <td className="py-4 pr-5">
                        <button
                          onClick={() => openStudent(student.id)}
                          className="flex items-center gap-3 text-left"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-brand">
                            {initials(`${student.firstName} ${student.lastName}`)}
                          </span>
                          <span>
                            <span className="block font-semibold text-ink group-hover:text-brand">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="mt-1 block text-[11px] text-slate-400">
                              {student.yearLevel
                                ? t(`Year ${student.yearLevel}`)
                                : t('Year not specified')}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-xs text-slate-700">
                          {student.guardians?.[0]?.guardian.name || t('No contact')}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {student.guardians?.[0]?.guardian.email ||
                            student.guardians?.[0]?.guardian.phone ||
                            '—'}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <Badge value={student.leads?.[0]?.stage || student.status} />
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-500">
                        {student.leads?.[0]?.nextFollowUpAt
                          ? dateOnly(student.leads[0].nextFollowUpAt)
                          : '—'}
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-500">
                        {student.owner?.name || '—'}
                      </td>
                      <td>
                        <button
                          aria-label={`${t('Open profile')}: ${student.firstName}`}
                          onClick={() => openStudent(student.id)}
                          className="p-2 text-slate-300 hover:text-brand"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !error && (
              <Empty
                title={search ? t('No matching students') : t('No students here yet')}
                text={
                  search
                    ? t('Try another student name or a parent’s name.')
                    : t('Create an inquiry to start a student’s learning journey.')
                }
                action={
                  !search && (
                    <button className="btn-primary" onClick={createStudent}>
                      {t('New inquiry')}
                    </button>
                  )
                }
              />
            )
          )}
        </div>
        {data && !loading && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
            <span>
              {t(`${data.total.toLocaleString(locale)} students`)} · {t('Page')} {page} {t('of')}{' '}
              {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </span>
            <div className="flex gap-2">
              <button
                aria-label={t('Previous page')}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn-quiet p-2 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label={t('Next page')}
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage(page + 1)}
                className="btn-quiet p-2 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
