import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageSwitch, LocaleProvider, useLocale } from './i18n';

function LocaleProbe() {
  const { locale, t } = useLocale();
  return (
    <p>
      {locale}:{t('Welcome back')}
    </p>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('locale preference', () => {
  it('switches immediately, persists the preference and updates document language', async () => {
    render(
      <LocaleProvider>
        <LanguageSwitch />
        <LocaleProbe />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '中文' }));

    expect(await screen.findByText('zh-CN:欢迎回来')).toBeInTheDocument();
    expect(localStorage.getItem('eduflow.language')).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('uses the saved supported locale before browser language detection', () => {
    localStorage.setItem('eduflow.language', 'en-AU');
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByText('en-AU:Welcome back')).toBeInTheDocument();
  });
});
