const WIDTH = 640;
const HEIGHT = 210;
const PADDING_X = 34;
const PADDING_TOP = 18;
const PADDING_BOTTOM = 38;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

function getChartPoints(trend) {
  const usableWidth = WIDTH - PADDING_X * 2;

  return trend.map((attempt, index) => {
    const score = Math.min(
      100,
      Math.max(0, Number(attempt.scorePercentage) || 0)
    );
    const x =
      trend.length === 1
        ? WIDTH / 2
        : PADDING_X + (index / (trend.length - 1)) * usableWidth;
    const y = PADDING_TOP + ((100 - score) / 100) * PLOT_HEIGHT;

    return { ...attempt, score, x, y };
  });
}

function formatChartDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function ScoreTrendChart({ trend = [] }) {
  const points = getChartPoints(
    trend.filter((attempt) =>
      Number.isFinite(Number(attempt.scorePercentage))
    )
  );

  if (points.length === 0) {
    return (
      <div className="analytics-chart-empty">
        Complete a quiz to start your score trend.
      </div>
    );
  }

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${points[0].x},${PADDING_TOP + PLOT_HEIGHT} ${linePoints} ${points.at(-1).x},${PADDING_TOP + PLOT_HEIGHT}`;
  const average = Math.round(
    points.reduce((total, point) => total + point.score, 0) / points.length
  );

  return (
    <div className="analytics-chart">
      <div className="analytics-chart__legend">
        <span>
          <span className="analytics-chart__swatch" aria-hidden="true" />
          Score per attempt
        </span>
        <strong>Trend average: {average}%</strong>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Quiz score trend across ${points.length} attempt${points.length === 1 ? "" : "s"}`}
      >
        <defs>
          <linearGradient id="scoreTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((score) => {
          const y = PADDING_TOP + ((100 - score) / 100) * PLOT_HEIGHT;

          return (
            <g key={score}>
              <line
                x1={PADDING_X}
                y1={y}
                x2={WIDTH - PADDING_X}
                y2={y}
                className="analytics-chart__grid"
              />
              <text
                x={PADDING_X - 9}
                y={y + 3}
                textAnchor="end"
                className="analytics-chart__axis"
              >
                {score}
              </text>
            </g>
          );
        })}

        <polygon points={areaPoints} fill="url(#scoreTrendFill)" />
        <polyline
          points={linePoints}
          className="analytics-chart__line"
          fill="none"
        />

        {points.map((point, index) => (
          <g key={point.id || `${point.x}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4.5"
              className="analytics-chart__point"
            >
              <title>
                {point.title}: {point.score}%
              </title>
            </circle>
            {index === 0 || index === points.length - 1 ? (
              <text
                x={point.x}
                y={HEIGHT - 13}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                      ? "end"
                      : "middle"
                }
                className="analytics-chart__axis"
              >
                {formatChartDate(point.completedAt)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}
