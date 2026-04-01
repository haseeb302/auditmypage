import type { Variants } from "framer-motion";
import type { Severity } from "@/app/types";

export const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: {
    label: "Critical",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  warning: {
    label: "Warning",
    color: "#92400e",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  suggestion: {
    label: "Tip",
    color: "#166534",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
};

export const scoreColor = (s: number) =>
  s >= 80 ? "#166534" : s >= 60 ? "#92400e" : "#b91c1c";

export const scoreBg = (s: number) =>
  s >= 80 ? "#f0fdf4" : s >= 60 ? "#fffbeb" : "#fef2f2";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.09 },
  }),
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const APP_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  :root {
    --cream:   #faf9f7;
    --cream-2: #f3f1ec;
    --cream-3: #e8e4dc;
    --forest:  #1a2e1e;
    --forest-2:#2d4a32;
    --forest-3:#3d6142;
    --ink:     #141412;
    --ink-2:   #4a4843;
    --ink-3:   #8a8780;
    --ink-4:   #c4c1b8;
    --border:  #e4e0d8;
    --border-2:#d4d0c8;
    --serif:   'Instrument Serif', Georgia, serif;
    --sans:    'DM Sans', system-ui, sans-serif;
    --r-sm:    8px;
    --r-md:    12px;
    --r-lg:    18px;
    --r-xl:    24px;
  }

  body {
    font-family: var(--sans);
    background: var(--cream);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  ::selection { background: rgba(26,46,30,0.12); }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: var(--cream-2); }
  ::-webkit-scrollbar-thumb { background: var(--cream-3); border-radius: 4px; }

  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 62px; display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(20px, 5vw, 64px); background: rgba(250,249,247,0.88); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
  .nav-logo { display: flex; align-items: center; gap: 9px; font-family: var(--serif); font-size: 19px; color: var(--ink); cursor: pointer; text-decoration: none; }
  .nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--forest); flex-shrink: 0; }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-btn { font-family: var(--sans); font-size: 13.5px; font-weight: 400; color: var(--ink-2); background: none; border: none; cursor: pointer; padding: 7px 14px; border-radius: var(--r-sm); transition: background 0.15s, color 0.15s; }
  .nav-btn:hover { background: var(--cream-2); color: var(--ink); }
  .nav-cta { font-family: var(--sans); font-size: 13.5px; font-weight: 500; color: var(--cream); background: var(--forest); border: none; cursor: pointer; padding: 8px 18px; border-radius: var(--r-sm); transition: background 0.15s, transform 0.15s; }
  .nav-cta:hover { background: var(--forest-2); transform: translateY(-1px); }

  .hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 120px clamp(20px, 5vw, 64px) 80px; position: relative; overflow: hidden; }
  .hero-badge { display: inline-flex; align-items: center; gap: 7px; background: var(--cream-2); border: 1px solid var(--border-2); border-radius: 20px; padding: 5px 14px; margin-bottom: 32px; font-size: 12px; font-weight: 500; color: var(--forest); letter-spacing: 0.03em; }
  .hero-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--forest); animation: breathe 2.4s ease-in-out infinite; }
  @keyframes breathe { 0%,100%{opacity:1} 50%{opacity:0.35} }
  .hero-h1 { font-family: var(--serif); font-size: clamp(40px, 7vw, 82px); font-weight: 400; line-height: 1.08; letter-spacing: -0.02em; color: var(--ink); max-width: 780px; margin-bottom: 22px; }
  .hero-h1 em { font-style: italic; color: var(--forest); }
  .hero-sub { font-size: clamp(15px, 2vw, 17.5px); font-weight: 300; color: var(--ink-2); max-width: 500px; line-height: 1.72; margin-bottom: 44px; }

  .url-form { display: flex; gap: 0; width: 100%; max-width: 560px; background: #fff; border: 1.5px solid var(--border-2); border-radius: var(--r-xl); overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; box-shadow: 0 2px 12px rgba(26,46,30,0.06); }
  .url-form:focus-within { border-color: var(--forest); box-shadow: 0 2px 20px rgba(26,46,30,0.12); }
  .url-input { flex: 1; font-family: var(--sans); font-size: 14.5px; font-weight: 400; color: var(--ink); background: transparent; border: none; outline: none; padding: 15px 20px; min-width: 0; }
  .url-input::placeholder { color: var(--ink-4); }
  .url-submit { font-family: var(--sans); font-size: 14px; font-weight: 500; color: var(--cream); background: var(--forest); border: none; cursor: pointer; padding: 12px 22px; margin: 5px; border-radius: var(--r-lg); transition: background 0.15s; white-space: nowrap; flex-shrink: 0; }
  .url-submit:hover { background: var(--forest-2); }
  .url-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  .url-note { font-size: 12.5px; color: var(--ink-3); margin-top: 14px; }

  .loading-bar-wrap { width: 100%; max-width: 560px; margin-top: 28px; }
  .loading-steps { display: flex; flex-direction: column; gap: 8px; }
  .loading-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink-3); }
  .loading-step.done { color: var(--forest); }
  .loading-step.active { color: var(--ink); }
  .step-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cream-3); flex-shrink: 0; transition: background 0.3s; }
  .loading-step.done .step-dot { background: var(--forest); }
  .loading-step.active .step-dot { background: var(--forest-2); animation: breathe 1s ease-in-out infinite; }

  .proof-row { display: flex; gap: 32px; align-items: center; flex-wrap: wrap; justify-content: center; margin-top: 56px; padding-top: 44px; border-top: 1px solid var(--border); width: 100%; max-width: 640px; }
  .proof-stat { text-align: center; }
  .proof-num { font-family: var(--serif); font-size: 28px; color: var(--ink); letter-spacing: -0.02em; }
  .proof-label { font-size: 12px; color: var(--ink-3); margin-top: 2px; }

  .features { padding: 100px clamp(20px, 5vw, 64px); max-width: 1100px; margin: 0 auto; }
  .features-eyebrow { font-size: 11.5px; font-weight: 500; color: var(--forest); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 14px; display: block; }
  .features-h2 { font-family: var(--serif); font-size: clamp(28px, 4vw, 46px); font-weight: 400; line-height: 1.18; letter-spacing: -0.02em; color: var(--ink); max-width: 480px; margin-bottom: 56px; }
  .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }
  .feature-card { background: var(--cream); padding: 28px 30px; transition: background 0.2s; }
  .feature-card:hover { background: var(--cream-2); }
  .feature-icon { width: 36px; height: 36px; border-radius: var(--r-sm); background: var(--cream-2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 16px; }
  .feature-name { font-size: 14.5px; font-weight: 500; color: var(--ink); margin-bottom: 7px; }
  .feature-desc { font-size: 13.5px; font-weight: 300; color: var(--ink-2); line-height: 1.65; }

  .audit-wrap { max-width: 860px; margin: 0 auto; padding: 100px clamp(20px, 5vw, 48px) 80px; }
  .audit-header { margin-bottom: 48px; }
  .audit-url-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .audit-url-badge { display: flex; align-items: center; gap: 7px; background: var(--cream-2); border: 1px solid var(--border); border-radius: 20px; padding: 5px 14px; font-size: 12.5px; color: var(--ink-2); }
  .audit-url-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--forest); }
  .audit-h1 { font-family: var(--serif); font-size: clamp(28px, 4vw, 42px); font-weight: 400; letter-spacing: -0.02em; line-height: 1.15; color: var(--ink); margin-bottom: 10px; }
  .audit-sub { font-size: 14.5px; color: var(--ink-2); font-weight: 300; }

  .score-hero { background: #fff; border: 1px solid var(--border); border-radius: var(--r-xl); padding: 36px 40px; margin-bottom: 28px; display: flex; align-items: center; gap: 40px; flex-wrap: wrap; }
  .score-circle-wrap { position: relative; flex-shrink: 0; }
  .score-circle-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .score-big { font-family: var(--serif); font-size: 42px; font-weight: 400; line-height: 1; letter-spacing: -0.02em; }
  .score-label { font-size: 11px; color: var(--ink-3); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em; }
  .score-hero-right { flex: 1; min-width: 200px; }
  .score-verdict { font-size: 17px; font-weight: 500; color: var(--ink); margin-bottom: 8px; line-height: 1.35; }
  .score-context { font-size: 14px; color: var(--ink-2); line-height: 1.65; font-weight: 300; }

  .dim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 40px; }
  .dim-card { background: #fff; border: 1px solid var(--border); border-radius: var(--r-md); padding: 18px 20px; transition: border-color 0.15s, transform 0.15s; cursor: default; }
  .dim-card:hover { border-color: var(--border-2); transform: translateY(-2px); }
  .dim-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .dim-name { font-size: 13px; font-weight: 500; color: var(--ink-2); }
  .dim-score-pill { font-size: 12px; font-weight: 500; padding: 2px 9px; border-radius: 20px; }
  .dim-bar-wrap { height: 4px; background: var(--cream-2); border-radius: 2px; overflow: hidden; }
  .dim-bar { height: 100%; border-radius: 2px; transition: width 1s ease; }

  .findings-section { display: flex; flex-direction: column; gap: 24px; }
  .finding-group { background: #fff; border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }
  .finding-group-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; cursor: pointer; user-select: none; transition: background 0.15s; }
  .finding-group-header:hover { background: var(--cream); }
  .finding-group-left { display: flex; align-items: center; gap: 12px; }
  .fgh-name { font-size: 15px; font-weight: 500; color: var(--ink); }
  .fgh-count { font-size: 11.5px; color: var(--ink-3); background: var(--cream-2); border: 1px solid var(--border); padding: 2px 9px; border-radius: 20px; }
  .finding-group-right { display: flex; align-items: center; gap: 12px; }
  .fgh-score { font-family: var(--serif); font-size: 20px; font-weight: 400; letter-spacing: -0.01em; }
  .fgh-chevron { width: 18px; height: 18px; color: var(--ink-3); transition: transform 0.25s; flex-shrink: 0; }
  .fgh-chevron.open { transform: rotate(180deg); }
  .finding-list { border-top: 1px solid var(--border); }
  .finding-item { padding: 18px 24px; border-bottom: 1px solid var(--border); }
  .finding-item:last-child { border-bottom: none; }
  .finding-sev { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; margin-bottom: 10px; border: 1px solid; }
  .finding-sev-dot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; }
  .finding-issue { font-size: 14px; color: var(--ink); line-height: 1.6; margin-bottom: 10px; }
  .finding-fix-wrap { background: var(--cream); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 12px 14px; border-left: 3px solid var(--forest); }
  .finding-fix-label { font-size: 10.5px; font-weight: 600; color: var(--forest); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 5px; }
  .finding-fix { font-size: 13.5px; color: var(--ink-2); line-height: 1.65; }

  .share-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #fff; border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px 22px; margin-bottom: 36px; }
  .share-text { font-size: 13.5px; color: var(--ink-2); flex: 1; min-width: 200px; }
  .share-btn { font-family: var(--sans); font-size: 13px; font-weight: 500; cursor: pointer; padding: 8px 16px; border-radius: var(--r-sm); transition: all 0.15s; }
  .share-btn-primary { background: var(--forest); color: var(--cream); border: none; }
  .share-btn-primary:hover { background: var(--forest-2); }
  .share-btn-ghost { background: none; color: var(--ink-2); border: 1px solid var(--border); }
  .share-btn-ghost:hover { background: var(--cream-2); }

  footer { border-top: 1px solid var(--border); padding: 28px clamp(20px, 5vw, 64px); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
  .footer-logo { font-family: var(--serif); font-size: 16px; color: var(--ink-2); }
  .footer-copy { font-size: 12px; color: var(--ink-4); }

  @media (max-width: 640px) {
    .score-hero { padding: 24px 20px; gap: 24px; flex-direction: column; }
    .nav-right .nav-btn { display: none; }
    .proof-row { gap: 20px; }
  }
`;
