import { motion, AnimatePresence } from "framer-motion";
import "./FeedbackToast.css";

interface FeedbackToastProps {
  visible: boolean;
  correct: boolean;
  fontName: string;
  onSkip: () => void;
}

export function FeedbackToast({
  visible,
  correct,
  fontName,
  onSkip,
}: FeedbackToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          className={`feedback ${correct ? "feedback--correct" : "feedback--wrong"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onSkip}
        >
          <span className="feedback__label">
            {correct ? "Correct" : "Wrong"}
          </span>
          {!correct && (
            <span className="feedback__answer">{fontName}</span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
