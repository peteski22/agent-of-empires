// @vitest-environment jsdom
//
// Covers the unified/split toggle in DiffFileViewer and its localStorage
// persistence via useWebSettings. The ResizeObserver is stubbed to report
// a wide viewport so the split branch actually activates on toggle.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiffFileViewer } from "../DiffFileViewer";
import type { RichFileDiffResponse } from "../../../lib/types";

const diff: RichFileDiffResponse = {
  file: {
    path: "a.ts",
    old_path: null,
    status: "modified",
    additions: 1,
    deletions: 1,
  },
  hunks: [
    {
      old_start: 1,
      old_lines: 2,
      new_start: 1,
      new_lines: 2,
      lines: [
        { type: "equal", old_line_num: 1, new_line_num: 1, content: "ctx\n" },
        { type: "delete", old_line_num: 2, new_line_num: null, content: "old\n" },
        { type: "add", old_line_num: null, new_line_num: 2, content: "new\n" },
      ],
    },
  ],
  is_binary: false,
  truncated: false,
};

vi.mock("../../../hooks/useFileDiff", () => ({
  useFileDiff: () => ({ diff, loading: false, error: null, refresh: vi.fn() }),
}));

vi.mock("../../../hooks/useHighlightedLines", () => ({
  useHighlightedLines: () => ({ tokens: null }),
}));

beforeEach(() => {
  window.localStorage.clear();
  // Stub ResizeObserver to immediately report a wide viewport so the split
  // path is available when the toggle is activated.
  class WideRO {
    cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe() {
      this.cb(
        [{ contentRect: { width: 1000 } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", WideRO);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("DiffFileViewer split layout", () => {
  it("defaults to unified (Split toggle not pressed)", async () => {
    render(<DiffFileViewer sessionId="s1" filePath="a.ts" />);
    await screen.findByText(/Modified/i);
    expect(
      screen.getByRole("button", { name: "Split" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("switches to split and persists the preference", async () => {
    render(<DiffFileViewer sessionId="s1" filePath="a.ts" />);
    await screen.findByText(/Modified/i);

    fireEvent.click(screen.getByRole("button", { name: "Split" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Split" }).getAttribute("aria-pressed"),
      ).toBe("true");
    });

    expect(
      JSON.parse(window.localStorage.getItem("aoe-web-settings") ?? "{}").diffViewLayout,
    ).toBe("split");
  });
});
