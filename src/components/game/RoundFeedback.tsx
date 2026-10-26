import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export type Feeling = 'closer' | 'discovery' | 'desire' | 'uncomfortable';
export type Pace = 'lighter' | 'same' | 'deeper';
export interface RoundSignal {
  feeling: Feeling | null;
  pace: Pace | null;
  note: string | null;
}

/** Explicit self-reports, never prefilled ratings of a partner's honesty. */
export function RoundFeedback({ onSubmit, onClose }: { onSubmit: (signal: RoundSignal) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [pace, setPace] = useState<Pace | null>(null);
  const [note, setNote] = useState('');
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="round-feedback">
      <DialogTitle>{t('intelligentPlay.feedbackTitle')}</DialogTitle>
      <DialogDescription>{t('intelligentPlay.feedbackSubtitle')}</DialogDescription>
      <fieldset><legend>{t('intelligentPlay.feelingPrompt')}</legend><div className="round-feelings">
        {(['closer', 'discovery', 'desire', 'uncomfortable'] as const).map(value => <button key={value} type="button" aria-pressed={feeling === value} onClick={() => setFeeling(feeling === value ? null : value)}>{t(`intelligentPlay.${value}`)}</button>)}
      </div></fieldset>
      <fieldset><legend>{t('intelligentPlay.pacePrompt')}</legend><div className="round-paces">
        {(['lighter', 'same', 'deeper'] as const).map(value => <button key={value} type="button" aria-pressed={pace === value} onClick={() => setPace(pace === value ? null : value)}>{t(`intelligentPlay.${value}`)}</button>)}
      </div></fieldset>
      <details><summary>{t('intelligentPlay.notePrompt')}</summary><textarea aria-label={t('intelligentPlay.notePrompt')} maxLength={140} value={note} onChange={event => setNote(event.target.value)} rows={2} /><span className="round-note-count">{note.length}/140</span></details>
      <button className="close-primary" onClick={() => onSubmit({ feeling, pace, note: note.trim() || null })}>{t(feeling || pace || note.trim() ? 'intelligentPlay.continue' : 'intelligentPlay.skipFeedback')}</button>
      <p className="round-preview-note">{t('intelligentPlay.localOnly')}</p>
    </DialogContent>
  </Dialog>;
}
