import {useEffect, useRef, useState} from "react";
import {X} from "lucide-react";
import {submitJobApplication} from "../lib/publicApi";
import {useTurnstile} from "../lib/useTurnstile";
import {useLockSmoothScroll} from "../lib/smoothScroll";

// "Apply on CareerVeda": name, mobile and LMS ID against one admin-posted job.
// A native <dialog> opened with showModal() gives focus trapping, Escape to
// close and an inert page behind it without any library.

const EMPTY = {name: "", mobile: "", lmsId: "", consent: false, company: ""};

const JobApplyDialog = ({job, onClose}) => {
  const ref = useRef(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done
  // A ref, not the `state` above: two submit events can arrive in the same
  // tick, before React has re-rendered the button as disabled. The ref blocks
  // the second request synchronously; the backend is idempotent as well.
  const inFlight = useRef(false);
  const captcha = useTurnstile();
  // Mounted only while open. Without this (and data-lenis-prevent below) Lenis
  // swallows touch scroll, so on a phone the dialog cannot reach its submit.
  useLockSmoothScroll(true);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  const set = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setValues((current) => ({...current, [field]: value}));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setState("sending");
    setMessage("");
    const result = await submitJobApplication({...values, job: job.slug, turnstileToken: captcha.token}).catch(() => ({
      ok: false,
      message: "We couldn't reach the server. Please check your connection and try again.",
    }));
    captcha.reset(); // tokens are single-use
    if (result.ok) {
      setState("done");
      return;
    }
    // A failed attempt may be retried; a successful one never opens the form
    // again, so the lock stays closed.
    inFlight.current = false;
    setErrors(result.errors || {});
    setMessage(result.message || "We couldn't send your application. Please try again.");
    setState("idle");
  };

  const field = (name, label, props) => (
    <div className="job-apply__field">
      <label htmlFor={`apply-${name}`}>{label}</label>
      <input
        id={`apply-${name}`}
        name={name}
        value={values[name]}
        onChange={set(name)}
        required
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `apply-${name}-error` : undefined}
        {...props}
      />
      {errors[name] && (
        <p id={`apply-${name}-error`} className="job-apply__error">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <dialog ref={ref} className="job-apply" aria-labelledby="job-apply-title" onClose={onClose} data-lenis-prevent>
      <div className="job-apply__head">
        <div>
          <p className="job-apply__eyebrow">Apply on CareerVeda</p>
          <h2 id="job-apply-title">{job.title}</h2>
          <p className="job-apply__company">{job.company}</p>
        </div>
        <button type="button" className="job-apply__close" onClick={onClose} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {(job.description || job.skills?.length > 0) && (
        <div className="job-apply__about">
          {job.description && <p>{job.description}</p>}
          {job.skills?.length > 0 && (
            <div className="job-card__skills">
              {job.skills.map((skill) => (
                <span key={skill} className="job-card__skill">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {state === "done" ? (
        <div className="job-apply__done" role="status">
          <p>Application received. Our placement team will contact you on your registered mobile number.</p>
          <button type="button" className="job-card__apply" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className="job-apply__form" onSubmit={submit} noValidate>
          {field("name", "Full name", {autoComplete: "name", maxLength: 120})}
          {field("mobile", "Mobile number", {type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 16})}
          {field("lmsId", "LMS ID", {autoComplete: "off", maxLength: 40, spellCheck: false})}

          {/* Honeypot: hidden from people and assistive tech, filled by bots. */}
          {/* Not name="company": mobile autofill fills that from the contact
              card, and the server then silently drops a real application. */}
          <input
            className="job-apply__trap"
            name="cv_hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={values.company}
            onChange={set("company")}
          />

          <label className="job-apply__consent">
            <input type="checkbox" checked={values.consent} onChange={set("consent")} required />
            <span>I agree to share these details with CareerVeda's placement team for this job.</span>
          </label>
          {errors.consent && <p className="job-apply__error">{errors.consent}</p>}

          {captcha.widget}

          {message && (
            <p className="job-apply__error" role="alert">
              {message}
            </p>
          )}

          <button type="submit" className="job-card__apply" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Submit application"}
          </button>
        </form>
      )}
    </dialog>
  );
};

export default JobApplyDialog;
