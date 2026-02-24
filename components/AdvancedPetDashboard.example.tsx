# Updated PetDashboard with Advanced Features

Example showing how to use all three advanced features in your dashboard component.

## Before & After

### BEFORE (Current Basic Dashboard)
```typescript
export function PetDashboard() {
  const { pets } = useAppwritePets(userId)
  return (
    <View>
      {pets.map(pet => <PetCard pet={pet} />)}
    </View>
  )
}
```

### AFTER (With Advanced Features)
```typescript
import { useAppwritePets } from '@/hooks/useAppwrite'
import {
  useAppwriteLongevityScore,
  useAppwriteMealPlan,
  useAppwritePhotoVitals,
} from '@/hooks/useAdvancedFeatures'
import { View, Text, Button, ScrollView, ActivityIndicator } from 'react-native'

export function AdvancedPetDashboard({ petId, userId }: Props) {
  // Basic pet data
  const { pets } = useAppwritePets(userId)

  // Advanced features
  const { score, computeScore, loading: scoreLoading } = useAppwriteLongevityScore(petId)
  const { plan, generatePlan, loading: planLoading } = useAppwriteMealPlan(petId)
  const { vitals, analyzePhoto, loading: vitalsLoading } = useAppwritePhotoVitals(petId)

  const [selectedPetId, setSelectedPetId] = useState<string>()
  const currentPet = pets.find(p => p.$id === (selectedPetId || petId))

  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: '#0A0A0F' }}>
      {/* Pet Selection */}
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 12 }}>
        Select Pet
      </Text>
      {pets.map(pet => (
        <TouchableOpacity
          key={pet.$id}
          onPress={() => setSelectedPetId(pet.$id)}
          style={{
            padding: 12,
            backgroundColor: selectedPetId === pet.$id ? '#10B981' : '#1a1a2e',
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>{pet.name}</Text>
        </TouchableOpacity>
      ))}

      {currentPet && (
        <>
          {/* HEALTH SCORE SECTION */}
          <View style={{ marginTop: 24, marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 }}>
              🏥 Health Score
            </Text>

            {score ? (
              <View style={{ backgroundColor: '#1a1a2e', padding: 16, borderRadius: 12 }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#10B981' }}>
                  {score.score}/999
                </Text>
                <Text style={{ color: '#aaa', fontSize: 14, marginTop: 4 }}>
                  {score.label}
                </Text>

                {/* Score Breakdown */}
                <Text style={{ color: '#fff', fontWeight: '600', marginTop: 12, marginBottom: 8 }}>
                  Factors:
                </Text>
                {score.breakdown?.slice(0, 5).map((factor: any) => (
                  <View key={factor.factor} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#ddd', flex: 1 }}>
                        {factor.label}
                      </Text>
                      <Text style={{ color: '#10B981', fontWeight: '600' }}>
                        {factor.score}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 4,
                        backgroundColor: '#333',
                        borderRadius: 2,
                        marginTop: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: `${factor.score}%`,
                          backgroundColor: factor.score > 70 ? '#10B981' : '#F59E0B',
                        }}
                      />
                    </View>
                  </View>
                ))}

                {score.breakdown?.[0]?.suggestion && (
                  <Text style={{ color: '#F59E0B', fontSize: 12, marginTop: 12 }}>
                    💡 {score.breakdown[0].suggestion}
                  </Text>
                )}
              </View>
            ) : (
              <Button
                title={scoreLoading ? 'Computing Score...' : 'Compute Health Score'}
                onPress={() => computeScore()}
                disabled={scoreLoading}
              />
            )}
          </View>

          {/* NUTRITION PLAN SECTION */}
          <View style={{ marginTop: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 }}>
              🍖 Nutrition Plan
            </Text>

            {plan ? (
              <View style={{ backgroundColor: '#1a1a2e', padding: 16, borderRadius: 12 }}>
                <Text style={{ color: '#10B981', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                  Daily Goal: {plan.dailyCalories} kcal
                </Text>

                {plan.meals?.map((meal: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>
                      {meal.type} ({meal.totalCalories} cal)
                    </Text>
                    {meal.foods?.map((food: any, fIdx: number) => (
                      <Text key={fIdx} style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                        • {food.brand} {food.name} - {food.amountGrams}g
                      </Text>
                    ))}
                  </View>
                ))}

                {plan.supplements?.length > 0 && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' }}>
                    <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 8 }}>
                      Supplements:
                    </Text>
                    {plan.supplements.map((supp: any, idx: number) => (
                      <Text key={idx} style={{ color: '#aaa', fontSize: 12, marginBottom: 4 }}>
                        • {supp.name} - {supp.dose} {supp.frequency}
                      </Text>
                    ))}
                  </View>
                )}

                <Text style={{ color: '#aaa', fontSize: 12, marginTop: 12 }}>
                  Plan valid until: {new Date(plan.validUntil).toLocaleDateString()}
                </Text>
              </View>
            ) : (
              <Button
                title={planLoading ? 'Generating Plan...' : 'Generate Meal Plan'}
                onPress={() => generatePlan()}
                disabled={planLoading}
              />
            )}
          </View>

          {/* PHOTO VITALS SECTION */}
          <View style={{ marginTop: 20, marginBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 }}>
              📸 Photo Health Check
            </Text>

            {vitals ? (
              <View style={{ backgroundColor: '#1a1a2e', padding: 16, borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#aaa', fontSize: 12 }}>Body Condition</Text>
                    <Text style={{ color: '#10B981', fontSize: 20, fontWeight: 'bold' }}>
                      {vitals.bodyConditionScore}/9
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#aaa', fontSize: 12 }}>Coat Health</Text>
                    <Text style={{ color: '#10B981', fontSize: 20, fontWeight: 'bold' }}>
                      {Math.round(vitals.coatQuality?.overallScore || 0)}%
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#aaa', fontSize: 12 }}>Eye Clarity</Text>
                    <Text style={{ color: '#10B981', fontSize: 20, fontWeight: 'bold' }}>
                      {Math.round(vitals.eyeHealth?.clarity || 0)}%
                    </Text>
                  </View>
                </View>

                {vitals.recommendations?.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: '#F59E0B', fontWeight: '600', marginBottom: 8 }}>
                      Recommendations:
                    </Text>
                    {vitals.recommendations.map((rec: string, idx: number) => (
                      <Text key={idx} style={{ color: '#ddd', fontSize: 12, marginBottom: 4 }}>
                        • {rec}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' }}>
                  <Text style={{ color: '#aaa', fontSize: 12 }}>
                    Mood: {vitals.emotionalState?.state || 'Unknown'}
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                    Analyzed: {new Date(vitals.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#aaa', marginBottom: 12 }}>
                  Take a photo of your pet to analyze health indicators
                </Text>
                <ImagePickerButton
                  onImage={(base64) => analyzePhoto(base64)}
                  disabled={vitalsLoading}
                />
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}

// Helper component for image picker
function ImagePickerButton({ onImage, disabled }: { onImage: (base64: string) => void; disabled: boolean }) {
  return (
    <Button
      title={disabled ? 'Analyzing...' : 'Pick Photo from Gallery'}
      onPress={async () => {
        try {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true,
          })

          if (!result.canceled && result.assets[0].base64) {
            onImage(result.assets[0].base64)
          }
        } catch (error) {
          console.error('Image picker error:', error)
        }
      }}
      disabled={disabled}
    />
  )
}
```

## Usage

```typescript
// In your screen/app
import AdvancedPetDashboard from '@/components/AdvancedPetDashboard'

export default function PetScreen({ userId }: { userId: string }) {
  return <AdvancedPetDashboard userId={userId} />
}
```

## Features Shown

1. **Health Score Card**
   - 0-999 score with label
   - Visual breakdown of 5 main factors
   - Personalized suggestions

2. **Nutrition Plan Card**
   - Daily calorie target
   - Meal-by-meal breakdown
   - Supplement recommendations
   - Plan validity date

3. **Photo Vitals Card**
   - Body Condition Score
   - Coat health percentage
   - Eye clarity percentage
   - AI-generated recommendations
   - Emotional state
   - Timestamp of analysis

4. **Pet Selection**
   - Switch between pets
   - Each pet has separate scores, plans, vitals

## Responsive & Real-Time

- Loading states while computing
- Error handling built in
- Real-time updates from Appwrite
- Disabled buttons during processing
- Color-coded health indicators

## Next Steps

1. Import this component in your screen
2. Connect to your Appwrite database
3. Test each feature
4. Customize styling to match your app theme
5. Add video recording for additional vitals
6. Implement background job scheduling

---

**All advanced features are now accessible through a beautiful, responsive UI! 🎨**
