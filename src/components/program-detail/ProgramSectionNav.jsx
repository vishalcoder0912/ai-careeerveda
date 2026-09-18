import {useEffect, useMemo, useRef, useState} from "react";

const NAV_OFFSET = 138;

const ProgramSectionNav = ({hasMentors, hasJobs}) => {
  const links = useMemo(
    () => [
      {id: "pd-overview", label: "Overview"},
      {id: "pd-curriculum", label: "Curriculum"},
      {id: "pd-careers", label: "Outcomes"},
      ...(hasJobs ? [{id: "pd-jobs", label: "Jobs"}] : []),
      ...(hasMentors ? [{id: "pd-mentors", label: "Faculty"}] : []),
      {id: "pd-fees", label: "Fees"},
      {id: "pd-faq", label: "FAQs"},
    ],
    [hasMentors, hasJobs],
  );

  const [active, setActive] = useState("");
  const activeRef = useRef("");

  // Scroll-spy: the section whose top edge sits just under the sticky nav wins.
  // Sections are probed in document order (the DOM, not the labels — mentors sit
  // between careers and fees here), so the last qualifying section is the one
  // the visitor is actually reading.
  useEffect(() => {
    const nodes = links
      .map((link) => link.id)
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );

    let frame;

    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        let current = "";
        for (const node of nodes) {
          const rect = node.getBoundingClientRect();
          if (rect.top <= NAV_OFFSET) current = node.id;
        }
        if (current !== activeRef.current) {
          activeRef.current = current;
          setActive(current);
        }
      });
    };

    update();
    window.addEventListener("scroll", update, {passive: true});
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [links]);

  return (
    <nav className="pd-section-nav" aria-label="In this program">
      <div className="pd-inner pd-section-nav__inner">
        {links.map((link) => (
          <a
            href={`#${link.id}`}
            key={link.id}
            className={active === link.id ? "is-active" : ""}
            aria-current={active === link.id ? "true" : undefined}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default ProgramSectionNav;