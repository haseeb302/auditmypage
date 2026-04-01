"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { SEVERITY_CONFIG, scoreColor } from "../design-system/theme";
import type { AuditDimension } from "@/app/types";

type FindingGroupProps = {
  dim: AuditDimension;
  index: number;
};

export function FindingGroup({ dim, index }: FindingGroupProps) {
  const [open, setOpen] = useState(index === 0);
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });

  return (
    <motion.div
      ref={ref}
      className="finding-group"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.06,
      }}
    >
      <div className="finding-group-header" onClick={() => setOpen((o) => !o)}>
        <div className="finding-group-left">
          <div className="fgh-name">{dim.label}</div>
          <span className="fgh-count">
            {dim.findings.length} finding{dim.findings.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="finding-group-right">
          <span className="fgh-score" style={{ color: scoreColor(dim.score) }}>
            {dim.score}
          </span>
          <svg
            className={`fgh-chevron${open ? " open" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="finding-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            {dim.findings.map((finding, findingIndex) => {
              const sev = SEVERITY_CONFIG[finding.severity];

              return (
                <div key={findingIndex} className="finding-item">
                  <div
                    className="finding-sev"
                    style={{
                      color: sev.color,
                      background: sev.bg,
                      borderColor: sev.border,
                    }}
                  >
                    <div
                      className="finding-sev-dot"
                      style={{ background: sev.color }}
                    />
                    {sev.label}
                  </div>
                  <div className="finding-issue">{finding.issue}</div>
                  <div className="finding-fix-wrap">
                    <div className="finding-fix-label">Suggested fix</div>
                    <div className="finding-fix">{finding.fix}</div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
