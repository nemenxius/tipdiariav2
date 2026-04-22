import { CombinedBetCard } from "@/components/combined-bet-card";
import { PickCard } from "@/components/pick-card";
import { requireSession } from "@/lib/auth/session";
import { getCombinedBetByDate, getPublishedPicksByDate } from "@/lib/db/index";
import { startOfTodayLisbon } from "@/lib/utils/date";

export default async function TipsPage() {
  await requireSession();
  const date = startOfTodayLisbon();
  const [picks, combinedBet] = await Promise.all([getPublishedPicksByDate(date), getCombinedBetByDate(date)]);

  return (
    <section className="page-stack">
      <div className="panel">
        <p className="eyebrow">Today only</p>
        <h2>Tips of the day</h2>
        <p className="muted">Only Lisbon-date picks that passed value, freshness, and confidence gates appear here.</p>
      </div>
      {combinedBet?.status === "published" ? <CombinedBetCard combinedBet={combinedBet} /> : null}
      <div className="page-grid">
        {picks.length ? picks.map((pick) => <PickCard key={pick.id} pick={pick} />) : (
          <div className="panel">
            <h3>No published picks yet</h3>
            <p className="muted">Run the pipeline and approve candidates from the admin area.</p>
          </div>
        )}
      </div>
    </section>
  );
}
