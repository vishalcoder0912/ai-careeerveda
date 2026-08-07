import {describe, expect, it} from "vitest";
import {computeCardPin} from "./scrollStackPin";

// Once pinned, a card's top sits `stackOffset` px below the top of the viewport
// (see updateCardTransforms: translateY holds cardTop + translateY - scrollTop
// at exactly stackOffset). This is the same arithmetic, so a test can ask where
// the card's edges land on screen.
const pinnedTop = (pin) => pin.stackOffset;
const pinnedBottom = (pin, cardHeight) => pin.stackOffset + cardHeight;

const VIEWPORT = 800;
const STACK_LINE = 144; // 18% of 800, the press section's stackPosition
const ITEM_STACK_DISTANCE = 30;

const pin = (cardHeight, index = 0, cardTop = 2000) =>
  computeCardPin({
    cardTop,
    cardHeight,
    index,
    containerHeight: VIEWPORT,
    stackPositionPx: STACK_LINE,
    itemStackDistance: ITEM_STACK_DISTANCE,
  });

describe("computeCardPin", () => {
  it("holds a card that fits at the stack line, offset per its position in the deck", () => {
    expect(pin(400, 0).overflow).toBe(0);
    expect(pinnedTop(pin(400, 0))).toBe(STACK_LINE);
    expect(pinnedTop(pin(400, 2))).toBe(STACK_LINE + 2 * ITEM_STACK_DISTANCE);
  });

  it("pins a card taller than the screen by its bottom, so its last row is visible", () => {
    // 1300px of card in an 800px viewport — a press card on a phone.
    const tall = pin(1300);

    expect(tall.overflow).toBeGreaterThan(0);
    expect(pinnedBottom(tall, 1300)).toBe(VIEWPORT);
    // Which means the top is pushed off the top of the screen, not held at 144.
    expect(pinnedTop(tall)).toBeLessThan(0);
  });

  it("delays a tall card's pin by exactly its overflow, so nothing jumps", () => {
    // At the moment of pinning, translateY is 0 — the card is still where the
    // document put it. That only holds if pinStart moves with stackOffset.
    const tall = pin(1300, 0, 2000);
    const atPin = tall.pinStart - 2000 + tall.stackOffset;

    expect(atPin).toBe(0);
    // ...and it pins later than a short card in the same slot would.
    expect(tall.pinStart).toBeGreaterThan(pin(400, 0, 2000).pinStart);
  });

  it("pins the moment the whole card has been seen, whatever its height", () => {
    // The invariant that matters at every height: at the pin, the card's bottom
    // edge is on screen. A card that fits pins early (its bottom is on screen
    // from the start); a tall one pins exactly when its bottom arrives.
    for (const height of [200, 800, 1300, 4000]) {
      const p = pin(height, 0, 2000);

      expect(pinnedBottom(p, height)).toBeLessThanOrEqual(VIEWPORT);
      // Never held above the stack line — that is the deck's look, and only a
      // card too tall for the screen is allowed to break it.
      expect(pinnedTop(p)).toBeLessThanOrEqual(STACK_LINE);
    }
  });
});
