import React from "react";
import { percent } from "@/lib/utils/math";

export function CombinedBetCard({ combinedBet }: { combinedBet: any }) {
  return (
    <article className="panel combined-bet-card">
      <div className="pick-card-header">
        <div>
          <p className="eyebrow">Featured Parlay</p>
          <h2>Combined Bet of the Day</h2>
          <p className="muted">{combinedBet.legSnapshots.length} legs · built from same-day approved-value singles</p>
        </div>
        <span className={`badge badge-${combinedBet.confidence}`}>{combinedBet.confidence}</span>
      </div>
      <div className="metric-grid">
        <div>
          <span>Combined Odds</span>
          <strong>{combinedBet.combinedOdds}</strong>
        </div>
        <div>
          <span>Est. Prob.</span>
          <strong>{percent(combinedBet.combinedEstimatedProbability)}%</strong>
        </div>
        <div>
          <span>Edge</span>
          <strong>{percent(combinedBet.combinedEdge)}%</strong>
        </div>
      </div>
      <div className="combined-legs">
        {combinedBet.legSnapshots.map((leg: any, index: number) => (
          <div className="combined-leg" key={leg.candidatePickId}>
            <strong>Leg {index + 1}</strong>
            <div>{leg.homeTeam} vs {leg.awayTeam}</div>
            <div className="muted">{leg.marketLabel} · {leg.offeredOdds}</div>
          </div>
        ))}
      </div>
      <p className="pick-rationale">{combinedBet.rationale}</p>
    </article>
  );
}
