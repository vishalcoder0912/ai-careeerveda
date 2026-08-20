import {BRAND_ICON_URL} from "../config/brand";

// The lockup renders in the navbar, the mobile menu and the footer. It lives in
// one component because brand.js already warns what happens otherwise: a mark
// updated in two of the three places is how these drift apart.
//
// No <span> anywhere — see the comment at the top of brand-wordmark.css.
export default function BrandLockup() {
  return (
    <>
      {/* alt is empty on purpose: the wordmark and tagline beside it are real
          text, so naming the icon too would repeat it. */}
      {BRAND_ICON_URL && <img className="brand-icon" src={BRAND_ICON_URL} alt="" width={44} height={45} decoding="async" />}
      <div className="brand-lockup">
        <div className="brand-name">
          <b className="cv-career">Career</b><b className="cv-veda">Veda</b>
        </div>
        <div className="brand-tagline">Learn. Analyze. Lead.</div>
      </div>
    </>
  );
}
