import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Sparkles, Heart, Flame, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cardContext, type CardLevel } from '@/lib/levelDeck';
import { track } from '@/lib/analytics';
import './hero-deck.css';

/** The same four accents used on the cards in Play. */
const HEAT_STYLE = {
  1: { dot: '#257157', ink: '#257157', wash: '#edf8f1', tint: 'linear-gradient(155deg, #edf8f1, #fff 65%)', line: '#cce4d7', glow: '#25715722', levelKey: 'levels.level1Name' },
  2: { dot: '#8544aa', ink: '#8544aa', wash: '#f5edff', tint: 'linear-gradient(155deg, #f5edff, #fff 65%)', line: '#e0cdeb', glow: '#8544aa22', levelKey: 'levels.level2Name' },
  3: { dot: '#be3a38', ink: '#be3a38', wash: '#fff0eb', tint: 'linear-gradient(155deg, #fff0eb, #fff 65%)', line: '#f0cec7', glow: '#be3a3822', levelKey: 'levels.level3Name' },
  4: { dot: '#4166ba', ink: '#4166ba', wash: '#edf2ff', tint: 'linear-gradient(155deg, #edf2ff, #fff 65%)', line: '#cbd8f3', glow: '#4166ba22', levelKey: 'levels.level4Name' },
} as const;

const copy = {
  es: { sample: 'Pruébenlo. Esta carta es para ustedes.', levels: 'Elijan su nivel', turn: 'Yo pregunto. Tú respondes.', ready: 'Ya respondimos', another: 'Otra carta', back: 'Volver a la pregunta', reaction: '¿Qué te dejó esta carta?', privacy: 'Solo una muestra. Tu reacción no se guarda.', deeper: 'Hay más detrás de esa respuesta.', lighter: 'Su ritmo siempre va primero.', lighterBody: 'Pueden cambiar de nivel, pasar una carta o parar.', follow: 'Una pregunta para seguir', play: 'Seguir jugando juntos', count: 'Carta {{number}} de 4' },
  en: { sample: 'Try it. This card is for you two.', levels: 'Choose your level', turn: 'I ask. You answer.', ready: 'We answered', another: 'Another card', back: 'Back to the question', reaction: 'How did this card feel?', privacy: 'Just a sample. Your reaction is not saved.', deeper: 'There is more behind that answer.', lighter: 'Your pace always comes first.', lighterBody: 'You can change level, pass a card, or stop.', follow: 'A question to keep talking', play: 'Keep playing together', count: 'Card {{number}} of 4' },
  pt: { sample: 'Experimentem. Esta carta é de vocês.', levels: 'Escolham o nível', turn: 'Eu pergunto. Você responde.', ready: 'Já respondemos', another: 'Outra carta', back: 'Voltar à pergunta', reaction: 'Como foi esta carta para você?', privacy: 'Só uma amostra. Sua reação não é salva.', deeper: 'Tem mais por trás dessa resposta.', lighter: 'O ritmo de vocês vem primeiro.', lighterBody: 'Vocês podem mudar de nível, pular uma carta ou parar.', follow: 'Uma pergunta para continuar', play: 'Continuar jogando juntos', count: 'Carta {{number}} de 4' },
  fr: { sample: 'Essayez. Cette carte est pour vous deux.', levels: 'Choisissez votre niveau', turn: 'Je demande. Tu réponds.', ready: 'On a répondu', another: 'Une autre carte', back: 'Revenir à la question', reaction: 'Que vous a fait ressentir cette carte ?', privacy: 'Un simple aperçu. Votre réaction n’est pas enregistrée.', deeper: 'Cette réponse peut en révéler davantage.', lighter: 'Votre rythme passe avant tout.', lighterBody: 'Vous pouvez changer de niveau, passer une carte ou arrêter.', follow: 'Une question pour continuer', play: 'Continuer à jouer ensemble', count: 'Carte {{number}} sur 4' },
};
const reactions = [
  { value: 'closer', emoji: '🥰' },
  { value: 'discovery', emoji: '🤩' },
  { value: 'desire', emoji: '🔥' },
  { value: 'uncomfortable', emoji: '😕' },
] as const;
const icons = { 1: Sparkles, 2: Heart, 3: Flame, 4: Zap };

/** A few seconds with an actual editorial card, before any account or setup. */
export function HeroDeck() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.language.split('-')[0] as keyof typeof copy;
  const words = copy[language] ?? copy.en;
  const [level, setLevel] = useState<CardLevel>(2);
  const [position, setPosition] = useState(0);
  const [stage, setStage] = useState<'question' | 'reaction' | 'followup'>('question');
  const [lighter, setLighter] = useState(false);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current === stage) return;
    previousStage.current = stage;
    questionRef.current?.focus({ preventScroll: true });
  }, [stage]);
  const start = useRef<{ x: number; y: number } | null>(null);
  const palette = HEAT_STYLE[level];
  const Icon = icons[level];
  const question = t(`variations.levels.${level}.questions.${position}`);
  const followup = t(`variations.levels.${level}.followups.${position}`);

  const another = () => {
    setPosition(previous => (previous + 1) % 4);
    setStage('question');
    setLighter(false);
    track('landing_demo_card_changed');
  };
  const chooseLevel = (next: CardLevel) => {
    setLevel(next);
    setPosition(0);
    setStage('question');
    setLighter(false);
    // Do not send level choices or intimate reactions to analytics.
    track('landing_demo_level_changed');
  };

  return <div className="hero-demo" id="try-card" style={{ '--demo-ink': palette.ink, '--demo-wash': palette.wash, '--demo-line': palette.line } as CSSProperties}>
    <p className="hero-demo-invite"><span aria-hidden="true">✦</span> {words.sample}</p>
    <div className="hero-demo-levels" role="group" aria-label={words.levels}>
      {([1, 2, 3, 4] as const).map(value => {
        const LevelIcon = icons[value];
        return <button key={value} type="button" aria-pressed={level === value} onClick={() => chooseLevel(value)} style={{ '--level-ink': HEAT_STYLE[value].ink, '--level-wash': HEAT_STYLE[value].wash } as CSSProperties}>
          <LevelIcon size={13} aria-hidden="true" /><span>{t(`levels.level${value}Name`)}</span>
        </button>;
      })}
    </div>
    <div className="hero-demo-stack">
      <article className="hero-demo-card" data-card-key={cardContext(level, 'conversation', position).cardKey}
        onPointerDown={event => { if ((event.target as HTMLElement).closest('button')) return; start.current = { x: event.clientX, y: event.clientY }; }}
        onPointerCancel={() => { start.current = null; }}
        onPointerUp={event => { const origin = start.current; start.current = null; if (origin && Math.abs(event.clientX - origin.x) > 70 && Math.abs(event.clientY - origin.y) < 45) another(); }}>
        <header className="hero-demo-brand">
          <img src="/lovable-uploads/385342b9-2cf5-4ed2-9d9c-54f0fe86b2f8.png" alt="Let's Get Close" width="68" height="32" />
          <span><Icon size={12} aria-hidden="true" />{t(`levels.level${level}Name`)}</span>
        </header>
        <div className="hero-demo-content" key={`${level}:${position}:${stage}`}>
          {stage === 'question' && <>
            <p className="hero-demo-turn"><span aria-hidden="true">1</span>{words.turn}<span aria-hidden="true">2</span></p>
            <p className="hero-demo-question" ref={questionRef} tabIndex={-1} aria-live="polite" aria-atomic="true">{question}</p>
            <button className="hero-demo-answer" type="button" onClick={() => { setStage('reaction'); track('landing_demo_answer_confirmed'); }}>{words.ready}<ArrowRight size={16} aria-hidden="true" /></button>
          </>}
          {stage === 'reaction' && <>
            <button type="button" className="hero-demo-back" onClick={() => setStage('question')}><ArrowLeft size={15} aria-hidden="true" />{words.back}</button>
            <p className="hero-demo-reaction-title" ref={questionRef} tabIndex={-1} role="status">{words.reaction}</p>
            <div className="hero-demo-reactions" role="group" aria-label={words.reaction}>{reactions.map(({ value, emoji }) => <button type="button" key={value} onClick={() => { setLighter(value === 'uncomfortable'); setStage('followup'); track('landing_demo_completed'); }}><span aria-hidden="true">{emoji}</span><span>{t(`intelligentPlay.${value}`)}</span></button>)}</div>
            <p className="hero-demo-privacy">{words.privacy}</p>
          </>}
          {stage === 'followup' && <>
            <p className="hero-demo-follow-label">{lighter ? words.lighter : words.follow}</p>
            <p className="hero-demo-question hero-demo-follow" ref={questionRef} tabIndex={-1} role="status">{lighter ? words.lighterBody : followup}</p>
            <button type="button" className="hero-demo-answer" onClick={() => { track('landing_cta_clicked', { section: 'demo_completed' }); navigate('/play'); }}>{words.play}<ArrowRight size={16} aria-hidden="true" /></button>
          </>}
        </div>
        <footer className="hero-demo-card-footer"><span aria-label={words.count.replace('{{number}}', String(position + 1))}>0{position + 1} / 04</span><button type="button" onClick={another}><RotateCw size={13} aria-hidden="true" />{words.another}</button></footer>
      </article>
    </div>
  </div>;
}
