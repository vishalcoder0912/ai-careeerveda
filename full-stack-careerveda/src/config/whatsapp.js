// ─────────────────────────────────────────────────────────────────────────────
//  THE WHATSAPP MESSAGES LIVE HERE. This is the only file you need to edit.
// ─────────────────────────────────────────────────────────────────────────────
//
// The floating WhatsApp button in the corner of every page opens a chat with the
// number below, with the message already typed in for the visitor. What that
// message says depends on the page they were on when they tapped it, so a
// programme enquiry arrives naming the programme instead of "hi".
//
// Everything you would want to change — the number, the wording, whether the
// button shows at all — is in this file. Nothing here needs a component change.

// The number the chat opens with, in full international form: country code, then
// the number, digits only. No +, no spaces, no dashes — wa.me rejects those.
// India is 91, so +91 92178 01191 is written as:
export const WHATSAPP_NUMBER = "919217801191";

// Set to false to take the button off the whole site without deleting anything.
export const WHATSAPP_ENABLED = true;

// The label read out to screen readers and shown on hover.
export const WHATSAPP_ARIA_LABEL = "Chat with CareerVeda on WhatsApp";

// The little text bubble beside the icon on desktop. Set to "" to show the icon
// alone.
export const WHATSAPP_TOOLTIP = "Need help? Chat with us";

// ─────────────────────────────────────────────────────────────────────────────
//  THE MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
//
// Edit the text inside the backticks freely. Line breaks come through to WhatsApp
// as real line breaks, and emoji are fine.
//
// What the visitor sees typed into WhatsApp is exactly what is written here —
// nothing is appended. The one exception is ${...}, which is filled in first:
//   ${program}  the programme's full name, e.g. "PG Program in Product Management"
//   ${fee}      that programme's fee as written in programCatalog.js
// Only the programme message has those two — the other pages have no programme
// to name.

// Used on /programs/:slug — one specific programme's page. This is the one that
// carries the course name.
export const programMessage = ({program, fee}) =>
  // No "the ... program" around ${program}: the titles already read "PG Program
  // in Product Management", and wrapping them gave "the PG Program in Product
  // Management program".
  `Hi CareerVeda 

I'm interested in *${program}*${fee ? ` (${fee})` : ""}.

Could you share the batch dates, fee structure and EMI options?`;

// Used on every other page, keyed by the exact path. A page not listed here
// falls back to defaultMessage below, so you can add or remove entries freely.
export const pageMessages = {
  "/": () =>
    `Hi, I would like to know more about CareerVeda programs.

`,

  "/programs": () =>
    `Hi, I would like to know more about CareerVeda programs.

`,

//   "/jobs": () =>
//     `Hi CareerVeda 

// I was browsing your job openings and I'd like to know more about the roles and how CareerVeda can help me apply.`,

  "/enroll": () =>
    `Hi, I would like to know more about CareerVeda programs
.`,

  "/faculty": () =>
    `Hi CareerVeda 

I'd like to know more about your faculty and the mentorship in your programs.`,

  "/alumni": () =>
    `Hi CareerVeda 

I read about your alumni outcomes and I'd like to know more about your programs.`,

  "/about": () =>
    `Hi CareerVeda 

I'd like to know more about CareerVeda.`,

  "/contact": () =>
    `Hi CareerVeda 

I'd like to speak to someone from your team.`,

  "/blog": () =>
    `Hi CareerVeda 

I was reading your blog and I'd like to know more about your programs.`,
};

// The catch-all: any page with no entry above (the policy pages, anything added
// later) uses this, so the button is never mute on a new route.
export const defaultMessage = () =>
  `Hi CareerVeda 

I'd like to know more about your career programs.`;

// ─────────────────────────────────────────────────────────────────────────────
//  Below this line is plumbing. You should not need to touch it.
// ─────────────────────────────────────────────────────────────────────────────

// Picks the message for a page and returns the wa.me link to open.
//
// `program` is the record from programCatalog.js when we're on a programme page,
// and null everywhere else — WhatsAppButton loads it and hands it in, because a
// component rendered on every route must not import the 471 KB catalog itself.
export function buildWhatsAppUrl({pathname, program = null}) {
  const text = program
    ? programMessage({program: program.fullTitle || program.title, fee: program.fee?.amount || ""})
    : (pageMessages[pathname] || defaultMessage)();

  // encodeURIComponent, not a template literal: the messages contain newlines,
  // "?" and "&", each of which would otherwise cut the text short or be read as
  // another query parameter.
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
