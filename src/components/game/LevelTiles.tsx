import { ArrowUpRight, Check, Flame, Heart, Sparkles, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface LevelOption { id: number; title: string; description: string; cards?: number }
const icons = [Sparkles, Heart, Flame, Zap];

/** The same level choices in the real room and the isolated visual review. */
export function LevelTiles({ levels, selected, disabled = false, onSelect }: {
  levels: LevelOption[]; selected?: number | null; disabled?: boolean; onSelect: (level: number) => void;
}) {
  const { t } = useTranslation();
  return <div className="close-levels">
    {levels.map(level => {
      const Icon = icons[level.id - 1] || Heart;
      return <button type="button" className="close-level" data-level={level.id} key={level.id}
        aria-pressed={selected === level.id} disabled={disabled} onClick={() => onSelect(level.id)}>
        <span className="close-level-top"><Icon size={24} aria-hidden="true" /><span>0{level.id}{level.id >= 3 ? ' · 18+' : ''}</span></span>
        <span className="close-level-title">{level.title}</span>
        <span className="close-level-description">{level.description}</span>
        <span className="close-level-bottom"><span>{typeof level.cards === 'number' ? t('levelSelect.cardCount', { count: level.cards }) : t('closeFlow.choose')}</span>
          {selected === level.id ? <Check size={20} aria-hidden="true" /> : <ArrowUpRight size={20} aria-hidden="true" />}</span>
      </button>;
    })}
  </div>;
}
