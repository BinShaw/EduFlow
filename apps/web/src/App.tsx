import { useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
} from 'lucide-react';
import { ApiError, api, dateOnly, initials } from './lib/api';
import type { SessionUser } from './types';
import { Login } from './components/Login';
import { ErrorNotice, Loading } from './components/ui';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { StudentDetail } from './pages/StudentDetail';
import { FollowUps } from './pages/FollowUps';
import { Teacher } from './pages/Teacher';
import { CreateStudent } from './components/CreateStudent';
import { LanguageSwitch, useLocale } from './i18n';

export function App() {
  const { t } = useLocale();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState('');
  const [page, setPage] = useState('dashboard');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const [version, setVersion] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const checkSession = () => {
    setBooting(true);
    setBootError('');
    api<{ user: SessionUser }>('/auth/me')
      .then((result) => setUser(result.user))
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 401)) setBootError((err as Error).message);
      })
      .finally(() => setBooting(false));
  };
  useEffect(checkSession, []);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setStudentId(null);
      setPage('dashboard');
    };
    window.addEventListener('eduflow:session-expired', expired);
    return () => window.removeEventListener('eduflow:session-expired', expired);
  }, []);
  if (booting)
    return (
      <div className="mx-auto max-w-sm p-10">
        <Loading />
      </div>
    );
  if (bootError)
    return (
      <div className="mx-auto max-w-lg p-10">
        <ErrorNotice message={bootError} retry={checkSession} />
      </div>
    );
  if (!user) return <Login onLogin={setUser} />;
  const teacher = user.role === 'TEACHER';
  const openStudent = (id: string) => {
    setStudentId(id);
    setPage('students');
  };
  const nav = teacher
    ? [{ id: 'teacher', label: t('Today’s classes'), icon: CalendarDays }]
    : [
        { id: 'dashboard', label: t('Overview'), icon: LayoutDashboard },
        { id: 'students', label: t('Students'), icon: Users },
        { id: 'followups', label: t('Follow-ups'), icon: CheckCheck },
      ];
  const activePage = teacher ? 'teacher' : page;
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setStudentId(null);
    } catch (err) {
      setLogoutError((err as Error).message);
    }
  }
  return (
    <div className="min-h-screen">
      <aside
        className={`${mobileNav ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200/70 bg-white px-5 py-8 transition-transform lg:translate-x-0`}
      >
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setPage('dashboard');
            setStudentId(null);
          }}
          className="mb-11 flex items-center gap-2.5 px-2 text-2xl font-semibold tracking-tight text-brand"
        >
          <GraduationCap size={31} />
          EduFlow
          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
        </a>
        <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">
          {t('Workspace')}
        </p>
        <nav className="space-y-2">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setPage(id);
                setStudentId(null);
                setMobileNav(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${activePage === id ? 'bg-emerald-50 text-brand' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Icon size={19} />
              {label}
              {id === 'dashboard' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-paper p-4">
          <p className="text-xs font-semibold text-slate-700">
            {t('A little clarity, every day.')}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {t('Your next conversation could be the start of something great.')}
          </p>
        </div>
        <div className="mt-6 flex items-center gap-3 px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user.name}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {teacher ? t('Teacher') : t('Education advisor')}
            </p>
          </div>
          <button
            aria-label={t('Sign out')}
            onClick={logout}
            className="text-slate-400 hover:text-brand"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          aria-label={t('Close navigation')}
          className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="lg:pl-60">
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200/60 bg-white/80 px-5 md:px-10">
          <div className="flex items-center gap-3">
            <button
              aria-label={t('Open navigation')}
              className="lg:hidden"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={22} />
            </button>
            <span className="text-xs text-slate-400">
              {t('Workspace')} <span className="mx-2 text-slate-300">/</span>{' '}
              <span className="font-medium text-slate-600">
                {nav.find((entry) => entry.id === activePage)?.label}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <LanguageSwitch />
            <span className="hidden items-center gap-2 sm:flex">
              <CalendarDays size={15} />
              {dateOnly(new Date())}
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px]">
                {t('Melbourne')}
              </span>
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-5 md:p-10">
          <ErrorNotice message={logoutError} />
          {teacher ? (
            <Teacher />
          ) : (
            <div key={version}>
              {page === 'dashboard' && (
                <Dashboard
                  user={user}
                  openStudent={openStudent}
                  createStudent={() => setCreate(true)}
                />
              )}{' '}
              {page === 'students' &&
                (studentId ? (
                  <StudentDetail id={studentId} back={() => setStudentId(null)} />
                ) : (
                  <Students openStudent={openStudent} createStudent={() => setCreate(true)} />
                ))}{' '}
              {page === 'followups' && <FollowUps userId={user.id} openStudent={openStudent} />}
            </div>
          )}
          <footer className="mt-12 border-t border-slate-200/70 pt-5 text-[11px] text-slate-400">
            EduFlow · {t('Austin Education · Student management')}{' '}
            <span className="float-right">{t('All times Australia/Melbourne')}</span>
          </footer>
        </main>
      </div>
      {create && (
        <CreateStudent
          close={() => setCreate(false)}
          saved={(id) => {
            setCreate(false);
            setVersion((value) => value + 1);
            openStudent(id);
          }}
        />
      )}
    </div>
  );
}
