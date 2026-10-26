import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type Feeling = 'closer' | 'discovery' | 'desire' | 'uncomfortable';
export type Pace = 'lighter' | 'same' | 'deeper';
export interface RoundSignal {
  feeling: Feeling | null;
  pace: Pace | null;
  // Reserved for compatibility. Notes are no longer requested during a round.
  note: string | null;
}
const feelings = [
  { value: 'closer', emoji: '🥰' },
  { value: 'discovery', emoji: '🤩' },
  { value: 'desire', emoji: '🔥' },
  { value: 'uncomfortable', emoji: '😕' },
] as const;
const paces = [{ value: 'lighter', emoji: '🌿' }, { value: 'same', emoji: '👌' }, { value: 'deeper', emoji: '✨' }] as const;

/** Explicit self-reports, never prefilled ratings of a partner's honesty. */
export function RoundFeedback({ active, onSubmit, onClose }: { active: boolean; onSubmit: (signal: RoundSignal) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [pace, setPace] = useState<Pace | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (active) heading.current?.focus({ preventScroll: true }); }, [active]);
  return <div className="card-response">
    <div className="card-response-top"><button className="close-icon" onClick={onClose} aria-label={t('intelligentPlay.resume')}><ArrowLeft size={20} /></button><span>{t('intelligentPlay.yourMoment')}</span><span aria-hidden="true">✧</span></div>
    <div className="card-response-body">
      <h2 ref={heading} tabIndex={-1}>{t('intelligentPlay.feedbackTitle')}</h2>
      <p className="card-response-subtitle">{t('intelligentPlay.feedbackSubtitle')}</p>
      <fieldset><legend className="sr-only">{t('intelligentPlay.feelingPrompt')}</legend><div className="card-feelings">
        {feelings.map(({ value, emoji }) => <button key={value} type="button" aria-pressed={feeling === value} onClick={() => setFeeling(feeling === value ? null : value)}><span className="feeling-emoji" aria-hidden="true">{emoji}</span><span>{t(`intelligentPlay.${value}`)}</span></button>)}
      </div></fieldset>
      <fieldset className="card-pace-field"><legend>{t('intelligentPlay.pacePrompt')}</legend><div className="card-paces">
        {paces.map(({ value, emoji }) => <button key={value} type="button" aria-pressed={pace === value} onClick={() => setPace(pace === value ? null : value)}><span aria-hidden="true">{emoji}</span><span>{t(`intelligentPlay.${value}`)}</span></button>)}
      </div></fieldset>
    </div>
    <div className="card-response-bottom"><button className="close-primary" onClick={() => onSubmit({ feeling, pace, note: null })}>{t(feeling || pace ? 'intelligentPlay.continue' : 'intelligentPlay.skipFeedback')}<ArrowRight size={17} /></button><p className="round-preview-note">{t('intelligentPlay.localOnly')}</p></div>
  </div>;
}
