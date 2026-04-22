export function SourceHealthPanel({ health, runs }: { health: any[]; runs: any[] }) {
  return (
    <div className="source-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Collectors</p>
            <h2>Source health</h2>
          </div>
          <span className="stat-pill">{health.length} active</span>
        </div>
        <ul className="plain-list">
          {health.map((entry) => (
            <li key={entry.source_key} className="status-card">
              <div className="status-card-top">
                <strong>{entry.source_key}</strong>
                <span className={`badge badge-status ${entry.last_error_at ? "badge-status-rejected" : "badge-status-published"}`}>
                  {entry.last_error_at ? "attention" : "healthy"}
                </span>
              </div>
              <div>{entry.last_message}</div>
              <div className="muted">Selector {entry.selector_version}</div>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pipeline</p>
            <h2>Recent runs</h2>
          </div>
          <form action="/api/jobs/run" method="post">
            <button type="submit">Run daily pipeline</button>
          </form>
        </div>
        <ul className="plain-list">
          {runs.map((entry) => (
            <li key={String(entry._id ?? entry.id)} className="status-card">
              <div className="status-card-top">
                <strong>{entry.source_key}</strong>
                <span className={`badge badge-status ${entry.status === "success" ? "badge-status-published" : "badge-status-rejected"}`}>
                  {entry.status}
                </span>
              </div>
              <div className="muted">{entry.message}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
