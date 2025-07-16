import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { shuffleArray, questionTracker } from '@/utils/questionRandomizer';

interface Question {
  id: string;
  text: string;
  category?: string;
  level_id: string;
  language: string;
  is_active: boolean;
}

interface Level {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  language: string;
  is_active: boolean;
}

interface UseQuestionsReturn {
  questions: Question[];
  levels: Level[];
  getQuestionsForLevel: (levelId: string, limit?: number) => Question[];
  markQuestionAsUsed: (questionId: string) => void;
  resetQuestionHistory: () => void;
  isLoading: boolean;
  error: string | null;
}

export const useQuestions = (): UseQuestionsReturn => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language || 'en';

  // Load questions and levels for the current language
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load levels
        const { data: levelsData, error: levelsError } = await supabase
          .from('levels')
          .select('*')
          .eq('language', currentLanguage)
          .eq('is_active', true)
          .order('sort_order');

        if (levelsError) throw levelsError;

        // Load questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('language', currentLanguage)
          .eq('is_active', true);

        if (questionsError) throw questionsError;

        setLevels(levelsData || []);
        setQuestions(questionsData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentLanguage]);

  // Get randomized questions for a specific level
  const getQuestionsForLevel = useCallback((levelId: string, limit: number = 10): Question[] => {
    const levelQuestions = questions.filter(q => q.level_id === levelId);
    
    // Get questions that haven't been used recently
    const availableQuestions = questionTracker.getAvailableQuestions(levelQuestions);
    
    // If we don't have enough unused questions, use all questions for the level
    const questionsToUse = availableQuestions.length >= limit ? availableQuestions : levelQuestions;
    
    return shuffleArray(questionsToUse).slice(0, limit);
  }, [questions]);

  const markQuestionAsUsed = useCallback((questionId: string) => {
    questionTracker.markAsUsed(questionId);
  }, []);

  const resetQuestionHistory = useCallback(() => {
    questionTracker.reset();
  }, []);

  return {
    questions,
    levels,
    getQuestionsForLevel,
    markQuestionAsUsed,
    resetQuestionHistory,
    isLoading,
    error
  };
};