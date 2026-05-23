import { playHoverSound } from "@/lib/sounds";
import "./Choices.css";

interface FontChoicesProps {
  options: string[];
  disabled: boolean;
  onSelect: (family: string) => void;
}

export function FontChoices({ options, disabled, onSelect }: FontChoicesProps) {
  return (
    <div className="choices choices--stack">
      {options.map((family) => (
        <button
          key={family}
          type="button"
          className="choices__btn choices__btn--stack"
          disabled={disabled}
          onMouseEnter={playHoverSound}
          onClick={() => onSelect(family)}
        >
          {family}
        </button>
      ))}
    </div>
  );
}
