import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Heart, Pause, Sparkles, X } from 'lucide-react';
import { PhysicalCard } from '@/components/game/PhysicalCard';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getSparkSample, toSparkLocale } from '@/lib/dailySpark';
import { readSession, saveSession, type TogetherSession } from '@/lib/togetherSession';
import { buildDateDeck, eligibleCards, validateDateDeck, type DatePreferences, type Mood } from '../../supabase/functions/_shared/date-deck';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const tablePreview = import.meta.env.VITE_TABLE_PREVIEW === 'true';
const defaults: DatePreferences = { mood: 'close', minutes: 10, heat: 0, depth: 0 };

export default function Together() {
  const { t, i18n } = useTranslation();
  const { ensureSession } = useAuth();
  const [session, setSession] = useState<TogetherSession | null>(readSession);
  const [preferences, setPreferences] = useState<DatePreferences>(defaults);
  const [agreed, setAgreed] = useState([false, false]);
  const [useAI, setUseAI] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [followup, setFollowup] = useState(false);
  const [notice, setNotice] = useState('');
  const startLock = useRef(false);
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const locale = toSparkLocale(i18n.resolvedLanguage ?? i18n.language);
  const finished = !!session && session.index >= session.cards.length;
  const cardId = session?.cards[session.index];
  const question = cardId === undefined ? '' : getSparkSample(locale, [cardId])[0];

  useEffect(() => {
    saveSession(session);
    if (!session) return;
    const expiry = setTimeout(() => saveSession(null), Math.max(0, session.createdAt + 8 * 3600_000 - Date.now()));
    return () => clearTimeout(expiry);
  }, [session]);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    setFollowup(false);
    heading.current?.focus();
  }, [session?.index, finished]);

  function changePreferences(patch: Partial<DatePreferences>) {
    setPreferences(p => ({ ...p, ...patch }));
    setAgreed([false, false]);
  }

  async function start() {
    if (startLock.current || !agreed.every(Boolean)) return;
    startLock.current = true;
    setPreparing(true);
    setNotice('');
    const attempt = ++generation.current;
    let cards = buildDateDeck(preferences);
    let source: TogetherSession['source'] = 'editorial';
    if (useAI && !tablePreview) {
      // Time-bound the entire path, including anonymous sign-in. A late reply
      // cannot replace the cards once a couple has started playing.
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          (async () => {
            const auth = await ensureSession();
            if (!auth.session) throw new Error('session_unavailable');
            const { data, error } = await supabase.functions.invoke('plan-date', { body: preferences });
            if (error || !validateDateDeck(data?.cards, preferences)) throw new Error('plan_unavailable');
            return data.cards as number[];
          })(),
          new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 8000); }),
        ]);
        cards = result;
        source = 'ai';
      } catch { if (attempt === generation.current) setNotice('fallback'); }
      finally { clearTimeout(timeout); }
    }
    if (attempt === generation.current) {
      setSession({ version: 1, createdAt: Date.now(), preferences, cards, index: 0, revealed: false, favorites: [], source });
      setPreparing(false);
    }
    startLock.current = false;
  }

  function next() {
    setNotice('');
    setSession(s => s ? { ...s, index: Math.min(s.index + 1, s.cards.length), revealed: false } : s);
  }

  function soften() {
    if (!session) return;
    const seen = session.cards.slice(0, session.index);
    const gentle = eligibleCards({ ...session.preferences, heat: 0, depth: 0 }).map(c => c.id);
    const closing = [8, 33, 52].find(id => !seen.includes(id))!;
    const remaining = gentle.filter(id => !seen.includes(id) && id !== closing);
    const need = session.cards.length - seen.length;
    const cards = [...seen, ...remaining.slice(0, need - 1), closing];
    setSession({ ...session, cards, favorites: session.favorites.filter(id => cards.includes(id)), revealed: false, source: 'editorial' });
    setPaused(false);
    setNotice('softened');
  }

  function reset() {
    setSession(null); setNotice(''); setAgreed([false, false]); setPaused(false);
  }

  const labels = (key: string) => t(`together.${key}`, { returnObjects: true }) as string[];
  const count = session?.cards.length ?? 0;

  return (
    <div className="table-experience">
      <header className="table-header">
        {!session ? <Link to="/" className="table-icon" aria-label={t('together.back')}><ArrowLeft size={20} /></Link> :
          <button className="table-icon" onClick={() => setPaused(true)} aria-label={t('together.pause')}><Pause size={20} /></button>}
        <Link to="/" onClick={e => { if (session && !finished) { e.preventDefault(); setPaused(true); } }} className="table-wordmark">let’s get close<span>✦</span></Link>
        <label className="sr-only" htmlFor="table-language">{t('together.language')}</label>
        <select id="table-language" aria-label={t('together.language')} value={locale} onChange={e => void i18n.changeLanguage(e.target.value)} className="table-language">
          <option value="en">EN</option><option value="es">ES</option><option value="pt">PT</option><option value="fr">FR</option>
        </select>
      </header>

      {!session ? <main className="table-setup">
        <div className="table-intro">
          <p className="table-eyebrow">{t('together.eyebrow')}</p>
          <h1>{t('together.title')}</h1>
          <p>{t('together.subtitle')}</p>
          <span className="table-free">{t('together.free')}</span>
          <div className="table-preview" aria-hidden="true"><div>let’s get<br /><em>close.</em><Heart size={26} /></div></div>
        </div>
        <form className="table-settings" onSubmit={e => { e.preventDefault(); void start(); }}>
          <fieldset disabled={preparing} className="space-y-6">
            <legend className="sr-only">{t('together.mode')}</legend>
            <fieldset><legend>{t('together.moodTitle')}</legend><div className="table-options">
              {(['playful', 'close', 'flirty'] as Mood[]).map(mood => <button type="button" key={mood} aria-pressed={preferences.mood === mood} onClick={() => changePreferences({ mood })}>{t(`together.moods.${mood}`)}</button>)}
            </div></fieldset>
            <fieldset><legend>{t('together.timeTitle')}</legend><div className="table-options">
              {([10, 20, 40] as const).map(minutes => <button type="button" key={minutes} aria-pressed={preferences.minutes === minutes} onClick={() => changePreferences({ minutes })}>{t('together.minutes', { count: minutes })}</button>)}
            </div><p className="table-hint">{t('together.timeHint')}</p></fieldset>
            <div className="space-y-4">
              <fieldset><legend>{t('together.heatTitle')}</legend><div className="table-options">
                {labels('heats').map((label, heat) => <button type="button" key={heat} aria-pressed={preferences.heat === heat} onClick={() => changePreferences({ heat: heat as 0 | 1 | 2 })}>{label}</button>)}
              </div></fieldset>
              <fieldset><legend>{t('together.depthTitle')}</legend><div className="table-options">
                {labels('depths').map((label, depth) => <button type="button" key={depth} aria-pressed={preferences.depth === depth} onClick={() => changePreferences({ depth: depth as 0 | 1 })}>{label}</button>)}
              </div></fieldset><p className="table-hint">{t('together.limitsHint')}</p>
            </div>
            <div className="table-agreement"><p className="font-semibold">{t('together.consentTitle')}</p><p className="table-hint">{t('together.consent')}</p><div className="table-options mt-3">
              {agreed.map((yes, i) => <button type="button" key={i} aria-pressed={yes} onClick={() => setAgreed(a => a.map((v, n) => n === i ? !v : v))}><Check size={16} className={yes ? '' : 'opacity-25'} />{t('together.person', { number: i + 1 })}</button>)}
            </div></div>
            {!tablePreview && <label className="table-ai"><input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} /><span><span className="flex items-center gap-2 font-semibold"><Sparkles size={15} />{t('together.ai')}</span><span className="table-hint block">{t('together.aiHint')}</span></span></label>}
            <button type="submit" className="table-primary w-full" disabled={!agreed.every(Boolean) || preparing}>{t(preparing ? 'together.preparing' : 'together.start')}<ArrowRight size={18} /></button>
          </fieldset>
          {!tablePreview && <div className="mt-5 grid gap-2 text-center text-sm"><Link className="table-link" to="/create-room">{t('together.online')}</Link><Link className="table-link" to="/join-room">{t('together.join')}</Link></div>}
        </form>
      </main> : finished ? <main className="table-ending">
        <Heart size={32} strokeWidth={1} className="mx-auto mb-7" />
        <h1 tabIndex={-1} ref={heading}>{t('together.doneTitle')}</h1>
        <p className="mt-5 leading-relaxed">{t('together.doneText')}</p>
        {session.favorites.length > 0 ? <section className="mt-10 text-left"><h2 className="table-eyebrow mb-4">{t('together.saved')}</h2>{getSparkSample(locale, session.favorites).map(q => <p key={q} className="table-keepsake">{q}</p>)}</section> : <p className="table-hint mt-8">{t('together.noSaved')}</p>}
        <button className="table-primary w-full mt-10" onClick={reset}>{t('together.again')}<ArrowRight size={18} /></button>
        <Link to="/" onClick={() => saveSession(null)} className="table-link block mt-5">{t('together.exit')}</Link>
      </main> : <main className="table-play">
        <div className="table-play-heading"><p className="table-eyebrow">{t(`together.moods.${session.preferences.mood}`)}</p><h1 ref={heading} tabIndex={-1} className="sr-only">{t('together.progress', { current: session.index + 1, total: count })}</h1><span>{String(session.index + 1).padStart(2, '0')} <span className="opacity-50">/ {String(count).padStart(2, '0')}</span></span></div>
        <p className="table-notice" role="status">{notice ? t(`together.${notice}`) : t(session.source === 'ai' ? 'together.aiReady' : 'together.editorial')}</p>
        <PhysicalCard key={cardId} label={t(session.index === count - 1 ? 'together.closeCard' : 'together.mode')} footer={String(session.index + 1).padStart(2, '0')} revealed={session.revealed} onReveal={() => setSession(s => s ? { ...s, revealed: true } : s)} revealLabel={t('together.reveal')} tone={session.preferences.heat}>
          <p>{question}</p>
        </PhysicalCard>
        <div className="table-under-card">
          <p className="table-instruction">{session.revealed ? t(session.index % 3 === 1 && session.index !== count - 1 ? 'together.guess' : 'together.talk') : '✦'}</p>
          {session.revealed && <div className="flex items-center justify-center gap-5">
            <button className="table-link min-h-11" onClick={() => setFollowup(!followup)} aria-expanded={followup}>{t('together.followup')}</button>
            <button className="table-icon" aria-label={t(session.favorites.includes(cardId!) ? 'together.unfavorite' : 'together.favorite')} aria-pressed={session.favorites.includes(cardId!)} onClick={() => setSession(s => s ? { ...s, favorites: s.favorites.includes(cardId!) ? s.favorites.filter(id => id !== cardId) : [...s.favorites, cardId!] } : s)}><Heart size={20} fill={session.favorites.includes(cardId!) ? 'currentColor' : 'none'} /></button>
          </div>}
          {followup && session.revealed && <p className="table-followup">{t('together.followupText')}</p>}
          <div className="table-play-actions"><button className="table-pass" onClick={next}>{t('together.skip')}</button><button className="table-primary" onClick={next} disabled={!session.revealed}>{t(session.index === count - 1 ? 'together.finish' : 'together.next')}<ArrowRight size={18} /></button></div>
        </div>
      </main>}
      <footer className="table-privacy">{tablePreview && <p className="mb-2 font-semibold">{t('together.preview')}</p>}{t('together.privacy')}</footer>
      <Dialog open={paused} onOpenChange={setPaused}><DialogContent className="table-pause">
        <DialogTitle className="font-display text-3xl">{t('together.paused')}</DialogTitle><DialogDescription>{t('together.pauseHint')}</DialogDescription>
        <button className="table-primary mt-3" onClick={() => setPaused(false)}>{t('together.resume')}</button>
        {!finished && <><button className="table-pass" onClick={soften}>{t('together.lighter')}</button><button className="table-pass" onClick={() => { setSession(s => s ? { ...s, index: s.cards.length } : s); setPaused(false); }}>{t('together.finish')}</button></>}
        <Link className="table-link text-center" to="/" onClick={() => saveSession(null)}><X size={14} className="inline mr-2" />{t('together.exit')}</Link>
      </DialogContent></Dialog>
    </div>
  );
}
