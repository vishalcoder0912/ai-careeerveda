// One constant because two screens show the mark        the sidebar and the sign-in
// card. A logo swap that updates only one of them is the failure mode this
// exists to prevent.
//
// `tr=w-96` asks ImageKit for a 96px-wide copy on the way out. The mark renders
// at 38px, so without it every page load pulls the full-size brand JPG for a
// slot the size of a favicon.
export const BRAND_LOGO =
  "https://ik.imagekit.io/q7ucn1rfni/careerveda/brand/logo.png?updatedAt=1786622628327";
