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
  /** One quote-worthy AI insight (aggregate only — never free-text answers) */
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

  // --- Background: layered dark romantic gradients ---
  const bg = ctx.createLinearGradient(0, 0, CARD_W * 0.4, CARD_H);
  bg.addColorStop(0, '#1c0a24');
  bg.addColorStop(0.45, '#2a0e33');
  bg.addColorStop(1, '#0d0716');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Radial glows
  const glow1 = ctx.createRadialGradient(CARD_W * 0.85, CARD_H * 0.12, 0, CARD_W * 0.85, CARD_H * 0.12, 700);
  glow1.addColorStop(0, 'rgba(233, 30, 99, 0.35)');
  glow1.addColorStop(1, 'rgba(233, 30, 99, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow2 = ctx.createRadialGradient(CARD_W * 0.1, CARD_H * 0.85, 0, CARD_W * 0.1, CARD_H * 0.85, 800);
  glow2.addColorStop(0, 'rgba(156, 39, 176, 0.28)');
  glow2.addColorStop(1, 'rgba(156, 39, 176, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow3 = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.42, 0, CARD_W / 2, CARD_H * 0.42, 620);
  glow3.addColorStop(0, 'rgba(255, 87, 34, 0.10)');
  glow3.addColorStop(1, 'rgba(255, 87, 34, 0)');
  ctx.fillStyle = glow3;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // --- Subtle noise via random dots (seeded-ish, cheap) ---
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * CARD_W;
    const y = Math.random() * CARD_H;
    const a = Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(233,30,99,${a})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // --- Rounded card inset ---
  const inset = 56;
  roundedRectPath(ctx, inset, inset, CARD_W - inset * 2, CARD_H - inset * 2, 48);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 3;
  ctx.stroke();
  const insetFill = ctx.createLinearGradient(0, inset, 0, CARD_H - inset);
  insetFill.addColorStop(0, 'rgba(255,255,255,0.045)');
  insetFill.addColorStop(1, 'rgba(255,255,255,0.015)');
  ctx.fillStyle = insetFill;
  ctx.fill();

  ctx.textAlign = 'center';
  const cx = CARD_W / 2;

  // --- Brand mark ---
  ctx.font = `600 44px ${SANS}`;
  const brandGrad = ctx.createLinearGradient(cx - 220, 0, cx + 220, 0);
  brandGrad.addColorStop(0, '#ff6090');
  brandGrad.addColorStop(1, BRAND_PINK);
  ctx.fillStyle = brandGrad;
  ctx.fillText(labels.brand, cx, 190);

  // Small heart under brand
  ctx.save();
  ctx.translate(cx, 250);
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
  ctx.font = `500 34px ${SANS}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(labels.ourVibe.toUpperCase(), cx, 380);
  setTracking(0);

  ctx.font = `700 92px ${SERIF}`;
  const headGrad = ctx.createLinearGradient(0, 420, 0, 560);
  headGrad.addColorStop(0, '#ffffff');
  headGrad.addColorStop(1, '#ffb3c9');
  ctx.fillStyle = headGrad;
  const headLines = wrapLines(ctx, labels.archetype, CARD_W - 240, 2);
  headLines.forEach((line, i) => ctx.fillText(line, cx, 490 + i * 108));
  let cursorY = 490 + (headLines.length - 1) * 108;

  // Optional phase tag
  if (labels.phase) {
    cursorY += 90;
    ctx.font = `600 30px ${SANS}`;
    const tagText = labels.phase.toUpperCase();
    const tw = ctx.measureText(tagText).width;
    roundedRectPath(ctx, cx - tw / 2 - 34, cursorY - 42, tw + 68, 62, 31);
    ctx.fillStyle = 'rgba(233,30,99,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,30,99,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ff8fb0';
    ctx.fillText(tagText, cx, cursorY);
  }

  // --- Score ring ---
  const ringY = 990;
  const radius = 235;
  ctx.lineCap = 'round';

  // Track
  ctx.beginPath();
  ctx.arc(cx, ringY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 26;
  ctx.stroke();

  const safeScore = score !== undefined ? Math.min(100, Math.max(0, score)) : undefined;
  const fraction = safeScore !== undefined ? safeScore / 100 : 1;
  const start = -Math.PI / 2;

  // Glow pass
  ctx.beginPath();
  ctx.arc(cx, ringY, radius, start, start + fraction * Math.PI * 2);
  ctx.strokeStyle = 'rgba(233,30,99,0.35)';
  ctx.lineWidth = 44;
  ctx.stroke();

  // Progress arc with gradient
  const arcGrad = ctx.createLinearGradient(cx - radius, ringY, cx + radius, ringY);
  arcGrad.addColorStop(0, '#ff9800');
  arcGrad.addColorStop(0.5, BRAND_PINK);
  arcGrad.addColorStop(1, '#c2185b');
  ctx.beginPath();
  ctx.arc(cx, ringY, radius, start, start + fraction * Math.PI * 2);
  ctx.strokeStyle = arcGrad;
  ctx.lineWidth = 26;
  ctx.stroke();

  // Score number
  if (safeScore !== undefined) {
    ctx.font = `800 210px ${SANS}`;
    const scoreGrad = ctx.createLinearGradient(0, ringY - 110, 0, ringY + 90);
    scoreGrad.addColorStop(0, '#ffffff');
    scoreGrad.addColorStop(1, '#ffc1d4');
    ctx.fillStyle = scoreGrad;
    ctx.fillText(`${Math.round(safeScore)}`, cx, ringY + 55);
    ctx.font = `600 54px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('%', cx + (safeScore === 100 ? 205 : 165), ringY + 40);
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
  ctx.font = `600 36px ${SANS}`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(labels.compatibility.toUpperCase(), cx, ringY + radius + 90);
  setTracking(0);

  // --- Insight quote block ---
  const quoteTop = 1415;
  setTracking(6);
  ctx.font = `500 32px ${SANS}`;
  ctx.fillStyle = 'rgba(255,143,176,0.85)';
  ctx.fillText(labels.insightLabel.toUpperCase(), cx, quoteTop);
  setTracking(0);

  ctx.font = `italic 500 46px ${SERIF}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const quoteLines = wrapLines(ctx, `“${truncate(labels.insight, 130)}”`, CARD_W - 260, 4);
  quoteLines.forEach((line, i) => ctx.fillText(line, cx, quoteTop + 76 + i * 62));

  // --- Footer ---
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 140, CARD_H - 190);
  ctx.lineTo(cx + 140, CARD_H - 190);
  ctx.stroke();

  ctx.font = `600 38px ${SANS}`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(labels.footer, cx, CARD_H - 120);
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
