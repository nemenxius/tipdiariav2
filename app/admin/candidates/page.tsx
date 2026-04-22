import { AdminCombinedBetCard } from "@/components/admin-combined-bet-card";
import { AdminCandidateTable } from "@/components/admin-candidate-table";
import { requireSession } from "@/lib/auth/session";
import { getCandidatePicks, getCombinedBetByDate } from "@/lib/db/index";
import { startOfTodayLisbon } from "@/lib/utils/date";

export default async function AdminCandidatesPage() {
  await requireSession();
  const date = startOfTodayLisbon();
  const [picks, combinedBet] = await Promise.all([getCandidatePicks(), getCombinedBetByDate(date)]);

  return (
    <section className="page-stack">
      <div className="panel">
        <p className="eyebrow">Manual review</p>
        <h2>Candidate picks</h2>
        <p className="muted">Soccer is fully automated. Review today’s football candidates, publish the strongest value spots, and hide anything you do not want on the feed.</p>
      </div>
      <AdminCombinedBetCard combinedBet={combinedBet} />
      <AdminCandidateTable picks={picks} />
    </section>
  );
}
