import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { getDict, getLang, htmlLangAttr } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';
import HeaderSearchForm from '@/components/HeaderSearchForm';

const notoSansTc = Noto_Sans_TC({
  subsets: ['latin'],
  variable: '--font-noto-sans-tc',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AIData — 開放數據目錄 Open Data Catalogue',
    template: '%s | AIData',
  },
  description:
    '開放數據目錄 — bilingual open-data catalogue for Hong Kong and beyond. 中英雙語開放數據目錄。',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  const dict = await getDict();

  const navLink =
    'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700';

  return (
    <html lang={htmlLangAttr(lang)} className={notoSansTc.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-blue-700"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-sm font-black text-white">
                A
              </span>
              AIData
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/datasets" className={navLink}>
                {dict.nav.datasets}
              </Link>
              <Link href="/organizations" className={navLink}>
                {dict.nav.organizations}
              </Link>
              <a href="/#about" className={navLink}>
                {dict.nav.about}
              </a>
            </nav>
            <div className="order-3 w-full md:order-2 md:ml-auto md:w-auto md:flex-1 md:px-6">
              <HeaderSearchForm
                placeholder={dict.nav.searchPlaceholder}
                buttonLabel={dict.home.searchButton}
              />
            </div>
            <div className="order-2 ml-auto md:order-3 md:ml-0">
              <LanguageToggle dict={dict} initialLang={lang} />
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
              <p>{dict.footer.sourceNote}</p>
              <p>{dict.footer.builtWith}</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
