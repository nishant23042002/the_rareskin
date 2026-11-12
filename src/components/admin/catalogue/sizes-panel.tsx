"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import { Field, TextInput, Toggle } from "@/components/admin/field";
import { Icon } from "@/components/ui/icon";
import { formatPaise, toPaise } from "@/lib/money";
import type { ProductEditDTO } from "@/server/admin";

type Size = ProductEditDTO["sizes"][number];

/** the sizes worth offering first: the two the range launches with */
const SUGGESTED_ML = [10, 100];

const ERRORS: Record<string, string> = {
  "size-exists": "That size already exists for this fragrance.",
  "mrp-below-price": "MRP can't be lower than the price.",
  "slug-or-sku-taken": "A product with that slug or SKU already exists.",
  "already-a-size": "A size can't have sizes of its own.",
};

/**
 * The sizes of a fragrance (10 / 50 / 100 ml …). Each size is a product record of its own — own price, stock,
 * status and pictures — shown on the product page as a size chooser; "Available soon" until it is switched on.
 * The fragrance's own record is the main size (50 ml); this panel lists the others and adds one.
 */
export function SizesPanel({
  slug,
  name,
  main,
  sizes,
}: {
  slug: string;
  name: string;
  main: { volumeMl: number; pricePaise: number; stock: number };
  sizes: Size[];
}) {
  const router = useRouter();
  const taken = new Set([main.volumeMl, ...sizes.map((s) => s.volumeMl)]);
  const nextMl = SUGGESTED_ML.find((n) => !taken.has(n));

  const [open, setOpen] = useState(false);
  const [ml, setMl] = useState(nextMl ? String(nextMl) : "");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [soon, setSoon] = useState(true);
  const [label, setLabel] = useState("Available soon");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const volumeMl = Number(ml);
    const p = Number(price || 0);
    const m = Number(mrp || price || 0);
    if (!Number.isInteger(volumeMl) || volumeMl <= 0) return setError("Enter the size in whole ml, e.g. 10.");
    if (!Number.isFinite(p) || p < 0 || !Number.isFinite(m) || m < 0)
      return setError("Enter the price in rupees.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalogue/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add_size",
          volumeMl,
          price: toPaise(p),
          mrp: toPaise(m),
          soon,
          soonLabel: label.trim(),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(ERRORS[json.error as string] ?? "Couldn't add the size.");
        return;
      }
      router.push(`/admin/catalogue/${json.slug}/edit`);
      router.refresh();
    } catch {
      setError("Couldn't add the size. Check your connection and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase">Sizes</h3>
          <p className="mt-0.5 max-w-[60ch] text-[11.5px] text-ink-3">
            Each size is its own product: its own price, stock and pictures. The product page shows them as a size
            chooser, and a size marked “not on sale yet” appears as “Available soon” and can&apos;t be bought.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:border-ink hover:text-ink"
          >
            <Icon name="plus" className="size-3.5" />
            Add size
          </button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-line border-y border-line text-[12.5px]">
        <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
          <span className="w-16 tabular-nums text-ink">{main.volumeMl} ml</span>
          <span className="w-20 tabular-nums text-ink">{formatPaise(main.pricePaise)}</span>
          <span className="text-[11px] text-ink-3">stock {main.stock}</span>
          <span className="ml-auto text-[11px] tracking-[0.08em] text-ink-3 uppercase">
            this record · {name}
          </span>
        </li>
        {sizes.map((s) => (
          <li key={s.slug} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
            <span className="w-16 tabular-nums text-ink">{s.volumeMl} ml</span>
            <span className="w-20 tabular-nums text-ink">
              {s.pricePaise > 0 ? formatPaise(s.pricePaise) : <span className="text-ink-3">no price</span>}
            </span>
            <span className="text-[11px] text-ink-3">stock {s.stock}</span>
            <span className="text-[11px] text-ink-3">
              {s.pictures} {s.pictures === 1 ? "picture" : "pictures"}
            </span>
            <span
              className={
                s.status !== "active"
                  ? "rounded-full border border-line-2 px-2 py-0.5 text-[10px] tracking-[0.1em] text-ink-3 uppercase"
                  : s.soon
                    ? "rounded-full border border-gilt/50 bg-gilt/10 px-2 py-0.5 text-[10px] tracking-[0.1em] text-ink-2 uppercase"
                    : "rounded-full bg-ok/10 px-2 py-0.5 text-[10px] tracking-[0.1em] text-ok uppercase"
              }
            >
              {s.status !== "active" ? s.status : s.soon ? s.label || "soon" : "on sale"}
            </span>
            <Link
              href={`/admin/catalogue/${encodeURIComponent(s.slug)}/edit`}
              className="ml-auto inline-flex items-center gap-1 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:text-ink"
            >
              Edit <Icon name="arrowRight" className="size-3" />
            </Link>
          </li>
        ))}
        {sizes.length === 0 && (
          <li className="py-2.5 text-[11.5px] text-ink-3">No other sizes yet.</li>
        )}
      </ul>

      {open && (
        <div className="mt-4 grid gap-3 border border-line bg-surface-2/40 p-3.5">
          <p className="text-[11.5px] text-ink-2">
            New size of <b className="text-ink">{name}</b>. It is created from this fragrance (copy, notes, colours),
            with no stock and no pictures — add both on its own page.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Size (ml)">
              <TextInput type="number" inputMode="numeric" value={ml} onChange={(e) => setMl(e.target.value)} />
            </Field>
            <Field label="Price (₹)" hint="0 = “price at launch”">
              <TextInput
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
            <Field label="MRP (₹)" hint="blank = same as price">
              <TextInput inputMode="decimal" value={mrp} onChange={(e) => setMrp(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <Toggle
              label="Not on sale yet (shows “Available soon”)"
              checked={soon}
              onChange={(e) => setSoon(e.target.checked)}
            />
            {soon && (
              <div className="min-w-[200px] flex-1 sm:max-w-[260px]">
                <Field label="Wording" hint="≤ 40 chars">
                  <TextInput
                    value={label}
                    maxLength={40}
                    placeholder="Available soon"
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-error">
              <Icon name="alert" className="size-3.5" />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="rounded-[3px] bg-cta px-3.5 py-1.5 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-cta-hover disabled:opacity-40"
            >
              {busy ? "Adding…" : "Add size"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-[3px] border border-line-2 px-3.5 py-1.5 text-[11px] tracking-[0.1em] text-ink-2 uppercase hover:border-ink hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
