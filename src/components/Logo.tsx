import { assetUrl } from "@/lib/baseUrl";
import "./Logo.css";

interface LogoProps {
  size?: "sm" | "lg";
  markOnly?: boolean;
}

export function Logo({ size = "lg", markOnly = false }: LogoProps) {
  return (
    <div
      className={`logo logo--${size}${markOnly ? " logo--mark-only" : ""}`}
      aria-label="TypedUp"
    >
      {!markOnly && <span className="logo__typed">Typed</span>}
      <img className="logo__up" src={assetUrl("logo-up.png")} alt="" />
    </div>
  );
}
