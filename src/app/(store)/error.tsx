"use client";

import { ErrorView } from "@/components/layout/error-view";

/**
 * A storefront page threw. The shell (header, bag, menu, footer) is still standing
 * above this boundary, so it stays: only the page's own area shows the fallback.
 */
export default function StoreError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView error={error} retry={retry} />;
}
