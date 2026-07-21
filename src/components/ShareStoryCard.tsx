import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { assetUrl } from "@/lib/baseUrl";
import { drawStoryCard, gameShareUrl, shareStoryImage } from "@/lib/shareStory";
import { playHoverSound } from "@/lib/sounds";
import "./ShareStoryCard.css";

interface ShareStoryCardProps {
  open: boolean;
  onClose: () => void;
}

export function ShareStoryCard({ open, onClose }: ShareStoryCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    setStatus(null);

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    drawStoryCard(canvas, assetUrl("logo-up.png"))
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setStatus("Couldn't render the preview.");
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas || busy || !ready) return;

    setBusy(true);
    setStatus(null);
    try {
      const result = await shareStoryImage(canvas, gameShareUrl());
      setStatus(result.message);
    } catch {
      setStatus("Couldn't share the image — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="share-story"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Share TypedUp to Instagram Story"
        >
          <button
            type="button"
            className="share-story__backdrop"
            aria-label="Close"
            onClick={onClose}
          />

          <div className="share-story__panel">
            <div className="share-story__preview">
              <canvas ref={canvasRef} className="share-story__canvas" />
              {!ready && !status && (
                <div className="share-story__loading">Rendering…</div>
              )}
            </div>

            <button
              type="button"
              className="share-story__share-btn"
              onClick={handleShare}
              onMouseEnter={playHoverSound}
              disabled={!ready || busy}
            >
              {busy ? "Preparing…" : "Share to Instagram Story"}
            </button>

            {status && <p className="share-story__status">{status}</p>}

            <button
              type="button"
              className="share-story__close"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
