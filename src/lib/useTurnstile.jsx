import {useCallback, useRef, useState} from "react";

// Cloudflare Turnstile for the public forms. The backend redeems the token
// (backend/src/middleware/turnstile.js); a token is single-use, so a form calls
// reset() after every submit attempt to get a fresh one.
//
// No VITE_TURNSTILE_SITE_KEY (local dev, tests): no widget, empty token, and a
// backend without a secret skips the check.

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

let scriptPromise = null;
const loadScript = () => {
  scriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = null; // let the next form mount retry
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

export const useTurnstile = () => {
  const widgetId = useRef(null);
  const [token, setToken] = useState("");

  // A callback ref, not an effect: dialogs render their form conditionally, so
  // the widget renders whenever its box appears and is removed when it goes.
  const mount = useCallback((element) => {
    if (!element) {
      if (widgetId.current !== null) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      setToken("");
      return;
    }
    loadScript()
      .then((turnstile) => {
        if (!element.isConnected || widgetId.current !== null) return;
        widgetId.current = turnstile.render(element, {
          sitekey: SITE_KEY,
          callback: setToken,
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {}); // the server will refuse the submit and the form shows why
  }, []);

  const reset = useCallback(() => {
    setToken("");
    if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
  }, []);

  return {
    widget: SITE_KEY ? <div ref={mount} className="turnstile-widget" /> : null,
    token,
    reset,
  };
};
