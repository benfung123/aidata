import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseWithCookies } from '@/lib/supabase/server';
import { dictFor } from '@/lib/i18n';
import { signOutAction } from './actions';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'benfung123@gmail.com';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const dict = dictFor('zh');

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{dict.admin.unauthorized}</h1>
        <p className="mt-2 text-sm text-slate-500">{user.email}</p>
        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-600 hover:text-blue-700"
          >
            {dict.admin.signOut}
          </button>
        </form>
      </div>
    );
  }

  const navItem =
    'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700';
  const nav = [
    { href: '/admin', label: dict.admin.dashboard },
    { href: '/admin/datasets/new', label: dict.admin.newDataset },
    { href: '/admin/organizations', label: dict.admin.organizations },
    { href: '/admin/categories', label: dict.admin.categories },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={navItem}>
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-red-300 hover:text-red-600"
          >
            {dict.admin.signOut} →
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
