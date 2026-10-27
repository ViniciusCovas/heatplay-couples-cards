import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart, RotateCcw } from 'lucide-react';
import { Logo } from '@/components/ui/animated-logo';
import { LevelTiles } from '@/components/game/LevelTiles';
import { ImmersiveCard } from '@/components/game/ImmersiveCard';
import { RoundFeedback, type RoundSignal } from '@/components/game/RoundFeedback';
import { useActiveCardTime } from '@/hooks/useActiveCardTime';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChoiceVariation, ActionVariation, ClosingVariation } from '@/components/game/VariationCard';
import { previewSequence, keepsakeText, type SessionMoment, type VariationKind, type VariationOutcome } from '@/lib/cardVariations';
import { cardContext, feedbackComplete } from '@/lib/levelDeck';
import { track } from '@/lib/analytics';
import { getLocalPlayCopy } from '@/lib/localPlayCopy';

// A self-contained, one-phone session; connected rooms remain a separate product path.
type Stage = 'levels' | 'cards' | 'done';

export default function Play() {
  const { t, i18n } = useTranslation();
  const copy = getLocalPlayCopy(i18n.language);
  const [stage, setStage] = useState<Stage>('levels');
  const [run, setRun] = useState(0);
  const [level, setLevel] = useState(1);
  const [index, setIndex] = useState(0);
  const [followup, setFollowup] = useState(false);
  const [keepsake, setKeepsake] = useState<SessionMoment | null>(null);
  const kind = previewSequence[index];
  const questionIndex = Math.max(0, previewSequence.slice(0, index + 1).filter(item => item === 'conversation').length - 1);
  const [asker, setAsker] = useState<1 | 2>(1);
  const respondent = asker === 1 ? 2 : 1;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rounds, setRounds] = useState<Array<RoundSignal & { cardId: string; level: number; topic: string; catalogVersion: string; activeVisibleMs: number; skipped: boolean; asker: 1 | 2; respondent: 1 | 2; feedbackPerspective: 'listener' | null; kind: VariationKind; question: string; followedUp: boolean; outcome?: VariationOutcome }>>([]);
  const readTime = useActiveCardTime(`${run}:${level}:${index}`, stage === 'cards' && !feedbackOpen && !menuOpen);
  const exposure = useRef(0);
  const firstCardCompleted = useRef(false);
  const gameCompleted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [stage]);
  const levels = [1, 2, 3, 4].map(id => ({ id, title: t(`levels.level${id}Name`), description: t(`closeFlow.level${id}`) }));
  const questions = [0, 1, 2, 3].map(position => t(`variations.levels.${level}.questions.${position}`));
  const choose = (id: number) => {
    firstCardCompleted.current = false;
    gameCompleted.current = false;
    setRun(value => value + 1);
    setLevel(id);
    setIndex(0);
    setFollowup(false);
    setKeepsake(null);
    setAsker(1);
    setRounds([]);
    setFeedbackOpen(false);
    setMenuOpen(false);
    setStage('cards');
    // Funnel events deliberately omit the level, card, responses and relationship signals.
    track('game_started');
  };
  const next = () => {
    if (index === previewSequence.length - 1) setStage('done');
    else { setIndex(index + 1); setFollowup(false); }
  };
  const finishCard = (signal: RoundSignal, skipped = false, outcome?: VariationOutcome) => {
    if (!skipped && kind === 'conversation' && !feedbackComplete(signal)) return;
    if (!skipped && !firstCardCompleted.current) {
      firstCardCompleted.current = true;
      track('first_card_completed');
    }
    if (!skipped && index === previewSequence.length - 1 && !gameCompleted.current) {
      gameCompleted.current = true;
      track('game_completed');
    }
    setRounds(previous => [...previous, { ...signal, cardId: kind === 'closing' ? `editorial-v2:${level}:closing` : cardContext(level, kind, kind === 'conversation' ? questionIndex : 0).cardKey, level, topic: cardContext(level, 'conversation').topic, catalogVersion: 'editorial-v2', activeVisibleMs: exposure.current, skipped, asker, respondent, feedbackPerspective: kind === 'conversation' ? 'listener' : null, kind, question: kind === 'conversation' ? questions[questionIndex] : kind === 'closing' ? t('variations.closing.title') : t(`variations.levels.${level}.${kind === 'action' ? 'actionTitle' : `${kind}Title`}`), followedUp: followup, outcome }]);
    setFeedbackOpen(false);
    // Replacing an unwanted card keeps the same person's opportunity to answer.
    if (!skipped) setAsker(respondent);
    next();
  };
  const requestFeedback = () => { exposure.current = readTime(); setFeedbackOpen(true); };
  const skipCard = () => { exposure.current = readTime(); finishCard({ feeling: null, pace: null, note: null }, true); };
  const completeVariation = (outcome?: VariationOutcome) => { exposure.current = readTime(); finishCard({ feeling: null, pace: null, note: null }, false, outcome); };
  const moments = rounds.filter(round => round.kind === 'conversation' && !round.skipped).map(round => ({ id: String(round.cardId), question: round.question }));
  const downloadKeepsake = () => {
    if (!keepsake) return;
    const url = URL.createObjectURL(new Blob([keepsakeText(keepsake, i18n.language)], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'lets-get-close-moment.txt'; anchor.hidden = true; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const variation = kind === 'guess' || kind === 'match' ? <ChoiceVariation level={level} kind={kind} asker={asker} respondent={respondent} onComplete={completeVariation} />
    : kind === 'action' ? <ActionVariation level={level} onComplete={() => completeVariation()} />
    : kind === 'closing' ? <ClosingVariation moments={moments} onComplete={moment => { setKeepsake(moment); completeVariation(); }} /> : undefined;
  const back = () => setStage('levels');
  return <div className={`close-experience ${stage === 'cards' ? 'close-immersive' : ''}`}>
    {stage !== 'cards' && <header className="close-header">
      {stage === 'levels' ? <Link className="close-icon" to="/" aria-label={t('common.backToHome')}><ArrowLeft size={20} /></Link>
        : <button className="close-icon" onClick={back} aria-label={t('closeFlow.back')}><ArrowLeft size={20} /></button>}
      <Logo size="small" className="close-logo" />
      <select className="close-language" aria-label={t('together.language')} value={i18n.language.split('-')[0]} onChange={e => i18n.changeLanguage(e.target.value)}>
        <option value="pt">PT</option><option value="es">ES</option><option value="en">EN</option><option value="fr">FR</option>
      </select>
    </header>}
    {stage !== 'cards' && <p className="close-review-note">{copy.mode}</p>}

    {stage === 'levels' && <main className="close-selection">
      <p className="close-eyebrow">{t('closeFlow.yourRhythm')}</p>
      <h1 ref={heading} tabIndex={-1}>{t('closeFlow.chooseTitle')}</h1>
      <p className="close-subtitle">{copy.choose}</p>
      <LevelTiles levels={levels} onSelect={choose} />
      <p className="close-small">{t('closeFlow.limits')}</p>
    </main>}

    {stage === 'cards' && <main className="immersive-table" aria-label={t('intelligentPlay.gameLabel')}>
      <ImmersiveCard key={`${run}:${level}:${index}`} label={t(`levels.level${level}Name`)} progress={`${index + 1} / ${previewSequence.length}`} tone={level - 1} asker={asker} respondent={respondent} question={followup ? t(`variations.levels.${level}.followups.${questionIndex}`) : questions[questionIndex]} content={variation} sharedTurn={kind === 'match' || kind === 'action' || kind === 'closing'} extraAction={kind === 'conversation' ? <button className="close-text-button tactile-stay" onClick={() => setFollowup(previous => !previous)}>{t(followup ? 'variations.stay.back' : 'variations.stay.button')}</button> : undefined} responding={feedbackOpen} onRespond={requestFeedback} onSkip={skipCard} onOptions={() => setMenuOpen(true)}>
        <RoundFeedback participantName={t('intelligentPlay.person', { number: asker })} active={feedbackOpen} onSubmit={finishCard} onClose={() => setFeedbackOpen(false)} />
      </ImmersiveCard>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}><DialogContent className="round-feedback">
        <DialogTitle>{t('intelligentPlay.options')}</DialogTitle><DialogDescription>{t('intelligentPlay.previewExplanation')}</DialogDescription>
        <button className="close-primary" onClick={() => setMenuOpen(false)}>{t('intelligentPlay.resume')}</button>
        <button className="close-secondary" onClick={() => { setMenuOpen(false); setStage('levels'); }}>{t('closeFlow.changeLevel')}</button>
        <button className="close-text-button" onClick={() => { setMenuOpen(false); setStage('done'); }}>{t('intelligentPlay.finish')}</button>
      </DialogContent></Dialog>
    </main>}

    {stage === 'done' && <main className="close-room close-narrow">
      <Heart className="mx-auto text-primary" size={40} />
      <h1 ref={heading} tabIndex={-1}>{copy.doneTitle}</h1>
      <p className="close-subtitle">{copy.summary(rounds.filter(round => !round.skipped).length)}</p>
      {keepsake && <div className="keepsake-card">
        <span aria-hidden="true">💌</span>
        <h2>{t('variations.closing.title')}</h2>
        <p>{keepsake.question}</p>
        <button className="close-secondary" onClick={downloadKeepsake}>{t('variations.download')}</button>
        <small>{t('variations.localMemory')}</small>
      </div>}
      <button className="close-primary" onClick={() => setStage('levels')}><RotateCcw size={18} />{copy.replay}</button>
      <p className="close-small">{copy.limitations}</p>
    </main>}
    {stage !== 'cards' && <footer className="close-footer">LET’S GET CLOSE <span>·</span> letsgetclose.com</footer>}
  </div>;
}
