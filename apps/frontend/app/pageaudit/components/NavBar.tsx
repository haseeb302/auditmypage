"use client";

type NavBarProps = {
  onHome: () => void;
};

export function NavBar({ onHome }: NavBarProps) {
  return (
    <nav className="nav">
      <a className="nav-logo" onClick={onHome} style={{ cursor: "pointer" }}>
        <div className="nav-logo-dot" />
        PageAudit
      </a>
      <div className="nav-right">
        <button className="nav-btn" onClick={onHome}>
          Home
        </button>
        <button className="nav-cta" onClick={onHome}>
          Try free →
        </button>
      </div>
    </nav>
  );
}
