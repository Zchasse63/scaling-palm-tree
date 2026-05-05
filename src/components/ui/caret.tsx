interface CaretProps {
  size?: number;
  className?: string;
}

export function Caret({ size = 10, className = "" }: CaretProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden
      className={className}
    >
      <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
