import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface PathMenuState {
  x: number;
  y: number;
  /** Repo-relative path of the right-clicked file or folder. */
  path: string;
}

interface Props {
  menu: PathMenuState | null;
  onClose: () => void;
}

/// A minimal right-click menu for the diff file list offering "Copy relative
/// path". Rendered in a portal at the click position and dismissed on any
/// outside click, another right-click, or Escape.
export function CopyPathContextMenu({ menu, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    const onDocClick = (e: MouseEvent) => {
      // Clicks inside the menu are handled by the item's onClick.
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // Defer so the contextmenu event that opened this menu finishes bubbling
    // first; otherwise React flushes this effect synchronously for the discrete
    // event and the same right-click immediately hits the document listener,
    // closing the menu before it ever paints.
    const raf = requestAnimationFrame(() => {
      document.addEventListener("click", onDocClick);
      document.addEventListener("contextmenu", close);
      document.addEventListener("keydown", onKey);
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const copy = () => {
    navigator.clipboard?.writeText(menu.path).catch(() => {});
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[160px] rounded-md border border-surface-700 bg-surface-850 py-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={copy}
        className="w-full px-3 py-1.5 text-left text-[13px] text-text-secondary hover:bg-surface-800 cursor-pointer"
      >
        Copy relative path
      </button>
    </div>,
    document.body,
  );
}
