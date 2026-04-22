import Link from "next/link";
import { startOfTodayLisbon } from "@/lib/utils/date";

export function AppNav() {
  const today = startOfTodayLisbon();

  return (
    <nav className="app-nav">
      <div className="nav-brand">
        <div className="nav-mark">T</div>
        <div>
          <p className="eyebrow">Private Betting Desk</p>
          <h1>Tip</h1>
          <p className="nav-subtitle">Soccer value picks for the Lisbon trading day.</p>
        </div>
      </div>
      <div className="nav-links">
        <Link className="nav-link" href="/tips">Tips</Link>
        <Link className="nav-link" href={`/archive/${today}`}>Archive</Link>
        <Link className="nav-link" href="/admin/candidates">Candidates</Link>
        <Link className="nav-link" href="/admin/sources">Sources</Link>
        <Link className="nav-link" href="/admin/settings">Settings</Link>
        <span className="nav-date">{today}</span>
        <form action="/api/logout" method="post">
          <button className="ghost-button" type="submit">
            Logout
          </button>
        </form>
      </div>
    </nav>
  );
}
