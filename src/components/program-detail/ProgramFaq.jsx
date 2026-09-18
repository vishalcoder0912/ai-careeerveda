import {Reveal} from "../motionPrimitives";
import {faqs} from "../../data/faqs";

const ProgramFaq = () => {
  if (!faqs.length) return null;

  return (
    <section className="pd-section pd-section--alt" id="pd-faq">
      <div className="pd-inner">
        <Reveal className="pd-heading">
          <p className="pd-eyebrow">Frequently Asked Questions</p>
          <h2>Questions learners ask most</h2>
        </Reveal>

        <div className="pd-faq">
          {faqs.map(([question, answer], index) => (
            <details className="pd-faq__item" key={question} open={index === 0}>
              <summary>
                <span>{question}</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgramFaq;