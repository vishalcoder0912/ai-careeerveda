import {describe, expect, it} from "vitest";
import {programCatalog} from "./programCatalog";
import {programFaqList, programFaqs} from "./programFaqs";

describe("programFaqs", () => {
  it("answers from the program's own record", () => {
    const program = programCatalog.find((entry) => entry.id === "data-analytics");
    const answers = Object.fromEntries(programFaqs(program));
    expect(answers[`How long is the ${program.title}?`]).toContain(program.duration);
    expect(answers[`What is the fee for the ${program.title}?`]).toContain(program.fee.amount);
    expect(answers[`When does the next batch of the ${program.title} start?`]).toContain(program.nextBatch);
  });

  it("writes every fee with exactly one rupee sign, however the catalog spelled it", () => {
    const fee = (amount) => programFaqs({title: "X", fee: {amount}})[0][1];
    expect(fee("1,45,000")).toBe("The program investment is ₹1,45,000.");
    expect(fee("₹1,45,000")).toBe("The program investment is ₹1,45,000.");
  });

  it("skips a question whose answer is missing instead of printing 'undefined'", () => {
    const pairs = programFaqs({title: "Test Program", duration: "6 Months"});
    expect(pairs).toEqual([["How long is the Test Program?", "The Test Program runs for 6 Months."]]);
  });

  it("gives every published program real answers", () => {
    for (const program of programCatalog) {
      for (const [question, answer] of programFaqList(program)) {
        expect(question).not.toMatch(/undefined|null/);
        expect(answer).not.toMatch(/undefined|null|\[object/);
      }
    }
  });

  it("drops the generic 'duration varies' answer on a program page", () => {
    const program = programCatalog[0];
    const questions = programFaqList(program).map(([question]) => question);
    expect(questions.filter((question) => /how long|duration/i.test(question))).toEqual([`How long is the ${program.title}?`]);
  });
});
