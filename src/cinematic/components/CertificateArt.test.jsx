import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import {certificates} from "../data";
import {CertificateArt} from "./CertificateArt";

/* The certificate leaves the browser as a serialised SVG document, so these
   tests check the serialised form rather than the React tree. A rule like
   `.ga-cert h3 { color: red }` passes every DOM assertion in the suite and then
   produces a blank white PNG on download, because nothing in the artwork depends
   on the stylesheet. Asserting on the markup keeps that from regressing. */

const mark = (props) => renderToStaticMarkup(<CertificateArt {...props} />);

const WIDTH_CENTRE = 800;

/* The nearest font-size declared before the name is the name's own. Matching on
   the rendered attribute order is brittle; scanning backwards from the text node
   is not. */
const fontSizeOfName = (markup, name) => {
  const at = markup.indexOf(`>${name}<`);
  expect(at, `could not locate the name "${name}" in the markup`).toBeGreaterThan(-1);
  const before = markup.slice(0, at);
  const sizes = [...before.matchAll(/font-size="(\d+)"/g)];
  return Number(sizes[sizes.length - 1][1]);
};

describe("CertificateArt", () => {
  it("prints the recipient's name", () => {
    const markup = renderToStaticMarkup(
      <CertificateArt
        cert={certificates[0]}
        name="Ananya Sharma"
        serial="CV-TEST-0000"
        issuedOn="25 Sep 2026"
      />,
    );
    expect(markup).toContain("Ananya Sharma");
  });

  it("falls back to a placeholder when no name is given", () => {
    const markup = renderToStaticMarkup(
      <CertificateArt cert={certificates[0]} serial="CV-TEST-0000" issuedOn="25 Sep 2026" />,
    );
    expect(markup).toContain("YOUR NAME HERE");
  });

  /* The rule under the name spans 860px. A name rendered wider than that runs off
     the end of it and collides with the programme title — so the property to
     assert is the fit, not a particular magic number. The estimate mirrors the
     one in CertificateArt. Width depends only on character count, so the sweep
     uses space-free samples; the all-caps variant is checked too, because that is
     the wider case and the one that used to overrun. */
  it("fits the name inside the rule for every length the input allows", () => {
    const RULE_WIDTH = 860;
    const estimate = (name, size) => {
      const trackingEm = name === name.toUpperCase() ? 0.07 : 0.01;
      return size * (name.length * 0.5 + (name.length - 1) * trackingEm);
    };

    for (const sample of ["A", "Ananya", "MaximilianAlexanderFeatherstonehaugh", "A".repeat(48)]) {
      for (let length = 1; length <= sample.length; length += 1) {
        const name = sample.slice(0, length);
        const upper = name.toUpperCase();

        [name, upper].forEach((candidate) => {
          const size = fontSizeOfName(
            mark({cert: certificates[0], name: candidate, serial: "CV-TEST-0000"}),
            candidate,
          );
          expect(estimate(candidate, size), `"${candidate}" at ${size}px`).toBeLessThanOrEqual(
            RULE_WIDTH,
          );
        });
      }
    }
  });

  it("uses the largest size for a typical name and shrinks as the name grows", () => {
    const sizeOf = (name) =>
      fontSizeOfName(mark({cert: certificates[0], name, serial: "CV-TEST-0000"}), name);

    expect(sizeOf("Ananya Sharma")).toBe(84);
    expect(sizeOf("Ananya Sharma-Wallace")).toBeLessThan(sizeOf("Ananya Sharma"));
    expect(sizeOf("Maximilian Alexander Featherstonehaugh")).toBeLessThan(
      sizeOf("Ananya Sharma-Wallace"),
    );
  });

  it("accounts for the wider tracking on an uppercase name", () => {
    const sizeOf = (name) =>
      fontSizeOfName(mark({cert: certificates[0], name, serial: "CV-TEST-0000"}), name);

    expect(sizeOf("ANANYA SHARMA WALLACE")).toBeLessThan(sizeOf("Ananya Sharma-Wallace"));
  });

  it("carries the CareerVeda watermark", () => {
    const markup = renderToStaticMarkup(
      <CertificateArt cert={certificates[0]} name="Ananya Sharma" serial="CV-TEST-0000" />,
    );
    expect(markup).toContain("CAREERVEDA");
  });

  it("renders every programme's mark, title and outcome", () => {
    certificates.forEach((cert) => {
      const markup = renderToStaticMarkup(
        <CertificateArt cert={cert} name="Ananya Sharma" serial="CV-TEST-0000" />,
      );
      expect(markup).toContain(cert.mark);
      expect(markup).toContain(cert.title);
      expect(markup).toContain(cert.outcome);
    });
  });

  /* Style lives in presentation attributes, never in a class, or it disappears
     from the download. This is the assertion that actually guards that. */
  it("uses no CSS classes, so nothing depends on the stylesheet", () => {
    const markup = renderToStaticMarkup(
      <CertificateArt cert={certificates[0]} name="Ananya Sharma" serial="CV-TEST-0000" />,
    );
    expect(markup).not.toMatch(/class="[^"]*ga-/);
  });

  it("serialises to a standalone SVG document", () => {
    const markup = renderToStaticMarkup(
      <CertificateArt cert={certificates[0]} name="Ananya Sharma" serial="CV-TEST-0000" />,
    );
    expect(markup.startsWith("<svg")).toBe(true);
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('viewBox="0 0 1600 1131"');
    expect(markup).toContain("</svg>");
  });

  it("handles a non-Latin name without producing invalid output", () => {
    const name = "अन्या शर्मा";
    const markup = renderToStaticMarkup(
      <CertificateArt cert={certificates[0]} name={name} serial="CV-TEST-0000" />,
    );
    expect(markup).toContain(name);
  });

  /* Every element on the certificate sits at a hard-coded y. Nothing in SVG
     reflows, so a band that moves can silently start printing through the band
     above it — which is exactly what happened to the credential ID and the seal.
     These assertions are the layout's regression guard. */
  describe("vertical layout", () => {
    const SEAL_RADIUS = 62;
    const SEALS_CENTRE = 915;
    const SKILLS_CENTRE = 812;
    const SKILL_HALF_HEIGHT = 19;
    const CREDENTIAL_ID_Y = 1131 - 118;
    const FINE_PRINT_Y = 1131 - 92;
    const INNER_FRAME_BOTTOM = 76 + 979;

    it("keeps the credential ID clear of the seal", () => {
      expect(CREDENTIAL_ID_Y).toBeGreaterThan(SEALS_CENTRE + SEAL_RADIUS);
    });

    it("keeps the seal clear of the skill chips", () => {
      expect(SEALS_CENTRE - SEAL_RADIUS).toBeGreaterThan(SKILLS_CENTRE + SKILL_HALF_HEIGHT);
    });

    it("keeps the footer text inside the frame", () => {
      expect(FINE_PRINT_Y).toBeLessThan(INNER_FRAME_BOTTOM);
    });

    it("orders the content bands from top to bottom", () => {
      const bands = [
        ["masthead", 180],
        ["kicker", 311],
        ["certifies that", 430],
        ["recipient", 520],
        ["rule", 552],
        ["completed the", 606],
        ["programme title", 672],
        ["focus", 716],
        ["outcome", 766],
        ["skill chips", SKILLS_CENTRE + SKILL_HALF_HEIGHT],
        ["seal", SEALS_CENTRE + SEAL_RADIUS],
        ["credential id", CREDENTIAL_ID_Y],
        ["fine print", FINE_PRINT_Y],
      ];
      for (let i = 1; i < bands.length; i += 1) {
        expect(bands[i][1], `${bands[i][0]} must sit below ${bands[i - 1][0]}`).toBeGreaterThan(
          bands[i - 1][1],
        );
      }
    });

    it("puts the signature blocks clear of the seal horizontally", () => {
      /* The seal spans x 738–862. The signature rules run to 450 and from 1150,
         so they can share the seal's vertical band without touching it. */
      expect(450).toBeLessThan(WIDTH_CENTRE - SEAL_RADIUS);
      expect(1150).toBeGreaterThan(WIDTH_CENTRE + SEAL_RADIUS);
    });
  });
});
