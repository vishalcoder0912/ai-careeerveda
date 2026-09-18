// Which phone numbers have already submitted a lead on this browser. The
// server is the real gate — the phone number is a unique primary key there, so
// a repeat fill is refused no matter what happens here. This copy just answers
// the repeat-fill instantly instead of spending a round trip the server is
// going to refuse anyway. It is a convenience, not a security boundary.

const STORAGE_KEY = "careerveda.submittedPhones";

const normalize = (mobile) => String(mobile || "").replace(/\D/g, "").slice(-10);

const read = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (phones) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(phones));
  } catch {
    // Private mode or a full quota: the server still refuses duplicates.
  }
};

export const hasSubmittedPhone = (mobile) => read().includes(normalize(mobile));

export const rememberSubmittedPhone = (mobile) => {
  const normalised = normalize(mobile);
  if (!normalised) return;
  const phones = read();
  if (phones.includes(normalised)) return;
  write([...phones, normalised]);
};