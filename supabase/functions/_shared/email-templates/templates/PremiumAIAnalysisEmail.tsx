import React from 'npm:react@18.3.1';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from 'npm:@react-email/components@0.0.22';

interface PremiumAIAnalysisEmailProps {
  userEmail: string;
  language: string;
  analysisData: {
    compatibilityScore: number;
    relationshipPhase: string;
    strengthAreas: Array<{
      area: string;
      score: number;
      insight: string;
    }>;
    growthAreas: Array<{
      area: string;
      score: number;
      recommendation: string;
    }>;
    keyInsights: string[];
    personalizedTips: string[];
    culturalNotes?: string;
    intelligenceMarkers?: {
      primaryDynamic: string;
      communicationDNA: string;
      volatilityProfile: string;
      rarityPercentile: string;
      dataPoints?: number;
      analysisDepth?: string;
    };
    specificMoments?: Array<{
      questionNumber: number;
      type: string;
      score: number;
      insight: string;
      significance: string;
    }>;
    advancedMetrics?: {
      honestyIntimacyCorrelation: number;
      attractionSurpriseCorrelation: number;
      overallVolatility: number;
      averageResponseTime: number;
      breakthroughFrequency: number;
    };
  };
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#16a34a'; // green-600
  if (score >= 60) return '#ca8a04'; // yellow-600
  return '#dc2626'; // red-600
};

const getPhaseEmoji = (phase: string): string => {
  const phases: { [key: string]: string } = {
    'exploring': '🔍',
    'building': '🏗️',
    'deepening': '💫',
    'mastering': '👑'
  };
  return phases[phase.toLowerCase()] || '💝';
};

export const PremiumAIAnalysisEmail = ({ 
  userEmail, 
  language, 
  analysisData 
}: PremiumAIAnalysisEmailProps) => {
  const texts = {
    en: {
      subject: 'Your GetClose Intelligence Report',
      preview: 'Premium relationship analysis powered by AI psychology',
      title: 'GetClose AI Intelligence Report',
      subtitle: 'Relationship Intelligence Powered by Psychology',
      compatibilityTitle: 'Intelligence Score',
      phaseTitle: 'Relationship Phase',
      dynamicTitle: 'Primary Dynamic',
      dataPointsTitle: 'Analysis Depth',
      strengthsTitle: 'Strength Analysis',
      insightsTitle: 'Key Intelligence',
      breakthroughTitle: 'Breakthrough Moments',
      metricsTitle: 'Advanced Metrics',
      recommendationsTitle: 'Intelligent Recommendations',
      cta: 'Start New Session',
      footer: 'Based on advanced psychological frameworks and AI analysis'
    },
    es: {
      subject: 'Tu Reporte de Inteligencia GetClose',
      preview: 'Análisis premium de relaciones con IA psicológica',
      title: 'Reporte de Inteligencia IA GetClose',
      subtitle: 'Inteligencia Relacional Impulsada por Psicología',
      compatibilityTitle: 'Puntuación de Inteligencia',
      phaseTitle: 'Fase de la Relación',
      dynamicTitle: 'Dinámica Principal',
      dataPointsTitle: 'Profundidad del Análisis',
      strengthsTitle: 'Análisis de Fortalezas',
      insightsTitle: 'Inteligencia Clave',
      breakthroughTitle: 'Momentos Decisivos',
      metricsTitle: 'Métricas Avanzadas',
      recommendationsTitle: 'Recomendaciones Inteligentes',
      cta: 'Iniciar Nueva Sesión',
      footer: 'Basado en marcos psicológicos avanzados y análisis de IA'
    },
    fr: {
      subject: 'Votre Rapport d\'Intelligence GetClose',
      preview: 'Analyse premium des relations avec IA psychologique',
      title: 'Rapport d\'Intelligence IA GetClose',
      subtitle: 'Intelligence Relationnelle Alimentée par la Psychologie',
      compatibilityTitle: 'Score d\'Intelligence',
      phaseTitle: 'Phase Relationnelle',
      dynamicTitle: 'Dynamique Principale',
      dataPointsTitle: 'Profondeur d\'Analyse',
      strengthsTitle: 'Analyse des Forces',
      insightsTitle: 'Intelligence Clé',
      breakthroughTitle: 'Moments Décisifs',
      metricsTitle: 'Métriques Avancées',
      recommendationsTitle: 'Recommandations Intelligentes',
      cta: 'Démarrer Nouvelle Session',
      footer: 'Basé sur des cadres psychologiques avancés et l\'analyse IA'
    },
    pt: {
      subject: 'Seu Relatório de Inteligência GetClose',
      preview: 'Análise premium de relacionamentos com IA psicológica',
      title: 'Relatório de Inteligência IA GetClose',
      subtitle: 'Inteligência Relacional Alimentada por Psicologia',
      compatibilityTitle: 'Pontuação de Inteligência',
      phaseTitle: 'Fase do Relacionamento',
      dynamicTitle: 'Dinâmica Principal',
      dataPointsTitle: 'Profundidade da Análise',
      strengthsTitle: 'Análise de Forças',
      insightsTitle: 'Inteligência Chave',
      breakthroughTitle: 'Momentos Decisivos',
      metricsTitle: 'Métricas Avançadas',
      recommendationsTitle: 'Recomendações Inteligentes',
      cta: 'Iniciar Nova Sessão',
      footer: 'Baseado em estruturas psicológicas avançadas e análise de IA'
    }
  };

  const text = texts[language as keyof typeof texts] || texts.en;

  return (
    <Html>
      <Head />
      <Preview>{text.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <div style={logoContainer}>
              <div style={logo}>🧠</div>
              <div>
                <Heading style={title}>{text.title}</Heading>
                <Text style={subtitle}>{text.subtitle}</Text>
              </div>
            </div>
          </Section>

          {/* Intelligence Overview */}
          <Section style={section}>
            <div style={metricsGrid}>
              <div style={metricCard}>
                <div style={{ ...metricValue, color: getScoreColor(analysisData.compatibilityScore) }}>
                  {analysisData.compatibilityScore}%
                </div>
                <div style={metricLabel}>{text.compatibilityTitle}</div>
              </div>
              <div style={metricCard}>
                <div style={metricValue}>
                  {getPhaseEmoji(analysisData.relationshipPhase)} {analysisData.relationshipPhase}
                </div>
                <div style={metricLabel}>{text.phaseTitle}</div>
              </div>
              <div style={metricCard}>
                <div style={metricValue}>
                  {analysisData.intelligenceMarkers?.primaryDynamic || 'Balanced'}
                </div>
                <div style={metricLabel}>{text.dynamicTitle}</div>
              </div>
              <div style={metricCard}>
                <div style={metricValue}>
                  {analysisData.intelligenceMarkers?.dataPoints || 16} Points
                </div>
                <div style={metricLabel}>{text.dataPointsTitle}</div>
              </div>
            </div>
          </Section>

          <Hr style={divider} />

          {/* Strength Analysis */}
          {analysisData.strengthAreas && analysisData.strengthAreas.length > 0 && (
            <Section style={section}>
              <Heading style={sectionTitle}>{text.strengthsTitle}</Heading>
              {analysisData.strengthAreas.map((strength, index) => (
                <div key={index} style={strengthCard}>
                  <div style={strengthHeader}>
                    <span style={strengthArea}>{strength.area}</span>
                    <span style={strengthScore}>{strength.score}/10</span>
                  </div>
                  <Text style={strengthInsight}>{strength.insight}</Text>
                </div>
              ))}
            </Section>
          )}

          {/* Key Intelligence */}
          {analysisData.keyInsights && analysisData.keyInsights.length > 0 && (
            <Section style={section}>
              <Heading style={sectionTitle}>{text.insightsTitle}</Heading>
              {analysisData.keyInsights.map((insight, index) => (
                <div key={index} style={insightCard}>
                  <Text style={insightText}>• {insight}</Text>
                </div>
              ))}
            </Section>
          )}

          {/* Breakthrough Moments */}
          {analysisData.specificMoments && analysisData.specificMoments.length > 0 && (
            <Section style={section}>
              <Heading style={sectionTitle}>{text.breakthroughTitle}</Heading>
              {analysisData.specificMoments.slice(0, 3).map((moment, index) => (
                <div key={index} style={breakthroughCard}>
                  <div style={breakthroughHeader}>
                    <span style={breakthroughQuestion}>Question {moment.questionNumber}</span>
                    <span style={breakthroughScore}>{moment.score}/5</span>
                  </div>
                  <Text style={breakthroughInsight}>{moment.insight}</Text>
                  <div style={breakthroughSignificance}>{moment.significance} Impact</div>
                </div>
              ))}
            </Section>
          )}

          {/* Advanced Metrics */}
          {analysisData.advancedMetrics && (
            <Section style={section}>
              <Heading style={sectionTitle}>{text.metricsTitle}</Heading>
              <div style={advancedMetricsGrid}>
                <div style={advancedMetricCard}>
                  <div style={advancedMetricValue}>
                    {(analysisData.advancedMetrics.honestyIntimacyCorrelation * 100).toFixed(0)}%
                  </div>
                  <div style={advancedMetricLabel}>Trust-Intimacy Sync</div>
                </div>
                <div style={advancedMetricCard}>
                  <div style={advancedMetricValue}>
                    {analysisData.advancedMetrics.averageResponseTime.toFixed(1)}s
                  </div>
                  <div style={advancedMetricLabel}>Response Time</div>
                </div>
                <div style={advancedMetricCard}>
                  <div style={advancedMetricValue}>
                    {analysisData.advancedMetrics.breakthroughFrequency}
                  </div>
                  <div style={advancedMetricLabel}>Breakthroughs</div>
                </div>
                <div style={advancedMetricCard}>
                  <div style={advancedMetricValue}>
                    {analysisData.intelligenceMarkers?.volatilityProfile || 'Stable'}
                  </div>
                  <div style={advancedMetricLabel}>Stability</div>
                </div>
              </div>
            </Section>
          )}

          {/* Intelligent Recommendations */}
          {analysisData.personalizedTips && analysisData.personalizedTips.length > 0 && (
            <Section style={section}>
              <Heading style={sectionTitle}>{text.recommendationsTitle}</Heading>
              {analysisData.personalizedTips.slice(0, 3).map((tip, index) => (
                <div key={index} style={recommendationCard}>
                  <Text style={recommendationText}>💡 {tip}</Text>
                </div>
              ))}
            </Section>
          )}

          {/* Call to Action */}
          <Section style={ctaSection}>
            <Button
              style={button}
              href="https://your-app-domain.lovable.app"
            >
              {text.cta}
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>{text.footer}</Text>
            <Text style={footerText}>
              Percentile: {analysisData.intelligenceMarkers?.rarityPercentile || '75th'} | 
              Analysis: {analysisData.intelligenceMarkers?.analysisDepth || 'Advanced'}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
};

const header = {
  padding: '32px 40px 24px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '12px 12px 0 0',
};

const logoContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const logo = {
  fontSize: '32px',
  width: '48px',
  height: '48px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const title = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0',
};

const subtitle = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.8)',
  margin: '4px 0 0 0',
};

const section = {
  padding: '24px 40px',
};

const metricsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px',
  marginBottom: '8px',
};

const metricCard = {
  textAlign: 'center' as const,
  padding: '16px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const metricValue = {
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 4px 0',
  color: '#1e293b',
};

const metricLabel = {
  fontSize: '12px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 40px',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 16px 0',
  borderBottom: '2px solid #e2e8f0',
  paddingBottom: '8px',
};

const strengthCard = {
  padding: '16px',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  marginBottom: '12px',
};

const strengthHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
};

const strengthArea = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#15803d',
  textTransform: 'capitalize' as const,
};

const strengthScore = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#15803d',
  backgroundColor: '#dcfce7',
  padding: '4px 8px',
  borderRadius: '4px',
};

const strengthInsight = {
  fontSize: '13px',
  color: '#166534',
  margin: '0',
  lineHeight: '1.4',
};

const insightCard = {
  padding: '12px 16px',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  marginBottom: '8px',
};

const insightText = {
  fontSize: '13px',
  color: '#1e40af',
  margin: '0',
  lineHeight: '1.4',
};

const breakthroughCard = {
  padding: '16px',
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  marginBottom: '12px',
};

const breakthroughHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
};

const breakthroughQuestion = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#92400e',
  backgroundColor: '#fef9c3',
  padding: '4px 8px',
  borderRadius: '4px',
};

const breakthroughScore = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#92400e',
};

const breakthroughInsight = {
  fontSize: '13px',
  color: '#78350f',
  margin: '0 0 4px 0',
  lineHeight: '1.4',
};

const breakthroughSignificance = {
  fontSize: '11px',
  color: '#a16207',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const advancedMetricsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '12px',
};

const advancedMetricCard = {
  textAlign: 'center' as const,
  padding: '12px',
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
};

const advancedMetricValue = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#475569',
  margin: '0 0 4px 0',
};

const advancedMetricLabel = {
  fontSize: '10px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const recommendationCard = {
  padding: '12px 16px',
  backgroundColor: '#faf5ff',
  border: '1px solid #d8b4fe',
  borderRadius: '6px',
  marginBottom: '8px',
};

const recommendationText = {
  fontSize: '13px',
  color: '#7c3aed',
  margin: '0',
  lineHeight: '1.4',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '32px 40px',
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  border: 'none',
  cursor: 'pointer',
};

const footer = {
  textAlign: 'center' as const,
  padding: '20px 40px',
  borderTop: '1px solid #e2e8f0',
};

const footerText = {
  fontSize: '12px',
  color: '#64748b',
  margin: '4px 0',
  lineHeight: '1.4',
};

export default PremiumAIAnalysisEmail;