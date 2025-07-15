// Fisher-Yates shuffle algorithm for better randomization
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get random questions with proper distribution
export function getRandomQuestions<T>(questions: T[], limit: number): T[] {
  const shuffled = shuffleArray(questions);
  return shuffled.slice(0, limit);
}

// Weighted randomization for better category distribution
export function getWeightedRandomQuestions<T extends { category?: string }>(
  questions: T[],
  limit: number,
  categoryWeights: Record<string, number> = {}
): T[] {
  if (questions.length <= limit) {
    return shuffleArray(questions);
  }

  // Group questions by category
  const categorizedQuestions = questions.reduce((acc, question) => {
    const category = question.category || 'default';
    if (!acc[category]) acc[category] = [];
    acc[category].push(question);
    return acc;
  }, {} as Record<string, T[]>);

  const categories = Object.keys(categorizedQuestions);
  const result: T[] = [];

  // Calculate questions per category
  const totalWeight = categories.reduce((sum, cat) => sum + (categoryWeights[cat] || 1), 0);
  
  categories.forEach(category => {
    const weight = categoryWeights[category] || 1;
    const questionsFromCategory = Math.max(1, Math.floor((weight / totalWeight) * limit));
    const availableQuestions = categorizedQuestions[category];
    
    const selectedQuestions = getRandomQuestions(availableQuestions, questionsFromCategory);
    result.push(...selectedQuestions);
  });

  // Fill remaining slots if needed
  const remaining = limit - result.length;
  if (remaining > 0) {
    const unusedQuestions = questions.filter(q => !result.includes(q));
    const additionalQuestions = getRandomQuestions(unusedQuestions, remaining);
    result.push(...additionalQuestions);
  }

  return shuffleArray(result.slice(0, limit));
}

// Session-based question tracking to avoid immediate repeats
class QuestionTracker {
  private usedQuestions: Set<string> = new Set();
  private questionHistory: string[] = [];
  private maxHistorySize = 50;

  markAsUsed(questionId: string): void {
    this.usedQuestions.add(questionId);
    this.questionHistory.push(questionId);
    
    // Keep history size manageable
    if (this.questionHistory.length > this.maxHistorySize) {
      const removedId = this.questionHistory.shift();
      if (removedId) {
        this.usedQuestions.delete(removedId);
      }
    }
  }

  isRecentlyUsed(questionId: string): boolean {
    return this.usedQuestions.has(questionId);
  }

  getAvailableQuestions<T extends { id: string }>(questions: T[]): T[] {
    return questions.filter(q => !this.isRecentlyUsed(q.id));
  }

  reset(): void {
    this.usedQuestions.clear();
    this.questionHistory = [];
  }
}

export const questionTracker = new QuestionTracker();
