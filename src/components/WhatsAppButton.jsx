import {useEffect, useState} from "react";
import {useLocation} from "react-router-dom";
import {
  WHATSAPP_ENABLED,
  WHATSAPP_ARIA_LABEL,
  WHATSAPP_TOOLTIP,
  buildWhatsAppUrl,
} from "../config/whatsapp";
import "./whatsapp-button.css";

/* The floating chat button. Lives in Layout, so it is on every route, and reads
   the route rather than taking props — the message it prefills depends on where
   the visitor is, and all of that wording lives in config/whatsapp.js. */

// "/programs/product-management" -> "product-management"; anything else -> null.
// The trailing-segment check keeps "/programs" itself out.
const programSlug = (pathname) => {
  const match = pathname.match(/^\/programs\/([^/]+)\/?$/);
  return match ? match[1] : null;
};

const WhatsAppButton = () => {
  const {pathname} = useLocation();
  const [program, setProgram] = useState(null);
  // Adjust state during render (the documented pattern for state that mirrors
  // a prop/route) instead of an effect: a synchronous setProgram(null) in the
  // effect caused a cascading render, and the stale program had to live past
  // one render before the effect cleared it. Now the message is generic the
  // moment the route is, and the effect below only loads a real program.
  const [programFor, setProgramFor] = useState(pathname);
  if (programFor !== pathname) {
    setProgramFor(pathname);
    setProgram(null);
  }

  // The catalog is 471 KB and this component renders on every route, so it is
  // imported only once we are actually on a programme page — where the detail
  // page loads the same chunk anyway, making this free in practice. Until it
  // resolves, `program` is null and the button carries the generic message; a
  // tap in that window still opens a working chat.
  useEffect(() => {
    const slug = programSlug(pathname);
    if (!slug) return undefined;

    let cancelled = false;
    import("../data/programCatalog")
      .then(({getProgram}) => {
        if (!cancelled) setProgram(getProgram(slug));
      })
      .catch(() => {
        // Chunk failed to load: keep the generic message rather than crash.
        if (!cancelled) setProgram(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!WHATSAPP_ENABLED) return null;

  const href = buildWhatsAppUrl({pathname, program});

  return (
    <a
      className="whatsapp-fab"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={WHATSAPP_ARIA_LABEL}
    >
      {WHATSAPP_TOOLTIP && (
        <span className="whatsapp-fab__tip" aria-hidden="true">{WHATSAPP_TOOLTIP}</span>
      )}
      {/* Same 24x24 path the footer uses (SocialLinks.jsx). Inline so it costs
          no request and inherits currentColor. */}
      <svg className="whatsapp-fab__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.1 15.08l-.3-.17-3.06.88.9-3-.2-.31A8.1 8.1 0 0 1 12.05 3.8zm4.7 10.5c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12s-.64.8-.79.97c-.14.16-.29.18-.54.06a6.6 6.6 0 0 1-3.3-2.88c-.25-.43.25-.4.71-1.32.08-.16.04-.3-.02-.42-.06-.13-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.42.06-.64.3-.22.25-.84.83-.84 2.02s.86 2.34.98 2.5c.12.17 1.7 2.6 4.12 3.64 1.53.66 2.13.72 2.9.6.46-.06 1.47-.6 1.68-1.18.2-.58.2-1.08.15-1.18-.06-.1-.23-.16-.48-.28z" />
      </svg>
    </a>
  );
};

export default WhatsAppButton;
