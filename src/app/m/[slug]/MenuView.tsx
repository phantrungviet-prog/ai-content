"use client";

import { useMemo, useState } from "react";
import type { MenuOption } from "@/lib/menu";
import { formatVnd } from "@/lib/price";
import { slugify } from "@/lib/slug";

export type PublicCategory = {
  name: string;
  items: { name: string; description: string | null; price: number | null; options: MenuOption[]; available: boolean }[];
};

export function MenuView({ categories }: { categories: PublicCategory[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = slugify(query);
    if (!q) return categories;
    return categories
      .map((c) => ({ ...c, items: c.items.filter((i) => slugify(i.name).includes(q)) }))
      .filter((c) => c.items.length > 0);
  }, [categories, query]);

  return (
    <>
      <nav className="sticky top-0 z-10 space-y-2 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm món..."
          className="w-full rounded-full bg-slate-100 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
        />
        {!query && categories.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {categories.map((c, i) => (
              <a key={i} href={`#cat-${i}`} className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-sm whitespace-nowrap">
                {c.name}
              </a>
            ))}
          </div>
        )}
      </nav>

      {visible.length === 0 && <p className="px-5 py-10 text-center text-slate-500">Không tìm thấy món phù hợp.</p>}

      {visible.map((category, ci) => (
        <section key={ci} id={query ? undefined : `cat-${ci}`} className="scroll-mt-28 px-5 pt-6">
          <h2 className="mb-2 text-lg font-bold text-orange-700">{category.name}</h2>
          <ul className="divide-y divide-slate-100">
            {category.items.map((item, ii) => (
              <li key={ii} className={`py-3 ${item.available ? "" : "opacity-50"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">
                    {item.name}
                    {!item.available && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-normal">Hết món</span>}
                  </p>
                  {item.price != null && <p className="shrink-0 font-semibold">{formatVnd(item.price)}</p>}
                </div>
                {item.description && <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>}
                {item.options.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-slate-600">
                    {item.options.map((o, oi) => (
                      <span key={oi}>
                        {o.label} <span className="font-medium">{formatVnd(o.price)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
