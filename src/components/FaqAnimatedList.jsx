import {useState} from "react";

import AnimatedList from "./AnimatedList";

// The FAQ on a phone. On a wide screen the stacked <details> accordion reads
// fine; on a narrow one its twelve questions are a wall of text to scroll past.
// A phone gets the React Bits AnimatedList instead: the questions animate in as
// the list scrolls, tapping one shows its answer in a card beneath, and the
// list is height-capped so the section stays compact.
//
// The list and the accordion share the same `faqs` source (pairs of
// [question, answer]), so the FAQPage JSON-LD built over that list, the desktop
// accordion and this phone list can never drift apart.
const FaqAnimatedList = ({faqs}) => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="faq-animated-list">
      <AnimatedList
        items={faqs.map(([question]) => question)}
        onItemSelect={(question, index) => setSelected(faqs[index])}
        showGradients
        enableArrowNavigation={false}
        displayScrollbar={false}
      />
      {selected ? (
        <div className="faq-animated-answer">
          <h3>{selected[0]}</h3>
          <p>{selected[1]}</p>
        </div>
      ) : (
        <p className="faq-animated-hint">Tap a question to read the answer</p>
      )}
    </div>
  );
};

export default FaqAnimatedList;