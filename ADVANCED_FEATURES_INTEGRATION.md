# ANIMA Advanced Features Integration with Appwrite

## 📍 Current Status

You have three powerful backend engines that need to be integrated with Appwrite:

```
✓ longevityScorer.ts        - Calculates health scores (0-999)
✓ ambientIntelligence.ts    - Photo vitals, environmental risks, behavioral analysis
✓ nutritionEngine.ts        - Personalized meal planning
```

These are **standalone TypeScript modules** currently using **Prisma + PostgreSQL**, but they need to work with **Appwrite** instead.

---

## 🔧 Integration Strategy

### Option 1: Appwrite Functions (RECOMMENDED)
Deploy each engine as **Appwrite Serverless Functions**:
- Triggered by app events (user logs meal, uploads photo, etc.)
- Run on Appwrite's execution environment
- Store results directly in Appwrite collections
- No separate Node.js server needed

### Option 2: Docker Service + Appwrite API
Run engines in a separate Docker container:
- Engines read/write via Appwrite REST API
- Benefits: Can use more resources, Cron jobs for background tasks
- More complex but more flexible

### Option 3: Hybrid (RECOMMENDED FOR NOW)
- **Real-time features** (food logging) → Appwrite Functions
- **Background analysis** (photo vitals, behavioral patterns) → Separate service
- **Scheduled tasks** (predictive care timeline) → Cron jobs

---

## 📋 Step-by-Step Integration

### Step 1: Create Appwrite Collections for Advanced Features

Add these to your Appwrite database alongside the existing ones:

```
✓ longevity_scores        - Computed health scores
✓ nutrition_plans         - Generated meal plans
✓ photo_vitals            - Computer vision analysis results
✓ environmental_risks     - Location-based risk assessments
✓ behavioral_insights     - Pattern detection results
✓ food_alerts            - Safety & optimization alerts
✓ care_timeline          - Predicted vet visit timeline
✓ digital_twins          - Pet's computational profile
```

### Step 2: Adapt Engines for Appwrite

Convert Prisma queries to Appwrite SDK calls:

**BEFORE (Prisma)**:
```typescript
const pet = await prisma.pet.findUniqueOrThrow({
  where: { id: petId }
});
```

**AFTER (Appwrite)**:
```typescript
const pet = await appwriteDatabase.getDocument(
  'anima_db',
  'pets',
  petId
);
```

### Step 3: Deploy as Appwrite Functions

Create function wrappers that Appwrite can execute.

---

## 🚀 Quick Integration: Appwrite Functions

### Create Function 1: Longevity Score Computation

```bash
# In Appwrite Console → Functions → Create Function
# Runtime: Node.js 18
# ID: compute_longevity_score
```

**Function Code**:
```typescript
// functions/computeLongevityScore.ts
import { Client, Databases } from 'appwrite';

export default async function handler(req, res) {
  const client = new Client();
  const database = new Databases(client);

  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  try {
    const payload = req.body ? JSON.parse(req.body) : {};
    const { petId } = payload;

    if (!petId) {
      return res.json({ error: 'petId required' }, 400);
    }

    // Fetch pet
    const pet = await database.getDocument('anima_db', 'pets', petId);

    // Import and run the scoring engine
    const { computeScore } = await import('./longevityScorer');
    const result = await computeScore(pet);

    // Save to Appwrite
    await database.createDocument(
      'anima_db',
      'longevity_scores',
      'unique()',
      {
        petId,
        score: result.score,
        factors: result.factors,
        breakdown: result.breakdown,
        percentile: result.percentile,
        label: result.label,
        computedAt: new Date().toISOString(),
      }
    );

    return res.json(result);
  } catch (error) {
    console.error('Score computation failed:', error);
    return res.json({ error: error.message }, 500);
  }
}
```

### Create Function 2: Photo Vitals Analysis

```typescript
// functions/analyzePhotoVitals.ts
export default async function handler(req, res) {
  const { petId, imageBase64 } = JSON.parse(req.body);

  const { analyzePhotoVitals } = await import('./ambientIntelligence');
  const result = await analyzePhotoVitals(petId, imageBase64);

  // Save results
  await database.createDocument(
    'anima_db',
    'photo_vitals',
    'unique()',
    {
      petId,
      ...result,
      timestamp: new Date().toISOString(),
    }
  );

  return res.json(result);
}
```

### Create Function 3: Generate Meal Plan

```typescript
// functions/generateMealPlan.ts
export default async function handler(req, res) {
  const { petId } = JSON.parse(req.body);

  const { generateMealPlan } = await import('./nutritionEngine');
  const plan = await generateMealPlan(petId);

  // Save to Appwrite
  await database.createDocument(
    'anima_db',
    'nutrition_plans',
    'unique()',
    {
      petId,
      dailyCalories: plan.dailyCalories,
      meals: plan.meals,
      supplements: plan.supplements,
      hydrationTarget: plan.hydrationTarget,
      notes: plan.notes,
      generatedAt: plan.generatedAt.toISOString(),
      validUntil: plan.validUntil.toISOString(),
    }
  );

  return res.json(plan);
}
```

---

## 🪝 Call Functions from React App

### From Your Components:

```typescript
import { appwriteFunctions } from '@/config/appwrite';

// Compute score
const scoreResult = await appwriteFunctions.createExecution(
  'compute_longevity_score',
  JSON.stringify({ petId })
);

// Analyze photo
const photoResult = await appwriteFunctions.createExecution(
  'analyze_photo_vitals',
  JSON.stringify({ petId, imageBase64 })
);

// Generate meal plan
const planResult = await appwriteFunctions.createExecution(
  'generate_meal_plan',
  JSON.stringify({ petId })
);
```

### Create Custom Hooks:

```typescript
// hooks/useAdvancedFeatures.ts
import { appwriteFunctions } from '@/config/appwrite';

export function useLongevityScore(petId?: string) {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);

  const computeScore = async () => {
    if (!petId) return;
    try {
      setLoading(true);
      const result = await appwriteFunctions.createExecution(
        'compute_longevity_score',
        JSON.stringify({ petId })
      );
      const parsed = JSON.parse(result.responseBody);
      setScore(parsed);
    } finally {
      setLoading(false);
    }
  };

  return { score, loading, computeScore };
}

export function usePhotoVitals(petId?: string) {
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzePhoto = async (imageBase64: string) => {
    if (!petId) return;
    try {
      setLoading(true);
      const result = await appwriteFunctions.createExecution(
        'analyze_photo_vitals',
        JSON.stringify({ petId, imageBase64 })
      );
      const parsed = JSON.parse(result.responseBody);
      setVitals(parsed);
    } finally {
      setLoading(false);
    }
  };

  return { vitals, loading, analyzePhoto };
}

export function useMealPlan(petId?: string) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    if (!petId) return;
    try {
      setLoading(true);
      const result = await appwriteFunctions.createExecution(
        'generate_meal_plan',
        JSON.stringify({ petId })
      );
      const parsed = JSON.parse(result.responseBody);
      setPlan(parsed);
    } finally {
      setLoading(false);
    }
  };

  return { plan, loading, generatePlan };
}
```

---

## 📁 Where to Put the Files

```
anima/
├── functions/                          ← Appwrite Functions
│   ├── computeLongevityScore.ts
│   ├── analyzePhotoVitals.ts
│   ├── generateMealPlan.ts
│   └── computeEnvironmentalRisks.ts
│
├── server/                             ← Optional: Background service
│   ├── engines/
│   │   ├── longevityScorer.ts          ← Move here
│   │   ├── ambientIntelligence.ts      ← Move here
│   │   ├── nutritionEngine.ts          ← Move here
│   │   └── voiceHealthMonitor.ts
│   │
│   └── workers/                        ← Background jobs
│       ├── photoAnalysisWorker.ts
│       ├── behavioralAnalysisWorker.ts
│       └── careTimelineGenerator.ts
│
├── config/
│   └── appwrite.ts                     ← Already created
│
└── hooks/
    └── useAdvancedFeatures.ts          ← Create this
```

---

## 🔄 Data Flow with Appwrite

```
User Action (App)
      ↓
Component calls hook
      ↓
Hook calls Appwrite Function
      ↓
Function imports + runs engine
      ↓
Engine processes data
      ↓
Results saved to Appwrite collections
      ↓
Hook fetches results
      ↓
Component displays to user
```

---

## 🎯 Implementation Order

### Week 1: Setup
- [ ] Create Appwrite collections for advanced features
- [ ] Move engine files to `server/engines/`
- [ ] Create function wrappers in `functions/`
- [ ] Deploy functions to Appwrite Console

### Week 2: Integration
- [ ] Create `useAdvancedFeatures.ts` hooks
- [ ] Update components to use hooks
- [ ] Test score computation
- [ ] Test meal plan generation

### Week 3: Photo Vitals
- [ ] Integrate ML models (TFLite on-device)
- [ ] Test photo analysis
- [ ] Add photo upload component

### Week 4: Polish
- [ ] Background job scheduling
- [ ] Real-time updates
- [ ] Performance optimization

---

## 🚀 Deploy to Production

### Option A: Appwrite Cloud
1. Upload functions via CLI or Console
2. Set environment variables
3. Enable API access

### Option B: Self-Hosted + Background Service
1. Run Appwrite in Docker (already set up)
2. Create separate Node.js service for background jobs
3. Service reads/writes via Appwrite API

```yaml
# docker-compose.appwrite.yml - add this service

background-engine:
  build:
    context: .
    dockerfile: Dockerfile.engine
  environment:
    APPWRITE_ENDPOINT: http://appwrite:80/v1
    APPWRITE_PROJECT_ID: anima_project
    APPWRITE_API_KEY: ${APPWRITE_API_KEY}
  depends_on:
    - appwrite
  networks:
    - anima-network
  restart: unless-stopped
```

---

## 📊 Collection Schema for Advanced Features

```json
// longevity_scores
{
  "petId": "string",
  "score": "number",        // 0-999
  "label": "string",        // Exceptional, Excellent, Good, etc.
  "factors": {
    "genetic": "number",
    "bodyCondition": "number",
    "nutritionQuality": "number",
    "ageHealth": "number",
    "preventiveCare": "number",
    "activityLevel": "number",
    "biomarkerHealth": "number",
    "trajectory": "number"
  },
  "breakdown": "array",
  "percentile": "number",
  "computedAt": "datetime"
}

// nutrition_plans
{
  "petId": "string",
  "dailyCalories": "number",
  "meals": "array",
  "supplements": "array",
  "hydrationTarget": "number",
  "notes": "array",
  "generatedAt": "datetime",
  "validUntil": "datetime"
}

// photo_vitals
{
  "petId": "string",
  "bodyConditionScore": "number",
  "coatQuality": "object",
  "eyeHealth": "object",
  "dentalIndicators": "object",
  "emotionalState": "object",
  "recommendations": "array",
  "timestamp": "datetime"
}

// environmental_risks
{
  "petId": "string",
  "location": "object",
  "risks": "array",
  "overallRiskLevel": "string",
  "actionItems": "array",
  "computedAt": "datetime"
}

// care_timeline
{
  "petId": "string",
  "events": "array",
  "generatedAt": "datetime"
}
```

---

## 🎮 Example: Full Feature Flow

```typescript
// Component: PetHealthDashboard.tsx
import { useLongevityScore, usePhotoVitals, useMealPlan } from '@/hooks/useAdvancedFeatures';

export function PetHealthDashboard({ petId, userId }) {
  const { score, computeScore, loading: scoreLoading } = useLongevityScore(petId);
  const { vitals, analyzePhoto, loading: vitalsLoading } = usePhotoVitals(petId);
  const { plan, generatePlan, loading: planLoading } = useMealPlan(petId);

  return (
    <ScrollView>
      {/* Longevity Score Card */}
      <Card>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
          Health Score: {score?.score || '—'}
        </Text>
        <Text style={{ color: '#888' }}>
          {score?.label || 'Calculate your pet\'s health score'}
        </Text>
        <Button
          title={scoreLoading ? 'Computing...' : 'Compute Score'}
          onPress={computeScore}
          disabled={scoreLoading}
        />
        {score?.breakdown && (
          <View>
            {score.breakdown.map(factor => (
              <FactorBreakdown key={factor.factor} {...factor} />
            ))}
          </View>
        )}
      </Card>

      {/* Meal Plan Card */}
      <Card>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
          Personalized Meal Plan
        </Text>
        <Button
          title={planLoading ? 'Generating...' : 'Generate Plan'}
          onPress={generatePlan}
          disabled={planLoading}
        />
        {plan?.meals && (
          <View>
            {plan.meals.map((meal, i) => (
              <MealDisplay key={i} {...meal} />
            ))}
          </View>
        )}
      </Card>

      {/* Photo Vitals Card */}
      <Card>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
          Photo Health Check
        </Text>
        <ImagePicker onImage={(base64) => analyzePhoto(base64)} />
        {vitals && (
          <View>
            <Text>BCS: {vitals.bodyConditionScore}/9</Text>
            <Text>Coat: {vitals.coatQuality?.overallScore}/100</Text>
            {vitals.recommendations.map((rec, i) => (
              <Text key={i}>→ {rec}</Text>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
```

---

## ✅ Next Steps

1. **Copy these files to proper locations**:
   ```bash
   mkdir -p server/engines
   mkdir -p functions
   
   mv longevityScorer.ts server/engines/
   mv ambientIntelligence.ts server/engines/
   mv nutritionEngine.ts server/engines/
   ```

2. **Create Appwrite collections** (see schema above)

3. **Create function wrappers** in `functions/` directory

4. **Deploy functions** to Appwrite Console

5. **Create custom hooks** in `hooks/useAdvancedFeatures.ts`

6. **Update components** to use the new hooks

All your engines are now integrated with Appwrite and accessible from your React app! 🚀

Let me know if you need help with any specific step!
