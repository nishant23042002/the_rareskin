import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCatalogueRole } from "@/server/auth/admin";
import { getProductForEdit, fragranceSlugOptions } from "@/server/admin";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/catalogue/product-form";
import { StockPanel } from "@/components/admin/catalogue/stock-panel";
import { SizesPanel } from "@/components/admin/catalogue/sizes-panel";
import {
  DuplicateButton,
  DeleteButton,
} from "@/components/admin/catalogue/product-actions";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireCatalogueRole();
  const { slug } = await params;
  const [product, fragranceOptions] = await Promise.all([
    getProductForEdit(decodeURIComponent(slug)),
    fragranceSlugOptions(),
  ]);
  if (!product) notFound();

  // a size (10 ml / 100 ml …) belongs to a fragrance: its page, its eyebrow and its way back say so
  const parent = product.variantOf
    ? (fragranceOptions.find((o) => o.slug === product.variantOf)?.name ?? product.variantOf)
    : null;
  const isFragrance = product.kind === "fragrance" && !product.variantOf;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href="/admin/catalogue"
          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
        >
          <Icon name="arrowLeft" className="size-3.5" />
          Catalogue
        </Link>
        {product.variantOf && (
          <Link
            href={`/admin/catalogue/${product.variantOf}/edit`}
            className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
          >
            <Icon name="arrowLeft" className="size-3.5" />
            {parent}
          </Link>
        )}
      </div>
      <PageHeader
        eyebrow={
          product.variantOf
            ? `size of ${parent} · ${product.status}${product.launch.soon ? " · not on sale yet" : ""}`
            : `${product.kind} · ${product.status}`
        }
        title={product.variantOf ? `${product.name} · ${product.volumeMl} ml` : product.name}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={
                product.kind === "set"
                  ? "/discovery-set"
                  : product.variantOf
                    ? `/fragrances/${product.variantOf}?size=${product.volumeMl}`
                    : `/fragrances/${product.slug}`
              }
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:border-ink hover:text-ink"
            >
              View <Icon name="external" className="size-3" />
            </Link>
            {!product.variantOf && <DuplicateButton slug={product.slug} />}
          </div>
        }
      />

      {product.status === "draft" && (
        <div className="mb-4 flex justify-end">
          <DeleteButton slug={product.slug} />
        </div>
      )}

      {isFragrance && (
        <SizesPanel
          slug={product.slug}
          name={product.name}
          main={{
            volumeMl: product.volumeMl,
            pricePaise: product.pricePaise,
            stock: product.inventory.stock,
          }}
          sizes={product.sizes}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <ProductForm
          mode="edit"
          product={product}
          fragranceOptions={fragranceOptions}
        />
        <div className="lg:sticky lg:top-6 lg:self-start">
          <StockPanel
            slug={product.slug}
            stock={product.inventory.stock}
            threshold={product.inventory.lowStockThreshold}
            ledger={product.ledger}
          />
        </div>
      </div>
    </>
  );
}
