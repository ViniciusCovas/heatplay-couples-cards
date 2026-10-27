import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { advanceChoices, emptyChoices, sharedChoices, variationOutcome, type VariationOutcome, type SessionMoment } from '@/lib/cardVariations';

import { cardContext, getLevelDeck } from '@/lib/levelDeck';

interface ChoiceProps { level: number; kind: 'guess' | 'match'; asker: 1 | 2; respondent: 1 | 2; onComplete: (outcome: VariationOutcome) => void }
export function ChoiceVariation({ kind, level, asker, respondent, onComplete }: ChoiceProps) {
  const { t } = useTranslation();
  const emoji: Record<string, string> = getLevelDeck(level)[kind];
  const options = Object.keys(emoji);
  const contentKey = `variations.levels.${level}`;
  const prompt = t(`${contentKey}.${kind}Title`);
  const optionLabel = (id: string) => t(`${contentKey}.${kind}Options.${id}`);
  const [state, setState] = useState(emptyChoices);
  const [selection, setSelection] = useState<string[]>([]);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [state.phase]);
  const isFirst = state.phase === 'first';
  const choosing = isFirst || state.phase === 'second';
  const matches = sharedChoices(state);
  const submit = () => {
    setState(previous => advanceChoices(previous, { type: 'submit', choices: selection }, options, kind === 'match'));
    setSelection([]);
  };
  const toggle = (value: string) => setSelection(previous => kind === 'guess' ? [value] : previous.includes(value) ? previous.filter(item => item !== value) : [...previous, value]);
  return <div className="variation-content">
    <p className="variation-kicker">{t(`variations.${kind}.badge`)}</p>
    <h2 ref={title} tabIndex={-1}>{state.phase === 'result' ? t(`variations.${kind}.${matches.length ? 'success' : 'different'}`) : prompt}</h2>
    {choosing && <>
      <p className="variation-instruction">{t(`variations.${kind}.${isFirst ? 'first' : 'second'}`, { person: isFirst ? asker : respondent })}</p>
      <div className="variation-options" role="group" aria-label={prompt}>{options.map(id => <button key={id} aria-pressed={selection.includes(id)} onClick={() => toggle(id)}><span aria-hidden="true">{emoji[id]}</span>{optionLabel(id)}</button>)}</div>
      <button className="close-primary" disabled={!selection.length} onClick={submit}>{t('variations.seal')}</button>
      <p className="variation-footnote">{t('variations.localPrivacy')}</p>
    </>}
    {state.phase === 'handoff' && <><span className="variation-symbol" aria-hidden="true">💌</span><p className="variation-instruction">{t('variations.handoff', { person: respondent })}</p><button className="close-primary" onClick={() => setState(previous => advanceChoices(previous, { type: 'accept-handoff' }, options, kind === 'match'))}>{t('variations.itsMe', { person: respondent })}</button></>}
    {state.phase === 'reveal' && <><span className="variation-symbol" aria-hidden="true">✨</span><p className="variation-instruction">{t('variations.ready')}</p><button className="close-primary" onClick={() => setState(previous => advanceChoices(previous, { type: 'reveal' }, options, kind === 'match'))}>{t('variations.reveal')}</button></>}
    {state.phase === 'result' && <>
      {kind === 'guess' ? <div className="variation-result-pair">{[state.first[0], state.second[0]].map((id, index) => <div key={index}><small>{t(index === 0 ? 'variations.prediction' : 'variations.answer')}</small><span aria-hidden="true">{emoji[id as keyof typeof emoji]}</span><strong>{optionLabel(id)}</strong></div>)}</div>
        : <div className="variation-matches">{matches.map(id => <span key={id}>{emoji[id as keyof typeof emoji]} {optionLabel(id)}</span>)}</div>}
      <p className="variation-instruction">{t(`variations.${kind}.conversation`)}</p>
      <button className="close-primary" onClick={() => { const outcome = variationOutcome(kind, state); if (outcome) onComplete({ ...outcome, ...cardContext(level, kind) }); }}>{t('variations.next')}</button>
    </>}
  </div>;
}

export function ActionVariation({ level, onComplete }: { level: number; onComplete: () => void }) {
  const { t } = useTranslation();
  return <div className="variation-content"><p className="variation-kicker">{t('variations.action.badge')}</p><span className="variation-symbol" aria-hidden="true">🫶</span><h2>{t(`variations.levels.${level}.actionTitle`)}</h2><p className="variation-instruction">{t(`variations.levels.${level}.actionBody`)}</p><p className="variation-footnote">{t('variations.action.permission')}</p><button className="close-primary" onClick={onComplete}>{t('variations.action.done')}</button></div>;
}

export function ClosingVariation({ moments, onComplete }: { moments: SessionMoment[]; onComplete: (moment: SessionMoment | null) => void }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [agreement, setAgreement] = useState<number[]>([]);
  return <div className="variation-content"><p className="variation-kicker">{t('variations.closing.badge')}</p><span className="variation-symbol" aria-hidden="true">💌</span><h2>{t('variations.closing.title')}</h2><p className="variation-instruction">{t(moments.length ? 'variations.closing.body' : 'variations.closing.empty')}</p>
    <div className="variation-moments">{moments.map(moment => <button key={moment.id} aria-pressed={selected === moment.id} onClick={() => { setSelected(moment.id); setAgreement([]); }}>{moment.question}</button>)}</div>
    {selected && <div className="variation-agreement">{[1, 2].map(person => <button key={person} aria-pressed={agreement.includes(person)} onClick={() => setAgreement(previous => previous.includes(person) ? previous.filter(id => id !== person) : [...previous, person])}>{t('variations.closing.agree', { person })}</button>)}</div>}
    <button className="close-primary" disabled={agreement.length !== 2} onClick={() => onComplete(moments.find(moment => moment.id === selected) ?? null)}>{t('variations.closing.keep')}</button>
    <button className="close-text-button" onClick={() => onComplete(null)}>{t('variations.closing.without')}</button>
  </div>;
}
