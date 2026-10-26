import { useEffect, useRef, type ReactNode } from 'react';
import { Heart, Sparkles, Flame, Zap } from 'lucide-react';
import { Logo } from '@/components/ui/animated-logo';

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
  const Icon = [Sparkles, Heart, Flame, Zap][tone] || Heart;
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
          <div className="physical-card-heading"><Icon size={18} aria-hidden="true" /><span>{label}</span><span aria-hidden="true">✦</span></div>
          <div className="physical-card-question">{children}</div>
          <div className="physical-card-footer"><Logo size="small" className="physical-card-logo" /><span>{footer}</span></div>
        </div>
        {!revealed && <button type="button" className="physical-card-back" onClick={onReveal} aria-label={revealLabel}>
          <span className="card-back-level"><Icon size={20} aria-hidden="true" />{label}</span>
          <Logo size="large" className="physical-back-logo" />
          <span className="card-back-tagline">FROM CUTE TO WILD.</span>
          <span className="mt-10 text-xs tracking-[.16em] uppercase">{revealLabel}</span>
        </button>}
      </div>
    </div>
  );
}
