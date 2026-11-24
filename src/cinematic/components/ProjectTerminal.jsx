/* A compact developer terminal for the program-page project gallery.
   This is a real interface, not a device mockup: the card itself is the
   terminal. All copy is derived from the shared project data, so a project's
   id, category, description and technology labels stay in one place.

   The scroll gallery flags the active card with [data-state="active"]. The
   terminal CSS uses that flag to type the command and reveal the execution
   logs; nothing here sets React state or timers during a scroll. */

const pad = (n) => String(n).padStart(2, "0");

export default function ProjectTerminal({project, index, category}) {
  const id = `P${pad(index + 1)}`;
  const slug = `p${pad(index + 1)}`;
  const stack = project.stack.join(" · ");

  return (
    <div
      className="ga-term"
      role="img"
      aria-label={`${id} · ${category}. ${project.name}. ${project.description}`}
    >
      <div className="ga-term-bar">
        <span className="ga-term-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="ga-term-id">{id}</span>
        <span className="ga-term-divider" aria-hidden="true">/</span>
        <span className="ga-term-category">{category}</span>
        <span className="ga-term-live" aria-hidden="true"><i />live</span>
      </div>

      <div className="ga-term-body">
        <div className="ga-term-command">
          <span className="ga-term-sigil" aria-hidden="true">$</span>
          <span className="ga-term-verb">run</span>
          <span className="ga-term-flag">--project</span>
          <span className="ga-term-arg">{slug}</span>
          <span className="ga-term-caret" aria-hidden="true" />
        </div>

        <div className="ga-term-logs">
          <p className="ga-term-line">
            <span className="ga-term-time">00:00</span>
            <span className="ga-term-tag">init</span>
            <span>workspace <b>{slug}</b></span>
            <span className="ga-term-ok">ok</span>
          </p>
          <p className="ga-term-line">
            <span className="ga-term-time">00:01</span>
            <span className="ga-term-tag">deps</span>
            <span className="ga-term-value">{stack}</span>
          </p>
          <p className="ga-term-line ga-term-line--lead">{project.name}</p>
          <p className="ga-term-line ga-term-line--note">{project.description}</p>
          <p className="ga-term-line">
            <span className="ga-term-time">00:02</span>
            <span className="ga-term-tag ga-term-tag--ok">verify</span>
            <span className="ga-term-ok">✓ 12 checks passed</span>
          </p>
        </div>

        <div className="ga-term-statuses" aria-hidden="true">
          <span className="ga-term-status ga-term-status--running"><i />RUNNING</span>
          <span className="ga-term-status ga-term-status--verified"><i />VERIFIED</span>
          <span className="ga-term-status ga-term-status--complete"><i />COMPLETE</span>
        </div>
      </div>
    </div>
  );
}
