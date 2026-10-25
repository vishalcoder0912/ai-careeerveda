import {Reveal} from "../motionPrimitives";

// `items` is programFaqList(program): the same list the page emits as FAQPage
// JSON-LD (ProgramDetailPage), so what is marked up is exactly what is shown.
const ProgramFaq = ({items}) => {
  if (!items.length) return null;

  return (
    <section className="pd-section pd-section--alt" id="pd-faq">
      <div className="pd-inner">
        <Reveal className="pd-heading">
          <p className="pd-eyebrow">Frequently Asked Questions</p>
          <h2>Questions learners ask most</h2>
        </Reveal>

        <div className="pd-faq">
          {items.map(([question, answer], index) => (
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
