import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowRight, MoreHorizontal, Sparkles, Heart, Flame, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/animated-logo';

interface Props {
  label: string;
  progress: string;
  tone: number;
  question: string;
  content?: ReactNode;
  sharedTurn?: boolean;
  extraAction?: ReactNode;
  asker: 1 | 2;
  respondent: 1 | 2;
  revealed: boolean;
  responding: boolean;
  onReveal: () => void;
  onRespond: () => void;
  onSkip: () => void;
  onOptions: () => void;
  children: ReactNode;
}

/** Both sides belong to one physical object; feedback never opens an overlay. */
export function ImmersiveCard({ label, progress, tone, asker, respondent, question, content, sharedTurn, extraAction, revealed, responding, onReveal, onRespond, onSkip, onOptions, children }: Props) {
  const { t } = useTranslation();
  const questionRef = useRef<HTMLParagraphElement>(null);
  const Icon = [Sparkles, Heart, Flame, Zap][tone] ?? Sparkles;
  useEffect(() => {
    if (revealed && !responding) questionRef.current?.focus({ preventScroll: true });
  }, [revealed, responding, question]);
  return <div className="tactile-deck" data-tone={tone}>
    <div className="tactile-turn" data-responding={responding}>
      <section className="tactile-face tactile-question-face" aria-hidden={responding} {...{ inert: responding ? '' : undefined }}>
        <div className="tactile-heading"><span><Icon size={15} aria-hidden="true" />{label}</span><button className="close-icon" onClick={onOptions} aria-label={t('intelligentPlay.options')}><MoreHorizontal size={22} /></button></div>
        {sharedTurn ? <div className="tactile-roles"><span className="tactile-person" aria-hidden="true">1</span><span className="variation-kicker">{t('variations.together')}</span><span className="tactile-person" aria-hidden="true">2</span></div> : <div className="tactile-roles" aria-label={t('intelligentPlay.turnDescription', { asker, respondent })}>
          <span className="tactile-role"><span className="tactile-person" aria-hidden="true">{asker}</span><span><strong>{t('intelligentPlay.person', { number: asker })}</strong><small>{t('intelligentPlay.asks')}</small></span></span>
          <ArrowRight size={15} aria-hidden="true" />
          <span className="tactile-role"><span className="tactile-person" aria-hidden="true">{respondent}</span><span><strong>{t('intelligentPlay.person', { number: respondent })}</strong><small>{t('intelligentPlay.answers')}</small></span></span>
        </div>}
        <div className={`tactile-question ${revealed ? 'is-revealed' : ''} ${content && revealed ? 'has-variation' : ''}`}>
          {revealed ? content ?? <p ref={questionRef} tabIndex={-1}>{question}</p> : <button className="tactile-cover" onClick={onReveal} aria-label={t('closeFlow.reveal')}><Logo size="large" className="tactile-logo" /><span>FROM CUTE TO WILD. ONE GAME.</span></button>}
        </div>
        <span className="tactile-number">{progress}</span>
        <div className="tactile-actions"><button className="close-text-button" onClick={onSkip}>{t('closeFlow.skip')}</button>{revealed && extraAction}{(!content || !revealed) && <button className="close-primary" onClick={revealed ? onRespond : onReveal}>{t(revealed ? 'intelligentPlay.responseReady' : 'closeFlow.reveal')}<ArrowRight size={17} /></button>}</div>
      </section>
      <section className="tactile-face tactile-response-face" aria-hidden={!responding} {...{ inert: !responding ? '' : undefined }}>{children}</section>
    </div>
  </div>;
}
