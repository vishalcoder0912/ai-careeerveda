import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import Carousel from "./Carousel";

afterEach(cleanup);

const items = [
  {id: "a", title: "Alpha", description: "First"},
  {id: "b", title: "Beta"},
  "/c.jpg",
];

describe("Carousel", () => {
  it("renders every slide with its content", () => {
    const {container} = render(<Carousel items={items} />);
    expect(container.querySelectorAll(".carousel-slide")).toHaveLength(3);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("First")).toBeTruthy();
    expect(container.querySelector("img.carousel-image").getAttribute("src")).toBe("/c.jpg");
  });

  it("moves between slides from the dots and the arrows", async () => {
    render(<Carousel items={items} arrows />);
    const dots = screen.getAllByRole("button", {name: /Go to slide/});
    expect(dots[0].getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("button", {name: "Previous slide"}).disabled).toBe(true);

    await act(async () => fireEvent.click(dots[2]));
    expect(dots[2].getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("button", {name: "Next slide"}).disabled).toBe(true);

    await act(async () => fireEvent.click(screen.getByRole("button", {name: "Previous slide"})));
    expect(dots[1].getAttribute("aria-current")).toBe("true");
  });

  it("shows a counter and bars when asked, and no controls for one slide", () => {
    const {container, rerender} = render(<Carousel items={items} indicator="counter" />);
    expect(container.querySelector(".carousel-counter").textContent).toBe("01/03");

    rerender(<Carousel items={items} indicator="bars" />);
    expect(container.querySelectorAll(".carousel-bar-fill")).toHaveLength(3);

    rerender(<Carousel items={[items[0]]} arrows />);
    expect(container.querySelector(".carousel-controls")).toBeNull();
  });

  it("tells the parent once per slide change, never on mount", async () => {
    const onChange = vi.fn();
    render(<Carousel items={items} arrows onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => fireEvent.click(screen.getByRole("button", {name: "Next slide"})));
    expect(onChange.mock.calls).toEqual([[1]]);

    await act(async () => fireEvent.click(screen.getAllByRole("button", {name: /Go to slide/})[0]));
    expect(onChange.mock.calls).toEqual([[1], [0]]);
  });
});
