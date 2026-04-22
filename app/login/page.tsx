import { LoginForm } from "@/components/login-form";

export default function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  return (
    <main className="login-wrap">
      <section className="login-shell">
        <div className="login-hero panel">
          <p className="eyebrow">Tip Desk</p>
          <h1>Daily soccer value, in one private workspace.</h1>
          <p className="muted">Review candidates, publish only the best edge, monitor sources, and keep the archive clean without leaving the dashboard.</p>
          <div className="hero-pills">
            <span className="stat-pill">Today only</span>
            <span className="stat-pill">Private access</span>
            <span className="stat-pill">Mongo-backed</span>
          </div>
        </div>
        <LoginForm nextPath={searchParams?.next} />
      </section>
    </main>
  );
}
