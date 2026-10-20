// "CareerVeda" inside running text or a heading, in the logo's own colours:
// "Career" black, "Veda" the logo's blue gradient (brand-wordmark.css).
// <b>, not <span>, for the same reason as BrandLockup: legacy sheets force
// span colours with !important, which would repaint half the word.
export default function BrandWord() {
  return (
    <b className="cv-word">
      <b className="cv-word__career">Career</b>
      <b className="cv-word__veda">Veda</b>
    </b>
  );
}
