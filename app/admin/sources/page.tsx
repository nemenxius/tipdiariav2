import { SourceHealthPanel } from "@/components/source-health-panel";
import { requireSession } from "@/lib/auth/session";
import { getRecentScrapeRuns, getSourceHealth } from "@/lib/db/index";

export default async function AdminSourcesPage() {
  await requireSession();
  const [health, runs] = await Promise.all([getSourceHealth(), getRecentScrapeRuns()]);
  return (
    <section className="page-stack">
      <div className="panel">
        <p className="eyebrow">Operations</p>
        <h2>Source health</h2>
        <p className="muted">Track selector versions, last successes, and source breakage before stale odds reach the feed.</p>
      </div>
      <SourceHealthPanel health={health as any[]} runs={runs as any[]} />
    </section>
  );
}
