/*
 * The role, with the employer cut off: "Product Development, HighRadius" and
 * "Associate Product Manager at Wipro" both come back as the job title alone.
 *
 * Kept out of OutcomeStories.jsx so that file exports only its component: a
 * module that mixes components with plain functions is not a Fast Refresh
 * boundary, so editing it full-reloads the page instead of swapping the
 * component in place.
 *
 * Only the chip above the quote uses this. It falls back to the role when the
 * record has no programTitle, and printing the role verbatim there put the
 * company at the top of the card and again in the footer three lines below —
 * the same string twice. The footer keeps the full "role at company", which is
 * where the employer belongs.
 *
 * Both separators are handled because both are in the data. A title that
 * genuinely contains " at " would be cut short, but none in the collection do.
 */
export const roleTitle = (role) =>
  typeof role === "string" ? role.split(/\s+at\s+|\s*,\s*/i)[0].trim() : role;
