import { getDict, getLang } from '@/lib/i18n';
import { getLangFromCookieSync } from '@/lib/i18n/shared';
import { cookies } from 'next/headers';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const store = await cookies();
  const lang = getLangFromCookieSync(store.get('lang')?.value);
  const dict = await getDict();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <LoginForm dict={dict} />
      {sp.error === 'auth' && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
          {dict.admin.error}
        </p>
      )}
      <p className="mt-6 text-center text-xs text-slate-400">
        {lang === 'zh' ? '' : ''}
      </p>
    </div>
  );
}
