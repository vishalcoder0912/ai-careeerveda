import {useCallback, useEffect, useRef, useState} from "react";
import {CheckCircle2, FileText, UploadCloud, X} from "lucide-react";
import {API_BASE, isApiConfigured, submitJobApplication} from "../lib/publicApi";
import {useTurnstile} from "../lib/useTurnstile";

const EMPTY = {
  fullName: "",
  email: "",
  mobile: "",
  currentLocation: "",
  gender: "",
  totalExperience: "",
  currentEmploymentStatus: "",
  linkedinUrl: "",
  portfolioUrl: "",
  coverLetter: "",
  consent: false,
  company: "",
};

const MAX_RESUME = 5 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const detectClientType = async (file) => {
  const buf = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return "application/msword";
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    const text = await file.slice(0, 4096).text().catch(() => "");
    if (text.includes("word/")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "";
};

// The browser never talks to ImageKit. It posts the bytes to our own API, which
// inspects them before the SDK stores the file in the folder named by the signed
// token. XHR is used only because fetch has no real upload-progress event.
const uploadResumeToServer = (job, file, uploadToken, onProgress) => new Promise((resolve, reject) => {
  const form = new FormData();
  form.append("uploadToken", uploadToken);
  form.append("resume", file, file.name);
  const slug = encodeURIComponent(job.slug || job.id);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${API_BASE}/public/job-applications/${slug}/resume`);
  xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
  xhr.onload = () => {
    let body;
    try { body = JSON.parse(xhr.responseText); }
    catch { reject(new Error("Upload failed.")); return; }
    if (xhr.status >= 200 && xhr.status < 300 && body?.success !== false && body?.data?.resumeFileId) {
      resolve(body.data);
      return;
    }
    const error = body?.error || {};
    reject(new Error(error.fields?.resume || error.message || "Resume upload failed."));
  };
  xhr.onerror = () => reject(new Error("Network interruption during upload."));
  xhr.send(form);
});

const fetchResumeAuth = async (job, turnstileToken) => {
  if (!isApiConfigured) throw new Error("Resume uploads aren't configured yet.");
  const slug = encodeURIComponent(job.slug || job.id);
  const response = await fetch(`${API_BASE}/public/job-applications/${slug}/resume-upload-auth`, {
    method: "POST",
    headers: {"Content-Type": "application/json", Accept: "application/json"},
    body: JSON.stringify({turnstileToken}),
  });
  // fetch resolves on 4xx/5xx, so check the status before reading the body.
  // Keep the API's own error message when it gives us one.
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || "Could not start resume upload.");
  }
  const body = await response.json().catch(() => null);
  if (body?.success === false) {
    throw new Error(body?.error?.message || "Could not start resume upload.");
  }
  return body.data;
};

const useResumeUpload = ({job, captcha, setErrors}) => {
  const fileInputRef = useRef(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeMeta, setResumeMeta] = useState(null);
  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const resetResume = () => {
    setResumeFile(null);
    setResumeMeta(null);
    setUploadState("idle");
    setUploadProgress(0);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadResume = async (file) => {
    setUploadError("");
    setUploadProgress(0);
    setResumeMeta(null);
    setUploadState("idle");
    if (!file) return;
    const name = file.name || "";
    if (!/\.(pdf|doc|docx)$/i.test(name)) { setUploadError("Only .pdf, .doc and .docx resumes are allowed."); return; }
    if (file.size > MAX_RESUME) { setUploadError("Resume must be 5 MB or smaller."); return; }
    const detected = await detectClientType(file);
    if (!ALLOWED.includes(detected)) { setUploadError("Only PDF and Word resumes are allowed."); return; }
    if (file.type && file.type !== detected && !(detected.includes("wordprocessingml") && file.type === "application/octet-stream")) {
      setUploadError("The file contents do not match its type.");
      return;
    }
    if (captcha.widget && !captcha.token) {
      setUploadError("Please complete the verification below, then choose your file again.");
      return;
    }
    setResumeFile(file);
    setUploadState("uploading");
    try {
      // The auth route redeems this Turnstile token (single-use), so the widget
      // is reset below to obtain a fresh token for the submit call.
      const auth = await fetchResumeAuth(job, captcha.token);
      captcha.reset();
      const uploaded = await uploadResumeToServer(job, file, auth.uploadToken, setUploadProgress);
      setResumeMeta({
        resumeFileId: uploaded.resumeFileId,
        resumeUrl: uploaded.resumeUrl || "",
        resumeFileName: uploaded.resumeFileName || file.name,
        resumeFileSize: uploaded.resumeFileSize || file.size,
        resumeMimeType: uploaded.resumeMimeType || detected,
        imageKitFilePath: uploaded.imageKitFilePath || "",
        resumeUploadToken: uploaded.resumeUploadToken || auth.uploadToken,
        uploadedAt: new Date().toISOString(),
      });
      setUploadState("done");
      setUploadProgress(100);
      setErrors((e) => ({...e, resume: ""}));
    } catch (err) {
      captcha.reset();
      setUploadState("error");
      setUploadError(err?.message || "Resume upload failed. Please try again.");
      setResumeMeta(null);
    }
  };

  return {fileInputRef, resumeFile, resumeMeta, uploadState, uploadProgress, uploadError, uploadResume, resetResume};
};

const SuccessView = ({job, onClose}) => (
  <div className="job-apply__done" role="status">
    <CheckCircle2 size={28} aria-hidden="true" />
    <p><strong>Application submitted successfully.</strong></p>
    <p>Our team has received your application for <strong>{job.title}</strong>. We’ll contact you if your profile is shortlisted.</p>
    <button type="button" className="job-card__apply" onClick={onClose}>Done</button>
  </div>
);

const ResumeUploadSection = ({fileInputRef, resumeFile, resumeMeta, uploadState, uploadProgress, uploadError, fieldError, onFileChange, onDrop, onRemove}) => (
  <div className="job-apply__field job-apply__field--full">
    <label htmlFor="apply-resume">Resume (PDF/DOC/DOCX, max 5 MB) *</label>
    <div
      className={`job-upload${uploadState === "error" ? " is-error" : ""}${uploadState === "done" ? " is-done" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <input ref={fileInputRef} id="apply-resume" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileChange} className="job-upload__input" />
      <UploadCloud size={22} aria-hidden="true" />
      <p><strong>Drag & drop your resume</strong> or <button type="button" className="job-upload__browse" onClick={() => fileInputRef.current?.click()}>browse files</button></p>
      <p className="job-form__hint">Accepted: PDF, DOC, DOCX · Max 5 MB</p>
      {(resumeFile || resumeMeta) ? (
        <div className="job-upload__file">
          <FileText size={16} aria-hidden="true" />
          <span>{resumeMeta?.resumeFileName || resumeFile?.name} {resumeMeta?.resumeFileSize || resumeFile?.size ? `(${Math.ceil((resumeMeta?.resumeFileSize || resumeFile.size)/1024)} KB)` : ""}</span>
          {uploadState === "done" ? <span className="job-upload__ok">Uploaded</span> : null}
          <button type="button" className="job-upload__remove" onClick={onRemove}>Remove</button>
        </div>
      ) : null}
      {uploadState === "uploading" ? (
        <div className="job-upload__progress" aria-label="Upload progress">
          <div className="job-upload__bar" style={{width: `${uploadProgress}%`}} />
          <span>{uploadProgress}%</span>
        </div>
      ) : null}
    </div>
    {uploadError ? <p className="job-apply__error">{uploadError}</p> : null}
    {fieldError ? <p className="job-apply__error">{fieldError}</p> : null}
  </div>
);

const ConsentField = ({checked, onChange, error}) => (
  <div className="job-apply__field job-apply__field--full">
    <label className="job-apply__consent">
      <input type="checkbox" checked={checked} onChange={onChange} required />
      <span>I agree to share these details with CareerVeda's placement team for this job.</span>
    </label>
    {error ? <p className="job-apply__error job-apply__field--full">{error}</p> : null}
  </div>
);

const validateApplication = (values, resumeMeta) => {
  const e = {};
  if (!values.fullName.trim()) e.fullName = "Please enter your full name.";
  if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) e.email = "That email doesn't look right.";
  if (!/^(\+?91[-\s]?)?[6-9]\d{9}$/.test(values.mobile.replace(/[-\s]/g, ""))) e.mobile = "That mobile number doesn't look right.";
  if (!values.currentLocation.trim()) e.currentLocation = "Please enter your current location.";
  if (!values.gender) e.gender = "Please select your gender.";
  if (!values.totalExperience.trim()) e.totalExperience = "Please enter your total work experience.";
  if (!values.currentEmploymentStatus) e.currentEmploymentStatus = "Please select your employment status.";
  if (!resumeMeta?.resumeFileId) e.resume = "Please upload your resume (PDF or Word, up to 5 MB).";
  if (!values.consent) e.consent = "Please agree to share these details with the hiring team.";
  return e;
};

const ApplicationFormBody = ({values, errors, setField, resume, onFileChange, onDrop, captcha, message, submitState, uploadState, onSubmit}) => (
  <form className="job-apply__form job-apply__form--grid" onSubmit={onSubmit} noValidate>
    <div className="job-apply__field">
      <label htmlFor="apply-fullName">Full name *</label>
      <input id="apply-fullName" value={values.fullName} onChange={setField("fullName")} autoComplete="name" maxLength={120} required aria-invalid={Boolean(errors.fullName)} />
      {errors.fullName ? <p className="job-apply__error">{errors.fullName}</p> : null}
    </div>
    <div className="job-apply__field">
      <label htmlFor="apply-email">Email address *</label>
      <input id="apply-email" type="email" value={values.email} onChange={setField("email")} autoComplete="email" required aria-invalid={Boolean(errors.email)} />
      {errors.email ? <p className="job-apply__error">{errors.email}</p> : null}
    </div>
    <div className="job-apply__field">
      <label htmlFor="apply-mobile">Mobile number *</label>
      <input id="apply-mobile" type="tel" value={values.mobile} onChange={setField("mobile")} autoComplete="tel" inputMode="tel" required aria-invalid={Boolean(errors.mobile)} />
      {errors.mobile ? <p className="job-apply__error">{errors.mobile}</p> : null}
    </div>
    <div className="job-apply__field">
      <label htmlFor="apply-currentLocation">Current location *</label>
      <input id="apply-currentLocation" value={values.currentLocation} onChange={setField("currentLocation")} placeholder="City, State" required aria-invalid={Boolean(errors.currentLocation)} />
      {errors.currentLocation ? <p className="job-apply__error">{errors.currentLocation}</p> : null}
    </div>
    <div className="job-apply__field">
      <label htmlFor="apply-gender">Gender *</label>
      <select id="apply-gender" value={values.gender} onChange={setField("gender")} required aria-invalid={Boolean(errors.gender)}>
        <option value="">Select</option>
        <option value="Female">Female</option>
        <option value="Male">Male</option>
        <option value="Non-binary">Non-binary</option>
        <option value="Prefer not to say">Prefer not to say</option>
      </select>
      {errors.gender ? <p className="job-apply__error">{errors.gender}</p> : null}
    </div>
    <div className="job-apply__field">
      <label htmlFor="apply-totalExperience">Total work experience *</label>
      <input id="apply-totalExperience" value={values.totalExperience} onChange={setField("totalExperience")} placeholder="e.g. Fresher / 2 years" required aria-invalid={Boolean(errors.totalExperience)} />
      {errors.totalExperience ? <p className="job-apply__error">{errors.totalExperience}</p> : null}
    </div>
    <div className="job-apply__field">
      <label htmlFor="apply-currentEmploymentStatus">Current employment status *</label>
      <select id="apply-currentEmploymentStatus" value={values.currentEmploymentStatus} onChange={setField("currentEmploymentStatus")} required aria-invalid={Boolean(errors.currentEmploymentStatus)}>
        <option value="">Select</option>
        <option value="Student">Student</option>
        <option value="Fresher">Fresher</option>
        <option value="Employed">Employed</option>
        <option value="Notice period">Notice period</option>
        <option value="Unemployed">Unemployed</option>
      </select>
      {errors.currentEmploymentStatus ? <p className="job-apply__error">{errors.currentEmploymentStatus}</p> : null}
    </div>
    <div className="job-apply__field">
      <label htmlFor="apply-linkedinUrl">LinkedIn profile URL (optional)</label>
      <input id="apply-linkedinUrl" value={values.linkedinUrl} onChange={setField("linkedinUrl")} placeholder="https://linkedin.com/in/..." aria-invalid={Boolean(errors.linkedinUrl)} />
      {errors.linkedinUrl ? <p className="job-apply__error">{errors.linkedinUrl}</p> : null}
    </div>
    <div className="job-apply__field">
      <label htmlFor="apply-portfolioUrl">Portfolio/GitHub URL (optional)</label>
      <input id="apply-portfolioUrl" value={values.portfolioUrl} onChange={setField("portfolioUrl")} placeholder="https://..." aria-invalid={Boolean(errors.portfolioUrl)} />
      {errors.portfolioUrl ? <p className="job-apply__error">{errors.portfolioUrl}</p> : null}
    </div>
    <ResumeUploadSection
      fileInputRef={resume.fileInputRef}
      resumeFile={resume.resumeFile}
      resumeMeta={resume.resumeMeta}
      uploadState={resume.uploadState}
      uploadProgress={resume.uploadProgress}
      uploadError={resume.uploadError}
      fieldError={errors.resume}
      onFileChange={onFileChange}
      onDrop={onDrop}
      onRemove={resume.resetResume}
    />
    <div className="job-apply__field job-apply__field--full">
      <label htmlFor="apply-coverLetter">Cover letter (optional)</label>
      <textarea id="apply-coverLetter" value={values.coverLetter} onChange={setField("coverLetter")} rows={4} maxLength={5000} placeholder="Tell us why you're a good fit..." />
    </div>
    <input className="job-apply__trap" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={values.company} onChange={setField("company")} />
    <ConsentField checked={values.consent} onChange={setField("consent")} error={errors.consent} />
    {captcha.widget}
    {message ? <p className="job-apply__error job-apply__field--full" role="alert">{message}</p> : null}
    <button type="submit" className="job-card__apply job-apply__field--full" disabled={submitState === "sending" || uploadState === "uploading"}>
      {submitState === "sending" ? "Submitting…" : "Submit application"}
    </button>
  </form>
);

const JobApplicationForm = ({job, onClose}) => {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const inFlight = useRef(false);
  const showRafRef = useRef(0);
  const closeTimerRef = useRef(0);
  const captcha = useTurnstile();
  const resume = useResumeUpload({job, captcha, setErrors});
  const {uploadState, resumeMeta} = resume;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    showRafRef.current = requestAnimationFrame(() => setShow(true));
    return () => {
      if (showRafRef.current) cancelAnimationFrame(showRafRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const close = useCallback(() => {
    setShow(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = 0;
      onClose?.();
    }, 180);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const setField = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setValues((current) => ({...current, [field]: value}));
    if (errors[field]) setErrors((e) => ({...e, [field]: ""}));
  };

  const onFileChange = (e) => { const f = e.target.files?.[0]; if (f) resume.uploadResume(f); };
  const onDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) resume.uploadResume(f); };

  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    const clientErrors = validateApplication(values, resumeMeta);
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; }
    // The Turnstile token is single-use and was spent on the upload, so wait for
    // the widget to hand us a fresh one before submitting.
    if (captcha.widget && !captcha.token) {
      setMessage("Please complete the verification below and try again.");
      return;
    }
    inFlight.current = true;
    setSubmitState("sending");
    setMessage("");
    const payload = {
      ...values,
      name: values.fullName,
      job: job.slug || job.id,
      turnstileToken: captcha.token,
      ...(resumeMeta || {}),
    };
    const result = await submitJobApplication(payload).catch(() => ({
      ok: false,
      message: "We couldn't reach the server. Please check your connection and try again.",
    }));
    captcha.reset();
    if (result.ok) {
      setSubmitState("done");
      return;
    }
    inFlight.current = false;
    setErrors(result.errors || {});
    setMessage(result.message || "We couldn't send your application. Please try again.");
    setSubmitState("idle");
  };

  return (
    <dialog
      ref={ref}
      className={`job-apply job-apply--form${show ? " is-open" : ""}`}
      aria-labelledby="job-apply-title"
      onClose={onClose}
      data-lenis-prevent
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="job-apply__head">
        <div>
          <p className="job-apply__eyebrow">Apply with CareerVeda</p>
          <h2 id="job-apply-title">{job.title}</h2>
          <p className="job-apply__company">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
        </div>
        <button type="button" className="job-apply__close" onClick={close} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {submitState === "done" ? (
        <SuccessView job={job} onClose={close} />
      ) : (
        <ApplicationFormBody
          values={values}
          errors={errors}
          setField={setField}
          resume={resume}
          onFileChange={onFileChange}
          onDrop={onDrop}
          captcha={captcha}
          message={message}
          submitState={submitState}
          uploadState={uploadState}
          onSubmit={submit}
        />
      )}
    </dialog>
  );
};

export default JobApplicationForm;