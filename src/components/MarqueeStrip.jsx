import "./marquee-strip.css";

/* Infinite text-chip marquee.

   Movement is pure CSS in the same family as TrustedCompanies: the track holds
   two identical copies of the chip sequence and animates translate3d 0 → -50%
   (or back), landing copy 2 exactly where copy 1 began — a seamless loop. Gap
   lives as margin on a separator span, so one copy is exactly half the track.

   React only handles the markup and the copy count: short lists are repeated
   inside each copy so a row of five chips still fills the viewport before the
   loop turns. The second copy is aria-hidden so screen readers read the strip
   once. Hover / keyboard focus pauses the scroll; reduced motion drops it for
   a static, swipeable row. */

const MarqueeStrip = ({
  items = [],
  label,
  className = "",
  separator = "✦",
  speed = 38,
  direction = "ltr",
}) => {
  const chips = items.filter((item) => String(item).trim() !== "");
  if (chips.length === 0) return null;

  // Below ~7 chips one copy is too short to fill the viewport; tile it so the
  // -50% loop never shows empty track.
  const times = chips.length < 7 ? 2 : 1;

  const group = (dup) => (
    <div className="ms-group" aria-hidden={dup ? "true" : undefined}>
      {Array.from({length: times}).flatMap((_, round) =>
        chips.map((chip, index) => (
          <span className="ms-chip" key={`${dup ? "b" : "a"}-${round}-${index}`}>
            {chip}
            <span className="ms-chip__sep" aria-hidden="true">
              {separator}
            </span>
          </span>
        )),
      )}
    </div>
  );

  const cls = [
    "ms-strip",
    direction === "rtl" ? " ms-strip--rtl" : "",
    className ? ` ${className}` : "",
  ].join("");

  return (
    <div className={cls} aria-label={label} style={{"--ms-speed": `${speed}s`}}>
      <div className="ms-track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
};

export default MarqueeStrip;