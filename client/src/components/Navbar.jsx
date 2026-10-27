import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navClassName = ({ isActive }) =>
  `navbar__link${isActive ? " is-active" : ""}`;

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <header className="navbar">
      <div className="navbar__inner">
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

        <nav
          id="primary-navigation"
          className={`navbar__nav${isOpen ? " is-open" : ""}`}
          aria-label="Primary navigation"
          onClick={() => setIsOpen(false)}
        >
          <NavLink className={navClassName} to="/" end>
            Home
          </NavLink>
          <Link className="navbar__link" to="/#features">
            Features
          </Link>
          <NavLink className={navClassName} to="/dashboard">
            Dashboard
          </NavLink>

          <div className="navbar__actions">
            {isAuthenticated ? (
              <>
                <Link
                  className="button button--primary button--small"
                  to="/dashboard"
                >
                  Dashboard
                </Link>
                <button
                  className="button button--ghost button--small"
                  type="button"
                  onClick={logout}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="button button--ghost button--small" to="/login">
                  Log in
                </Link>
                <Link
                  className="button button--primary button--small"
                  to="/register"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>

        <button
          className="navbar__toggle"
          type="button"
          aria-expanded={isOpen}
          aria-controls="primary-navigation"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
