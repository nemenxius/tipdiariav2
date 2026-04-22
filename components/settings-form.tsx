import type { AppSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  return (
    <form action="/api/settings" method="post" className="panel settings-form">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Control Room</p>
          <h2>Model and publish settings</h2>
        </div>
        <span className="stat-pill">Soccer only</span>
      </div>
      <div className="settings-grid">
        <label>
          Combined bet enabled
          <select name="combinedBetEnabled" defaultValue={String(settings.combinedBetEnabled)}>
            <option value="true">enabled</option>
            <option value="false">disabled</option>
          </select>
        </label>
        <label>
          Enabled sources
          <input name="enabledSources" defaultValue={settings.enabledSources.join(",")} />
        </label>
        <label>
          Publish mode
          <select name="publishMode" defaultValue={settings.publishMode}>
            <option value="manual">manual</option>
            <option value="automatic">automatic</option>
          </select>
        </label>
        <label>
          Combined bet max legs
          <select name="combinedBetMaxLegs" defaultValue={String(settings.combinedBetMaxLegs)}>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label>
          Minimum edge %
          <input name="minEdgePercent" type="number" step="0.1" defaultValue={settings.minEdgePercent} />
        </label>
        <label>
          Maximum edge %
          <input name="maxEdgePercent" type="number" step="0.1" defaultValue={settings.maxEdgePercent} />
        </label>
        <label>
          Minimum confidence
          <input name="minConfidenceScore" type="number" step="0.01" defaultValue={settings.minConfidenceScore} />
        </label>
        <label>
          Combined bet min leg confidence
          <input name="combinedBetMinLegConfidence" type="number" step="0.01" defaultValue={settings.combinedBetMinLegConfidence} />
        </label>
        <label>
          Scrape cadence minutes
          <input name="scrapeCadenceMinutes" type="number" defaultValue={settings.scrapeCadenceMinutes} />
        </label>
        <label>
          Raw data retention days
          <input name="rawDataRetentionDays" type="number" min="0" defaultValue={settings.rawDataRetentionDays} />
        </label>
        <label>
          Scrape history retention days
          <input name="scrapeRunRetentionDays" type="number" min="1" defaultValue={settings.scrapeRunRetentionDays} />
        </label>
      </div>
      <button type="submit">Save settings</button>
    </form>
  );
}
