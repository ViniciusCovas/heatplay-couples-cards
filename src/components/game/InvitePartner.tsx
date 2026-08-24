import { Button } from '@/components/ui/button';
import { MessageCircle, Share2, Link2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/analytics';

// WhatsApp's mandated brand green. It is not a Let's Get Close token, so it is
// declared here as a local CSS custom property instead of a literal utility.
// TODO: move to index.css as --brand-whatsapp when that file is next touched.
const WHATSAPP_GREEN = '#25D366';
const WHATSAPP_GREEN_HOVER = '#1EBE5B';

interface InvitePartnerProps {
  roomCode: string;
}

/**
 * Hero invite block shown to the host while waiting for their partner.
 * Builds a join deep link (/join-room?code=XXXXXX) and offers WhatsApp,
 * native share and copy-link channels with a flirty localized teaser.
 */
export function InvitePartner({ roomCode }: InvitePartnerProps) {
  const { t } = useTranslation();

  const inviteUrl = `${window.location.origin}/join-room?code=${roomCode}`;
  const inviteMessage = t('invite.message', { url: inviteUrl });

  const shareViaWhatsApp = (): void => {
    track('invite_shared', { channel: 'whatsapp' });
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, '_blank', 'noopener,noreferrer');
  };

  const shareNative = async (): Promise<void> => {
    try {
      await navigator.share({ text: inviteMessage });
      track('invite_shared', { channel: 'native' });
    } catch {
      // User dismissed the share sheet — not an error
    }
  };

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      track('invite_shared', { channel: 'copy' });
      toast.success(t('invite.linkCopied'));
    } catch {
      toast.error(t('invite.copyError'));
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 border-2 border-primary/30 shadow-lg">
      <div className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Heart className="w-5 h-5 fill-current animate-pulse" />
          <h2 className="text-lg font-bold">{t('invite.title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('invite.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Button
          onClick={shareViaWhatsApp}
          style={{ ['--brand-whatsapp' as string]: WHATSAPP_GREEN, ['--brand-whatsapp-hover' as string]: WHATSAPP_GREEN_HOVER }}
          className="w-full h-12 text-base font-semibold bg-[var(--brand-whatsapp)] hover:bg-[var(--brand-whatsapp-hover)] text-white"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          {t('invite.whatsapp')}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {canNativeShare && (
            <Button
              onClick={shareNative}
              className="h-11 font-semibold btn-gradient-primary"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t('invite.share')}
            </Button>
          )}
          <Button
            onClick={copyLink}
            variant="outline"
            className={`h-11 font-semibold border-primary/40 hover:bg-primary/10 ${canNativeShare ? '' : 'col-span-2'}`}
          >
            <Link2 className="w-4 h-4 mr-2" />
            {t('invite.copyLink')}
          </Button>
        </div>
      </div>
    </div>
  );
}
