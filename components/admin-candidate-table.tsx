import React from "react";

const STATUS_ORDER = ["pending", "published", "approved", "rejected", "hidden"] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  published: "Published",
  approved: "Approved",
  rejected: "Rejected",
  hidden: "Hidden"
};

function groupedPicks(picks: any[]) {
  return STATUS_ORDER.map((status) => ({
    status,
    title: STATUS_LABELS[status],
    picks: picks.filter((pick) => pick.status === status)
  })).filter((group) => group.picks.length > 0);
}

function CandidateActions({ pick }: { pick: any }) {
  if (pick.status === "hidden" || pick.status === "rejected") {
    return (
      <form action={`/api/candidates/${pick.id}/restore`} method="post">
        <button className="ghost-button" type="submit">Restore</button>
      </form>
    );
  }

  if (pick.status === "published") {
    return (
      <form action={`/api/candidates/${pick.id}/hide`} method="post">
        <button className="ghost-button" type="submit">Remove From Feed</button>
      </form>
    );
  }

  return (
    <>
      <form action={`/api/candidates/${pick.id}/approve`} method="post">
        <button type="submit">Publish</button>
      </form>
      <form action={`/api/candidates/${pick.id}/reject`} method="post">
        <button className="ghost-button" type="submit">Reject</button>
      </form>
      <form action={`/api/candidates/${pick.id}/hide`} method="post">
        <button className="ghost-button" type="submit">Hide</button>
      </form>
    </>
  );
}

export function AdminCandidateTable({ picks }: { picks: any[] }) {
  return (
    <div className="candidate-sections">
      {groupedPicks(picks).map((group) => (
        <section className="panel candidate-panel" key={group.status}>
          <div className="candidate-section-header">
            <div>
              <p className="eyebrow">Review Bucket</p>
              <h3>{group.title}</h3>
            </div>
            <span className={`badge badge-status badge-status-${group.status}`}>{group.picks.length}</span>
          </div>
          <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Market</th>
                <th>Odds</th>
                <th>Edge</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {group.picks.map((pick) => (
                <tr key={pick.id} className={`candidate-row candidate-row-${pick.status}`}>
                  <td>
                    <strong>{pick.home_team} vs {pick.away_team}</strong>
                    <div className="muted">{pick.league}</div>
                    <div className="muted">
                      {pick.start_time_utc
                        ? new Date(pick.start_time_utc).toLocaleString("en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "Europe/Lisbon"
                          })
                        : ""}
                    </div>
                  </td>
                  <td>{pick.marketLabel ?? pick.market_label}</td>
                  <td>{pick.offeredOdds ?? pick.offered_odds}</td>
                  <td>{(pick.edge * 100).toFixed(1)}%</td>
                  <td>{pick.confidence}</td>
                  <td>
                    <span className={`badge badge-status badge-status-${pick.status}`}>{pick.status}</span>
                  </td>
                  <td className="action-cell">
                    <CandidateActions pick={pick} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      ))}
    </div>
  );
}
