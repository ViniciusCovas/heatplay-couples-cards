import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Send, Play, Check } from 'lucide-react';
import { getDailySpark, localDayKey } from '@/lib/dailySpark';
import { track } from '@/lib/analytics';

const LS_LAST_OPEN = 'dailySpark.lastOpen';
const LS_STREAK = 'dailySpark.streak';
const LS_SHARED_ON = 'dailySpark.sharedOn';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/**
 * Update and return the open-streak: consecutive days the user opened the
 * Daily Spark. Couple-level server streak comes later — this is per-device.
 */
function bumpStreak(): number {
  const today = localDayKey();
  const lastOpen = safeGet(LS_LAST_OPEN);
  let streak = parseInt(safeGet(LS_STREAK) || '0', 10);
  if (!Number.isFinite(streak) || streak < 0) streak = 0;

  if (lastOpen === today) return Math.max(streak, 1);

  const yesterday = localDayKey(new Date(Date.now() - 86_400_000));
  streak = lastOpen === yesterday ? streak + 1 : 1;
  safeSet(LS_LAST_OPEN, today);
  safeSet(LS_STREAK, String(streak));
  return streak;
}

export const DailySpark = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [streak, setStreak] = useState(1);
  const [sharedToday, setSharedToday] = useState(false);

  const question = useMemo(() => getDailySpark(i18n.language), [i18n.language]);

  useEffect(() => {
    setStreak(bumpStreak());
    setSharedToday(safeGet(LS_SHARED_ON) === localDayKey());
  }, []);

  const handleShare = () => {
    const url = window.location.origin;
    const text = t('dailySpark.shareText', { question, url });
    track('daily_spark_shared');
    safeSet(LS_SHARED_ON, localDayKey());
    setSharedToday(true);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <Card className="landing-panel relative overflow-hidden rounded-3xl border-0">
      {/* soft glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#ffb3cd]/45 rounded-full blur-3xl pointer-events-none"></div>

      <CardContent className="relative p-6 md:p-8 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fdeaf1] text-[#c2185b] text-xs font-semibold uppercase tracking-wide">
            <Flame className="w-3.5 h-3.5" />
            {t('dailySpark.title')}
          </div>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#c33c0c]">
            <Flame className="w-4 h-4 fill-[#ff5722]/25" />
            {t('dailySpark.streak', { count: streak })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#6c6577] uppercase tracking-wider">
            {t('dailySpark.badge')}
          </p>
          <p className="font-display text-balance text-xl md:text-[1.6rem] font-semibold text-[#23212b] leading-snug">
            “{question}”
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Button
            onClick={handleShare}
            className="landing-cta flex-1 min-h-12 h-auto py-2 whitespace-normal font-semibold text-white border-0 rounded-full group"
          >
            {sharedToday ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                {t('dailySpark.sharedToday')}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2 group-hover:translate-x-0.5 transition-transform" />
                {t('dailySpark.share')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/create-room')}
            className="flex-1 min-h-12 h-auto py-2 whitespace-normal rounded-full border-[1.5px] border-[#f0c7d5] bg-white/80 font-semibold text-[#c2185b] hover:bg-white hover:border-[#e891ae] hover:text-[#c2185b]"
          >
            <Play className="w-5 h-5 mr-2" />
            {t('dailySpark.play')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
