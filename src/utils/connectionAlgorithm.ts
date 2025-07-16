export interface GameResponse {
  question: string;
  response: string;
  responseTime: number;
  level: number;
  playerId: string;
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
  
  // Simplified scoring based on response times and quantity
  const baseScore = Math.min(5, totalResponses / 2); // More responses = higher score
  const timeBonus = Math.max(0, (30 - averageResponseTime) / 30); // Faster responses = bonus
  
  const overallScore = Math.min(5, baseScore + timeBonus);
  
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
};