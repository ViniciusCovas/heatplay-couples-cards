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
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/10 shadow-lg">
      {/* soft glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <CardContent className="relative p-6 md:p-8 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
            <Flame className="w-3.5 h-3.5" />
            {t('dailySpark.title')}
          </div>
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary">
            <Flame className="w-4 h-4 fill-secondary/20" />
            {t('dailySpark.streak', { count: streak })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('dailySpark.badge')}
          </p>
          <p className="text-xl md:text-2xl font-heading font-semibold text-foreground leading-snug">
            “{question}”
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Button
            onClick={handleShare}
            className="flex-1 h-12 font-semibold btn-gradient-primary text-white border-0 shadow-md group"
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
            className="flex-1 h-12 font-semibold btn-gradient-secondary"
          >
            <Play className="w-5 h-5 mr-2" />
            {t('dailySpark.play')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
