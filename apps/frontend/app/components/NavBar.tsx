"use client";

type NavBarProps = {
  onHome: () => void;
  onTryFree: () => void;
};

export function NavBar({ onHome, onTryFree }: NavBarProps) {
  return (
    <nav className="nav">
      <a className="nav-logo" onClick={onHome} style={{ cursor: "pointer" }}>
        <div className="nav-logo-dot" />
        PageAudit
      </a>
      <div className="nav-right">
        <button className="nav-cta" onClick={onTryFree}>
          Try free →
        </button>
      </div>
    </nav>
  );
}
