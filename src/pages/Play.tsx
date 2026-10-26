import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Heart, Link2, MessageCircle, RotateCcw, Users } from 'lucide-react';
import { Logo } from '@/components/ui/animated-logo';
import { LevelTiles } from '@/components/game/LevelTiles';
import { PhysicalCard } from '@/components/game/PhysicalCard';
import { ImmersiveCard } from '@/components/game/ImmersiveCard';
import { RoundFeedback, type RoundSignal } from '@/components/game/RoundFeedback';
import { useActiveCardTime } from '@/hooks/useActiveCardTime';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getSparkSample } from '@/lib/dailySpark';

const review = import.meta.env.VITE_TABLE_PREVIEW === 'true';
// Existing editorial samples only. These are NOT the production level catalog.
const samples = [[0, 7, 12], [22, 28, 33], [40, 47, 51], [54, 58, 59]];
type Stage = 'connect' | 'invite' | 'join' | 'levels' | 'cards' | 'done';

export default function Play() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('connect');
  const [run, setRun] = useState(0);
  const [level, setLevel] = useState(1);
  const [index, setIndex] = useState(0);
  const [asker, setAsker] = useState<1 | 2>(1);
  const respondent = asker === 1 ? 2 : 1;
  const [revealed, setRevealed] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rounds, setRounds] = useState<Array<RoundSignal & { cardId: number; activeVisibleMs: number; skipped: boolean; asker: 1 | 2; respondent: 1 | 2; feedbackPerspective: 'listener' }>>([]);
  const readTime = useActiveCardTime(`${run}:${level}:${index}`, stage === 'cards' && revealed && !feedbackOpen && !menuOpen);
  const exposure = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [stage]);
  const levels = [1, 2, 3, 4].map(id => ({ id, title: t(`levels.level${id}Name`), description: t(`closeFlow.level${id}`) }));
  const questions = getSparkSample(i18n.language, samples[level - 1]);
  const connect = (joining: boolean) => {
    if (review) setStage(joining ? 'join' : 'invite');
    else navigate(joining ? '/join-room' : '/create-room');
  };
  const choose = (id: number) => { setRun(value => value + 1); setLevel(id); setIndex(0); setAsker(1); setRevealed(false); setRounds([]); setStage('cards'); };
  const next = () => {
    if (index === questions.length - 1) setStage('done');
    else { setIndex(index + 1); setRevealed(false); }
  };
  const finishCard = (signal: RoundSignal, skipped = false) => {
    setRounds(previous => [...previous, { ...signal, cardId: samples[level - 1][index], activeVisibleMs: exposure.current, skipped, asker, respondent, feedbackPerspective: 'listener' }]);
    setFeedbackOpen(false);
    // Replacing an unwanted card keeps the same person's opportunity to answer.
    if (!skipped) setAsker(respondent);
    next();
  };
  const requestFeedback = () => { exposure.current = readTime(); setFeedbackOpen(true); };
  const skipCard = () => { exposure.current = revealed ? readTime() : 0; finishCard({ feeling: null, pace: null, note: null }, true); };
  const back = () => setStage(stage === 'cards' || stage === 'done' ? 'levels' : 'connect');
  return <div className={`close-experience ${stage === 'cards' ? 'close-immersive' : ''}`}>
    {stage !== 'cards' && <header className="close-header">
      {stage === 'connect' ? <Link className="close-icon" to="/" aria-label={t('common.backToHome')}><ArrowLeft size={20} /></Link>
        : <button className="close-icon" onClick={back} aria-label={t('closeFlow.back')}><ArrowLeft size={20} /></button>}
      <Logo size="small" className="close-logo" />
      <select className="close-language" aria-label={t('together.language')} value={i18n.language.split('-')[0]} onChange={e => i18n.changeLanguage(e.target.value)}>
        <option value="pt">PT</option><option value="es">ES</option><option value="en">EN</option><option value="fr">FR</option>
      </select>
    </header>}
    {review && stage !== 'cards' && <p className="close-review-note">{t('closeFlow.review')}</p>}

    {stage === 'connect' && <main className="close-connect">
      <section className="close-intro">
        <p className="close-eyebrow">FROM CUTE TO WILD. ONE GAME.</p>
        <h1 ref={heading} tabIndex={-1}>{t('closeFlow.title')}</h1>
        <p className="close-subtitle">{t('closeFlow.subtitle')}</p>
        <div className="close-connect-actions">
          <button className="close-primary" onClick={() => connect(false)}><Link2 size={19} />{t('closeFlow.create')}<ArrowRight size={19} /></button>
          <button className="close-secondary" onClick={() => connect(true)}><MessageCircle size={19} />{t('closeFlow.join')}</button>
        </div>
        <p className="close-small">{t('closeFlow.steps')}</p>
        {!review && <Link className="close-text-button" to="/together">{t('closeFlow.onePhone')}</Link>}
      </section>
      <div className="close-hero-card">
        <PhysicalCard label={t('levels.level2Name')} footer="02" tone={1} revealed={false} onReveal={() => connect(false)} revealLabel={t('closeFlow.create')}><p>{getSparkSample(i18n.language, [22])[0]}</p></PhysicalCard>
        <span className="close-card-caption">{t('closeFlow.cardCaption')}</span>
      </div>
    </main>}

    {(stage === 'invite' || stage === 'join') && <main className="close-room close-narrow">
      <div className="close-pair" aria-hidden="true"><span><Heart size={25} /></span><span><Users size={25} /></span></div>
      <h1 ref={heading} tabIndex={-1}>{t(stage === 'invite' ? 'closeFlow.inviteTitle' : 'closeFlow.joinTitle')}</h1>
      <p className="close-subtitle">{t(stage === 'invite' ? 'closeFlow.inviteText' : 'closeFlow.joinText')}</p>
      <div className="close-invite-placeholder"><Link2 size={24} /><p>{t('closeFlow.previewInvite')}</p></div>
      <button className="close-primary" onClick={() => setStage('levels')}>{t('closeFlow.previewContinue')}<ArrowRight size={18} /></button>
    </main>}

    {stage === 'levels' && <main className="close-selection">
      <p className="close-eyebrow">{t('closeFlow.yourRhythm')}</p>
      <h1 ref={heading} tabIndex={-1}>{t('closeFlow.chooseTitle')}</h1>
      <p className="close-subtitle">{t('closeFlow.chooseText')}</p>
      <LevelTiles levels={levels} onSelect={choose} />
      <p className="close-small">{t('closeFlow.limits')}</p>
    </main>}

    {stage === 'cards' && <main className="immersive-table" aria-label={t('intelligentPlay.gameLabel')}>
      <ImmersiveCard key={`${run}:${level}:${index}`} label={t(`levels.level${level}Name`)} progress={`${index + 1} / ${questions.length}`} tone={level - 1} asker={asker} respondent={respondent} question={questions[index]} revealed={revealed} responding={feedbackOpen} onReveal={() => setRevealed(true)} onRespond={requestFeedback} onSkip={skipCard} onOptions={() => setMenuOpen(true)}>
        <RoundFeedback participantName={t('intelligentPlay.person', { number: asker })} active={feedbackOpen} onSubmit={finishCard} onClose={() => setFeedbackOpen(false)} />
      </ImmersiveCard>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}><DialogContent className="round-feedback">
        <DialogTitle>{t('intelligentPlay.options')}</DialogTitle><DialogDescription>{t('intelligentPlay.previewExplanation')}</DialogDescription>
        <button className="close-primary" onClick={() => setMenuOpen(false)}>{t('intelligentPlay.resume')}</button>
        <button className="close-secondary" onClick={() => { setMenuOpen(false); setStage('levels'); }}>{t('closeFlow.changeLevel')}</button>
        <button className="close-text-button" onClick={() => { setMenuOpen(false); setStage('done'); }}>{t('intelligentPlay.finish')}</button>
      </DialogContent></Dialog>
    </main>}

    {stage === 'done' && <main className="close-room close-narrow"><Heart className="mx-auto text-primary" size={40} /><h1 ref={heading} tabIndex={-1}>{t('closeFlow.done')}</h1><p className="close-subtitle">{t('intelligentPlay.previewSummary', { count: rounds.filter(round => round.feeling || round.pace || round.note).length })}</p><button className="close-primary" onClick={() => setStage('levels')}><RotateCcw size={18} />{t('closeFlow.changeLevel')}</button></main>}
    {stage !== 'cards' && <footer className="close-footer">LET’S GET CLOSE <span>·</span> letsgetclose.com</footer>}
  </div>;
}
