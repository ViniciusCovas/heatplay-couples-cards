import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const localExperienceNotice = {
  es: { title: 'Sobre la partida gratuita actual', body: '«Jugar en pareja» abre una partida local en un teléfono, sin cuenta ni pagos. No conecta dos teléfonos ni utiliza IA. Las elecciones y reacciones permanecen en la memoria de la página y se pierden al salir o recargar. Si se habilita la analítica, solo recibe eventos de uso, nunca sus respuestas ni reacciones. Los documentos siguientes también describen los servicios conectados y sus compras: esas funciones no forman parte de esta partida local.' },
  en: { title: 'About the current free game', body: '“Play together” opens a local game on one phone, without an account or payment. It does not connect two phones or use AI. Choices and reactions stay in page memory and are lost when you leave or reload. If analytics are enabled, they receive only usage events, never your answers or reactions. The documents below also describe connected services and purchases: those features are not part of this local game.' },
  pt: { title: 'Sobre a partida gratuita atual', body: '“Jogar em casal” abre uma partida local em um celular, sem conta nem pagamento. Não conecta dois celulares nem utiliza IA. As escolhas e reações ficam na memória da página e se perdem ao sair ou recarregar. Se a análise de uso estiver ativada, ela recebe apenas eventos de uso, nunca suas respostas ou reações. Os documentos abaixo também descrevem os serviços conectados e suas compras: essas funções não fazem parte desta partida local.' },
  fr: { title: 'À propos de la partie gratuite actuelle', body: '« Jouer à deux » ouvre une partie locale sur un téléphone, sans compte ni paiement. Elle ne connecte pas deux téléphones et n’utilise pas d’IA. Les choix et réactions restent dans la mémoire de la page et disparaissent en quittant ou en rechargeant. Si les statistiques d’utilisation sont activées, elles ne reçoivent que des événements d’utilisation, jamais vos réponses ou réactions. Les documents ci-dessous décrivent aussi les services connectés et leurs achats : ces fonctions ne font pas partie de cette partie locale.' },
};

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared shell for the legal pages (/terms, /privacy, /refund).
 * Body content is authored in English; a note explains that translations
 * are available on request. Titles and navigation are localized.
 */
export const LegalLayout = ({ title, lastUpdated, children }: LegalLayoutProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.split('-')[0] as keyof typeof localExperienceNotice;
  const notice = localExperienceNotice[locale] ?? localExperienceNotice.en;

  return (
    <div className="min-h-screen romantic-background">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('legal.backHome')}
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 md:p-10">
            <h1 className="text-3xl font-heading font-bold text-primary mb-2">{title}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t('legal.lastUpdated')}: {lastUpdated}
            </p>

            <aside aria-label={notice.title} className="mb-6 rounded-xl border border-[#e6c9da] bg-[#fff6fa] p-4 text-[#47334d]">
              <h2 className="mb-2 text-base font-semibold">{notice.title}</h2>
              <p className="text-sm leading-relaxed">{notice.body}</p>
            </aside>

            <div className="flex items-start gap-3 rounded-lg bg-accent/10 border border-accent/20 p-4 mb-8">
              <Languages className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{t('legal.translationNote')}</p>
            </div>

            <div className="space-y-6 text-sm leading-relaxed text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-2 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_a]:text-primary [&_a]:underline">
              {children}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <Link className="hover:text-primary transition-colors" to="/terms">
            {t('legal.termsTitle')}
          </Link>
          <Link className="hover:text-primary transition-colors" to="/privacy">
            {t('legal.privacyTitle')}
          </Link>
          <Link className="hover:text-primary transition-colors" to="/refund">
            {t('legal.refundTitle')}
          </Link>
        </div>
      </div>
    </div>
  );
};
