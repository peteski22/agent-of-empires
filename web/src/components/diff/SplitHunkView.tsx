import { Fragment } from "react";
import type { SyntaxToken } from "../../hooks/useHighlightedLines";
import type { RichDiffHunk, RichDiffLine } from "../../lib/types";
import { buildSplitRows } from "../../lib/splitDiff";

interface Props {
  hunk: RichDiffHunk;
  /** Tokens for this hunk, indexed by the line's index within `hunk.lines`. */
  lineTokens?: SyntaxToken[][];
}

function renderTokens(line: RichDiffLine, tokens?: SyntaxToken[]) {
  const content = line.content.replace(/\r?\n$/, "");
  if (tokens && tokens.length > 0) {
    const opacity = line.type === "equal" ? 1 : 0.7;
    return tokens.map((tok, i) => (
      <span key={i} style={tok.color ? { color: tok.color, opacity } : { opacity }}>
        {tok.content}
      </span>
    ));
  }
  return content || " ";
}

/** One side (column) of a split row. A null line renders an empty,
 *  subtly-tinted placeholder cell with no gutter number. */
function SplitCell({
  line,
  lineNum,
  tokens,
}: {
  line: RichDiffLine | null;
  lineNum: number | null;
  tokens?: SyntaxToken[];
}) {
  if (!line) {
    return <div className="flex flex-1 min-w-0 bg-surface-850/40" />;
  }
  let bgClass = "";
  let textClass = "text-text-secondary";
  let prefix = " ";
  if (line.type === "add") {
    bgClass = "bg-status-running/5";
    textClass = "text-status-running";
    prefix = "+";
  } else if (line.type === "delete") {
    bgClass = "bg-status-error/5";
    textClass = "text-status-error";
    prefix = "-";
  }
  return (
    <div className={`flex flex-1 min-w-0 ${bgClass}`}>
      <span className="shrink-0 w-[50px] text-right pr-2 font-mono text-[11px] text-text-dim select-none border-r border-surface-700/30">
        {lineNum ?? ""}
      </span>
      <span className={`shrink-0 w-4 text-center font-mono text-[12px] ${textClass} select-none`}>
        {prefix}
      </span>
      <span className="flex-1 min-w-0 font-mono text-[12px] whitespace-pre overflow-hidden">
        {renderTokens(line, tokens)}
      </span>
    </div>
  );
}

export function SplitHunkView({ hunk, lineTokens }: Props) {
  const rows = buildSplitRows(hunk);
  return (
    <div>
      <div className="flex bg-surface-850 border-y border-surface-700/20 sticky top-0 z-[1]">
        <span className="flex-1 font-mono text-[11px] text-accent-600 py-0.5 px-1">
          @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
        </span>
      </div>
      {rows.map((row, i) => (
        <Fragment key={i}>
          <div className="flex">
            <SplitCell
              line={row.left}
              lineNum={row.left?.old_line_num ?? null}
              tokens={row.leftIndex != null ? lineTokens?.[row.leftIndex] : undefined}
            />
            <div className="w-px bg-surface-700/40 shrink-0" />
            <SplitCell
              line={row.right}
              lineNum={row.right?.new_line_num ?? null}
              tokens={row.rightIndex != null ? lineTokens?.[row.rightIndex] : undefined}
            />
          </div>
        </Fragment>
      ))}
    </div>
  );
}
