import { SettingsForm } from "@/components/settings-form";
import { requireSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/index";

export default async function AdminSettingsPage() {
  await requireSession();
  const settings = await getSettings();
  return (
    <section className="page-stack">
      <div className="panel">
        <p className="eyebrow">Controls</p>
        <h2>Settings</h2>
        <p className="muted">Tune the edge window, retention cleanup, source enablement, and publication mode for the soccer-only pipeline.</p>
      </div>
      <SettingsForm settings={settings} />
    </section>
  );
}
