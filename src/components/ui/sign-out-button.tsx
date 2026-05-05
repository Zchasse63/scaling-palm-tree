// Wraps a POST <form> around a sign-out button so a third-party <img src="/signout">
// can't trivially destroy a customer's session via CSRF.

import type { ReactNode, CSSProperties } from "react";

interface SignOutButtonProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function SignOutButton({
  children,
  className,
  style,
  ariaLabel,
}: SignOutButtonProps) {
  return (
    <form method="POST" action="/signout" style={{ display: "inline-flex" }}>
      <button
        type="submit"
        className={className}
        style={style}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    </form>
  );
}
