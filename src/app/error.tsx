"use client";

import { ErrorView } from "@/components/layout/error-view";

/**
 * Anything the segment boundaries below do not catch: the storefront layout itself
 * (its data failed to load), the admin. The root layout is still standing, so the
 * site's fonts and tokens apply; there is no header here, so no space is kept for it.
 */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView error={error} retry={retry} chrome={false} />;
}
