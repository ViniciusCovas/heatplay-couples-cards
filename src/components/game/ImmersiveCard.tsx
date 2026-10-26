import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowRight, MoreHorizontal, Sparkles, Heart, Flame, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/animated-logo';

interface Props {
  label: string;
  progress: string;
  tone: number;
  question: string;
  revealed: boolean;
  responding: boolean;
  onReveal: () => void;
  onRespond: () => void;
  onSkip: () => void;
  onOptions: () => void;
  children: ReactNode;
}

/** Both sides belong to one physical object; feedback never opens an overlay. */
export function ImmersiveCard({ label, progress, tone, question, revealed, responding, onReveal, onRespond, onSkip, onOptions, children }: Props) {
  const { t } = useTranslation();
  const questionRef = useRef<HTMLParagraphElement>(null);
  const Icon = [Sparkles, Heart, Flame, Zap][tone] ?? Sparkles;
  useEffect(() => {
    if (revealed && !responding) questionRef.current?.focus({ preventScroll: true });
  }, [revealed, responding]);
  return <div className="tactile-deck" data-tone={tone}>
    <div className="tactile-turn" data-responding={responding}>
      <section className="tactile-face tactile-question-face" aria-hidden={responding} {...{ inert: responding ? '' : undefined }}>
        <div className="tactile-heading"><span><Icon size={15} aria-hidden="true" />{label}</span><button className="close-icon" onClick={onOptions} aria-label={t('intelligentPlay.options')}><MoreHorizontal size={22} /></button></div>
        <div className={`tactile-question ${revealed ? 'is-revealed' : ''}`}>
          {revealed ? <p ref={questionRef} tabIndex={-1}>{question}</p> : <button className="tactile-cover" onClick={onReveal} aria-label={t('closeFlow.reveal')}><Logo size="large" className="tactile-logo" /><span>FROM CUTE TO WILD. ONE GAME.</span></button>}
        </div>
        <span className="tactile-number">{progress}</span>
        <div className="tactile-actions"><button className="close-text-button" onClick={onSkip}>{t('closeFlow.skip')}</button><button className="close-primary" onClick={revealed ? onRespond : onReveal}>{t(revealed ? 'intelligentPlay.answered' : 'closeFlow.reveal')}<ArrowRight size={17} /></button></div>
      </section>
      <section className="tactile-face tactile-response-face" aria-hidden={!responding} {...{ inert: !responding ? '' : undefined }}>{children}</section>
    </div>
  </div>;
}
