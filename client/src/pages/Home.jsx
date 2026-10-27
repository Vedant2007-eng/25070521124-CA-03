import { Link } from "react-router-dom";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.7",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const features = [
  {
    title: "Study planner",
    description:
      "Organize subjects and topics into a realistic weekly plan that keeps every exam in view.",
    icon: (
      <svg {...iconProps}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
        <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
        <path d="m8.5 14 2 2 4.5-4.5" />
      </svg>
    ),
  },
  {
    title: "AI-powered quizzes",
    description:
      "Turn notes and learning material into focused practice questions with instant feedback.",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3.5 13.8 8l4.5 1.8-4.5 1.8L12 16l-1.8-4.4L5.7 9.8 10.2 8 12 3.5Z" />
        <path d="M18.5 15.5 19.4 18l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9.9-2.5Z" />
      </svg>
    ),
  },
  {
    title: "Revision system",
    description:
      "Schedule spaced reviews so important concepts return at the right moment, not all at once.",
    icon: (
      <svg {...iconProps}>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 9a7 7 0 0 1 11.5-2.2L20 9M4 15l2.4 2.2A7 7 0 0 0 17.9 15" />
      </svg>
    ),
  },
  {
    title: "Performance analytics",
    description:
      "Understand accuracy, consistency, and weaker topics through clear, honest progress reports.",
    icon: (
      <svg {...iconProps}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
];

const commandTiles = [
  {
    title: "Plan",
    text: "Map topics to study sessions",
    tone: "blue",
    icon: (
      <svg {...iconProps}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
        <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
      </svg>
    ),
  },
  {
    title: "Practice",
    text: "Generate a quiz from notes",
    tone: "cyan",
    icon: (
      <svg {...iconProps}>
        <path d="M9.2 18h5.6M10 21h4" />
        <path d="M9 14.5c0-1.3.8-2.1 1.7-3 .8-.8 1.5-1.7 1.5-3.1A4.2 4.2 0 0 0 8 4.2c-1.7.2-3 1.3-3.7 2.7" />
        <path d="M9 14.5c.2-1.1 1-1.8 1.9-2.5.9-.7 1.6-1.6 1.6-2.9A2.9 2.9 0 0 0 10 6.4" />
      </svg>
    ),
  },
  {
    title: "Revise",
    text: "Review at the right time",
    tone: "indigo",
    icon: (
      <svg {...iconProps}>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 9a7 7 0 0 1 11.5-2.2L20 9M4 15l2.4 2.2A7 7 0 0 0 17.9 15" />
      </svg>
    ),
  },
  {
    title: "Track",
    text: "See where to improve",
    tone: "violet",
    icon: (
      <svg {...iconProps}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            Personalized exam preparation
          </span>

          <h1>
            Prep smarter.
            <br />
            <span className="text-gradient">Walk in ready.</span>
          </h1>

          <p className="hero__lede">
            PrepPilot AI brings your subjects, study plan, practice quizzes,
            revisions, and progress into one calm workspace — so you always know
            what to study next.
          </p>

          <div className="hero__actions">
            <Link className="button button--primary" to="/register">
              Get started
            </Link>
            <Link className="button button--secondary" to="/login">
              Log in
            </Link>
          </div>

          <ul className="hero__meta">
            <li>Plan by subject and topic</li>
            <li>Practice with AI</li>
            <li>Track improvement over time</li>
          </ul>
        </div>

        <div className="hero__visual">
          <div className="command-card">
            <div className="command-card__head">
              <div>
                <span className="command-card__eyebrow">Study command center</span>
                <h2>One connected study loop</h2>
              </div>
              <span className="status-pill">Live workspace</span>
            </div>

            <div className="command-grid">
              {commandTiles.map((tile) => (
                <div
                  className={`command-tile command-tile--${tile.tone}`}
                  key={tile.title}
                >
                  <span className="command-tile__icon">{tile.icon}</span>
                  <strong>{tile.title}</strong>
                  <span>{tile.text}</span>
                </div>
              ))}
            </div>

            <div className="command-footer">
              <span className="command-footer__status">
                <span className="pulse-dot" />
                Plan → Practice → Revise
              </span>
              <span className="command-footer__link">PrepPilot AI</span>
            </div>
          </div>

          <div className="hero-chip hero-chip--one">
            <span className="hero-chip__dot" />
            AI quiz generation
            <span className="hero-chip__tag">Ready</span>
          </div>

          <div className="hero-chip hero-chip--two">
            <span className="hero-chip__dot hero-chip__dot--cyan" />
            Spaced revision
            <span className="hero-chip__tag">Ready</span>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-heading section-heading--center">
          <span className="eyebrow">Built for the full study loop</span>
          <h2>Everything you need to prepare with intention</h2>
          <p>
            Every tool below is built into your workspace and works from the
            subjects, plans, and progress saved to your account.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-card__icon">{feature.icon}</span>
              <div className="feature-card__head">
                <h3>{feature.title}</h3>
                <span className="tag">Live</span>
              </div>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">A calmer way to prepare</span>
          <h2>From scattered notes to a clear next step</h2>
          <p>
            PrepPilot is designed around a simple rhythm: know what matters,
            practice it, revisit it, and learn from the result.
          </p>
        </div>

        <div className="steps">
          <article className="step">
            <span className="step__number">01</span>
            <h3>Set up your subjects</h3>
            <p>
              Break the syllabus into subjects and topics, then mark what needs
              the most attention.
            </p>
          </article>
          <article className="step">
            <span className="step__number">02</span>
            <h3>Plan focused sessions</h3>
            <p>
              Turn priorities into a workable schedule with study blocks that fit
              around your day.
            </p>
          </article>
          <article className="step">
            <span className="step__number">03</span>
            <h3>Practice, revise, improve</h3>
            <p>
              Use quizzes and scheduled revisions to strengthen recall, then see
              what changed.
            </p>
          </article>
        </div>
      </section>

      <section className="cta-band">
        <div>
          <span className="eyebrow">Ready when you are</span>
          <h2>Start with a calmer study plan.</h2>
          <p>
            Create your PrepPilot account to open a personal workspace with study
            planning, AI practice, scheduled revision, and progress analytics.
          </p>
        </div>
        <div className="cta-band__actions">
          <Link className="button button--primary" to="/register">
            Get started
          </Link>
          <Link className="button button--secondary" to="/login">
            Log in
          </Link>
        </div>
      </section>
    </div>
  );
}
