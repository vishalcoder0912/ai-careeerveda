/* Real logos for the tool/language skill chips (Excel, SQL, Python, Power BI…).
 *
 * Each key is a skill name AS IT APPEARS IN THE DATA, lower-cased; the value is
 * any image URL. Every place that renders a skill chip (program hero tags,
 * overview tags, the explorer's skill-chip row and the floating visual/media
 * chips) looks up the name here and paints the logo to the left of the label.
 * Skills without an entry keep their existing plain-text chip.
 *
 * Sources are pinned to a specific release so the logo cannot silently change:
 *   - Excel / Power BI use simple-icons v6 (the last release that still ships
 *     Microsoft's brand marks).
 *   - Python uses devicon at a fixed tag.
 *   - "SQL" is the Azure SQL Database mark from devicon — there is no neutral
 *     brand logo for SQL-as-a-language, and the cylinder is its universal symbol.
 *
 * To use YOUR OWN logo for a language, drop the file into /public and add a row
 * here (or paste any HTTPS image URL):
 *   tableau: "/tableau.png",
 *   "gen ai": "https://example.com/gen-ai.png",
 */
export const skillIcons = {
  excel: "https://cdn.jsdelivr.net/npm/simple-icons@6/icons/microsoftexcel.svg",
  "power bi": "https://cdn.jsdelivr.net/npm/simple-icons@6/icons/powerbi.svg",
  python: "https://cdn.jsdelivr.net/gh/devicons/devicon@2.17.0/icons/python/python-original.svg",
  sql: "https://cdn.jsdelivr.net/gh/devicons/devicon@2.17.0/icons/azuresqldatabase/azuresqldatabase-original.svg",
};

export const skillIconFor = (name) =>
  typeof name === "string" ? skillIcons[name.toLowerCase()] : undefined;