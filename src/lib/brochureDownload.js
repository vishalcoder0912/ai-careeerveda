/* Download a programme brochure.

   Tries the remote ImageKit URL first: fetches the file as a blob and triggers
   a real save-as download with the given file name.

   If the remote file is missing (the placeholder ImageKit URL has no real PDF
   yet), CORS blocks the fetch, or the network is down, we fall back to
   generating a client-side brochure document from the programme data so the
   download button always produces a file instead of doing nothing.

   On success the browser shows its own download prompt — no in-page toast —
   but we alert on hard failure so the visitor is never left wondering why
   nothing happened. */
export const downloadBrochure = async (url, filename, program) => {
  // 1) Try the remote brochure URL (ImageKit delivery link).
  if (url) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        downloadBlob(blob, filename || "brochure.pdf");
        return;
      }
      // Non-OK (e.g. 404 on a placeholder): fall through to client-side gen.
    } catch (error) {
      // Fetch failed (CORS / network / dead URL): fall through below.
    }
  }

  // 2) Client-side fallback: build a brochure document from the programme data.
  if (program) {
    const html = generateBrochureHTML(program);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const htmlName = (filename || "brochure.pdf").replace(/\.pdf$/i, ".html");
    downloadBlob(blob, htmlName);
    return;
  }

  // 3) Nothing available at all.
  alert("This programme's brochure is not available yet. Please check back soon.");
};

/* Trigger a save-as download from a blob, then revoke the object URL. */
const downloadBlob = (blob, filename) => {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
};

/* Build a printable, single-page brochure from the programme record. */
const generateBrochureHTML = (program) => {
  const esc = (text) =>
    String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const list = (items) => {
    if (!items || !items.length) return "";
    return `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  };

  const cv = esc(program.title);
  const category = esc(program.category);
  const duration = esc(program.duration);
  const format = esc(program.format);
  const learners = esc(program.learners);
  const nextBatch = esc(program.nextBatch);
  const description = esc(program.description || program.lead || "");
  const fee = program.fee ? `${esc(program.fee.label)}: ${esc(program.fee.amount)} ${esc(program.fee.note ?? "")}`.trim() : "";
  const emi = esc(program.emi);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${cv} — Brochure</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; margin: 0; font-size: 11pt; }
  .brochure { max-width: 800px; margin: 0 auto; padding: 6px 8px; }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #2563eb; }
  .brand .mark { width: 34px; height: 34px; border-radius: 8px; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
  .brand h1 { margin: 0; font-size: 22px; letter-spacing: -0.02em; }
  .brand .cat { font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: #2563eb; font-weight: 700; margin-top: 2px; }
  .hero { margin-bottom: 20px; }
  .hero .desc { font-size: 11.5pt; color: #334155; margin-top: 8px; line-height: 1.6; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0 22px; }
  .tile { border: 1px solid #e3e9f1; border-radius: 10px; padding: 12px 10px; background: #f4f7fb; }
  .tile .k { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; font-weight: 700; margin-bottom: 4px; }
  .tile .v { font-size: 12pt; font-weight: 700; color: #0f172a; }
  h2 { font-size: 14pt; margin: 20px 0 8px; color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
  h3 { font-size: 11.5pt; margin: 14px 0 6px; color: #0f172a; }
  p { margin: 6px 0; color: #334155; }
  ul { margin: 6px 0 10px 18px; padding: 0; color: #334155; }
  li { margin: 4px 0; }
  .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e3e9f1; font-size: 9pt; color: #64748b; text-align: center; }
  .print-hint { font-size: 8.5pt; color: #94a3b8; font-style: italic; text-align: center; margin-top: 10px; }
</style>
</head>
<body>
<div class="brochure">
  <div class="brand">
    <div class="mark">CV</div>
    <div>
      <h1>${cv}</h1>
      <div class="cat">${category}</div>
    </div>
  </div>

  <div class="hero">
    <p>${description}</p>
  </div>

  <div class="meta">
    <div class="tile"><div class="k">Duration</div><div class="v">${duration}</div></div>
    <div class="tile"><div class="k">Format</div><div class="v">${format}</div></div>
    <div class="tile"><div class="k">Learners</div><div class="v">${learners}</div></div>
    <div class="tile"><div class="k">Next Batch</div><div class="v">${nextBatch}</div></div>
  </div>

  ${fee ? `<p style="font-weight:700; color:#0f172a;">${fee}</p>` : ""}
  ${emi ? `<p>${emi}</p>` : ""}

  <h2>Overview</h2>
  <p>${esc(program.gainsIntro || program.description || "")}</p>

  <h2>What You Will Master</h2>
  ${list(program.skills)}

  <h2>Curriculum</h2>
  ${list(program.curriculum)}

  <h2>Outcomes</h2>
  ${list(program.outcomes)}

  <div class="footer">
    CareerVeda · ${cv} · Generated on ${new Date().toLocaleDateString()}
  </div>
  <div class="print-hint">Tip: Open this file and use your browser's Print → Save as PDF to create a PDF brochure.</div>
</div>
</body>
</html>`;
};
