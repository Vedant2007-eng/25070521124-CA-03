export default function AuthPending() {
  return (
    <section className="auth-pending" role="status" aria-live="polite">
      <span className="pulse-dot" aria-hidden="true" />
      <p>Checking your session...</p>
    </section>
  );
}
