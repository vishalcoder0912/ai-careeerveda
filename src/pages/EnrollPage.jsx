import {useState} from "react";
import {useSearchParams} from "react-router-dom";
import {PageHero, SectionHeading} from "../components/PageShell";
import {Reveal, StaggerGroup, StaggerItem} from "../components/motionPrimitives";
import {getProgram, programCatalog} from "../data/programCatalog";
import {useContentList} from "../hooks/useContent";
import {adaptProgram} from "../lib/contentAdapters";
import {submitLead} from "../lib/publicApi";
// Carries .consultation-honeypot and .consultation-status. The honeypot import is
// load-bearing: without it the "company" field is a visible input, not a trap.
import "../components/consultation-form.css";

const steps = [
  ["Apply", "Share your details and pick a program that matches your career goal."],
  ["Talk to an expert", "A career counselor helps you confirm the right track and batch."],
  ["Start learning", "Join live classes, projects, and mentorship from day one."],
  ["Get placed", "Use resume support, mock interviews, and 900+ hiring partners."],
];

const perks = [
  ["🎓", "Industry-aligned curriculum", "Built with current tools and workflows employers actually use."],
  ["🧑‍🏫", "1:1 mentorship", "Personal guidance from 200+ working professionals."],
  ["💼", "Placement support", "Resume, interviews, referrals, and direct hiring partner access."],
  ["📜", "Recognized certification", "Credentials that add credibility to your resume."],
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_PATTERN = /^(\+?91)?[6-9]\d{9}$/;

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

const EnrollPage = () => {
  // Apply / Reserve buttons across the site link here as /enroll?program=<slug>,
  // so the course the visitor was reading about is already chosen when the form
  // loads. An unknown or absent slug just leaves the picker empty.
  const [searchParams] = useSearchParams();
  const preselected = getProgram(searchParams.get("program"));

  // The picker offers exactly the published programs. The preselection above
  // still reads the static catalogue, because it seeds the form's initial state
  // on first render — a slug that only exists in the database resolves once the
  // list below arrives and the visitor picks it.
  const {items: programs} = useContentList("programs", {
    fallback: programCatalog,
    adapt: adaptProgram,
  });

  const [values, setValues] = useState({
    name: "",
    email: "",
    mobile: "",
    userType: "Student",
    program: preselected?.title ?? "",
    company: "", // honeypot — hidden from real users, see the field below
  });
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

    setStatus("submitting");
    setMessage("");

    try {
      const result = await submitLead(
        {
          ...values,
          type: "enrollment",
          source: "enroll-page-form",
          sourcePage: window.location.pathname,
        },
        // Used only when no backend is configured. Same endpoint this form has
        // always posted to, so nothing is lost in that configuration.
        {legacyEndpoint: "/api/enroll"},
      );

      if (!result.ok) {
        // Surface the server's own field errors when it sends them.
        if (result.errors) setErrors(result.errors);

        setStatus("error");
        setMessage(result.message);
        return;
      }

      setStatus("success");
      setMessage("Thanks — a career expert will confirm your batch and payment options shortly.");
      setValues({
        name: "",
        email: "",
        mobile: "",
        userType: "Student",
        program: "",
        company: "",
      });
    } catch {
      // Network failure. Deliberately not a success message: an application that
      // silently goes nowhere is worse than a visible error.
      setStatus("error");
      setMessage("We couldn't reach the server. Please check your connection and try again.");
    }
  };

  const isSubmitting = status === "submitting";

  return (
    <main className="spline-page page-shell">
      <PageHero
        eyebrow="Enroll Now"
        title={<>Start your <span className="accent">career journey</span> today</>}
        lead={
          preselected
            ? `You're applying for the ${preselected.fullTitle || preselected.title} — ${preselected.duration}, ${preselected.format}${preselected.fee ? `, ${preselected.fee.amount}` : ""}. Fill in your details and a career expert will confirm your batch and payment options.`
            : "Reserve your seat in a mentor-led CareerVeda program. Fill in your details and a career expert will reach out with the next steps and a free consultation"
        }
      />

      <section className="page-section">
        <div className="ps-inner">
          <div className="page-split">
            <StaggerGroup>
              <SectionHeading label="How enrollment works" title="Four simple steps to get started" />
              {steps.map(([title, body], i) => (
                <StaggerItem className="contact-line" key={title}>
                  <span className="ic" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </span>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <Reveal as="form" className="page-form" amount={0.15} onSubmit={handleSubmit} noValidate>
              <h3>Reserve your seat</h3>
              <div className="form-grid">
                <label className="form-field">
                  Full name*
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
                <label className="form-field">
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
                <label className="form-field">
                  Mobile no.*
                  <input
                    type="tel"
                    name="mobile"
                    value={values.mobile}
                    onChange={update}
                    placeholder="+91 92178 01191"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.mobile)}
                  />
                  {errors.mobile && <small className="field-error">{errors.mobile}</small>}
                </label>
                <label className="form-field">
                  I am a
                  <select name="userType" value={values.userType} onChange={update}>
                    <option>Student</option>
                    <option>Working Professional</option>
                    <option>Career Switcher</option>
                  </select>
                </label>
                <label className="form-field full">
                  Select program
                  <select
                    name="program"
                    value={values.program}
                    onChange={update}
                    aria-invalid={Boolean(errors.program)}
                  >
                    <option value="" disabled>Choose a program</option>
                    {programs.map(({id, title}) => (
                      <option key={id} value={title}>{title}</option>
                    ))}
                  </select>
                  {errors.program && <small className="field-error">{errors.program}</small>}
                </label>
              </div>

              {/* Honeypot. Hidden from people, irresistible to bots; the server
                  drops any submission that fills it in. */}
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

              <div className="page-hero__actions">
                <button type="submit" className="page-btn page-btn--primary" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting…" : "Submit application"}
                </button>
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
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <SectionHeading label="What you get" title="Everything included with your enrollment" />
          <StaggerGroup className="page-grid">
            {perks.map(([icon, title, body]) => (
              <StaggerItem as="article" interactive className="page-card" key={title}>
                <span className="card-icon" aria-hidden="true">{icon}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>
    </main>
  );
};

export default EnrollPage;
