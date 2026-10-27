import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.7",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const navItems = [
  {
    to: "/dashboard",
    label: "Overview",
    icon: (
      <svg {...iconProps}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
      </svg>
    ),
  },
  {
    to: "/planner",
    label: "Study planner",
    icon: (
      <svg {...iconProps}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
        <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
        <path d="m8.5 14 2 2 4.5-4.5" />
      </svg>
    ),
  },
  {
    to: "/quiz",
    label: "AI quizzes",
    icon: (
      <svg {...iconProps}>
        <path d="M9.2 18h5.6M10 21h4" />
        <path d="M9 14.5c0-1.3.8-2.1 1.7-3 .8-.8 1.5-1.7 1.5-3.1A4.2 4.2 0 0 0 8 4.2c-1.7.2-3 1.3-3.7 2.7" />
        <path d="M9 14.5c.2-1.1 1-1.8 1.9-2.5.9-.7 1.6-1.6 1.6-2.9A2.9 2.9 0 0 0 10 6.4" />
        <path d="M18.2 9.5a5.9 5.9 0 0 1 .3 1.8" />
      </svg>
    ),
  },
  {
    to: "/revision",
    label: "Revision",
    icon: (
      <svg {...iconProps}>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 9a7 7 0 0 1 11.5-2.2L20 9M4 15l2.4 2.2A7 7 0 0 0 17.9 15" />
      </svg>
    ),
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: (
      <svg {...iconProps}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <p className="sidebar__label">Workspace</p>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " is-active" : ""}`
            }
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__note">
        <strong>Workspace live</strong>
        <p>
          Your plans, AI quizzes, revision schedule, and analytics stay connected
          to your account.
        </p>
      </div>

      <div className="sidebar__user">
        <span className="sidebar__avatar" aria-hidden="true">
          <svg {...iconProps}>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </span>
        <span>
          <strong>{user ? user.name : "Signed in"}</strong>
          <button
            className="sidebar__logout"
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </span>
      </div>
    </aside>
  );
}
