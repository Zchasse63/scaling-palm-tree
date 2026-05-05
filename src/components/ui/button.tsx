// Button — primary (ink black), secondary (white + charcoal border), text (ghost).

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Kind = "primary" | "secondary" | "text";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind;
  children: ReactNode;
}

export function Button({
  kind = "secondary",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const cls =
    kind === "primary"
      ? "btn btn-primary"
      : kind === "text"
      ? "btn-text"
      : "btn btn-secondary";
  return (
    <button className={cls + " " + className} {...rest}>
      {children}
    </button>
  );
}
