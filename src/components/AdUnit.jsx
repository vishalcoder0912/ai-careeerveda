import {useEffect, useRef, useState} from "react";

import {ADSENSE_CLIENT_ID, ADSENSE_SLOT_ID, adsAllowed, loadAdsense} from "../lib/adsense";
import {CONSENT_EVENT} from "../lib/consent";
import "./AdUnit.css";

// One responsive ad slot. With no publisher ID or no slot ID configured the
// component renders nothing, so dropping it into a page is safe in every
// environment (local, staging, CI) and it only becomes visible once AdSense is
// actually set up for this domain.
const AdUnit = ({slot = ADSENSE_SLOT_ID, format = "auto", label = "Advertisement"}) => {
  const insRef = useRef(null);
  const pushed = useRef(false);
  const [allowed, setAllowed] = useState(() => adsAllowed());

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !slot) return undefined;

    const sync = () => {
      const next = adsAllowed();
      setAllowed(next);
      if (next) loadAdsense();
    };

    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, [slot]);

  useEffect(() => {
    if (!allowed || !ADSENSE_CLIENT_ID || !slot || pushed.current || !insRef.current) return;

    // adsbygoogle.js queues calls made before it loads, so pushing here is
    // correct even on the first paint. Guard against StrictMode's double run.
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      pushed.current = false;
    }
  }, [allowed, slot]);

  if (!ADSENSE_CLIENT_ID || !slot || !allowed) return null;

  return (
    <aside className="cv-ad-unit" aria-label={label}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{display: "block"}}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
};

export default AdUnit;
