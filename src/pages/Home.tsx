import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ShareStoryCard } from "@/components/ShareStoryCard";
import { playHoverSound } from "@/lib/sounds";
import "./Home.css";

const LEVELS = [
  { level: "noob", title: "noob", subtitle: "Pick the font" },
  { level: "advanced", title: "advanced", subtitle: "Search and select" },
] as const;

export function Home() {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <main className="home page-enter">
      <button
        type="button"
        className="home__share-trigger"
        aria-label="Share to Instagram Story"
        onClick={() => setShareOpen(true)}
        onMouseEnter={playHoverSound}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
          <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
        </svg>
      </button>

      <div className="home__main">
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
      </div>
      <footer className="home__credit">
        <a
          href="https://www.thereisfarq.com"
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={playHoverSound}
        >
          MADE BY AHFOS
        </a>
      </footer>

      <ShareStoryCard open={shareOpen} onClose={() => setShareOpen(false)} />
    </main>
  );
}
