import { ResponseEvaluation } from "@/components/game/ResponseEvaluation";

export interface GameResponse {
  question: string;
  response: string;
  responseTime: number;
  evaluation: ResponseEvaluation;
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

  // Separate responses by player to calculate discrepancy
  const player1Responses = responses.filter(r => r.playerId === 'player1');
  const player2Responses = responses.filter(r => r.playerId === 'player2');
  
  // Calculate base metrics
  const totalResponses = responses.length;
  const averageResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / totalResponses;
  
  // Emotional Connection (C): Average honesty scores
  const emotionalConnection = responses.reduce((sum, r) => sum + r.evaluation.honesty, 0) / totalResponses;
  
  // Attraction (A): Weighted by response time (faster = more attraction) and attraction scores
  const attractionScores = responses.map(r => {
    const timeWeight = Math.max(0.5, Math.min(2, 10 / r.responseTime)); // Faster response = higher weight
    return r.evaluation.attraction * timeWeight;
  });
  const attraction = Math.min(5, attractionScores.reduce((sum, score) => sum + score, 0) / totalResponses);
  
  // Intimacy (I): Average intimacy scores, weighted by level
  const intimacyScores = responses.map(r => {
    const levelWeight = r.level; // Higher level = more weight
    return r.evaluation.intimacy * levelWeight;
  });
  const intimacy = Math.min(5, intimacyScores.reduce((sum, score) => sum + score, 0) / responses.reduce((sum, r) => sum + r.level, 0));
  
  // Mutual Curiosity (MC): Average surprise scores
  const mutualCuriosity = responses.reduce((sum, r) => sum + r.evaluation.surprise, 0) / totalResponses;
  
  // Emotional Sync (ES): How similar are the evaluations between players
  let emotionalSync = 50; // Default if can't calculate
  if (player1Responses.length > 0 && player2Responses.length > 0) {
    const p1AvgEvaluations = {
      honesty: player1Responses.reduce((sum, r) => sum + r.evaluation.honesty, 0) / player1Responses.length,
      attraction: player1Responses.reduce((sum, r) => sum + r.evaluation.attraction, 0) / player1Responses.length,
      intimacy: player1Responses.reduce((sum, r) => sum + r.evaluation.intimacy, 0) / player1Responses.length,
      surprise: player1Responses.reduce((sum, r) => sum + r.evaluation.surprise, 0) / player1Responses.length,
    };
    
    const p2AvgEvaluations = {
      honesty: player2Responses.reduce((sum, r) => sum + r.evaluation.honesty, 0) / player2Responses.length,
      attraction: player2Responses.reduce((sum, r) => sum + r.evaluation.attraction, 0) / player2Responses.length,
      intimacy: player2Responses.reduce((sum, r) => sum + r.evaluation.intimacy, 0) / player2Responses.length,
      surprise: player2Responses.reduce((sum, r) => sum + r.evaluation.surprise, 0) / player2Responses.length,
    };
    
    // Calculate similarity (inverse of discrepancy)
    const discrepancy = (
      Math.abs(p1AvgEvaluations.honesty - p2AvgEvaluations.honesty) +
      Math.abs(p1AvgEvaluations.attraction - p2AvgEvaluations.attraction) +
      Math.abs(p1AvgEvaluations.intimacy - p2AvgEvaluations.intimacy) +
      Math.abs(p1AvgEvaluations.surprise - p2AvgEvaluations.surprise)
    ) / 4;
    
    emotionalSync = Math.max(0, 100 - (discrepancy * 20)); // Convert to percentage
  }
  
  // Overall Score: ICI formula
  // ICI = (C + A + I + MC + (ES/20)) / 5
  const overallScore = (emotionalConnection + attraction + intimacy + mutualCuriosity + (emotionalSync / 20)) / 5;
  
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
    emotionalConnection: Math.round(emotionalConnection * 10) / 10,
    attraction: Math.round(attraction * 10) / 10,
    intimacy: Math.round(intimacy * 10) / 10,
    mutualCuriosity: Math.round(mutualCuriosity * 10) / 10,
    emotionalSync: Math.round(emotionalSync),
    overallScore: Math.round(overallScore * 10) / 10,
    feeling,
    totalResponses,
    averageResponseTime: Math.round(averageResponseTime)
  };
};