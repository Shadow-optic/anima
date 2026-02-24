/**
 * ANIMA Appwrite SDK Configuration
 * Initialize Appwrite client for web and mobile platforms
 * 
 * Usage:
 *   import { initAppwrite, appwriteClient, appwriteDatabase } from '@/config/appwrite'
 *   
 *   // Initialize on app startup
 *   initAppwrite()
 */

import { Client, Databases, Account, Storage, Functions, Query } from 'appwrite';

// Initialize Appwrite Client
export const appwriteClient = new Client();

export const initAppwrite = () => {
  appwriteClient
    .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'http://localhost/v1')
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 'anima_project');

  console.log('✅ Appwrite initialized:', {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  });
};

// Services
export const appwriteDatabase = new Databases(appwriteClient);
export const appwriteAccount = new Account(appwriteClient);
export const appwriteStorage = new Storage(appwriteClient);
export const appwriteFunctions = new Functions(appwriteClient);

// Database & Collection IDs
export const APPWRITE_IDS = {
  database: 'anima_db',
  collections: {
    users: 'users',
    pets: 'pets',
    biomarkers: 'biomarkers',
    meals: 'meals',
    weights: 'weights',
    vetRecords: 'vet_records',
    activityLogs: 'activity_logs',
    longevityScores: 'longevity_scores',
  },
  buckets: {
    petPhotos: 'pet_photos',
    bioCardScans: 'biocard_scans',
    vetDocuments: 'vet_documents',
  },
};

// Helper: Create User Session
export const createUserSession = async (email: string, password: string) => {
  try {
    return await appwriteAccount.createEmailPasswordSession(email, password);
  } catch (error) {
    console.error('❌ Session creation failed:', error);
    throw error;
  }
};

// Helper: Get Current User
export const getCurrentUser = async () => {
  try {
    return await appwriteAccount.get();
  } catch (error) {
    console.error('❌ Get user failed:', error);
    return null;
  }
};

// Helper: Logout
export const logoutUser = async () => {
  try {
    return await appwriteAccount.deleteSession('current');
  } catch (error) {
    console.error('❌ Logout failed:', error);
  }
};

// Helper: Create Pet Document
export const createPet = async (userId: string, petData: any) => {
  try {
    return await appwriteDatabase.createDocument(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.pets,
      'unique()',
      {
        userId,
        ...petData,
        createdAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('❌ Create pet failed:', error);
    throw error;
  }
};

// Helper: Get Pet by ID
export const getPet = async (petId: string) => {
  try {
    return await appwriteDatabase.getDocument(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.pets,
      petId
    );
  } catch (error) {
    console.error('❌ Get pet failed:', error);
    return null;
  }
};

// Helper: List Pets for User
export const getUserPets = async (userId: string) => {
  try {
    return await appwriteDatabase.listDocuments(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.pets,
      [Query.equal('userId', userId)]
    );
  } catch (error) {
    console.error('❌ List pets failed:', error);
    return { documents: [] };
  }
};

// Helper: Update Pet
export const updatePet = async (petId: string, petData: any) => {
  try {
    return await appwriteDatabase.updateDocument(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.pets,
      petId,
      {
        ...petData,
        updatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('❌ Update pet failed:', error);
    throw error;
  }
};

// Helper: Create Biomarker Set
export const createBiomarkerSet = async (petId: string, biomarkers: any[]) => {
  try {
    return await appwriteDatabase.createDocument(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.biomarkers,
      'unique()',
      {
        petId,
        biomarkers,
        recordedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('❌ Create biomarker set failed:', error);
    throw error;
  }
};

// Helper: Get Pet Biomarkers
export const getPetBiomarkers = async (petId: string, limit = 10) => {
  try {
    return await appwriteDatabase.listDocuments(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.biomarkers,
      [Query.equal('petId', petId), Query.limit(limit), Query.orderDesc('recordedAt')]
    );
  } catch (error) {
    console.error('❌ Get biomarkers failed:', error);
    return { documents: [] };
  }
};

// Helper: Log Meal
export const logMeal = async (petId: string, mealData: any) => {
  try {
    return await appwriteDatabase.createDocument(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.meals,
      'unique()',
      {
        petId,
        ...mealData,
        loggedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('❌ Log meal failed:', error);
    throw error;
  }
};

// Helper: Log Weight
export const logWeight = async (petId: string, weightKg: number, bodyCondition?: number) => {
  try {
    return await appwriteDatabase.createDocument(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.weights,
      'unique()',
      {
        petId,
        weightKg,
        bodyCondition,
        recordedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('❌ Log weight failed:', error);
    throw error;
  }
};

// Helper: Get Pet Activity Logs
export const getPetActivityLogs = async (petId: string, limit = 30) => {
  try {
    return await appwriteDatabase.listDocuments(
      APPWRITE_IDS.database,
      APPWRITE_IDS.collections.activityLogs,
      [Query.equal('petId', petId), Query.limit(limit), Query.orderDesc('date')]
    );
  } catch (error) {
    console.error('❌ Get activity logs failed:', error);
    return { documents: [] };
  }
};

// Helper: Upload Pet Photo
export const uploadPetPhoto = async (petId: string, file: File) => {
  try {
    const response = await appwriteStorage.createFile(
      APPWRITE_IDS.buckets.petPhotos,
      'unique()',
      file
    );
    return response;
  } catch (error) {
    console.error('❌ Upload pet photo failed:', error);
    throw error;
  }
};

// Helper: Get File Preview URL
export const getFilePreviewUrl = (bucketId: string, fileId: string) => {
  return `${process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID}`;
};

// Helper: Call Longevity Scorer Function
export const computeLongevityScore = async (petId: string, petData: any) => {
  try {
    return await appwriteFunctions.createExecution(
      'compute_longevity_score',
      JSON.stringify({ petId, ...petData })
    );
  } catch (error) {
    console.error('❌ Compute longevity score failed:', error);
    throw error;
  }
};

export default {
  initAppwrite,
  appwriteClient,
  appwriteDatabase,
  appwriteAccount,
  appwriteStorage,
  appwriteFunctions,
  APPWRITE_IDS,
  createUserSession,
  getCurrentUser,
  logoutUser,
  createPet,
  getPet,
  getUserPets,
  updatePet,
  createBiomarkerSet,
  getPetBiomarkers,
  logMeal,
  logWeight,
  getPetActivityLogs,
  uploadPetPhoto,
  getFilePreviewUrl,
  computeLongevityScore,
};
