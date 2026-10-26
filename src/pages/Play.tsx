import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Heart, Link2, MessageCircle, RotateCcw, Users } from 'lucide-react';
import { Logo } from '@/components/ui/animated-logo';
import { LevelTiles } from '@/components/game/LevelTiles';
import { PhysicalCard } from '@/components/game/PhysicalCard';
import { getSparkSample } from '@/lib/dailySpark';

const review = import.meta.env.VITE_TABLE_PREVIEW === 'true';
// Existing editorial samples only. These are NOT the production level catalog.
const samples = [[0, 7, 12], [22, 28, 33], [40, 47, 51], [54, 58, 59]];
type Stage = 'connect' | 'invite' | 'join' | 'levels' | 'cards' | 'done';

export default function Play() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('connect');
  const [level, setLevel] = useState(1);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [stage]);
  const levels = [1, 2, 3, 4].map(id => ({ id, title: t(`levels.level${id}Name`), description: t(`closeFlow.level${id}`) }));
  const questions = getSparkSample(i18n.language, samples[level - 1]);
  const connect = (joining: boolean) => {
    if (review) setStage(joining ? 'join' : 'invite');
    else navigate(joining ? '/join-room' : '/create-room');
  };
  const choose = (id: number) => { setLevel(id); setIndex(0); setRevealed(false); setFavorite(false); setStage('cards'); };
  const next = () => {
    if (index === questions.length - 1) setStage('done');
    else { setIndex(index + 1); setRevealed(false); setFavorite(false); }
  };
  const back = () => setStage(stage === 'cards' || stage === 'done' ? 'levels' : 'connect');
  return <div className="close-experience">
    <header className="close-header">
      {stage === 'connect' ? <Link className="close-icon" to="/" aria-label={t('common.backToHome')}><ArrowLeft size={20} /></Link>
        : <button className="close-icon" onClick={back} aria-label={t('closeFlow.back')}><ArrowLeft size={20} /></button>}
      <Logo size="small" className="close-logo" />
      <select className="close-language" aria-label={t('together.language')} value={i18n.language.split('-')[0]} onChange={e => i18n.changeLanguage(e.target.value)}>
        <option value="pt">PT</option><option value="es">ES</option><option value="en">EN</option><option value="fr">FR</option>
      </select>
    </header>
    {review && <p className="close-review-note">{t('closeFlow.review')}</p>}

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

    {stage === 'cards' && <main className="close-game close-narrow">
      <div className="close-game-top"><h1 ref={heading} tabIndex={-1}>{t('closeFlow.cardSample')}</h1><button className="close-text-button" onClick={() => setStage('levels')}>{t('closeFlow.changeLevel')}</button></div>
      <PhysicalCard key={`${level}:${index}`} label={t(`levels.level${level}Name`)} footer={`${index + 1} / ${questions.length}`} tone={level - 1} revealed={revealed} onReveal={() => setRevealed(true)} revealLabel={t('closeFlow.reveal')}><p>{questions[index]}</p></PhysicalCard>
      <p className="close-card-instruction" aria-live="polite">{t(revealed ? 'closeFlow.answer' : 'closeFlow.revealHint')}</p>
      <div className="close-game-actions"><button className="close-icon" aria-label={t('closeFlow.favorite')} aria-pressed={favorite} onClick={() => setFavorite(!favorite)} disabled={!revealed}><Heart size={22} fill={favorite ? 'currentColor' : 'none'} /></button>
        <button className="close-primary" onClick={revealed ? next : () => setRevealed(true)}>{t(revealed ? 'closeFlow.next' : 'closeFlow.reveal')}<ArrowRight size={18} /></button>
        <button className="close-text-button" onClick={next}>{t('closeFlow.skip')}</button></div>
      <p className="close-small">{t('closeFlow.samplesOnly')}</p>
    </main>}

    {stage === 'done' && <main className="close-room close-narrow"><Heart className="mx-auto text-primary" size={40} /><h1 ref={heading} tabIndex={-1}>{t('closeFlow.done')}</h1><p className="close-subtitle">{t('closeFlow.doneText')}</p><button className="close-primary" onClick={() => setStage('levels')}><RotateCcw size={18} />{t('closeFlow.changeLevel')}</button></main>}
    <footer className="close-footer">LET’S GET CLOSE <span>·</span> letsgetclose.com</footer>
  </div>;
}
