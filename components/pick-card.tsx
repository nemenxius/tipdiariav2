import React from "react";
import { percent } from "@/lib/utils/math";
import { toLisbonTimeLabel } from "@/lib/utils/date";

export function PickCard({ pick }: { pick: any }) {
  const marketLabel = pick.marketLabel ?? pick.market_label;
  const offeredOdds = pick.offeredOdds ?? pick.offered_odds;
  const estimatedProbability = pick.estimatedProbability ?? pick.estimated_probability;
  const fairOdds = pick.fairOdds ?? pick.fair_odds;
  return (
    <article className="pick-card">
      <div className="pick-card-header">
        <div>
          <p className="eyebrow">Soccer</p>
          <h3 className="pick-title">{pick.home_team} vs {pick.away_team}</h3>
          <p className="muted">{pick.league} · {toLisbonTimeLabel(pick.start_time_utc)}</p>
        </div>
        <span className={`badge badge-${pick.confidence}`}>{pick.confidence}</span>
      </div>
      <div className="metric-grid">
        <div>
          <span>Market</span>
          <strong>{marketLabel}</strong>
        </div>
        <div>
          <span>Odds</span>
          <strong>{offeredOdds}</strong>
        </div>
        <div>
          <span>Est. Prob.</span>
          <strong>{percent(estimatedProbability)}%</strong>
        </div>
        <div>
          <span>Fair Odds</span>
          <strong>{fairOdds}</strong>
        </div>
        <div>
          <span>Edge</span>
          <strong>{percent(pick.edge)}%</strong>
        </div>
      </div>
      <p className="pick-rationale">{pick.rationale}</p>
      <div className="pick-footer">
        <span className="stat-pill">Edge Band</span>
        <span className="muted">High-confidence shortlist item for the current Lisbon date.</span>
      </div>
    </article>
  );
}
