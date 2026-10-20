import {useEffect, useId, useRef, useState} from "react";
import {useContentList} from "../hooks/useContent";
import {adaptProgram} from "../lib/contentAdapters";
import {submitLead} from "../lib/publicApi";
import {useLockSmoothScroll} from "../lib/smoothScroll";
import {HIRE_FROM_US_HREF} from "../config/externalLinks";
import "./hire-from-us.css";

// Same choices as HIRING_POSITIONS / RECRUITMENT_MODES in backend/src/models/Lead.js.
const POSITIONS = ["1-5", "6-15", "16-30", "Other"];
const MODES = ["On-campus Interview", "Virtual Interview", "Internship placement", "Direct Hire"];

// Where the follow-up email from the employer goes.
const HIRING_EMAIL = "Info@careerveda.in";

// A prefilled draft to us, so the employer can add anything the form didn't
// cover. Three ways to open it, because a bare mailto: does nothing on the many
// machines with no desktop mail app set up — most people use webmail.
const composeLinks = (values) => {
  const subject = `Hiring enquiry — ${values.organization}`;
  const body = [
    "Hi CareerVeda team,",
    "",
    `We'd like to hire from your ${values.program} program.`,
    "",
    `Organization: ${values.organization}`,
    `Contact person: ${values.name}`,
    `Phone: ${values.mobile}`,
    `Positions: ${values.positions}`,
    `Recruitment mode: ${values.recruitmentMode}`,
    values.message ? `Comments: ${values.message}` : "",
    "",
    "",
  ].join("\n");
  const to = encodeURIComponent(HIRING_EMAIL);
  const su = encodeURIComponent(subject);
  const bd = encodeURIComponent(body);
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bd}`,
    outlook: `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${su}&body=${bd}`,
    mailto: `mailto:${HIRING_EMAIL}?subject=${su}&body=${bd}`,
  };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_PATTERN = /^(\+?91)?[6-9]\d{9}$/;

const EMPTY = {
  organization: "",
  name: "",
  email: "",
  mobile: "",
  program: "",
  positions: "",
  recruitmentMode: "",
  message: "",
  company: "", // honeypot — see ConsultationForm
};

const validate = (values) => {
  const errors = {};
  if (!values.organization.trim()) errors.organization = "Please enter your organization name.";
  if (!values.name.trim()) errors.name = "Please enter the contact person's name.";
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Please enter a valid email.";
  if (!MOBILE_PATTERN.test(values.mobile.replace(/[-\s]/g, ""))) {
    errors.mobile = "Please enter a valid mobile number.";
  }
  if (!values.program) errors.program = "Please choose a program.";
  if (!values.positions) errors.positions = "Please choose one.";
  if (!values.recruitmentMode) errors.recruitmentMode = "Please choose one.";
  return errors;
};

// Mounted once in Layout. Any link to HIRE_FROM_US_HREF — footer, mobile drawer,
// anywhere else — opens it, so the links themselves need no wiring.
const HireFromUsDialog = () => {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [message, setMessage] = useState("");
  const [mailLinks, setMailLinks] = useState(null);

  const {items: programs} = useContentList("programs", {adapt: adaptProgram});

  useLockSmoothScroll(open);

  useEffect(() => {
    const onClick = (event) => {
      if (!event.target.closest?.(`a[href="${HIRE_FROM_US_HREF}"]`)) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    if (status === "success") {
      setStatus("idle");
      setMessage("");
    }
  };

  const update = (event) => {
    const {name, value} = event.target;
    setValues((current) => ({...current, [name]: value}));
    setErrors((current) => ({...current, [name]: undefined}));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus("error");
      setMessage("Please fix the highlighted fields.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const result = await submitLead({
        ...values,
        type: "hiring",
        source: "hire-from-us-dialog",
        consent: true,
        sourcePage: window.location.pathname,
      });

      if (!result.ok) {
        if (result.errors) setErrors(result.errors);
        setStatus("error");
        setMessage(result.message);
        return;
      }

      setMailLinks(composeLinks(values));
      setStatus("success");
      setMessage("Thank you! Our placement team will contact you shortly. A copy has been sent to your email.");
      setValues(EMPTY);
    } catch {
      setStatus("error");
      setMessage("We couldn't reach the server. Please check your connection and try again.");
    }
  };

  const field = (name, label, props = {}) => (
    <label className="hire-field">
      <span>{label}<em aria-hidden="true">*</em></span>
      <input
        name={name}
        value={values[name]}
        onChange={update}
        aria-invalid={Boolean(errors[name])}
        required
        {...props}
      />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </label>
  );

  const choices = (name, legend, options) => (
    <fieldset className="hire-choices" aria-invalid={Boolean(errors[name])}>
      <legend>{legend}<em aria-hidden="true">*</em></legend>
      {options.map((option) => (
        <label key={option} className="hire-chip">
          <input
            type="radio"
            name={name}
            value={option}
            checked={values[name] === option}
            onChange={update}
          />
          <span>{option}</span>
        </label>
      ))}
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </fieldset>
  );

  return (
    <dialog
      ref={dialogRef}
      className="hire-dialog"
      aria-labelledby={titleId}
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form className="hire-form" onSubmit={handleSubmit} noValidate>
        <header className="hire-form__head">
          <div>
            <h2 id={titleId}>Hire From Us</h2>
            <p>
              Share your organization details and the program you'd like to recruit
              candidates from.
            </p>
          </div>
          <button type="button" className="hire-close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {status === "success" ? (
          <div className="hire-success" role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M7.5 12.5l3 3 6-6" />
            </svg>
            <p>{message}</p>
            <p className="hire-mail-label">Want to add more? Email us your requirements:</p>
            <div className="hire-mail-options">
              <a className="hire-submit" href={mailLinks.gmail} target="_blank" rel="noopener noreferrer">
                Gmail
              </a>
              <a className="hire-submit" href={mailLinks.outlook} target="_blank" rel="noopener noreferrer">
                Outlook
              </a>
              <a className="hire-submit hire-submit--ghost" href={mailLinks.mailto}>
                Mail app
              </a>
            </div>
            <p className="hire-mail-label">
              Or write to <a href={`mailto:${HIRING_EMAIL}`}>{HIRING_EMAIL}</a>
            </p>
            <button type="button" className="hire-link" onClick={close}>Done</button>
          </div>
        ) : (
          <>
            <div className="hire-grid">
              {field("organization", "Organization Name", {autoComplete: "organization"})}
              {field("name", "Contact Person Name", {autoComplete: "name"})}
              {field("email", "Email Address", {type: "email", autoComplete: "email"})}
              {field("mobile", "Phone Number", {type: "tel", autoComplete: "tel", placeholder: "+91 98765 43210"})}

              <label className="hire-field hire-field--full">
                <span>Which program are you interested in hiring from?<em aria-hidden="true">*</em></span>
                <select
                  name="program"
                  value={values.program}
                  onChange={update}
                  aria-invalid={Boolean(errors.program)}
                  required
                >
                  <option value="" disabled>Select a program</option>
                  {programs.map(({id, title}) => (
                    <option key={id} value={title}>{title}</option>
                  ))}
                </select>
                {errors.program && <small className="field-error">{errors.program}</small>}
              </label>
            </div>

            {choices("positions", "How many positions are you looking to fill?", POSITIONS)}
            {choices("recruitmentMode", "Preferred recruitment mode", MODES)}

            <label className="hire-field hire-field--full">
              <span>Additional Requirements or Comments</span>
              <textarea name="message" rows={3} value={values.message} onChange={update} />
              {errors.message && <small className="field-error">{errors.message}</small>}
            </label>

            {/* Honeypot, as in ConsultationForm. Not named "organization" — the
                server treats a filled-in `company` as a bot. */}
            <input
              type="text"
              name="company"
              value={values.company}
              onChange={update}
              className="hire-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <button type="submit" className="hire-submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Submitting…" : "Submit Enquiry"}
            </button>
            <p className="hire-consent">
              By submitting, you agree to be contacted about your enquiry and to our{" "}
              <a href="/privacy-policy">Privacy Policy</a>.
            </p>

            {message && (
              <p className={`hire-status hire-status--${status}`} role="status" aria-live="polite">
                {message}
              </p>
            )}
          </>
        )}
      </form>
    </dialog>
  );
};

export default HireFromUsDialog;
