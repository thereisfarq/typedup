import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FeedbackToast } from "@/components/FeedbackToast";
import { FontChoices } from "@/components/FontChoices";
import { FontSearch } from "@/components/FontSearch";
import { Logo } from "@/components/Logo";
import { ScoreBar } from "@/components/ScoreBar";
import { DEFAULT_SPECIMEN_TEXT, Specimen } from "@/components/Specimen";
import {
  checkFontAnswer,
  pickQuestion,
  pushHistory,
  type GameLevel,
  type Question,
} from "@/game/engine";
import {
  getFontCatalog,
  loadFontFace,
  preloadFontFace,
  type FontEntry,
} from "@/lib/fontsCatalog";
import { playCorrectSound, playHoverSound, playWrongSound } from "@/lib/sounds";
import { getBestStreak, updateBestStreak } from "@/lib/streak";
import "./Play.css";

const FEEDBACK_MS = 900;
const SPECIMEN_STORAGE_KEY = "typedup-specimen-text";

const LEVEL_TITLES: Record<GameLevel, string> = {
  noob: "Which font is this?",
  advanced: "Find the font",
};

function parseLevel(param: string | undefined): GameLevel | null {
  if (param === "noob" || param === "advanced") return param;
  return null;
}

function loadSpecimenText(): string {
  try {
    return localStorage.getItem(SPECIMEN_STORAGE_KEY) || DEFAULT_SPECIMEN_TEXT;
  } catch {
    return DEFAULT_SPECIMEN_TEXT;
  }
}

export function Play() {
  const { level: levelParam } = useParams<{ level: string }>();
  const level = parseLevel(levelParam);

  const [catalog, setCatalog] = useState<FontEntry[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [specimenText, setSpecimenText] = useState(loadSpecimenText);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [shake, setShake] = useState(false);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    correct: boolean;
  }>({ visible: false, correct: false });

  const questionKey = useRef(0);
  const advanceTimer = useRef<number | null>(null);

  const handleSpecimenTextChange = (text: string) => {
    setSpecimenText(text);
    try {
      localStorage.setItem(SPECIMEN_STORAGE_KEY, text);
    } catch {
      /* ignore */
    }
  };

  const startRound = useCallback(
    (cat: FontEntry[], hist: string[], lvl: GameLevel) => {
      const q = pickQuestion(lvl, cat, hist);
      setQuestion(q);
      setFontLoaded(false);
      setDisabled(false);
      setShake(false);
      questionKey.current += 1;

      loadFontFace(q.correctFont)
        .then(() => setFontLoaded(true))
        .catch(() => setFontLoaded(true));
    },
    [],
  );

  useEffect(() => {
    if (!level) return;
    setBest(getBestStreak(level));
    getFontCatalog()
      .then((cat) => {
        setCatalog(cat);
        startRound(cat, [], level);
      })
      .catch(() => setCatalogError(true));
  }, [level, startRound]);

  const clearAdvanceTimer = () => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  const advanceRound = useCallback(() => {
    if (!catalog || !level || !question) return;
    clearAdvanceTimer();
    setFeedback({ visible: false, correct: false });
    const newHistory = pushHistory(history, question.correctFont.family);
    setHistory(newHistory);
    startRound(catalog, newHistory, level);
  }, [catalog, level, question, history, startRound]);

  const showFeedback = (correct: boolean) => {
    if (correct) playCorrectSound();
    else playWrongSound();

    setFeedback({ visible: true, correct });
    if (!correct) {
      setShake(true);
    }
    advanceTimer.current = window.setTimeout(advanceRound, FEEDBACK_MS);
  };

  const handleAnswer = (correct: boolean) => {
    if (!question || disabled || !level) return;
    setDisabled(true);

    if (correct) {
      const next = streak + 1;
      setStreak(next);
      setBest(updateBestStreak(level, next));
      const nextQ = catalog
        ? pickQuestion(level, catalog, pushHistory(history, question.correctFont.family))
        : null;
      if (nextQ) preloadFontFace(nextQ.correctFont);
    } else {
      setStreak(0);
    }

    showFeedback(correct);
  };

  const handleFontSelect = (family: string) => {
    if (!question) return;
    handleAnswer(checkFontAnswer(question, family));
  };

  if (!level) {
    return (
      <main className="play play--center page-enter">
        <p>Invalid level.</p>
        <Link to="/" className="play__back" onMouseEnter={playHoverSound}>
          Home
        </Link>
      </main>
    );
  }

  if (catalogError) {
    return (
      <main className="play play--center page-enter">
        <p className="play__error">
          No fonts found. Add .ttf or .otf files to{" "}
          <code>public/fonts/</code> and restart.
        </p>
        <Link to="/" className="play__back" onMouseEnter={playHoverSound}>
          Home
        </Link>
      </main>
    );
  }

  if (!catalog || !question) {
    return (
      <main className="play play--center page-enter">
        <p className="play__loading">Loading…</p>
      </main>
    );
  }

  return (
    <main className="play page-enter">
      <header className="play__header">
        <a className="farq-outpost" href="https://thereisfarq.github.io/" aria-label="Farq Outpost home"><span>Farq Outpost | All Tools</span><span className="outpost-arrow" aria-hidden="true">↗</span></a>
        <Link to="/" className="play__back" onMouseEnter={playHoverSound}>
          ← Back
        </Link>
        <Logo size="sm" markOnly />
        <ScoreBar streak={streak} best={best} />
      </header>

      <p className="play__prompt">{LEVEL_TITLES[level]}</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={questionKey.current}
          className="play__question"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Specimen
            family={question.correctFont.family}
            loaded={fontLoaded}
            text={specimenText}
            onTextChange={handleSpecimenTextChange}
            shake={shake && feedback.visible && !feedback.correct}
          />

          {level === "noob" && question.fontOptions && (
            <FontChoices
              options={question.fontOptions}
              disabled={disabled}
              onSelect={handleFontSelect}
            />
          )}

          {level === "advanced" && (
            <FontSearch
              catalog={catalog}
              disabled={disabled}
              onSelect={handleFontSelect}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <FeedbackToast
        visible={feedback.visible}
        correct={feedback.correct}
        fontName={question.correctFont.family}
        onSkip={advanceRound}
      />
    </main>
  );
}
