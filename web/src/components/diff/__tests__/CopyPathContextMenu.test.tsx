// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CopyPathContextMenu } from "../CopyPathContextMenu";

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

// The dismiss listeners attach on the next animation frame (so the opening
// right-click doesn't immediately re-trigger them); wait one frame before
// dispatching events that should close the menu.
async function flushFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}

function openMenu(onClose: () => void) {
  return render(
    <CopyPathContextMenu menu={{ x: 12, y: 34, path: "src/app/foo.rs" }} onClose={onClose} />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyPathContextMenu", () => {
  it("renders nothing when there is no open menu", () => {
    const { container } = render(
      <CopyPathContextMenu menu={null} onClose={() => {}} />,
    );
    expect(container.querySelector("button")).toBeNull();
    expect(screen.queryByText("Copy relative path")).toBeNull();
  });

  it("copies the path to the clipboard and closes on click", () => {
    const writeText = stubClipboard();
    const onClose = vi.fn();
    openMenu(onClose);

    fireEvent.click(screen.getByText("Copy relative path"));

    expect(writeText).toHaveBeenCalledWith("src/app/foo.rs");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on an outside click once the listeners attach", async () => {
    const onClose = vi.fn();
    openMenu(onClose);
    await flushFrame();

    fireEvent.click(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    openMenu(onClose);
    await flushFrame();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on another right-click", async () => {
    const onClose = vi.fn();
    openMenu(onClose);
    await flushFrame();

    fireEvent.contextMenu(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not double-close when the click lands inside the menu", async () => {
    const writeText = stubClipboard();
    const onClose = vi.fn();
    openMenu(onClose);
    await flushFrame();

    // The document listener must skip clicks inside the menu (menuRef guard);
    // the item's own onClick performs the copy + the single close.
    fireEvent.click(screen.getByText("Copy relative path"));
    expect(writeText).toHaveBeenCalledWith("src/app/foo.rs");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
