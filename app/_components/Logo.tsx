type Props = {
  size?: number;
  className?: string;
  title?: string;
};

export function Logo({ size = 32, className, title = 'Sienovo Marine' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M6 14 L26 14 L23 19 L9 19 Z" fill="currentColor" />
      <rect x="14.5" y="9" width="3" height="5" rx="0.5" fill="currentColor" />
      <path
        d="M4 23 Q8 21 12 23 T20 23 T28 23"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M4 27 Q8 25 12 27 T20 27 T28 27"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function LogoLockup({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`logo-lockup${className ? ` ${className}` : ''}`}>
      <Logo size={size} />
      <span className="logo-wordmark">
        Sienovo<span className="logo-wordmark-accent">Marine</span>
      </span>
    </span>
  );
}
