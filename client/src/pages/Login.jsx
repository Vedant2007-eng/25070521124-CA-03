import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginAccount } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getPostAuthPath } from "../utils/authRedirect";

export default function Login() {
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitLock.current || isSubmitting) {
      return;
    }

    const email = formValues.email.trim().toLowerCase();

    if (!email || !formValues.password) {
      setError("Enter your email and password.");
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await loginAccount({
        email,
        password: formValues.password,
      });

      login({
        token: data.token,
        user: data.user,
      });
      navigate(getPostAuthPath(location), { replace: true });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to sign in. Check your details and try again."
        )
      );
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-intro">
        <Link className="brand" to="/" aria-label="PrepPilot AI home">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3 2.8 7.6 12 12.2l9.2-4.6L12 3Z"
                fill="currentColor"
              />
              <path
                d="M6.4 10.5v4.1c0 2.2 2.5 3.9 5.6 3.9s5.6-1.7 5.6-3.9v-4.1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="brand__text">
            PrepPilot <span>AI</span>
          </span>
        </Link>

        <span className="eyebrow">Welcome back</span>
        <h1>Pick up where you left off.</h1>
        <p>
          Sign in to return to your prep workspace. Your account keeps your
          plans, quizzes, revisions, and analytics connected to you alone.
        </p>

        <ul className="auth-points">
          <li>Return to a plan that already knows your priorities.</li>
          <li>Keep quiz attempts and revision progress in one place.</li>
          <li>Pick up the next study session without guessing.</li>
        </ul>
      </section>

      <section className="auth-card">
        <span className="status-pill">Secure sign-in</span>
        <h2>Sign in to PrepPilot AI</h2>
        <p className="auth-card__lede">
          Enter the email and password you used to create your account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              value={formValues.email}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={formValues.password}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            className="button button--primary button--block"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="form-note">
          Your session stays in memory, so a full page refresh will require you
          to sign in again.
        </p>

        <p className="auth-switch">
          New to PrepPilot? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}
