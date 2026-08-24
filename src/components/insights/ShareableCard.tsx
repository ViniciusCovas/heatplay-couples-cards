import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

const CARD_W = 1080;
const CARD_H = 1920;
const BRAND_PINK = '#E91E63';

export interface ShareableCardProps {
  /** 0–100 compatibility score; undefined renders the fallback card */
  compatibilityScore?: number;
  /**
   * One quote-worthy AI insight.
   *
   * PRIVACY CONTRACT: this must always be the model's OWN synthesis
   * (`shareable_insight` / `keyInsights[0]`). The share card is a public
   * artefact, so it must never render a raw spoken answer or a listener's
   * free-text note verbatim. The edge-function prompt enforces the same rule
   * on the generation side; do not wire any raw `evaluation.note` in here.
   */
  insight?: string;
  /** Optional relationship phase from the analysis, shown as a small tag */
  relationshipPhase?: string;
  /** Optional server-provided archetype name; preferred over the client-side score-band derivation */
  archetype?: string;
}

interface CardLabels {
  brand: string;
  archetype: string;
  compatibility: string;
  ourVibe: string;
  insightLabel: string;
  insight: string;
  phase?: string;
  footer: string;
}

function archetypeKeyForScore(score: number | undefined): string | null {
  if (score === undefined || Number.isNaN(score)) return null;
  if (score >= 90) return 'twinFlames';
  if (score >= 75) return 'magnetic';
  if (score >= 60) return 'risingHeat';
  if (score >= 40) return 'slowBurn';
  return 'newSpark';
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + '…';
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxWidth || !current) {
      current = attempt;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && ctx.measureText(lines[maxLines - 1]).width > maxWidth) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Georgia', 'Times New Roman', serif";

/**
 * DOM-free canvas painter: draws the 1080x1920 wrapped-style story card.
 */
export function paintShareCard(
  canvas: HTMLCanvasElement,
  score: number | undefined,
  labels: CardLabels
): void {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- Background: rich blush → peach → lilac gradient wash ---
  const bg = ctx.createLinearGradient(0, 0, CARD_W * 0.55, CARD_H);
  bg.addColorStop(0, '#ffd9e4');
  bg.addColorStop(0.38, '#ffc9cf');
  bg.addColorStop(0.72, '#ffd2bd');
  bg.addColorStop(1, '#f3cbe8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Saturated radial blooms so the card pops in a feed
  const glow1 = ctx.createRadialGradient(CARD_W * 0.86, CARD_H * 0.08, 0, CARD_W * 0.86, CARD_H * 0.08, 760);
  glow1.addColorStop(0, 'rgba(255, 138, 178, 0.75)');
  glow1.addColorStop(1, 'rgba(255, 138, 178, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow2 = ctx.createRadialGradient(CARD_W * 0.06, CARD_H * 0.88, 0, CARD_W * 0.06, CARD_H * 0.88, 860);
  glow2.addColorStop(0, 'rgba(196, 102, 255, 0.42)');
  glow2.addColorStop(1, 'rgba(196, 102, 255, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow3 = ctx.createRadialGradient(CARD_W * 0.04, CARD_H * 0.06, 0, CARD_W * 0.04, CARD_H * 0.06, 700);
  glow3.addColorStop(0, 'rgba(255, 152, 92, 0.5)');
  glow3.addColorStop(1, 'rgba(255, 152, 92, 0)');
  ctx.fillStyle = glow3;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // --- Very subtle grain to kill banding on the big gradient ---
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * CARD_W;
    const y = Math.random() * CARD_H;
    const a = Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(150,60,100,${a * 0.7})`;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.textAlign = 'center';
  const cx = CARD_W / 2;

  // --- White inset card floating on the blush ground ---
  const inset = 56;
  const cardTop = 116;
  const cardBottom = CARD_H - 116;
  ctx.save();
  ctx.shadowColor = 'rgba(150, 45, 95, 0.30)';
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 26;
  roundedRectPath(ctx, inset, cardTop, CARD_W - inset * 2, cardBottom - cardTop, 56);
  const insetFill = ctx.createLinearGradient(0, cardTop, 0, cardBottom);
  insetFill.addColorStop(0, '#ffffff');
  insetFill.addColorStop(1, '#fff7f9');
  ctx.fillStyle = insetFill;
  ctx.fill();
  ctx.restore();

  // hairline + warm top accent bar inside the card
  roundedRectPath(ctx, inset, cardTop, CARD_W - inset * 2, cardBottom - cardTop, 56);
  ctx.strokeStyle = 'rgba(233, 30, 99, 0.16)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  roundedRectPath(ctx, inset, cardTop, CARD_W - inset * 2, cardBottom - cardTop, 56);
  ctx.clip();
  const bar = ctx.createLinearGradient(inset, 0, CARD_W - inset, 0);
  bar.addColorStop(0, '#ff8a5c');
  bar.addColorStop(0.5, BRAND_PINK);
  bar.addColorStop(1, '#c466ff');
  ctx.fillStyle = bar;
  ctx.fillRect(inset, cardTop, CARD_W - inset * 2, 14);
  ctx.restore();

  // --- Brand mark ---
  ctx.font = `600 44px ${SANS}`;
  ctx.fillStyle = '#c2185b';
  ctx.fillText(labels.brand, cx, 268);

  // Small heart under brand
  ctx.save();
  ctx.translate(cx, 330);
  ctx.scale(1.6, 1.6);
  ctx.fillStyle = BRAND_PINK;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-14, -6, -6, -18, 0, -8);
  ctx.bezierCurveTo(6, -18, 14, -6, 0, 10);
  ctx.fill();
  ctx.restore();

  // Tracked-out small caps for label text (no-op on engines without letterSpacing)
  const setTracking = (px: number): void => {
    try {
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
    } catch { /* older engines */ }
  };

  // --- "Our vibe" eyebrow + archetype headline ---
  setTracking(6);
  ctx.font = `600 32px ${SANS}`;
  ctx.fillStyle = '#6c6577';
  ctx.fillText(labels.ourVibe.toUpperCase(), cx, 430);
  setTracking(0);

  ctx.font = `700 92px ${SERIF}`;
  ctx.fillStyle = '#23212b';
  const headLines = wrapLines(ctx, labels.archetype, CARD_W - 240, 2);
  headLines.forEach((line, i) => ctx.fillText(line, cx, 540 + i * 104));
  let cursorY = 540 + (headLines.length - 1) * 104;

  // Optional phase tag
  if (labels.phase) {
    cursorY += 88;
    ctx.font = `600 30px ${SANS}`;
    const tagText = labels.phase.toUpperCase();
    const tw = ctx.measureText(tagText).width;
    roundedRectPath(ctx, cx - tw / 2 - 34, cursorY - 42, tw + 68, 62, 31);
    ctx.fillStyle = 'rgba(233,30,99,0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,30,99,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#c2185b';
    ctx.fillText(tagText, cx, cursorY);
  }

  // --- Score ring ---
  const ringY = 945;
  const radius = 238;
  ctx.lineCap = 'round';

  // Soft pink halo behind the ring
  const halo = ctx.createRadialGradient(cx, ringY, radius * 0.6, cx, ringY, radius * 1.5);
  halo.addColorStop(0, 'rgba(255, 138, 178, 0.20)');
  halo.addColorStop(1, 'rgba(255, 138, 178, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - radius * 1.6, ringY - radius * 1.6, radius * 3.2, radius * 3.2);

  // Track
  ctx.beginPath();
  ctx.arc(cx, ringY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#f7e3ea';
  ctx.lineWidth = 26;
  ctx.stroke();

  const safeScore = score !== undefined ? Math.min(100, Math.max(0, score)) : undefined;
  const fraction = safeScore !== undefined ? safeScore / 100 : 1;
  const start = -Math.PI / 2;

  // Soft shadow pass under the arc, so it sits on the white card
  ctx.save();
  ctx.shadowColor = 'rgba(216, 27, 96, 0.35)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.arc(cx, ringY, radius, start, start + fraction * Math.PI * 2);
  ctx.strokeStyle = 'rgba(233,30,99,0.9)';
  ctx.lineWidth = 26;
  ctx.stroke();
  ctx.restore();

  // Progress arc — pink → coral
  const arcGrad = ctx.createLinearGradient(cx - radius, ringY - radius, cx + radius, ringY + radius);
  arcGrad.addColorStop(0, '#ff5722');
  arcGrad.addColorStop(0.45, '#f4306d');
  arcGrad.addColorStop(1, '#c2185b');
  ctx.beginPath();
  ctx.arc(cx, ringY, radius, start, start + fraction * Math.PI * 2);
  ctx.strokeStyle = arcGrad;
  ctx.lineWidth = 26;
  ctx.stroke();

  // Score number
  if (safeScore !== undefined) {
    ctx.font = `800 208px ${SANS}`;
    ctx.fillStyle = '#23212b';
    ctx.fillText(`${Math.round(safeScore)}`, cx, ringY + 58);
    ctx.font = `700 54px ${SANS}`;
    ctx.fillStyle = '#c2185b';
    ctx.fillText('%', cx + (safeScore === 100 ? 205 : 165), ringY + 42);
  } else {
    // Fallback: big heart in the ring
    ctx.save();
    ctx.translate(cx, ringY + 10);
    ctx.scale(9, 9);
    ctx.fillStyle = BRAND_PINK;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-14, -6, -6, -18, 0, -8);
    ctx.bezierCurveTo(6, -18, 14, -6, 0, 10);
    ctx.fill();
    ctx.restore();
  }

  setTracking(6);
  ctx.font = `600 34px ${SANS}`;
  ctx.fillStyle = '#6c6577';
  ctx.fillText(labels.compatibility.toUpperCase(), cx, ringY + radius + 86);
  setTracking(0);

  // --- Insight quote block, on a soft blush panel sized to its content ---
  const panelX = 116;
  const panelW = CARD_W - panelX * 2;
  const LINE_H = 60;

  // Measure first so the panel hugs the quote instead of leaving dead space.
  ctx.font = `italic 500 44px ${SERIF}`;
  const quoteLines = wrapLines(ctx, `“${truncate(labels.insight, 130)}”`, panelW - 108, 4);
  const panelH = 62 + 46 + quoteLines.length * LINE_H + 40;
  const panelTop = 1352;

  roundedRectPath(ctx, panelX, panelTop, panelW, panelH, 40);
  const qFill = ctx.createLinearGradient(0, panelTop, 0, panelTop + panelH);
  qFill.addColorStop(0, '#fff2f6');
  qFill.addColorStop(1, '#fff8f4');
  ctx.fillStyle = qFill;
  ctx.fill();
  ctx.strokeStyle = '#f7dde6';
  ctx.lineWidth = 2;
  ctx.stroke();

  setTracking(6);
  ctx.font = `700 30px ${SANS}`;
  ctx.fillStyle = '#c2185b';
  ctx.fillText(labels.insightLabel.toUpperCase(), cx, panelTop + 62);
  setTracking(0);

  ctx.font = `italic 500 44px ${SERIF}`;
  ctx.fillStyle = '#2f2b38';
  quoteLines.forEach((line, i) => ctx.fillText(line, cx, panelTop + 62 + 58 + i * LINE_H));

  // --- Footer, centred in the space left under the panel ---
  ctx.font = `600 36px ${SANS}`;
  ctx.fillStyle = '#55505f';
  ctx.fillText(labels.footer, cx, Math.min(panelTop + panelH + 84, cardBottom - 54));
}

export function ShareableCard({ compatibilityScore, insight, relationshipPhase, archetype: serverArchetype }: ShareableCardProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const archetypeKey = archetypeKeyForScore(compatibilityScore);
  const archetype = serverArchetype?.trim()
    ? serverArchetype.trim()
    : archetypeKey
      ? t(`shareCard.archetypes.${archetypeKey}`)
      : t('shareCard.fallbackArchetype');

  const siteUrl = window.location.origin;
  const shareText = t('shareCard.whatsappMessage', {
    score: compatibilityScore !== undefined ? Math.round(compatibilityScore) : '??',
    url: siteUrl,
  });

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    paintShareCard(canvas, compatibilityScore, {
      brand: "Let's Get Close",
      archetype,
      compatibility: t('shareCard.compatibility'),
      ourVibe: t('shareCard.ourVibe'),
      insightLabel: t('shareCard.insightLabel'),
      insight: insight && insight.trim() ? insight : t('shareCard.fallbackInsight'),
      phase: relationshipPhase || undefined,
      footer: t('shareCard.footer'),
    });
    setPreviewUrl(canvas.toDataURL('image/png'));
  }, [compatibilityScore, insight, relationshipPhase, archetype, t]);

  const getBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      if (!canvasRef.current) return resolve(null);
      canvasRef.current.toBlob((blob) => resolve(blob), 'image/png');
    });

  const handleDownload = async (): Promise<void> => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lets-get-close-result.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    track('result_card_downloaded');
    toast.success(t('shareCard.downloaded'));
  };

  const handleWhatsApp = (): void => {
    track('result_card_shared', { channel: 'whatsapp' });
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async (): Promise<void> => {
    try {
      const blob = await getBlob();
      if (blob) {
        const file = new File([blob], 'lets-get-close-result.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: shareText });
          track('result_card_shared', { channel: 'native_image' });
          return;
        }
      }
      await navigator.share({ text: shareText });
      track('result_card_shared', { channel: 'native_text' });
    } catch {
      // Dismissed share sheet — ignore
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5 overflow-hidden">
      <CardHeader className="pb-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-2xl">{t('shareCard.sectionTitle')}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{t('shareCard.sectionSubtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div className="mx-auto w-full max-w-[260px] rounded-2xl overflow-hidden shadow-2xl ring-2 ring-primary/30">
          {previewUrl && (
            <img
              src={previewUrl}
              alt={t('shareCard.previewAlt')}
              className="w-full h-auto block"
            />
          )}
        </div>

        <div className="mx-auto w-full max-w-sm space-y-2">
          <Button onClick={handleDownload} className="w-full h-11 font-semibold btn-gradient-primary">
            <Download className="w-4 h-4 mr-2" />
            {t('shareCard.download')}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleWhatsApp}
              className={`h-11 font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white ${canNativeShare ? '' : 'col-span-2'}`}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {t('shareCard.whatsapp')}
            </Button>
            {canNativeShare && (
              <Button
                onClick={handleNativeShare}
                variant="outline"
                className="h-11 font-semibold border-primary/40 hover:bg-primary/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t('shareCard.share')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
