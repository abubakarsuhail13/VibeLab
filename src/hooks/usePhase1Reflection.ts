import { useState, useCallback, useEffect } from "react";

export interface ReflectionQuestion {
  id: number;
  question: string;
  options: string[];
}

export interface ReflectionResult {
  success: boolean;
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  details: Record<string, { correct: boolean; correctIndex: number; explanation: string }>;
}

export function usePhase1Reflection() {
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMissingBlueprint, setIsMissingBlueprint] = useState<boolean>(false);
  const [previousAttempt, setPreviousAttempt] = useState<any | null>(null);
  const [result, setResult] = useState<ReflectionResult | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('vibelab_token') || localStorage.getItem('vibe_token');
      const res = await fetch(`/api/phase/1/quiz`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setPreviousAttempt(data.previousAttempt || null);
        setIsMissingBlueprint(!!data.isMissingBlueprint);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to load reflection questions.");
        if (errData.isMissingBlueprint) {
          setIsMissingBlueprint(true);
        }
      }
    } catch (err) {
      setError("Failed to fetch reflection questions due to network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswers = useCallback(async (selectedAnswers: Record<number, number>) => {
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('vibelab_token') || localStorage.getItem('vibe_token');
      const answersArray = Object.entries(selectedAnswers).map(([qId, sIdx]) => ({
        questionId: parseInt(qId),
        selectedIndex: sIdx
      }));

      const res = await fetch(`/api/phase/1/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: answersArray })
      });

      if (res.ok) {
        const data: ReflectionResult = await res.json();
        setResult(data);
        return data;
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to submit reflection answers.");
        return null;
      }
    } catch (err) {
      setError("Failed to submit reflection responses due to network error.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return {
    questions,
    loading,
    submitting,
    error,
    isMissingBlueprint,
    previousAttempt,
    result,
    fetchQuestions,
    submitAnswers
  };
}
