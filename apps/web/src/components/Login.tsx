import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, GraduationCap, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { SessionUser } from '../types';
import { ErrorNotice } from './ui';
import { LanguageSwitch, useLocale } from '../i18n';

export function Login({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const { t } = useLocale();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const result = await api<{ user: SessionUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: values.get('email'), password: values.get('password') }),
      });
      onLogin(result.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-brand p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-2xl font-semibold">
          <GraduationCap size={32} />
          EduFlow
        </div>
        <div className="relative z-10 max-w-lg">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[.22em] text-emerald-200">
            {t('A better way to move learning forward')}
          </p>
          <h1 className="text-5xl font-medium leading-tight tracking-tight">
            {t('Every student.')}
            <br />
            {t('A clear next step.')}
          </h1>
          <p className="mt-6 max-w-md leading-relaxed text-emerald-100/90">
            {t(
              'From the first conversation to their first class. Keep your students, trials and follow-ups connected.',
            )}
          </p>
          <div className="mt-12 inline-flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
            <BookOpen size={25} />
            <div>
              <p className="text-sm font-medium">{t('Designed around your teaching day')}</p>
              <p className="mt-1 text-xs text-emerald-100">
                {t('One workspace for advisors and teachers')}
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-emerald-100/70">{t('Austin Education · Student management')}</p>
        <div className="absolute -bottom-48 -right-44 h-[600px] w-[600px] rounded-full border-[80px] border-white/5" />
      </section>
      <section className="flex items-center justify-center bg-paper p-7">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-center gap-2 text-xl font-semibold text-brand lg:hidden">
            <GraduationCap />
            EduFlow
          </div>
          <div className="mb-7 flex justify-end">
            <LanguageSwitch />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            {t('Your student workspace')}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{t('Welcome back')}</h2>
          <p className="mb-8 mt-3 text-sm text-slate-500">
            {t('Sign in to continue where you left off.')}
          </p>
          <form onSubmit={submit} className="space-y-5">
            <ErrorNotice message={error} />
            <div>
              <label htmlFor="email" className="label">
                {t('Email address')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="field"
                placeholder="you@eduflow.local"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                {t('Password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="field"
              />
            </div>
            <button disabled={pending} className="btn-primary w-full py-3.5">
              {pending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {t('Sign in')} <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <p className="mt-7 text-xs leading-relaxed text-slate-400">
            {t('Need an account? Contact your workspace administrator.')}
          </p>
        </div>
      </section>
    </div>
  );
}
