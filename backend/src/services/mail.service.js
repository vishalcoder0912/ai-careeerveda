import nodemailer from "nodemailer";

import {env} from "../config/env.js";
import {logger} from "../config/logger.js";

// SMTP is optional: with no host configured the lead is still saved and the
// emails are simply skipped, so a deploy without mail credentials still works.
const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? {user: env.SMTP_USER, pass: env.SMTP_PASS} : undefined,
    })
  : null;

// Plain text only: every value here was typed by a member of the public, and
// text/plain cannot be turned into markup or a phishing link.
const hiringSummary = (lead) =>
  [
    `Organization: ${lead.organization}`,
    `Contact person: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.mobile}`,
    `Program: ${lead.program}`,
    `Positions: ${lead.positions}`,
    `Recruitment mode: ${lead.recruitmentMode}`,
    `Comments: ${lead.message || "—"}`,
  ].join("\n");

// Fire-and-forget. The lead is already saved; a mail outage must never turn a
// stored submission into an error for the person who sent it.
export const sendHiringEmails = async (lead) => {
  if (!transport) return;

  const from = env.MAIL_FROM || env.SMTP_USER;
  const summary = hiringSummary(lead);

  const results = await Promise.allSettled([
    env.LEAD_NOTIFY_EMAIL &&
      transport.sendMail({
        from,
        to: env.LEAD_NOTIFY_EMAIL,
        replyTo: lead.email,
        subject: `New hiring enquiry — ${lead.organization}`,
        text: `A new "Hire From Us" enquiry was submitted.\n\n${summary}`,
      }),
    transport.sendMail({
      from,
      to: lead.email,
      subject: "We've received your hiring enquiry — CareerVeda",
      text:
        `Hi ${lead.name},\n\n` +
        "Thank you for your interest in hiring from CareerVeda. Our placement team " +
        "will get in touch with you shortly.\n\n" +
        `Here is what you shared with us:\n\n${summary}\n\n` +
        "Regards,\nTeam CareerVeda\nInfo@careerveda.in · +91 9217801191",
    }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error({err: result.reason}, "hiring email failed");
    }
  }
};
