"use client";

import { AnimatePresence, motion } from "framer-motion";
import { APP_CSS } from "./design-system/theme";
import { LandingPage } from "./components/LandingPage";
import { NavBar } from "./components/NavBar";
import { useRouter } from "next/navigation";

export function PageAuditApp() {
  const router = useRouter();

  function goHome() {
    router.push("/");
  }

  return (
    <>
      <style>{APP_CSS}</style>
      <NavBar onHome={goHome} />

      <AnimatePresence mode="wait">
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <LandingPage />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
