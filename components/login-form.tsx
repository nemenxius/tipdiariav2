export function LoginForm({ nextPath }: { nextPath?: string }) {
  return (
    <form action="/api/login" method="post" className="panel login-form">
      <p className="eyebrow">Single User Access</p>
      <h1>Open the desk</h1>
      <p className="muted">Private access for the daily soccer value workflow, approvals, archive, and source monitoring.</p>
      <input type="hidden" name="next" value={nextPath ?? "/tips"} />
      <label>
        Username
        <input name="username" type="text" defaultValue="admin" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <button type="submit">Enter dashboard</button>
      <div className="login-note">
        <span className="badge badge-watch">Private</span>
        <p className="muted">Default admin password is `change-me-now` unless `TIP_ADMIN_PASSWORD` is set.</p>
      </div>
    </form>
  );
}
