import {useEffect, useMemo, useRef, useState} from "react";

import {fetchList, fetchOne, isApiConfigured} from "../lib/publicApi";

/**
 * @param resource  the API resource name — programs, faculty, alumni, blogs,
 *                  jobs, policies, faqs. Matches backend/src/config/resources.js.
 * @param fallback  the static array to render until the API answers, and to keep
 *                  rendering if it never does.
 * @param adapt     maps one API record to the shape the components expect.
 * @param params    extra query parameters, e.g. {category: "Product"}.
 */
export const useContentList = (resource, {fallback = [], adapt, params} = {}) => {
  const [items, setItems] = useState(fallback);
  const [source, setSource] = useState("static");

  
  const paramsKey = JSON.stringify(params || {});

  // Held in a ref so a changed adapt/fallback identity cannot restart a fetch;
  // only the resource and its params should.
  const latest = useRef({adapt, fallback});
  useEffect(() => {
    latest.current = {adapt, fallback};
  });

  useEffect(() => {
    if (!isApiConfigured) return undefined;

    let controller;

    const load = () => {
      // Abort any in-flight fetch before starting another, so a slow response
      // from an earlier load cannot land after a newer one and show stale data.
      controller?.abort();
      controller = new AbortController();
      const {signal} = controller;

      fetchList(resource, {params: JSON.parse(paramsKey), signal}).then(({reachable, items: records}) => {
        if (signal.aborted) return;
        // Unreachable: we learned nothing, so the static copy stands.
        if (!reachable) return;

        const {adapt: adaptNow} = latest.current;
        setItems(adaptNow ? records.map(adaptNow) : records);
        setSource("api");
      });
    };

    load();

    // Re-fetch when the tab regains focus or becomes visible again. A single-
    // page app otherwise fetches a list once and never again, so something
    // published in the admin panel does not appear on an already-open site tab
    // until a manual reload — which reads as "my new post isn't showing up".
    // The request is conditional (ETag), so an unchanged list costs a 304.
    const onFocus = () => load();
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      controller?.abort();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [resource, paramsKey]);

  return {items, source, isLive: source === "api"};
};

// "loading" is only an honest state when something is actually going to answer.
// With no backend configured, no static copy means the record does not exist —
// saying "loading" there would leave the page waiting on a request that is
// never made.
const initialState = (fallback) => {
  if (fallback) return "static";
  return isApiConfigured ? "loading" : "not-found";
};

/**
 * One record by slug, with a static fallback for the same slug.
 *
 * Reports `notFound` so a detail page can 404 properly. A record the admin
 * unpublished or deleted must stop resolving even when src/data still carries
 * it — otherwise "delete" is a button that does nothing a visitor can see.
 */
export const useContentItem = (resource, slug, {fallback = null, adapt} = {}) => {
  const [item, setItem] = useState(fallback);
  const [state, setState] = useState(() => initialState(fallback));

  const latest = useRef({adapt});
  useEffect(() => {
    latest.current = {adapt};
  });

  // Keep the fallback in step when the route changes under us — otherwise
  // navigating between two program pages shows the previous one's copy.
  //
  // Adjusted during render rather than from an effect: an effect runs after the
  // paint, so the previous program's copy would be on screen for a frame before
  // it cleared. React re-runs this render before committing anything, so nothing
  // built from the stale item is ever shown.
  const key = `${resource}/${slug}`;
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setItem(fallback);
    setState(initialState(fallback));
  }

  useEffect(() => {
    if (!isApiConfigured || !slug) return undefined;

    const controller = new AbortController();

    fetchOne(resource, slug, {signal: controller.signal}).then(({reachable, record}) => {
      if (controller.signal.aborted) return;

      // Unreachable: keep whatever we are showing, including a static copy.
      // With nothing to show, though, "loading" would never end — a record that
      // exists only in the database has no static copy to fall back to, so an
      // outage would leave its permalink on a blank aria-busy page forever.
      // Settling lets the page redirect to its index, which still renders.
      if (!reachable) {
        setState((current) => {
          if (current === "loading") return "not-found";
          // The fallback is all we will get, so stop calling it pending —
          // callers holding back fallback art can now show it.
          if (current === "static") return "fallback";
          return current;
        });
        return;
      }

      if (record) {
        const {adapt: adaptNow} = latest.current;
        setItem(adaptNow ? adaptNow(record) : record);
        setState("api");
        return;
      }

      // The server answered "no such published record". That is authoritative:
      // drop the static copy and let the page 404.
      setItem(null);
      setState("not-found");
    });

    return () => controller.abort();
  }, [resource, slug]);

  return {
    item,
    isLive: state === "api",
    isLoading: state === "loading",
    // A static fallback is already on screen while its admin record is still
    // in flight. Callers that swap static art for admin art need to know that
    // a response is coming before treating the fallback as final.
    isPending: state === "static" && isApiConfigured,
    notFound: state === "not-found",
  };
};

/** The list hook, reduced to a slug-keyed object. Used by the policy pages. */
export const useContentMap = (resource, {fallback = {}, adapt, toMap} = {}) => {
  const fallbackList = useMemo(() => Object.entries(fallback), [fallback]);
  const [map, setMap] = useState(fallback);
  const [source, setSource] = useState("static");
  // Distinct from `source`: a slug that exists only in the database is absent
  // from the static map, and a page that redirects on that absence would bounce
  // every admin-created record before the list could arrive. Callers wait on
  // this before concluding a slug is unknown.
  const [answered, setAnswered] = useState(!isApiConfigured);

  const latest = useRef({adapt, toMap});
  useEffect(() => {
    latest.current = {adapt, toMap};
  });

  useEffect(() => {
    if (!isApiConfigured) return undefined;

    const controller = new AbortController();

    fetchList(resource, {signal: controller.signal}).then(({reachable, items: records}) => {
      if (controller.signal.aborted) return;

      // Answered either way — an unreachable server is still a settled question
      // for the purpose of "should this page keep waiting?".
      setAnswered(true);
      if (!reachable) return;

      const {toMap: toMapNow, adapt: adaptNow} = latest.current;
      setMap(
        toMapNow
          ? toMapNow(records)
          : Object.fromEntries(records.map((r) => [r.slug, adaptNow ? adaptNow(r) : r])),
      );
      setSource("api");
    });

    return () => controller.abort();
  }, [resource, fallbackList.length]);

  return {map, source, isLive: source === "api", isLoading: !answered};
};
