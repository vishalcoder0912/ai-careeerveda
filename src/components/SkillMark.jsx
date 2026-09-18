import {useState} from "react";

import {skillIconFor} from "../data/skillIcons";

/* The brand logo chip painted to the left of a skill's name in whichever chip
   renders it. Returns null (the plain text chip) when the skill has no icon in
   `skillIcons` or the image fails to load — a dead URL can never leave a
   broken-image glyph inside a chip. */
const SkillMark = ({name}) => {
  const [failed, setFailed] = useState(false);
  const url = skillIconFor(name);
  if (!url || failed) return null;

  return (
    <img
      className="skill-mark"
      src={url}
      alt=""
      width="16"
      height="16"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};

export default SkillMark;