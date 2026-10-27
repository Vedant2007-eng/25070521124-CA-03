import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerAccount } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getPostAuthPath } from "../utils/authRedirect";

export default function Register() {
  const [formValues, setFormValues] = useState({
    name: "",
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

    const name = formValues.name.trim();
    const email = formValues.email.trim().toLowerCase();

    if (!name) {
      setError("Enter your name.");
      return;
    }

    if (!email) {
      setError("Enter your email address.");
      return;
    }

    if (formValues.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/\S/.test(formValues.password)) {
      setError("Password cannot contain only spaces.");
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await registerAccount({
        name,
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
          "Unable to create your account. Check your details and try again."
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

        <span className="eyebrow">Start with intention</span>
        <h1>Make every study session count.</h1>
        <p>
          Create your account to bring subjects, schedule, practice, and
          revision into a preparation system built around your exams.
        </p>

        <ul className="auth-points">
          <li>Organize the syllabus into subjects and topics.</li>
          <li>Practice with quizzes generated from your notes.</li>
          <li>See progress based on your own real activity.</li>
        </ul>
      </section>

      <section className="auth-card">
        <span className="status-pill">New account</span>
        <h2>Create your PrepPilot account</h2>
        <p className="auth-card__lede">
          Set up secure access to your personal preparation workspace.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={formValues.name}
              onChange={handleChange}
              maxLength={100}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="field">
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
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
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={formValues.password}
              onChange={handleChange}
              minLength={8}
              aria-describedby="register-password-hint"
              required
              disabled={isSubmitting}
            />
            <span className="field-hint" id="register-password-hint">
              Use at least 8 characters.
            </span>
          </div>

          <button
            className="button button--primary button--block"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="form-note">
          Your session stays in memory, so a full page refresh will require you
          to sign in again.
        </p>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </div>
  );
}
