import "./ScoreBar.css";

interface ScoreBarProps {
  streak: number;
  best: number;
}

export function ScoreBar({ streak, best }: ScoreBarProps) {
  return (
    <div className="score-bar">
      <span className="score-bar__streak">{streak}</span>
      {best > 0 && <span className="score-bar__best">best {best}</span>}
    </div>
  );
}
