/**
 * Homepage sections that are built but switched off for the live site.
 *
 * Flip one to `true` to bring the section back; nothing else needs to change
 * (the page also skips the data the section would have read while it is off).
 */

/**
 * "On the skin": the `@therareskin` photo strip above the footer
 * (`components/home/instagram-strip.tsx`). Off until there are real Instagram
 * posts to show: with none, the strip falls back to illustrated placeholders and
 * product packshots, which reads as filler on a live store. Bring it back when
 * the account has posts (and set the profile link in Site Settings → Social).
 */
export const SHOW_ON_THE_SKIN = false;
