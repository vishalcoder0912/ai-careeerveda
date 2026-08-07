// Where a ScrollStack card pins, and how far down the screen it is held once it does.
//
// Kept out of ScrollStack.jsx so that file exports only components: a module that
// mixes components with plain functions is not a Fast Refresh boundary, so editing
// it full-reloads the page instead of swapping the component in place.
//
// A card that fits the screen is held with its top at the stack line, `stackPosition`
// down from the top of the viewport, each card `itemStackDistance` lower than the one
// before so the deck reads as a deck.
//
// A card TALLER than the screen cannot be held that way: its last row would sit below
// the fold for as long as it is pinned, and the next card would then cover it — which
// is what put the press cards' "Featured in" links out of reach on a phone, where those
// cards run two to three screens tall. Such a card keeps scrolling for its overflow and
// then pins with its BOTTOM at the bottom of the screen, so all of it has been read
// before the next card arrives.
export const computeCardPin = ({
  cardTop,
  cardHeight,
  index,
  containerHeight,
  stackPositionPx,
  itemStackDistance
}) => {
  const stackLine = stackPositionPx + itemStackDistance * index;
  const overflow = Math.max(0, cardHeight + stackLine - containerHeight);
  const stackOffset = stackLine - overflow;

  return { stackOffset, overflow, pinStart: cardTop - stackOffset };
};
