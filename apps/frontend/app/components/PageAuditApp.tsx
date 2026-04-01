"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { APP_CSS } from "@/app/design-system/theme";
import { LandingPage } from "@/app/components/LandingPage";
import { NavBar } from "@/app/components/NavBar";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PageAuditApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusUrlInputRef = useRef<(() => void) | null>(null);

  function goHome() {
    router.push("/");
  }

  function handleTryFree() {
    // If already on home, just focus the field.
    if (pathname === "/") {
      focusUrlInputRef.current?.();
      return;
    }
    // Otherwise navigate home with a hint so the landing page can focus on mount.
    router.push("/?focus=url");
  }

  // When landing page mounts on /?focus=url, focus the input once.
  useEffect(() => {
    if (pathname !== "/") return;
    if (searchParams.get("focus") === "url") {
      focusUrlInputRef.current?.();
    }
  }, [pathname, searchParams]);

  return (
    <>
      <style>{APP_CSS}</style>
      <NavBar onHome={goHome} onTryFree={handleTryFree} />

      <AnimatePresence mode="wait">
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <LandingPage
            onRegisterUrlFocus={(fn) => {
              focusUrlInputRef.current = fn;
            }}
          />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
