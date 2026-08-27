// The single grid measurement for the whole site background.
//
// This number is the contract between the layers that share one visual field:
// the site's one CursorGrid canvas (components/background/CareerVedaBackground)
// draws its lattice at this spacing, and --grid-size in navbar-hero-merge.css
// documents the same value for CSS-side consumers. Change it here and nowhere
// else.
export const GRID_SIZE = 90;
