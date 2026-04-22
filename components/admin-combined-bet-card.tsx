import React from "react";

export function AdminCombinedBetCard({ combinedBet }: { combinedBet: any | null }) {
  if (!combinedBet) {
    return (
      <section className="panel">
        <p className="eyebrow">Combined Bet</p>
        <h3>No combined bet generated</h3>
        <p className="muted">The pipeline did not find enough independent same-day legs that met the combined-bet thresholds.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="candidate-section-header">
        <div>
          <p className="eyebrow">Combined Bet</p>
          <h3>Combined Bet of the Day</h3>
        </div>
        <span className={`badge badge-status badge-status-${combinedBet.status === "published" ? "published" : combinedBet.status === "hidden" ? "hidden" : "pending"}`}>
          {combinedBet.status}
        </span>
      </div>
      <p className="muted">{combinedBet.rationale}</p>
      <div className="combined-legs">
        {combinedBet.legSnapshots.map((leg: any, index: number) => (
          <div className="combined-leg" key={leg.candidatePickId}>
            <strong>Leg {index + 1}</strong>
            <div>{leg.homeTeam} vs {leg.awayTeam}</div>
            <div className="muted">{leg.marketLabel} · {leg.offeredOdds}</div>
          </div>
        ))}
      </div>
      <div className="action-cell">
        {combinedBet.status !== "published" ? (
          <form action={`/api/combined-bet/${combinedBet.date}/publish`} method="post">
            <button type="submit">Publish combined bet</button>
          </form>
        ) : null}
        <form action={`/api/combined-bet/${combinedBet.date}/hide`} method="post">
          <button className="ghost-button" type="submit">{combinedBet.status === "hidden" ? "Keep hidden" : "Hide combined bet"}</button>
        </form>
      </div>
    </section>
  );
}
