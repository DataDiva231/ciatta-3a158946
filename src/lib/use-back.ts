import { useRouter } from "@tanstack/react-router";

/**
 * Back navigation that always lands on the exact previous in-app screen.
 * When there is no in-app history (deep link / fresh load) it falls back to
 * `fallback` instead of leaving the app.
 */
export function useBack(fallback: string) {
  const router = useRouter();

  const canGoBack = router.history.canGoBack();

  const goBack = () => {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    router.navigate({ to: fallback });
  };

  return { canGoBack, goBack };
}
