import type { QuickAddOption } from "@/lib/quick-add";

/**
 * The product icon shown on Quick Add's category chips — shared by the
 * full-page flow (`routes/_authenticated/quick-add.tsx`) and the bottom
 * sheet (`components/ciatta/quick-add-sheet.tsx`), which used to each carry
 * their own copy of the same paths at two different fixed sizes.
 */
export function ProductGlyph({ icon, size = 44 }: { icon: QuickAddOption["icon"]; size?: number }) {
  const s = { stroke: "var(--muted-foreground)", strokeWidth: 1.3, fill: "none" } as const;
  switch (icon) {
    case "tampon":
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
          <rect x="13" y="8" width="18" height="20" rx="9" {...s} />
          <path d="M22 28v9" {...s} strokeLinecap="round" />
        </svg>
      );
    case "pad":
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
          <rect x="10" y="12" width="24" height="20" rx="10" {...s} />
          <path d="M10 18H5m29 0h5M10 26H5m29 0h5" {...s} strokeLinecap="round" />
        </svg>
      );
    case "cup":
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
          <path d="M13 12h18l-2.5 15a6.5 6.5 0 0 1-13 0L13 12Z" {...s} strokeLinejoin="round" />
          <path d="M22 33v5" {...s} strokeLinecap="round" />
        </svg>
      );
    case "disc":
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
          <ellipse cx="22" cy="22" rx="14" ry="7" {...s} />
          <ellipse cx="22" cy="22" rx="8" ry="3.5" {...s} />
        </svg>
      );
    case "underwear":
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
          <path
            d="M8 14h28l-2 8c-4 1-7 4-8 10h-8c-1-6-4-9-8-10l-2-8Z"
            {...s}
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="12" {...s} />
          <path d="M13.5 13.5 30.5 30.5" {...s} strokeLinecap="round" />
        </svg>
      );
  }
}
