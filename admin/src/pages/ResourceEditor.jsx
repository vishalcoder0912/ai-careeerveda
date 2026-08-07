import {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate, useParams, Link} from "react-router-dom";

import {RESOURCES, initialValues, prefilledFields, resourcePermission} from "../config/resources";
import {contentApi} from "../services/api";
import {useAuth} from "../context/AuthContext";
import {useToast} from "../context/ToastContext";
import {Field} from "../components/Fields";
import {fieldDomId, readPath, writePath} from "../components/fieldPath";
import {missingForPublish} from "../config/publishRules";
import {ConfirmDialog} from "../components/ConfirmDialog";
import {Modal} from "../components/Modal";
import {Skeleton, ErrorState, StatusBadge} from "../components/States";

const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE_URL || "http://localhost:5173";

const Forbidden = () => (
  <div className="page state state--empty">
    <h1>403</h1>
    <p>Your account does not have permission to open this section.</p>
    <Link className="btn btn--primary" to="/">
      Back to the dashboard
    </Link>
  </div>
);

const ResourceEditor = () => {
  const {resource: resourceName, id} = useParams();
  const resource = RESOURCES[resourceName];
  const {can} = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const isNew = id === "new";
  const canRead = Boolean(resource && can(resourcePermission(resource, "read")));
  const canCreate = Boolean(resource && can(resourcePermission(resource, "create")));
  const canUpdate = Boolean(resource && can(resourcePermission(resource, "update")));
  const canManageMedia = can("media.manage");
  const canWrite = isNew ? canCreate : canUpdate;

  const [record, setRecord] = useState(null);
  // A new record starts from the `initial` values in the resource config — the
  // fee model, eligibility line and delivery format that every program repeats
  // verbatim. They are ordinary prefilled inputs, there to be typed over.
  //
  // Seeded through the lazy initialiser rather than an effect so the form is
  // never briefly blank, and only for a create: load() replaces this wholesale
  // for an existing record, which is what keeps a deliberately blank field on an
  // old program from filling itself in when someone opens it.
  const [form, setForm] = useState(() => (isNew && resource ? initialValues(resource) : {}));
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [leaveTo, setLeaveTo] = useState(null);
  const [revisions, setRevisions] = useState(null);
  // Which sections are expanded. `null` until the record has arrived and the
  // opening layout has been decided.
  //
  // Deliberately a snapshot rather than something derived from the live form: an
  // earlier version recomputed "is this section finished?" on every keystroke,
  // which meant typing the last missing value in a section collapsed it under
  // the cursor. The layout is a decision made once, on arrival; after that it
  // belongs to the editor.
  const [openSections, setOpenSections] = useState(null);

  const api = useMemo(() => (resource ? contentApi(resource.name) : null), [resource]);

  const load = useCallback(async () => {
    if (isNew || !api || !canRead) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(id);
      setRecord(response.data);
      setForm(response.data);
      setDirty(false);
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }, [api, canRead, id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  // Decide the opening layout once the record is in hand. A record with work
  // outstanding opens the sections that need attention and folds the settled
  // ones away; a complete record opens everything, because hiding a finished
  // program behind seven closed sections is obstruction, not focus.
  useEffect(() => {
    if (!resource || !canRead || loading || openSections) return;

    const names = [...new Set(resource.fields.map((field) => field.group || "Other"))];
    const needy = new Set(missingForPublish(resource, form).map((entry) => entry.group));

    setOpenSections(
      Object.fromEntries(names.map((name) => [name, needy.size === 0 || needy.has(name)])),
    );
  }, [resource, canRead, loading, openSections, form]);

  // A refused save names fields. Whichever sections hold them are opened, so the
  // message is never pointing at something folded out of sight. This only ever
  // opens sections — it will not close one the editor opened themselves.
  useEffect(() => {
    if (!resource || Object.keys(fieldErrors).length === 0) return;

    const guilty = resource.fields
      .filter((field) => fieldErrors[field.name])
      .map((field) => field.group || "Other");

    if (guilty.length === 0) return;

    setOpenSections((current) => ({
      ...current,
      ...Object.fromEntries(guilty.map((name) => [name, true])),
    }));
  }, [fieldErrors, resource]);

  // Warns on a browser-level navigation (tab close, reload, back to another
  // site). In-app navigation is guarded separately by the dialog below, because
  // beforeunload cannot intercept a client-side route change.
  useEffect(() => {
    if (!dirty) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!resource) return <ErrorState error={{message: `Unknown section "${resourceName}"`}} />;
  if (!canRead || (isNew && !canCreate)) return <Forbidden />;
  if (loading) return <Skeleton rows={8} />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const setValue = (path, value) => {
    setForm((current) => writePath(current, path, value));
    setDirty(true);
    setFieldErrors((current) => {
      if (!current[path]) return current;
      const next = {...current};
      delete next[path];
      return next;
    });
  };

  // Only fields the editor actually renders are sent. Posting the whole record
  // back would include _id, status, revision and the audit fields, which the
  // API rejects or ignores — and sending them invites confusion about which
  // side owns them.
  const payload = () => {
    const body = {};

    for (const field of resource.fields) {
      const value = readPath(form, field.name);
      if (value === undefined) continue;
      Object.assign(body, writePath(body, field.name, value));
    }

    // Carried so the server can refuse a save that would overwrite someone
    // else's edit. Absent on create, where there is nothing to conflict with.
    if (!isNew && record) body.revision = record.revision;

    return body;
  };

  // One place that turns a rejection into something an editor can act on.
  //
  // The old version checked `fields` first and said "Please check the
  // highlighted fields" for anything that carried them — including a
  // concurrency conflict, whose only field is `revision`, which this form does
  // not render. The result was a red toast telling someone to look at
  // highlighted fields when nothing on screen was highlighted, and no way to
  // find out what the server had actually objected to.
  //
  // So: conflicts are named as conflicts, and a field error that maps to no
  // visible input is quoted in the toast rather than swallowed.
  const reportFailure = (failure, fallback) => {
    if (failure.code === "CONFLICT") {
      toast.error(failure.message);
      return;
    }

    const fields = failure.fields || {};
    const names = Object.keys(fields);

    if (names.length === 0) {
      toast.error(failure.message || fallback);
      return;
    }

    setFieldErrors(fields);

    const rendered = new Set(resource.fields.map((field) => field.name));
    const orphans = names.filter((name) => !rendered.has(name));

    if (orphans.length === 0) {
      toast.error("Please check the highlighted fields.");
    } else {
      // Nothing on screen will light up for these, so the message has to carry
      // the whole explanation itself.
      toast.error(orphans.map((name) => `${name}: ${fields[name]}`).join(" · "));
    }
  };

  const save = async ({thenPublish = false} = {}) => {
    // The route is also reachable by typing its URL. Keep the write guard at
    // the action boundary as well as hiding the controls, so an Enter key in a
    // read-only form cannot turn into a rejected API call.
    if (!canWrite || (thenPublish && !canUpdate)) return;

    setSaving(true);
    setFieldErrors({});

    try {
      const response = isNew ? await api.create(payload()) : await api.update(id, payload());
      const saved = response.data;

      // The save is committed to state before any publish is attempted. Publish
      // can legitimately fail — the record may be missing something the public
      // page needs — and when it did, this used to leave a record that exists in
      // the database behind a form that still thinks it is new, so saving again
      // created a duplicate. The draft is saved either way; publishing is a
      // second, separate outcome.
      setRecord(saved);
      setForm(saved);
      setDirty(false);

      // A create has no id in the URL yet; move to the real one so a reload
      // lands on the record rather than a blank new form.
      if (isNew) navigate(`/${resource.name}/${saved._id}`, {replace: true});

      if (thenPublish) {
        const published = await api.publish(saved._id);
        setRecord(published.data);
        setForm(published.data);
        toast.success(`${resource.singular} published.`);
      } else {
        toast.success(isNew ? `${resource.singular} created.` : "Saved.");
      }
    } catch (failure) {
      reportFailure(failure, "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (!canUpdate) return;

    setSaving(true);
    setFieldErrors({});
    try {
      const response =
        record.status === "published" ? await api.unpublish(id) : await api.publish(id);
      setRecord(response.data);
      setForm(response.data);
      toast.success(record.status === "published" ? "Unpublished." : "Published.");
    } catch (failure) {
      // A refused publish names the fields the public page needs. Marking them
      // is the whole point — "publish failed" on its own leaves an editor
      // hunting through every group for what is missing.
      reportFailure(failure, "That did not work.");
    } finally {
      setSaving(false);
    }
  };

  const loadRevisions = async () => {
    try {
      const response = await api.revisions(id);
      setRevisions(response.data);
    } catch (failure) {
      toast.error(failure.message || "Could not load history.");
    }
  };

  const rollback = async (revision) => {
    if (!canUpdate) return;

    setSaving(true);
    try {
      const response = await api.rollback(id, revision);
      setRecord(response.data);
      setForm(response.data);
      setRevisions(null);
      toast.success(`Rolled back to revision ${revision}.`);
    } catch (failure) {
      toast.error(failure.message || "Rollback failed.");
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (dirty) setLeaveTo(`/${resource.name}`);
    else navigate(`/${resource.name}`);
  };

  // Fields are grouped so a 30-field program editor reads as sections rather
  // than one unbroken column.
  const groups = resource.fields.reduce((accumulator, field) => {
    const group = field.group || "Other";
    accumulator[group] = accumulator[group] || [];
    accumulator[group].push(field);
    return accumulator;
  }, {});

  // What this record still needs before it may go live, recomputed on every
  // keystroke. The server checks the same list on publish; this is here so the
  // answer is on screen while the form is being filled rather than after a
  // refused publish.
  const missing = missingForPublish(resource, form);
  const missingByName = new Set(missing.map((entry) => entry.name));
  const missingByGroup = missing.reduce((accumulator, entry) => {
    accumulator[entry.group] = (accumulator[entry.group] || 0) + 1;
    return accumulator;
  }, {});
  const isReady = missing.length === 0;

  // On a create, the fields still holding their shared default say so. A
  // prefilled input is indistinguishable from one the editor typed, and the
  // failure mode that matters is publishing a program that claims "6 Months"
  // because nobody looked at the line.
  //
  // Compared by value rather than by a form-wide dirty flag, so editing the
  // title does not quietly clear the mark from the eight fields nobody has read
  // yet. Only on a create: once saved, the value is the record's own.
  const untouchedDefaults = new Set(
    isNew
      ? prefilledFields(resource).filter((name) => {
          const field = resource.fields.find((entry) => entry.name === name);
          return JSON.stringify(readPath(form, name)) === JSON.stringify(field.initial);
        })
      : [],
  );

  // Open until the snapshot above has been taken, so nothing is hidden during
  // the frame before it lands.
  const groupIsOpen = (group) => openSections?.[group] ?? true;

  // Jump from the readiness panel to the field itself. Opening the section first
  // matters: scrolling to an element inside a closed <details> scrolls to
  // nothing, which reads as a dead link.
  const jumpTo = (entry) => {
    setOpenSections((current) => ({...current, [entry.group]: true}));

    // Next frame, so the section has rendered open before we measure it.
    requestAnimationFrame(() => {
      const id = fieldDomId(entry.name);
      const row = document.getElementById(`${id}-row`);
      row?.scrollIntoView({behavior: "smooth", block: "center"});
      // Not every kind has a focusable control under this id — a media picker
      // has none — so focus is best-effort on top of the scroll, never instead
      // of it.
      document.getElementById(id)?.focus({preventScroll: true});
    });
  };

  const publicUrl =
    resource.publicPath && record && record.slug
      ? `${PUBLIC_SITE}${resource.publicPath.replace(":slug", record.slug)}`
      : null;

  // Ctrl/Cmd+S saves without leaving the keyboard — the single most repeated
  // action in the editor. Scoped to a keydown on the page (focus is always
  // inside it while editing) rather than a global listener, so it adds no
  // window-level state to clean up. The browser's own "save page" is suppressed.
  const onKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (canWrite && !saving) save();
    }
  };

  return (
    <div className="page" onKeyDown={onKeyDown}>
      <div className="page-head">
        <div>
          <button type="button" className="btn btn--ghost" onClick={goBack}>
            ← {resource.label}
          </button>
          <h1>
            {isNew ? `New ${resource.singular.toLowerCase()}` : form[resource.titleField] || resource.singular}
          </h1>
          <p className="page-sub">
            {record ? <StatusBadge status={record.status} /> : <span className="badge badge--draft">unsaved</span>}
            {record ? <span className="muted"> revision {record.revision}</span> : null}
            {dirty ? <span className="dirty-flag"> • unsaved changes</span> : null}
          </p>
        </div>

        <div className="page-actions">
          {publicUrl && record && record.status === "published" ? (
            <a className="btn" href={publicUrl} target="_blank" rel="noreferrer">
              View live
            </a>
          ) : null}
          {!isNew ? (
            <button type="button" className="btn" onClick={loadRevisions} disabled={saving}>
              History
            </button>
          ) : null}
          {/* Save and publish live in the sticky bar at the foot of the form,
              not here. Two sets of the same buttons means two places to check
              which one is disabled and why. */}
        </div>
      </div>

      {/* The checklist the publish button is judged against, shown before it is
          pressed. aria-live so the count is announced as fields are filled in,
          which is the only feedback a screen reader user would otherwise get
          from typing into the form. */}
      <div
        className={`readiness readiness--${isReady ? "ready" : "blocked"}`}
        aria-live="polite"
      >
        {isReady ? (
          <p className="readiness-head">
            <span aria-hidden="true">✓</span> Ready to publish — every field the public page needs is filled in.
          </p>
        ) : (
          <>
            <p className="readiness-head">
              <span aria-hidden="true">⚠</span>{" "}
              {missing.length} {missing.length === 1 ? "field is" : "fields are"} needed before publishing
            </p>
            <ul className="readiness-list">
              {missing.map((entry) => (
                <li key={entry.name}>
                  <button type="button" className="readiness-jump" onClick={() => jumpTo(entry)}>
                    {entry.label}
                    <span className="muted"> · {entry.group}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="readiness-foot muted">
              You can still save this as a draft — nothing here blocks saving.
            </p>
          </>
        )}

        {/* Only on a create, and only once: an editor who has been told the form
            is prefilled does not need reminding on every later visit. Naming the
            count rather than the fields keeps it to one line — the values are
            visible in the inputs themselves, which is where they will be
            checked. */}
        {isNew && untouchedDefaults.size > 0 ? (
          <p className="readiness-foot muted">
            {untouchedDefaults.size}{" "}
            {untouchedDefaults.size === 1 ? "field is" : "fields are"} prefilled with
            the values every {resource.singular.toLowerCase()} shares — the format,
            fee terms and eligibility line. Type over any that differ for this one.
          </p>
        ) : null}
      </div>

      <form
        className="editor"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        {Object.entries(groups).map(([group, fields]) => {
          const open = groupIsOpen(group);
          const outstanding = missingByGroup[group] || 0;

          return (
            // <details> rather than a div and a state flag: it is collapsible
            // with no JavaScript, the summary is focusable and toggles on Enter
            // for free, and browser find-in-page can still reach the content
            // inside a closed one.
            <details
              key={group}
              className="editor-section"
              open={open}
              // Read synchronously, before the updater. React calls a setState
              // callback during the *next* render, by which point it has reset
              // currentTarget to null — reading it in there threw and took the
              // whole editor down with it.
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenSections((current) => ({...current, [group]: isOpen}));
              }}
            >
              <summary>
                <span className="editor-section-name">{group}</span>
                {outstanding > 0 ? (
                  <span className="editor-section-count">{outstanding} needed</span>
                ) : (
                  <span className="editor-section-count editor-section-count--done">
                    <span aria-hidden="true">✓</span> complete
                  </span>
                )}
              </summary>

              <div className="editor-section-body">
                {fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={readPath(form, field.name)}
                    disabled={
                      saving ||
                      !canWrite ||
                      ((field.kind === "media" || field.kind === "mediaList") && !canManageMedia)
                    }
                    error={fieldErrors[field.name]}
                    needed={missingByName.has(field.name)}
                    prefilled={untouchedDefaults.has(field.name)}
                    onChange={(value) => setValue(field.name, value)}
                  />
                ))}
              </div>
            </details>
          );
        })}

        {/* A submit button inside the form so Enter saves, which is what a
            keyboard user expects a form to do. */}
        <button type="submit" className="visually-hidden">
          Save
        </button>
      </form>

      {/* The same actions as the header, pinned to the bottom. A thirty-field
          form scrolls the header buttons away within one screen, and hunting
          back up to save is the most repeated annoyance in an editor like this. */}
      <div className="editor-bar">
        <span className="editor-bar-status muted">
          {dirty ? "Unsaved changes" : record ? `Saved · revision ${record.revision}` : "Not saved yet"}
        </span>
        <div className="editor-bar-actions">
          {canWrite ? (
            <>
              <button
                type="button"
                className="btn"
                onClick={() => save()}
                disabled={saving}
                title="Save draft (Ctrl+S)"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              {!isNew && record && canUpdate ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={togglePublish}
                  disabled={saving || (record.status !== "published" && !isReady)}
                  title={
                    record.status !== "published" && !isReady
                      ? `Fill in ${missing.length} more ${missing.length === 1 ? "field" : "fields"} first`
                      : undefined
                  }
                >
                  {record.status === "published" ? "Unpublish" : "Publish"}
                </button>
              ) : isNew && canUpdate ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => save({thenPublish: true})}
                  disabled={saving || !isReady}
                  title={!isReady ? `Fill in ${missing.length} more ${missing.length === 1 ? "field" : "fields"} first` : undefined}
                >
                  Save &amp; publish
                </button>
              ) : null}
            </>
          ) : (
            <span className="muted">Read-only</span>
          )}
        </div>
      </div>

      {revisions ? (
        <Modal label="Revision history" onClose={() => setRevisions(null)}>
            <div className="dialog-head">
              <h2>Revision history</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setRevisions(null)} aria-label="Close">
                ×
              </button>
            </div>
            {revisions.length === 0 ? (
              <p className="muted">No previous revisions yet.</p>
            ) : (
              <ul className="revision-list">
                {revisions.map((revision) => (
                  <li key={revision.revision}>
                    <span>
                      Revision {revision.revision}
                      <span className="muted"> · {new Date(revision.createdAt).toLocaleString()}</span>
                      {revision.changedBy ? <span className="muted"> · {revision.changedBy.name}</span> : null}
                    </span>
                    {canUpdate ? (
                      <button type="button" className="btn btn--small" disabled={saving} onClick={() => rollback(revision.revision)}>
                        Restore
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(leaveTo)}
        title="Discard unsaved changes?"
        body="This record has edits that have not been saved. Leaving now loses them."
        confirmLabel="Discard and leave"
        cancelLabel="Stay"
        tone="danger"
        onConfirm={() => {
          const target = leaveTo;
          setLeaveTo(null);
          setDirty(false);
          navigate(target);
        }}
        onCancel={() => setLeaveTo(null)}
      />
    </div>
  );
};

export default ResourceEditor;
