"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIsFetching } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import { KalaricaLoader } from "@/components/loading/kalarica-loader";

type LoadingContextValue = {
  startLoading: (key?: string) => void;
  stopLoading: (key?: string) => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

function shouldTrackFetch(input: RequestInfo | URL): boolean {
  const raw =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (!raw) return false;
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return false;
  if (raw.includes("/_next/static") || raw.includes("/_next/image")) return false;
  if (/\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|otf)(\?|$)/i.test(raw)) return false;

  try {
    const url = new URL(raw, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [manualCount, setManualCount] = useState(0);
  const [navPending, setNavPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const queryFetching = useIsFetching();
  const manualKeys = useRef(new Set<string>());

  const busy = manualCount > 0 || navPending || queryFetching > 0;

  const startLoading = useCallback((key?: string) => {
    if (key) {
      if (manualKeys.current.has(key)) return;
      manualKeys.current.add(key);
    }
    setManualCount((count) => count + 1);
  }, []);

  const stopLoading = useCallback((key?: string) => {
    if (key) {
      if (!manualKeys.current.has(key)) return;
      manualKeys.current.delete(key);
    }
    setManualCount((count) => Math.max(0, count - 1));
  }, []);

  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      startLoading();
      try {
        return await fn();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading],
  );

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 80);
    return () => window.clearTimeout(timer);
  }, [busy]);

  useEffect(() => {
    setNavPending(false);
  }, [pathname]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname && url.search === window.location.search) return;

      setNavPending(true);
    }

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [pathname]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const track = shouldTrackFetch(args[0]);
      if (track) startLoading();
      try {
        return await originalFetch(...args);
      } finally {
        if (track) stopLoading();
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading, withLoading }}>
      {children}
      {visible ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/75 backdrop-blur-[2px]">
          <KalaricaLoader size="lg" />
        </div>
      ) : null}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
}

export function useOptionalLoading() {
  return useContext(LoadingContext);
}
