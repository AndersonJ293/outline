interface LogoProps {
  size?: number;
}

/** Marca do Outline: um contorno quadrado com um nó de sketch no canto. */
export function Logo({ size = 18 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="3.5"
        y="3.5"
        width="14"
        height="14"
        rx="3"
        stroke="var(--accent)"
        strokeWidth="2.2"
      />
      <circle cx="17.5" cy="17.5" r="3.6" fill="var(--accent)" stroke="var(--bg-secondary)" strokeWidth="1.6" />
    </svg>
  );
}
