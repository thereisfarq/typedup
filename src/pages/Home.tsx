import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { playHoverSound } from "@/lib/sounds";
import "./Home.css";

const LEVELS = [
  { level: "noob", title: "noob", subtitle: "Pick the font" },
  { level: "advanced", title: "advanced", subtitle: "Search and select" },
] as const;

export function Home() {
  return (
    <main className="home page-enter">
      <div className="home__logo">
        <Logo size="lg" markOnly />
      </div>
      <nav className="home__levels" aria-label="Difficulty levels">
        {LEVELS.map(({ level, title, subtitle }) => (
          <Link
            key={level}
            to={`/play/${level}`}
            className="home__level"
            onMouseEnter={playHoverSound}
          >
            <span className="home__level-title">{title}</span>
            <span className="home__level-sub">{subtitle}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
