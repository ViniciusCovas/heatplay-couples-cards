import React from 'npm:react@18.3.1';
import { Section, Text, Hr, Heading } from 'npm:@react-email/components@0.0.22';
import { BaseLayout } from '../components/BaseLayout.tsx';
import { Button } from '../components/Button.tsx';
import { contentStyle, subheadingStyle, listStyle, listItemStyle } from '../utils/email-styles.ts';

interface AIAnalysisEmailProps {
  userEmail: string;
  language: string;
  analysisData: {
    compatibility_score: number;
    relationship_phase: string;
    strength_areas: string[];
    growth_areas: string[];
    key_insights: string[];
    personalized_tips: string[];
    cultural_notes?: string;
    next_session_recommendation: string;
  };
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
};

const getPhaseEmoji = (phase: string) => {
  const phaseMap: { [key: string]: string } = {
    'Discovery': '🔍',
    'Building': '🏗️',
    'Deepening': '💫',
    'Established': '💎',
    'Advanced': '🌟'
  };
  return phaseMap[phase] || '💕';
};

export const AIAnalysisEmail = ({ userEmail, language, analysisData }: AIAnalysisEmailProps) => {
  const texts = {
    en: {
      subject: 'Your Connection Cards AI Analysis Results 💕',
      title: 'Your Relationship Analysis is Ready!',
      intro: 'Here are your personalized insights from your Connection Cards session:',
      compatibilityTitle: 'Compatibility Score',
      phaseTitle: 'Relationship Phase',
      strengthTitle: 'Your Strength Areas',
      growthTitle: 'Growth Opportunities',
      insightsTitle: 'Key Insights',
      tipsTitle: 'Personalized Tips',
      culturalTitle: 'Cultural Notes',
      nextTitle: 'Next Session Recommendation',
      playAgain: 'Play Another Session',
      footer: 'Keep exploring your connection with Connection Cards!'
    },
    es: {
      subject: 'Tus Resultados de Análisis IA de Connection Cards 💕',
      title: '¡Tu Análisis de Relación está Listo!',
      intro: 'Aquí tienes tus insights personalizados de tu sesión de Connection Cards:',
      compatibilityTitle: 'Puntuación de Compatibilidad',
      phaseTitle: 'Fase de la Relación',
      strengthTitle: 'Tus Áreas Fuertes',
      growthTitle: 'Oportunidades de Crecimiento',
      insightsTitle: 'Insights Clave',
      tipsTitle: 'Consejos Personalizados',
      culturalTitle: 'Notas Culturales',
      nextTitle: 'Recomendación para la Próxima Sesión',
      playAgain: 'Jugar Otra Sesión',
      footer: '¡Sigue explorando tu conexión con Connection Cards!'
    },
    fr: {
      subject: 'Vos Résultats d\'Analyse IA Connection Cards 💕',
      title: 'Votre Analyse de Relation est Prête!',
      intro: 'Voici vos insights personnalisés de votre session Connection Cards:',
      compatibilityTitle: 'Score de Compatibilité',
      phaseTitle: 'Phase de la Relation',
      strengthTitle: 'Vos Points Forts',
      growthTitle: 'Opportunités de Croissance',
      insightsTitle: 'Insights Clés',
      tipsTitle: 'Conseils Personnalisés',
      culturalTitle: 'Notes Culturelles',
      nextTitle: 'Recommandation pour la Prochaine Session',
      playAgain: 'Jouer une Autre Session',
      footer: 'Continuez à explorer votre connexion avec Connection Cards!'
    },
    pt: {
      subject: 'Seus Resultados de Análise IA do Connection Cards 💕',
      title: 'Sua Análise de Relacionamento está Pronta!',
      intro: 'Aqui estão seus insights personalizados da sua sessão Connection Cards:',
      compatibilityTitle: 'Pontuação de Compatibilidade',
      phaseTitle: 'Fase do Relacionamento',
      strengthTitle: 'Suas Áreas Fortes',
      growthTitle: 'Oportunidades de Crescimento',
      insightsTitle: 'Insights Principais',
      tipsTitle: 'Dicas Personalizadas',
      culturalTitle: 'Notas Culturais',
      nextTitle: 'Recomendação para a Próxima Sessão',
      playAgain: 'Jogar Outra Sessão',
      footer: 'Continue explorando sua conexão com Connection Cards!'
    }
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  return (
    <BaseLayout preview={t.subject}>
      <Section style={contentStyle}>
        <Heading style={subheadingStyle}>{t.title}</Heading>
        <Text style={{ marginBottom: '24px' }}>{t.intro}</Text>

        {/* Compatibility Score */}
        <Section style={{ marginBottom: '32px', textAlign: 'center' }}>
          <Heading style={{ ...subheadingStyle, fontSize: '20px', marginBottom: '16px' }}>
            {t.compatibilityTitle}
          </Heading>
          <div style={{
            display: 'inline-block',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: getScoreColor(analysisData.compatibility_score),
            color: 'white',
            fontSize: '36px',
            fontWeight: 'bold',
            lineHeight: '120px',
            textAlign: 'center'
          }}>
            {analysisData.compatibility_score}%
          </div>
        </Section>

        <Hr style={{ margin: '32px 0', borderColor: '#e5e7eb' }} />

        {/* Relationship Phase */}
        <Section style={{ marginBottom: '32px' }}>
          <Heading style={{ ...subheadingStyle, fontSize: '18px' }}>
            {getPhaseEmoji(analysisData.relationship_phase)} {t.phaseTitle}
          </Heading>
          <Text style={{ fontSize: '16px', fontWeight: '600', color: '#4f46e5' }}>
            {analysisData.relationship_phase}
          </Text>
        </Section>

        {/* Strength Areas */}
        <Section style={{ marginBottom: '32px' }}>
          <Heading style={{ ...subheadingStyle, fontSize: '18px' }}>
            💪 {t.strengthTitle}
          </Heading>
          <ul style={listStyle}>
            {analysisData.strength_areas.map((area, index) => (
              <li key={index} style={listItemStyle}>{area}</li>
            ))}
          </ul>
        </Section>

        {/* Growth Areas */}
        <Section style={{ marginBottom: '32px' }}>
          <Heading style={{ ...subheadingStyle, fontSize: '18px' }}>
            🌱 {t.growthTitle}
          </Heading>
          <ul style={listStyle}>
            {analysisData.growth_areas.map((area, index) => (
              <li key={index} style={listItemStyle}>{area}</li>
            ))}
          </ul>
        </Section>

        {/* Key Insights */}
        <Section style={{ marginBottom: '32px' }}>
          <Heading style={{ ...subheadingStyle, fontSize: '18px' }}>
            💡 {t.insightsTitle}
          </Heading>
          <ul style={listStyle}>
            {analysisData.key_insights.map((insight, index) => (
              <li key={index} style={listItemStyle}>{insight}</li>
            ))}
          </ul>
        </Section>

        {/* Personalized Tips */}
        <Section style={{ marginBottom: '32px' }}>
          <Heading style={{ ...subheadingStyle, fontSize: '18px' }}>
            🎯 {t.tipsTitle}
          </Heading>
          <ul style={listStyle}>
            {analysisData.personalized_tips.map((tip, index) => (
              <li key={index} style={listItemStyle}>{tip}</li>
            ))}
          </ul>
        </Section>

        {/* Cultural Notes */}
        {analysisData.cultural_notes && (
          <Section style={{ marginBottom: '32px' }}>
            <Heading style={{ ...subheadingStyle, fontSize: '18px' }}>
              🌍 {t.culturalTitle}
            </Heading>
            <Text>{analysisData.cultural_notes}</Text>
          </Section>
        )}

        {/* Next Session Recommendation */}
        <Section style={{ marginBottom: '32px' }}>
          <Heading style={{ ...subheadingStyle, fontSize: '18px' }}>
            🎮 {t.nextTitle}
          </Heading>
          <Text>{analysisData.next_session_recommendation}</Text>
        </Section>

        <Hr style={{ margin: '32px 0', borderColor: '#e5e7eb' }} />

        {/* Call to Action */}
        <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Button href="https://9efb8ab7-d861-473b-88f1-2736da9c245d.lovableproject.com">
            {t.playAgain}
          </Button>
        </Section>

        <Text style={{ 
          textAlign: 'center',
          fontSize: '16px',
          fontStyle: 'italic',
          color: '#6b7280'
        }}>
          {t.footer}
        </Text>
      </Section>
    </BaseLayout>
  );
};

export default AIAnalysisEmail;