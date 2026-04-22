import { CombinedBetCard } from "@/components/combined-bet-card";
import { PickCard } from "@/components/pick-card";
import { requireSession } from "@/lib/auth/session";
import { getCombinedBetByDate, getPublishedPicksByDate } from "@/lib/db/index";

export default async function ArchivePage({ params }: { params: { date: string } }) {
  await requireSession();
  const [picks, combinedBet] = await Promise.all([getPublishedPicksByDate(params.date), getCombinedBetByDate(params.date)]);

  return (
    <section className="page-stack">
      <div className="panel">
        <p className="eyebrow">Archive</p>
        <h2>{params.date}</h2>
        <p className="muted">Published soccer value picks for this Lisbon date.</p>
      </div>
      {combinedBet?.status === "published" ? <CombinedBetCard combinedBet={combinedBet} /> : null}
      <div className="page-grid">
        {picks.length ? picks.map((pick) => <PickCard key={pick.id} pick={pick} />) : (
          <div className="panel">
            <h3>No picks for this date</h3>
            <p className="muted">Only published picks are archived.</p>
          </div>
        )}
      </div>
    </section>
  );
}
