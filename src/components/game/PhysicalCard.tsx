import { useEffect, useRef, type ReactNode } from 'react';
import { Heart } from 'lucide-react';

interface PhysicalCardProps {
  children: ReactNode;
  label: string;
  footer: string;
  revealed?: boolean;
  onReveal?: () => void;
  revealLabel?: string;
  tone?: number;
}

/** One paper surface shared by table play and synchronized rooms. */
export function PhysicalCard({ children, label, footer, revealed = true, onReveal, revealLabel, tone = 0 }: PhysicalCardProps) {
  const face = useRef<HTMLDivElement>(null);
  const previous = useRef(revealed);
  useEffect(() => {
    if (revealed && !previous.current && onReveal) face.current?.focus();
    previous.current = revealed;
  }, [revealed, onReveal]);
  return (
    <div className="physical-deck" data-tone={tone}>
      <div className="physical-card" data-revealed={revealed}>
        <div ref={face} tabIndex={-1} role="group" aria-label={label} className="physical-card-front" aria-hidden={!revealed}>
          <div className="physical-card-heading"><Heart size={18} aria-hidden="true" /><span>{label}</span><span aria-hidden="true">✦</span></div>
          <div className="physical-card-question">{children}</div>
          <div className="physical-card-footer"><span>LET’S GET CLOSE</span><span>{footer}</span></div>
        </div>
        {!revealed && <button type="button" className="physical-card-back" onClick={onReveal} aria-label={revealLabel}>
          <span className="card-back-orbit" aria-hidden="true"><Heart strokeWidth={0.8} size={68} /></span>
          <span className="font-display text-4xl leading-tight">Let’s get<br /><em>close.</em></span>
          <span className="mt-10 text-xs tracking-[.16em] uppercase">{revealLabel}</span>
        </button>}
      </div>
    </div>
  );
}
