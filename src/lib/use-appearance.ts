import { useEffect } from "react";

import { useSettings } from "@/lib/profile-store";

/** Applies the stored appearance choice to the document. */
export function useAppearance() {
  const { settings, save, hydrated } = useSettings();
  const choice = settings.appearance;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = choice === "dark" || (choice === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [choice]);

  return {
    choice,
    setChoice: (v: "light" | "dark" | "system") => save({ appearance: v }),
    hydrated,
  };
}
