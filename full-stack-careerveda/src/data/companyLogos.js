// Logo data for the TrustedCompanies marquee.
//
// To show a real logo: drop an image into  public/images/companies/  named
// <slug>.png  (a `.svg`, `.webp` or `.jpg` with the same slug works too — the
// marquee tries each in turn). Nothing else to change — the logo appears
// automatically. Until an image exists, the card falls back to the company name
// as text, so the section never shows a broken image.
// See public/images/companies/README.md.
//
// To add a new company: add one line below with a unique id, its display name,
// and a lowercase slug (the image filename, no extension).
//
// The list is split evenly into the top and bottom rows further down; reorder or
// move entries between rows just by changing their position in the array.

const company = (id, name, slug) => ({id, name, slug, alt: `${name} logo`});

export const companyLogos = [
  company(1, "Deloitte", "deloitte"),
  company(2, "Accenture", "accenture"),
  company(3, "Cognizant", "cognizant"),
  company(4, "Capgemini", "capgemini"),
  company(5, "TCS", "tcs"),
  company(6, "Wipro", "wipro"),
  company(7, "HCL", "hcl"),
  company(8, "Tech Mahindra", "techmahindra"),
  company(9, "L&T Infotech", "lti"),
  company(10, "Mindtree", "mindtree"),
  company(11, "Thoughtworks", "thoughtworks"),
  company(12, "Mu Sigma", "musigma"),
  company(13, "KPMG", "kpmg"),
  company(14, "McKinsey & Company", "mckinsey"),
  company(15, "J.P. Morgan", "jpmorgan"),
  company(16, "BlackRock", "blackrock"),
  company(17, "American Express", "amex"),
  company(18, "HDFC Bank", "hdfc"),
  company(19, "Paytm", "paytm"),
  company(20, "FinBox", "finbox"),
  company(21, "Cisco", "cisco"),
  company(22, "Fortinet", "fortinet"),
  company(23, "FireEye", "fireeye"),
  company(24, "Symantec", "symantec"),
  company(25, "Adobe", "adobe"),
  company(26, "Amazon", "amazon"),
  company(27, "Sony", "sony"),
  company(28, "Spotify", "spotify"),
  company(29, "Reddit", "reddit"),
  company(30, "Swiggy", "swiggy"),
  company(31, "Zomato", "zomato"),
];

// Image formats the marquee will try for each slug, in order, before falling
// back to the text label. PNG first because that's the recommended format.
export const LOGO_EXTENSIONS = ["png", "svg", "webp", "jpg"];

// How many marquee lines to fill.
export const ROW_COUNT = 4;

// Fisher–Yates shuffle — returns a new randomly-ordered copy, original untouched.
const shuffle = (input) => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Build the rows: shuffle the whole list, then deal the logos out across the
// rows round-robin. Every row ends up with a different random mix, no logo
// repeats between rows, and the rows stay evenly balanced. Runs once per page
// load, so each visit shows a fresh random arrangement.
const buildRows = () => {
  const rows = Array.from({length: ROW_COUNT}, () => []);
  shuffle(companyLogos).forEach((item, index) => {
    rows[index % ROW_COUNT].push(item);
  });
  return rows;
};

export const logoRows = buildRows();
