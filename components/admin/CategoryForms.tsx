'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { deleteCategory, saveCategory } from '@/app/admin/actions';
import { dictFor } from '@/lib/i18n/dicts';
import type { Category } from '@/lib/types';
import DeleteButton from './DeleteButton';

const dict = dictFor('zh');

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

function CategoryFields({ initial }: { initial?: Category }) {
  return (
    <>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>{dict.admin.nameZh} *</label>
          <input name="name_zh" required defaultValue={initial?.name_zh ?? ''} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{dict.admin.nameEn} *</label>
          <input name="name_en" required defaultValue={initial?.name_en ?? ''} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{dict.admin.icon}</label>
            <input name="icon" defaultValue={initial?.icon ?? ''} placeholder="🚇" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{dict.admin.sortOrder}</label>
            <input name="sort_order" type="number" defaultValue={initial?.sort_order ?? 0} className={inputCls} />
          </div>
        </div>
      </div>
    </>
  );
}

export function NewCategoryForm() {
  const [state, formAction, pending] = useActionState(saveCategory, { ok: false, message: '' });
  return (
    <form action={formAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-slate-900">{dict.admin.addNew}</h2>
      <CategoryFields />
      {state.message && !state.ok && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pending ? dict.admin.saving : dict.admin.save}
      </button>
    </form>
  );
}

export function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(saveCategory, { ok: false, message: '' });
  const [delState, delAction, delPending] = useActionState(
    async (prev: { ok: boolean; message: string }, fd: FormData) => {
      await deleteCategory(prev, fd);
      return prev;
    },
    { ok: false, message: '' },
  );

  if (editing) {
    return (
      <form action={formAction} className="rounded-lg border border-blue-200 bg-blue-50/40 p-4">
        <CategoryFields initial={category} />
        {state.message && !state.ok && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{state.message}</p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {pending ? dict.admin.saving : dict.admin.save}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ✕
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-xl">{category.icon ?? '📁'}</span>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-900">{category.name_zh}</div>
        <div className="text-xs text-slate-500">
          {category.name_en} · <span className="font-mono">{category.slug}</span> · #{category.sort_order}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        {dict.admin.edit}
      </button>
      <form action={delAction}>
        <input type="hidden" name="id" value={category.id} />
        {delPending ? (
          <span className="text-sm text-slate-400">…</span>
        ) : (
          <DeleteButton label={dict.admin.delete} confirmMessage={dict.admin.deleteConfirm} />
        )}
      </form>
    </div>
  );
}
