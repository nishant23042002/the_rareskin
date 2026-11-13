/**
 * "Look here": restart the shake on an element that needs the shopper's attention
 * (a field that failed validation, a coupon that was refused). The animation is
 * `.rh-shake` in micro.css (a short sideways shake; a red flash under reduced
 * motion), so this only has to re-trigger it, which a plain class toggle cannot do
 * when it is already on, hence the forced reflow.
 */
export function shake(el: Element | null | undefined): void {
  if (!el || typeof window === "undefined") return;
  el.classList.remove("rh-shake");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("rh-shake");
  window.setTimeout(() => el.classList.remove("rh-shake"), 800);
}
