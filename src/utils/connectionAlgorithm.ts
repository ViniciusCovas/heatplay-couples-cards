export interface GameResponse {
  question: string;
  response: string;
  responseTime: number;
  level: number;
  playerId: string;
  evaluation?: {
    honesty: number;
    attraction: number;
    intimacy: number;
    surprise: number;
  };
}

export interface ConnectionData {
  emotionalConnection: number;
  attraction: number; 
  intimacy: number;
  mutualCuriosity: number;
  emotionalSync: number;
  overallScore: number;
  feeling: string;
  totalResponses: number;
  averageResponseTime: number;
}

export const calculateConnectionScore = (responses: GameResponse[]): ConnectionData => {
  if (responses.length === 0) {
    return {
      emotionalConnection: 0,
      attraction: 0,
      intimacy: 0,
      mutualCuriosity: 0,
      emotionalSync: 0,
      overallScore: 0,
      feeling: "No hay datos suficientes",
      totalResponses: 0,
      averageResponseTime: 0
    };
  }

  // Calculate base metrics
  const totalResponses = responses.length;
  const averageResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / totalResponses;
  
  // Calculate evaluation-based scores if available
  const responsesWithEvaluations = responses.filter(r => r.evaluation);
  
  if (responsesWithEvaluations.length > 0) {
    // Use actual evaluations for scoring
    const evaluationScores = responsesWithEvaluations.map(r => r.evaluation!);
    
    const emotionalConnection = evaluationScores.reduce((sum, e) => sum + e.honesty, 0) / evaluationScores.length;
    const attraction = evaluationScores.reduce((sum, e) => sum + e.attraction, 0) / evaluationScores.length;
    const intimacy = evaluationScores.reduce((sum, e) => sum + e.intimacy, 0) / evaluationScores.length;
    const mutualCuriosity = evaluationScores.reduce((sum, e) => sum + e.surprise, 0) / evaluationScores.length;
    
    const overallScore = (emotionalConnection + attraction + intimacy + mutualCuriosity) / 4;
    
    // Determine feeling based on overall score
    let feeling: string;
    if (overallScore >= 4.5) {
      feeling = "✨ ¡Conexión intensa y recíproca! ✨";
    } else if (overallScore >= 3.5) {
      feeling = "🔥 ¡Alta conexión y atracción! 🔥";
    } else if (overallScore >= 2.5) {
      feeling = "💫 Curiosos pero pueden conectar más";
    } else {
      feeling = "💭 Hay potencial, sigan explorando";
    }
    
    return {
      emotionalConnection,
      attraction,
      intimacy,
      mutualCuriosity,
      emotionalSync: Math.round(overallScore * 20),
      overallScore: Math.round(overallScore * 10) / 10,
      feeling,
      totalResponses,
      averageResponseTime: Math.round(averageResponseTime)
    };
  } else {
    // Fallback to response-time based scoring
    const baseScore = Math.min(5, totalResponses / 2);
    const timeBonus = Math.max(0, (30 - averageResponseTime) / 30);
    const overallScore = Math.min(5, baseScore + timeBonus);
    
    let feeling: string;
    if (overallScore >= 4.5) {
      feeling = "✨ ¡Conexión intensa y recíproca! ✨";
    } else if (overallScore >= 3.5) {
      feeling = "🔥 ¡Alta conexión y atracción! 🔥";
    } else if (overallScore >= 2.5) {
      feeling = "💫 Curiosos pero pueden conectar más";
    } else {
      feeling = "💭 Hay potencial, sigan explorando";
    }
    
    return {
      emotionalConnection: overallScore,
      attraction: overallScore,
      intimacy: overallScore,
      mutualCuriosity: overallScore,
      emotionalSync: Math.round(overallScore * 20),
      overallScore: Math.round(overallScore * 10) / 10,
      feeling,
      totalResponses,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }
};