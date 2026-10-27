import { useEffect } from "react";
import { Link, Outlet, Route, Routes, useLocation } from "react-router-dom";
import GuestRoute from "./components/GuestRoute";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import StudyPlanner from "./pages/StudyPlanner";
import Quiz from "./pages/Quiz";
import Revision from "./pages/Revision";
import Analytics from "./pages/Analytics";

function BackgroundDecor() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="orb orb--one" />
      <span className="orb orb--two" />
      <span className="orb orb--three" />
      <span className="ring ring--one" />
      <span className="ring ring--two" />
      <span className="dots" />

      <svg className="chart-line" viewBox="0 0 340 180" fill="none">
        <path
          d="M2 148 54 126 94 134 142 92 186 104 224 60 272 70 338 22"
          stroke="url(#chartGradient)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M2 148 54 126 94 134 142 92 186 104 224 60 272 70 338 22"
          stroke="rgba(96,165,250,0.08)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="340" y2="0">
            <stop stopColor="#22d3ee" stopOpacity="0.05" />
            <stop offset="0.55" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="1" stopColor="#a5b4fc" stopOpacity="0.75" />
          </linearGradient>
        </defs>
      </svg>

      <span className="backdrop__symbol backdrop__symbol--sum">∑</span>
      <span className="backdrop__symbol backdrop__symbol--pi">π</span>
      <span className="backdrop__symbol backdrop__symbol--root">√x</span>
      <span className="backdrop__symbol backdrop__symbol--delta">Δ</span>
    </div>
  );
}

function SiteLayout() {
  const location = useLocation();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView();
        return;
      }

      window.scrollTo({ top: 0, left: 0 });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return (
    <div className="site">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>PrepPilot AI · Personalized exam preparation</span>
        <span>Secure accounts · Planner · AI quizzes · Revision · Analytics</span>
      </footer>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <section className="not-found">
      <span className="eyebrow">404</span>
      <h1>This page could not be found.</h1>
      <p>
        The address may be incorrect, or the page may have moved. Head back home
        or open your dashboard to continue studying.
      </p>
      <Link className="button button--primary" to="/">
        Return home
      </Link>
    </section>
  );
}

export default function App() {
  return (
    <div className="app">
      <BackgroundDecor />

      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />

          <Route element={<GuestRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="planner" element={<StudyPlanner />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="revision" element={<Revision />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </div>
  );
}
