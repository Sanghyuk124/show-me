type P = { className?: string; strokeWidth?: number };

/** 프로토타입의 사람(아바타) 아이콘 */
export function PersonIcon({ className, strokeWidth = 1.6 }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="6" r="3" />
      <path d="M6 21v-5a6 6 0 0 1 12 0v5" />
      <path d="M10 21v-6M14 21v-6" />
    </svg>
  );
}

/** 프로토타입의 옷장 아이콘 */
export function ClosetIcon({ className, strokeWidth = 1.6 }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <path d="M12 3.5v17M9.5 10.5v3M14.5 10.5v3" />
    </svg>
  );
}
