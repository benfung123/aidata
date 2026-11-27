import Link from 'next/link';
import { getDict, getLang } from '@/lib/i18n';

export default async function NotFound() {
  const lang = await getLang();
  const dict = await getDict();

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-blue-700">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-900">
        {dict.detail.notFound}
      </h1>
      <Link
        href="/datasets"
        className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
      >
        {dict.detail.backToDatasets}
      </Link>
    </div>
  );
}
