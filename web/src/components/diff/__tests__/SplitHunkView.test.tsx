// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplitHunkView } from "../SplitHunkView";
import type { RichDiffHunk } from "../../../lib/types";
import type { AnchoredComment } from "../comments/types";

// A modify row: delete at line index 0 (old side), add at index 1 (new side).
// buildSplitRows pairs them into one row with leftIndex=0, rightIndex=1.
const modifyHunk: RichDiffHunk = {
  old_start: 1,
  old_lines: 1,
  new_start: 1,
  new_lines: 1,
  lines: [
    { type: "delete", old_line_num: 1, new_line_num: null, content: "old line\n" },
    { type: "add", old_line_num: null, new_line_num: 1, content: "new line\n" },
  ],
};

function oldSideCard(body: string): AnchoredComment {
  return {
    status: "active",
    comment: {
      id: "c1",
      filePath: "a.ts",
      side: "old",
      startLine: 1,
      endLine: 1,
      body,
      capturedSnippet: "old line",
      createdAt: "2025-01-01T00:00:00Z",
    },
  } as AnchoredComment;
}

const noop = () => {};

describe("SplitHunkView comment anchoring", () => {
  it("renders an old-side card on a modify row (anchored to the left index)", () => {
    // The card is anchored to the old line's index (0). The previous code only
    // consulted the right index, so old-side cards on modify rows were dropped.
    const cards = new Map<number, AnchoredComment[]>([
      [0, [oldSideCard("OLD SIDE NOTE")]],
    ]);
    render(
      <SplitHunkView
        hunk={modifyHunk}
        hunkIndex={0}
        commentsEnabled
        cardsByEndRow={cards}
        formRowIndex={null}
        draftSide={null}
        draftStartLine={null}
        draftEndLine={null}
        rangeStart={null}
        onPlusClick={noop}
        onCommentSave={noop}
        onCommentDelete={noop}
        onDraftSave={vi.fn()}
        onDraftCancel={noop}
      />,
    );
    expect(screen.getByText("OLD SIDE NOTE")).toBeTruthy();
  });
});
