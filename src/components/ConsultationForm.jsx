import {useState} from "react";
import {Reveal} from "./motionPrimitives";
import {programCatalog} from "../data/programCatalog";
import {useContentList} from "../hooks/useContent";
import {adaptProgram} from "../lib/contentAdapters";
import {submitLead} from "../lib/publicApi";
import {hasSubmittedPhone, rememberSubmittedPhone} from "../lib/submittedPhones";
import "./consultation-form.css";

const USER_TYPES = ["Student", "Working Professional", "Career Switcher"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_PATTERN = /^(\+?91)?[6-9]\d{9}$/;

const EMPTY = {
  name: "",
  email: "",
  mobile: "",
  userType: "Student",
  program: "",
  company: "", // honeypot — hidden from real users, see the field below
};

// Mirrors the checks in the serverless function. This copy exists to give
// immediate feedback, not to secure anything: the server validates again,
// because anything sent from a browser can be forged.
const validate = ({name, email, mobile, program}) => {
  const errors = {};

  if (!name.trim()) errors.name = "Please enter your name.";

  if (!email.trim()) errors.email = "Please enter your email.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "That email doesn't look right.";

  if (!mobile.trim()) errors.mobile = "Please enter your mobile number.";
  else if (!MOBILE_PATTERN.test(mobile.replace(/[-\s]/g, ""))) {
    errors.mobile = "That mobile number doesn't look right.";
  }

  if (!program) errors.program = "Please choose a program.";

  return errors;
};

const ConsultationForm = () => {
  // The picker lists exactly the published programs, so a program added in the
  // admin panel is selectable here without a code change — and one that is
  // unpublished stops being offered.
  const {items: programs} = useContentList("programs", {
    fallback: programCatalog,
    adapt: adaptProgram,
  });

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [message, setMessage] = useState("");

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

    // This browser has already sent this phone through. The server enforces the
    // same rule, so this just saves the round trip.
    if (hasSubmittedPhone(values.mobile)) {
      setStatus("error");
      setMessage(
        "You've already shared your details with us. Our team has them and will reach out — no need to submit again.",
      );
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const result = await submitLead({
        ...values,
        type: "consultation",
        source: "home-consultation-form",
        sourcePage: window.location.pathname,
      });

      if (!result.ok) {
        // Surface the server's own field errors when it sends them.
        if (result.errors) setErrors(result.errors);

        setStatus("error");
        setMessage(result.message);
        return;
      }

      rememberSubmittedPhone(values.mobile);
      setStatus("success");
      setMessage("Thanks — our admissions team will reach out to you shortly.");
      setValues(EMPTY);
    } catch {
      // Network failure. Deliberately not a success message: a lead that
      // silently goes nowhere is worse than a visible error.
      setStatus("error");
      setMessage("We couldn't reach the server. Please check your connection and try again.");
    }
  };

  const isSubmitting = status === "submitting";

  return (
    <Reveal as="form" className="consultation-form" onSubmit={handleSubmit} noValidate>
      <header className="consultation-form__head">
        <span className="consultation-form__badge" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
        </span>
        <div>
          <h3>Book Your Free Expert Consultation</h3>
          <span className="consultation-form__subtitle">
            Take the first step toward your dream career
          </span>
        </div>
      </header>

      <label className="consultation-field">
        Name*
        <input
          type="text"
          name="name"
          value={values.name}
          onChange={update}
          placeholder="Your full name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <small className="field-error">{errors.name}</small>}
      </label>

      <label className="consultation-field">
        Email*
        <input
          type="email"
          name="email"
          value={values.email}
          onChange={update}
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <small className="field-error">{errors.email}</small>}
      </label>

      <label className="consultation-field consultation-field--full">
        Mobile No.*
        <span className="phone-field">
          <span className="phone-field__prefix" aria-hidden="true">+91</span>
          <input
            type="tel"
            name="mobile"
            value={values.mobile}
            onChange={update}
            placeholder="98765 43210"
            autoComplete="tel"
            aria-invalid={Boolean(errors.mobile)}
          />
        </span>
        {errors.mobile && <small className="field-error">{errors.mobile}</small>}
      </label>

      <label className="consultation-field">
        User Type
        <select name="userType" value={values.userType} onChange={update}>
          {USER_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>

      <label className="consultation-field">
        Select Program
        <select
          name="program"
          value={values.program}
          onChange={update}
          aria-invalid={Boolean(errors.program)}
        >
          <option value="" disabled>
            Choose a program
          </option>
          {programs.map(({id, title}) => (
            <option key={id} value={title}>{title}</option>
          ))}
        </select>
        {errors.program && <small className="field-error">{errors.program}</small>}
      </label>

      {/* Honeypot. Hidden from people, irresistible to bots; the server drops
          any submission that fills it in. */}
      <input
        type="text"
        name="company"
        value={values.company}
        onChange={update}
        className="consultation-honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className="consultation-form__footer">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
        <p className="consultation-security">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Your details are secure. No spam, ever.
        </p>
      </div>

      {message && (
        <p
          className={`consultation-status consultation-status--${status}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </Reveal>
  );
};

export default ConsultationForm;
