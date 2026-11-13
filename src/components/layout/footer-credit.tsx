import { Roll } from "@/components/ui/roll";
import { SocialGlyph } from "./footer-icons";

/**
 * The developer credit, at the very end of the footer: a small seal whose ring of words turns slowly around the monogram, "Designed & developed
 * by" and the name, and the profile it opens. On hover the capsule fills with onyx, the monogram turns into the Instagram mark, the ring speeds up,
 * the name's letters roll and the handle slides in; under reduced motion it is the same capsule, still. It is one link, to the maker's Instagram.
 * Styles: `.fc*` in `app/footer-credit.css`. Server component, no script.
 */
const NAME = "Nishant Sapkal";
const HANDLE = "nishant.sapkal";
const HREF = "https://www.instagram.com/nishant.sapkal/";

export function FooterCredit() {
  return (
    <div className="fc-wrap">
      <a
        className="fc"
        href={HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Website designed and developed by ${NAME}. Opens Instagram, @${HANDLE}, in a new tab.`}
      >
        <span className="fc__seal" aria-hidden="true">
          <svg className="fc__ring" viewBox="0 0 100 100">
            <defs>
              <path id="fc-ring-path" d="M50 50m-35.5 0a35.5 35.5 0 1 1 71 0a35.5 35.5 0 1 1-71 0" />
            </defs>
            <text>
              <textPath href="#fc-ring-path" textLength="219" lengthAdjust="spacing">
                DESIGN · DEVELOPMENT · DETAIL ·{" "}
              </textPath>
            </text>
          </svg>
          <span className="fc__mono">NS</span>
          <SocialGlyph name="instagram" className="fc__ig" />
        </span>
        <span className="fc__txt">
          <small>Designed &amp; developed by</small>
          <b className="fc__name">
            <Roll>{NAME}</Roll>
          </b>
        </span>
        <span className="fc__handle" aria-hidden="true">
          <span>@{HANDLE}</span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        </span>
      </a>
    </div>
  );
}
