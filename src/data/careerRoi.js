import {getSalaryMarket} from "./salaryMarket";

// The four tracks the calculator covers. `id` is the program slug, which is
// also the key into salaryMarket.js and the /programs/:id URL.
//
// hikeLow/hikeHigh are the advertised salary-hike range for each track, in
// percent. Edit them here when the placement numbers change.
export const ROI_TRACKS = [
  {id: "product-management", label: "Product Management", hikeLow: 70, hikeHigh: 120},
  {id: "gen-ai-agentic-ai", label: "Gen AI & Agentic AI", hikeLow: 80, hikeHigh: 140},
  {id: "business-analytics", label: "Business Analytics with Gen AI", hikeLow: 45, hikeHigh: 65},
  {id: "data-analytics", label: "Data Analytics with Gen AI", hikeLow: 60, hikeHigh: 90},
];

// Projected CTC range in LPA. The hike is capped at the top of the track's
// market band (salaryMarket.js), so a senior salary is never projected past
// what the role actually pays — and never projected below what they earn now.
export const projectCtc = (ctc, track) => {
  const market = getSalaryMarket(track.id);
  const marketTop = Math.max(...market.bands.map((band) => band.high));
  const ceiling = Math.max(ctc, marketTop);
  const low = Math.min(ctc * (1 + track.hikeLow / 100), ceiling);
  const high = Math.min(ctc * (1 + track.hikeHigh / 100), ceiling);
  return {low, high, marketTop, capped: high === ceiling && ceiling > ctc, role: market.role};
};
