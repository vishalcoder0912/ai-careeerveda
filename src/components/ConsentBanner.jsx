import {useEffect, useState} from "react";
import {Link} from "react-router-dom";

import {
  CONSENT_EVENT,
  OPEN_CONSENT_EVENT,
  readConsent,
  saveConsent,
} from "../lib/consent";
import "./consent-banner.css";

// A small, honest banner: two choices, both persisted, both reported to Google
// through Consent Mode. "Reject optional" keeps only the storage the site needs
// to function (auth/session) and denies analytics and advertising storage.
const ConsentBanner = () => {
  const [choice, setChoice] = useState(() => readConsent());
  const [open, setOpen] = useState(() => !readConsent());

  useEffect(() => {
    const sync = (event) => {
      if (event.detail) setChoice(event.detail);
    };
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
    };
  }, []);

  if (!open) return null;

  const decide = (value) => {
    setChoice(saveConsent(value));
    setOpen(false);
  };

  return (
    <aside className="cv-consent" role="region" aria-label="Cookie choices">
      <div className="cv-consent-card">
        <h2>Your privacy, your choice</h2>
        <p>
          We use analytics and advertising cookies to understand how our programs
          are discovered and to measure enquiries from ads. You can accept them
          all, or keep only the cookies the site needs to work. Read our{" "}
          <Link to="/privacy-policy">Privacy Policy</Link> for the details.
        </p>
        <div className="cv-consent-actions">
          <button type="button" className="cv-consent-accept" onClick={() => decide("all")}>
            Accept all
          </button>
          <button type="button" className="cv-consent-reject" onClick={() => decide("optional")}>
            Reject optional
          </button>
          {choice && (
            <button type="button" className="cv-consent-close" onClick={() => setOpen(false)}>
              Keep my current choice
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ConsentBanner;
