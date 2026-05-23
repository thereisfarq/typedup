import { useEffect, useRef } from "react";
import "./Specimen.css";

export const DEFAULT_SPECIMEN_TEXT =
  "The quick brown fox jumps over the lazy dog";

interface SpecimenProps {
  family: string;
  loaded: boolean;
  text: string;
  onTextChange: (text: string) => void;
  shake?: boolean;
}

export function Specimen({
  family,
  loaded,
  text,
  onTextChange,
  shake,
}: SpecimenProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.innerText = text;
    }
  }, [text]);

  const handleBlur = () => {
    const next = ref.current?.innerText.trim() || DEFAULT_SPECIMEN_TEXT;
    onTextChange(next);
  };

  return (
    <div className={`specimen ${shake ? "shake" : ""}`}>
      <p
        ref={ref}
        className={`specimen__text ${loaded ? "specimen__text--loaded" : ""}`}
        style={{ fontFamily: loaded ? `"${family}", sans-serif` : "inherit" }}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onClick={() => ref.current?.focus()}
        onBlur={handleBlur}
      />
    </div>
  );
}
