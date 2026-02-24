/**
 * React Hook for Appwrite Database Operations
 * Provides easy access to pet data, biomarkers, meals, and more
 * 
 * Usage:
 *   const { pets, loading, error, refreshPets } = useAppwritePets(userId)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  getUserPets,
  getPetBiomarkers,
  getPetActivityLogs,
  createBiomarkerSet,
  logMeal,
  logWeight,
} from '@/config/appwrite';

// ============================================
// useAppwritePets - Fetch user's pets
// ============================================
export const useAppwritePets = (userId?: string) => {
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPets = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getUserPets(userId);
      setPets(result.documents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pets');
      console.error('❌ useAppwritePets error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshPets();
  }, [userId, refreshPets]);

  return { pets, loading, error, refreshPets };
};

// ============================================
// useAppwriteBiomarkers - Fetch pet biomarkers
// ============================================
export const useAppwriteBiomarkers = (petId?: string) => {
  const [biomarkers, setBiomarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBiomarkers = useCallback(async () => {
    if (!petId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getPetBiomarkers(petId, 50);
      setBiomarkers(result.documents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch biomarkers');
      console.error('❌ useAppwriteBiomarkers error:', err);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    refreshBiomarkers();
  }, [petId, refreshBiomarkers]);

  const addBiomarker = useCallback(
    async (biomarkerData: any[]) => {
      if (!petId) return;
      try {
        setError(null);
        await createBiomarkerSet(petId, biomarkerData);
        await refreshBiomarkers();
        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to add biomarker');
        console.error('❌ addBiomarker error:', err);
        return false;
      }
    },
    [petId, refreshBiomarkers]
  );

  return { biomarkers, loading, error, addBiomarker, refreshBiomarkers };
};

// ============================================
// useAppwriteActivityLogs - Fetch activity data
// ============================================
export const useAppwriteActivityLogs = (petId?: string) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshActivities = useCallback(async () => {
    if (!petId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getPetActivityLogs(petId, 100);
      setActivities(result.documents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activity logs');
      console.error('❌ useAppwriteActivityLogs error:', err);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    refreshActivities();
  }, [petId, refreshActivities]);

  return { activities, loading, error, refreshActivities };
};

// ============================================
// useAppwriteMealLogger - Log meals
// ============================================
export const useAppwriteMealLogger = (petId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logMealEntry = useCallback(
    async (mealData: any) => {
      if (!petId) {
        setError('Pet ID required');
        return false;
      }

      try {
        setLoading(true);
        setError(null);
        await logMeal(petId, mealData);
        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to log meal');
        console.error('❌ logMealEntry error:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [petId]
  );

  return { logMealEntry, loading, error };
};

// ============================================
// useAppwriteWeightLogger - Log weight
// ============================================
export const useAppwriteWeightLogger = (petId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logWeightEntry = useCallback(
    async (weightKg: number, bodyCondition?: number) => {
      if (!petId) {
        setError('Pet ID required');
        return false;
      }

      try {
        setLoading(true);
        setError(null);
        await logWeight(petId, weightKg, bodyCondition);
        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to log weight');
        console.error('❌ logWeightEntry error:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [petId]
  );

  return { logWeightEntry, loading, error };
};

// ============================================
// useAppwriteMulti - Fetch all pet data at once
// ============================================
export const useAppwriteMulti = (petId?: string) => {
  const {
    biomarkers,
    loading: biomarkersLoading,
    addBiomarker,
  } = useAppwriteBiomarkers(petId);
  const {
    activities,
    loading: activitiesLoading,
  } = useAppwriteActivityLogs(petId);

  const loading = biomarkersLoading || activitiesLoading;

  return {
    biomarkers,
    activities,
    loading,
    addBiomarker,
  };
};

export default {
  useAppwritePets,
  useAppwriteBiomarkers,
  useAppwriteActivityLogs,
  useAppwriteMealLogger,
  useAppwriteWeightLogger,
  useAppwriteMulti,
};
