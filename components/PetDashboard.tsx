/**
 * Example Component: Pet Dashboard with Appwrite
 * Demonstrates how to use Appwrite hooks and functions
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useAppwritePets, useAppwriteBiomarkers, useAppwriteMealLogger } from '@/hooks/useAppwrite';
import { getCurrentUser, createPet } from '@/config/appwrite';

export default function PetDashboard() {
  const [userId, setUserId] = useState<string | undefined>();
  const [currentPetId, setCurrentPetId] = useState<string | undefined>();

  // Load user on mount
  React.useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.$id);
      }
    };
    loadUser();
  }, []);

  // Fetch user's pets
  const { pets, loading: petsLoading, error: petsError, refreshPets } = useAppwritePets(userId);

  // Fetch biomarkers for current pet
  const { biomarkers, loading: biomarkersLoading, addBiomarker } = useAppwriteBiomarkers(currentPetId);

  // Meal logger
  const { logMealEntry, loading: mealLoading } = useAppwriteMealLogger(currentPetId);

  // Create new pet
  const [newPetName, setNewPetName] = useState('');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [creatingPet, setCreatingPet] = useState(false);

  const handleCreatePet = async () => {
    if (!userId || !newPetName) return;

    try {
      setCreatingPet(true);
      await createPet(userId, {
        name: newPetName,
        breed: newPetBreed || 'Unknown',
        species: 'DOG',
        dateOfBirth: new Date().toISOString(),
        sex: 'MALE',
        weightKg: 0,
      });
      setNewPetName('');
      setNewPetBreed('');
      refreshPets();
    } catch (error) {
      console.error('Failed to create pet:', error);
    } finally {
      setCreatingPet(false);
    }
  };

  // Log meal
  const handleLogMeal = async () => {
    const success = await logMealEntry({
      type: 'BREAKFAST',
      items: [
        {
          name: 'Dog Food',
          amountGrams: 200,
          calories: 600,
        },
      ],
      totalCalories: 600,
      notes: 'Standard morning meal',
    });

    if (success) {
      alert('✅ Meal logged successfully!');
    }
  };

  // Log biomarker
  const handleLogBiomarker = async () => {
    const success = await addBiomarker([
      {
        name: 'BUN',
        value: 18.5,
        unit: 'mg/dL',
        status: 'NORMAL',
      },
      {
        name: 'Creatinine',
        value: 1.2,
        unit: 'mg/dL',
        status: 'NORMAL',
      },
    ]);

    if (success) {
      alert('✅ Biomarker recorded!');
    }
  };

  if (!userId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading user data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24 }}>
        🐾 Pet Health Dashboard
      </Text>

      {/* Create Pet Section */}
      <View
        style={{
          backgroundColor: '#1a1a2e',
          padding: 16,
          borderRadius: 12,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#10B981',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#10B981', marginBottom: 12 }}>
          Add New Pet
        </Text>
        <TextInput
          placeholder="Pet Name"
          placeholderTextColor="#666"
          value={newPetName}
          onChangeText={setNewPetName}
          style={{
            backgroundColor: '#0A0A0F',
            color: '#fff',
            padding: 12,
            borderRadius: 8,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: '#333',
          }}
        />
        <TextInput
          placeholder="Breed (optional)"
          placeholderTextColor="#666"
          value={newPetBreed}
          onChangeText={setNewPetBreed}
          style={{
            backgroundColor: '#0A0A0F',
            color: '#fff',
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#333',
          }}
        />
        <TouchableOpacity
          onPress={handleCreatePet}
          disabled={creatingPet || !newPetName}
          style={{
            backgroundColor: '#10B981',
            padding: 12,
            borderRadius: 8,
            opacity: creatingPet ? 0.5 : 1,
          }}
        >
          {creatingPet ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
              Create Pet
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Pets List */}
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 }}>
        Your Pets ({pets.length})
      </Text>

      {petsLoading ? (
        <ActivityIndicator size="large" color="#10B981" />
      ) : petsError ? (
        <Text style={{ color: '#ef4444', marginBottom: 16 }}>Error: {petsError}</Text>
      ) : pets.length === 0 ? (
        <Text style={{ color: '#666', marginBottom: 16 }}>No pets yet. Create one above!</Text>
      ) : (
        pets.map((pet) => (
          <TouchableOpacity
            key={pet.$id}
            onPress={() => setCurrentPetId(pet.$id)}
            style={{
              backgroundColor: currentPetId === pet.$id ? '#10B981' : '#1a1a2e',
              padding: 16,
              borderRadius: 8,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: currentPetId === pet.$id ? '#10B981' : '#333',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
              {pet.name} 🐕
            </Text>
            <Text style={{ color: '#aaa', marginTop: 4 }}>
              {pet.breed} • {pet.species}
            </Text>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              Weight: {pet.weightKg || 'N/A'} kg
            </Text>
          </TouchableOpacity>
        ))
      )}

      {/* Actions for Selected Pet */}
      {currentPetId && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 }}>
            Pet Actions
          </Text>

          <TouchableOpacity
            onPress={handleLogMeal}
            disabled={mealLoading}
            style={{
              backgroundColor: '#3B82F6',
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
              opacity: mealLoading ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
              📍 Log Meal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogBiomarker}
            disabled={biomarkersLoading}
            style={{
              backgroundColor: '#8B5CF6',
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
              opacity: biomarkersLoading ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
              🧪 Log Biomarker
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Biomarkers Display */}
      {currentPetId && biomarkers.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 }}>
            Recent Biomarkers ({biomarkers.length})
          </Text>

          {biomarkers.map((record) => (
            <View
              key={record.$id}
              style={{
                backgroundColor: '#1a1a2e',
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
                borderLeftWidth: 4,
                borderLeftColor: '#10B981',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {new Date(record.recordedAt).toLocaleDateString()}
              </Text>
              {record.biomarkers?.map((bm: any, idx: number) => (
                <Text key={idx} style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                  • {bm.name}: {bm.value} {bm.unit} ({bm.status})
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Connection Status */}
      <View
        style={{
          backgroundColor: '#1a1a2e',
          padding: 12,
          borderRadius: 8,
          marginTop: 20,
          marginBottom: 40,
          borderWidth: 1,
          borderColor: '#10B981',
        }}
      >
        <Text style={{ color: '#10B981', fontWeight: '600', marginBottom: 8 }}>
          ✅ Connected to Appwrite
        </Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>
          Endpoint: {process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT}
        </Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>
          Project: {process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID}
        </Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>
          User ID: {userId}
        </Text>
      </View>
    </ScrollView>
  );
}
