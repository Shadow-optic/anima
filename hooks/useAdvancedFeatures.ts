/**
 * React Hooks for Advanced Features
 * 
 * Provides easy access to longevity scores, meal plans, and photo analysis
 * via Appwrite Functions
 */

import { useState, useCallback } from 'react';
import { appwriteFunctions } from '@/config/appwrite';

// ─────────────────────────────────────────────
// useAppwriteLongevityScore
// ─────────────────────────────────────────────

export function useAppwriteLongevityScore(petId?: string) {
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeScore = useCallback(async () => {
    if (!petId) {
      setError('Pet ID required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await appwriteFunctions.createExecution(
        'compute_longevity_score',
        JSON.stringify({ petId })
      );

      const parsed = JSON.parse(result.responseBody);
      setScore(parsed);
      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to compute score';
      setError(errorMsg);
      console.error('Score computation error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [petId]);

  const reset = useCallback(() => {
    setScore(null);
    setError(null);
  }, []);

  return { score, loading, error, computeScore, reset };
}

// ─────────────────────────────────────────────
// useAppwriteMealPlan
// ─────────────────────────────────────────────

export function useAppwriteMealPlan(petId?: string) {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async () => {
    if (!petId) {
      setError('Pet ID required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await appwriteFunctions.createExecution(
        'generate_meal_plan',
        JSON.stringify({ petId })
      );

      const parsed = JSON.parse(result.responseBody);
      setPlan(parsed);
      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate meal plan';
      setError(errorMsg);
      console.error('Meal plan generation error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [petId]);

  const reset = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  return { plan, loading, error, generatePlan, reset };
}

// ─────────────────────────────────────────────
// useAppwritePhotoVitals
// ─────────────────────────────────────────────

export function useAppwritePhotoVitals(petId?: string) {
  const [vitals, setVitals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePhoto = useCallback(
    async (imageBase64: string) => {
      if (!petId) {
        setError('Pet ID required');
        return false;
      }

      if (!imageBase64) {
        setError('Image required');
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await appwriteFunctions.createExecution(
          'analyze_photo_vitals',
          JSON.stringify({ petId, imageBase64 })
        );

        const parsed = JSON.parse(result.responseBody);
        setVitals(parsed);
        return true;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to analyze photo';
        setError(errorMsg);
        console.error('Photo vitals analysis error:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [petId]
  );

  const reset = useCallback(() => {
    setVitals(null);
    setError(null);
  }, []);

  return { vitals, loading, error, analyzePhoto, reset };
}

// ─────────────────────────────────────────────
// useAppwriteAdvancedFeatures
// Combined hook for all features
// ─────────────────────────────────────────────

export function useAppwriteAdvancedFeatures(petId?: string) {
  const score = useAppwriteLongevityScore(petId);
  const plan = useAppwriteMealPlan(petId);
  const vitals = useAppwritePhotoVitals(petId);

  const computeAll = async () => {
    const scoreSuccess = await score.computeScore();
    const planSuccess = await plan.generatePlan();
    return scoreSuccess && planSuccess;
  };

  return {
    score,
    plan,
    vitals,
    computeAll,
  };
}

export default {
  useAppwriteLongevityScore,
  useAppwriteMealPlan,
  useAppwritePhotoVitals,
  useAppwriteAdvancedFeatures,
};
