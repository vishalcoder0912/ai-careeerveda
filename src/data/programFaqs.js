import {faqs} from "./faqs.js";

// The questions people actually put to a search box or an AI assistant about
// one program ("how long is CareerVeda's product management course", "what
// does it cost", "who can join"), answered from that program's own record so
// the answers can never drift from the page. Shown on the program page AND
// emitted as FAQPage JSON-LD from the same list: structured data has to match
// visible content, and answer engines quote Q&A pairs more readily than prose.
// A question is only asked when its answer exists.
export const programFaqs = (program) => {
  const name = program.title;
  // The catalog writes fees both as "₹1,45,000" and "1,45,000"; say it one way.
  const amount = program.fee?.amount || program.startingPrice;
  const price = amount && `₹${String(amount).replace(/^\s*₹\s*/, "")}`;
  const pairs = [
    program.duration && [
      `How long is the ${name}?`,
      `The ${name} runs for ${program.duration}${program.format ? ` and is delivered ${program.format}` : ""}.`,
    ],
    price && [
      `What is the fee for the ${name}?`,
      `The program investment is ${price}${program.fee?.note ? ` (${program.fee.note})` : ""}.${
        program.emi ? ` EMI options: ${program.emi}.` : ""
      }`,
    ],
    program.eligibility && [`Who can join the ${name}?`, `It is open to: ${program.eligibility}.`],
    program.nextBatch && [`When does the next batch of the ${name} start?`, `The next batch starts on ${program.nextBatch}.`],
    program.skills?.length > 0 && [`What skills and tools does the ${name} cover?`, `${program.skills.join(", ")}.`],
    program.projects && [`How many projects are included?`, `${program.projects} hands-on projects, built on real-world problems.`],
    program.outcomes?.length > 0 && [`What will I be able to do after the ${name}?`, `${program.outcomes.join("; ")}.`],
  ];
  return pairs.filter(Boolean);
};

// Program page list: the program's own answers first, then the site-wide ones.
// The site-wide duration answer ("varies by program") is dropped, because on a
// program page the exact duration is already the first answer.
export const programFaqList = (program) => [
  ...programFaqs(program),
  ...faqs.filter(([question]) => !/duration/i.test(question)),
];
