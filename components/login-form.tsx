export function LoginForm({ nextPath, error }: { nextPath?: string; error?: string }) {
  const errorMessage =
    error === "invalid"
      ? "Invalid username or password."
      : error === "server"
        ? "Login is temporarily unavailable. Check MongoDB and Vercel environment variables."
        : null;

  return (
    <form action="/api/login" method="post" className="panel login-form">
      <p className="eyebrow">Single User Access</p>
      <h1>Open the desk</h1>
      <p className="muted">Private access for the daily soccer value workflow, approvals, archive, and source monitoring.</p>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
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
    </form>
  );
}
