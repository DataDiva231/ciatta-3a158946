import { useSyncExternalStore } from "react";

/**
 * Whether the device currently has a network connection. The native shell
 * loads its UI from a remote URL on every launch — nothing bundled, no
 * offline cache — so once the app is running, this is the only signal it
 * has that a subsequent action (syncing, signing in, transcribing) is about
 * to fail for a reason that has nothing to do with the app itself.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
