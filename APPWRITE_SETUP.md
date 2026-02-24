# ANIMA Appwrite Integration Guide

## Overview

This guide walks you through integrating **Appwrite** as the backend for ANIMA. Appwrite is a self-hosted Backend-as-a-Service (BaaS) that replaces the need for PostgreSQL + Mock API with a comprehensive platform featuring:

- 🗄️ **Database** - NoSQL document storage
- 👥 **Authentication** - Email/password, OAuth, SSO
- 📦 **Storage** - File uploads (pet photos, biocard scans, etc.)
- ⚡ **Realtime** - Live updates via WebSockets
- 🔧 **Functions** - Serverless functions for backend logic
- 📊 **Permissions** - Fine-grained access control

---

## Quick Start (5 minutes)

### 1. Start Appwrite

```bash
docker-compose -f docker-compose.appwrite.yml up -d
```

This starts:
- **Appwrite Console**: http://localhost (admin dashboard)
- **Appwrite API**: http://localhost/v1 (REST API)
- **Realtime**: ws://localhost:8080 (WebSocket)
- **MariaDB**: Database backend
- **Redis**: Caching layer
- **InfluxDB**: Analytics

### 2. Access Appwrite Console

Open http://localhost in your browser

- **Email**: any@email.com
- **Password**: any password (first signup creates admin account)

### 3. Create Project & Collections

In Appwrite Console:

1. **Create Project**:
   - Name: `ANIMA`
   - Project ID: `anima_project`

2. **Create Database**:
   - Database ID: `anima_db`

3. **Create Collections**:
   ```
   ✓ users              (ID: users)
   ✓ pets               (ID: pets)
   ✓ biomarkers         (ID: biomarkers)
   ✓ meals              (ID: meals)
   ✓ weights            (ID: weights)
   ✓ vet_records        (ID: vet_records)
   ✓ activity_logs      (ID: activity_logs)
   ✓ longevity_scores   (ID: longevity_scores)
   ```

### 4. Create Storage Buckets

In Appwrite Console → Storage:

```
✓ pet_photos        (ID: pet_photos)
✓ biocard_scans     (ID: biocard_scans)
✓ vet_documents     (ID: vet_documents)
```

### 5. Update Environment Variables

Edit `.env.local`:

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=http://localhost/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=anima_project
EXPO_PUBLIC_APPWRITE_API_KEY=your_api_key_here
```

Get API Key from: Appwrite Console → Settings → API Keys → Create API Key

### 6. Start Web App

```bash
docker-compose -f docker-compose.appwrite.yml up web
```

Access: http://localhost:8081

---

## Database Schema

### Collection: `pets`

```json
{
  "name": "string",
  "species": "enum[DOG,CAT]",
  "breed": "string",
  "breedSecondary": "string",
  "dateOfBirth": "datetime",
  "sex": "enum[MALE,FEMALE]",
  "weightKg": "float",
  "bodyCondition": "integer",
  "photoUrl": "string",
  "microchipId": "string",
  "userId": "string"
}
```

### Collection: `biomarkers`

```json
{
  "petId": "string",
  "biomarkers": [
    {
      "name": "string",      // BUN, Creatinine, etc.
      "value": "float",
      "unit": "string",      // mg/dL, pH, etc.
      "referenceMin": "float",
      "referenceMax": "float",
      "status": "enum[NORMAL,LOW,HIGH,CRITICAL]",
      "confidence": "float"
    }
  ],
  "scanImageUrl": "string",
  "recordedAt": "datetime"
}
```

### Collection: `meals`

```json
{
  "petId": "string",
  "type": "enum[BREAKFAST,LUNCH,DINNER,SNACK,TREAT]",
  "items": [
    {
      "name": "string",
      "amountGrams": "float",
      "calories": "float"
    }
  ],
  "totalCalories": "float",
  "notes": "string",
  "loggedAt": "datetime"
}
```

### Collection: `weights`

```json
{
  "petId": "string",
  "weightKg": "float",
  "bodyCondition": "integer",
  "recordedAt": "datetime"
}
```

---

## Code Integration

### Initialize Appwrite

In your app's root component:

```typescript
import { initAppwrite } from '@/config/appwrite';

export default function App() {
  React.useEffect(() => {
    initAppwrite();
  }, []);

  return <YourApp />;
}
```

### Use Appwrite Hooks in Components

```typescript
import { useAppwritePets, useAppwriteBiomarkers } from '@/hooks/useAppwrite';

export function MyPetScreen() {
  const { pets, loading, error } = useAppwritePets(userId);
  const { biomarkers, addBiomarker } = useAppwriteBiomarkers(petId);

  return (
    <View>
      {pets.map(pet => (
        <Text key={pet.$id}>{pet.name}</Text>
      ))}
    </View>
  );
}
```

### Query Examples

```typescript
// Get all pets for user
const result = await appwriteDatabase.listDocuments(
  'anima_db',
  'pets',
  [Query.equal('userId', userId)]
);

// Get recent biomarkers
const result = await appwriteDatabase.listDocuments(
  'anima_db',
  'biomarkers',
  [
    Query.equal('petId', petId),
    Query.orderDesc('recordedAt'),
    Query.limit(10)
  ]
);

// Search meals by date range
const result = await appwriteDatabase.listDocuments(
  'anima_db',
  'meals',
  [
    Query.equal('petId', petId),
    Query.greaterThanOrEqual('loggedAt', startDate),
    Query.lessThanOrEqual('loggedAt', endDate)
  ]
);
```

---

## File Uploads

### Upload Pet Photo

```typescript
import { appwriteStorage, APPWRITE_IDS } from '@/config/appwrite';

const file = new File([blob], 'pet-photo.jpg', { type: 'image/jpeg' });

const response = await appwriteStorage.createFile(
  APPWRITE_IDS.buckets.petPhotos,
  'unique()',
  file
);

// Get preview URL
const url = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${projectId}`;
```

### Upload BioCard Scan

```typescript
const scanFile = new File([scanBlob], 'biocard-scan.jpg', { type: 'image/jpeg' });

const response = await appwriteStorage.createFile(
  APPWRITE_IDS.buckets.bioCardScans,
  'unique()',
  scanFile
);

// Save reference in biomarker document
await appwriteDatabase.updateDocument(
  APPWRITE_IDS.database,
  APPWRITE_IDS.collections.biomarkers,
  biomarkerId,
  { scanImageUrl: response.$id }
);
```

---

## Realtime Features

### Subscribe to Pet Updates

```typescript
import { appwriteClient } from '@/config/appwrite';

// Listen for changes to a pet document
const unsubscribe = appwriteClient.subscribe(
  'documents.anima_db.pets',
  (response) => {
    console.log('Pet updated:', response.payload);
  }
);

// Cleanup
unsubscribe();
```

### Subscribe to Biomarker Changes

```typescript
// Listen for new biomarker records
const unsubscribe = appwriteClient.subscribe(
  'collections.anima_db.biomarkers.create',
  (response) => {
    console.log('New biomarker:', response.payload);
    // Trigger UI update
  }
);
```

---

## Serverless Functions

### Create a Longevity Score Function

In Appwrite Console → Functions:

1. **Create Function**:
   - Name: `Longevity Scorer`
   - ID: `longevity_scorer`
   - Runtime: Node.js 18
   - Execute As: Server

2. **Function Code**:

```javascript
export default async function(req, res) {
  const { petId, biomarkers, weight, meals } = req.body;

  // Calculate longevity score from inputs
  const baseScore = 500;
  const biomarkerScore = calculateBiomarkerScore(biomarkers);
  const weightScore = calculateWeightScore(weight);
  const nutritionScore = calculateNutritionScore(meals);

  const finalScore = Math.min(
    999,
    baseScore + biomarkerScore + weightScore + nutritionScore
  );

  return res.json({
    petId,
    score: finalScore,
    factors: {
      biomarker: biomarkerScore,
      weight: weightScore,
      nutrition: nutritionScore
    },
    computedAt: new Date().toISOString()
  });
}

function calculateBiomarkerScore(biomarkers) {
  // Custom scoring logic
  return biomarkers.reduce((score, bm) => {
    if (bm.status === 'NORMAL') return score + 20;
    if (bm.status === 'LOW' || bm.status === 'HIGH') return score - 10;
    if (bm.status === 'CRITICAL') return score - 50;
    return score;
  }, 0);
}

function calculateWeightScore(weight) {
  // Weight scoring logic
  return weight > 0 ? 50 : 0;
}

function calculateNutritionScore(meals) {
  // Nutrition scoring logic
  return meals ? 100 : 0;
}
```

3. **Call from App**:

```typescript
import { appwriteFunctions } from '@/config/appwrite';

const result = await appwriteFunctions.createExecution(
  'longevity_scorer',
  JSON.stringify({
    petId: 'pet123',
    biomarkers: [...],
    weight: 25.5,
    meals: [...]
  })
);

const response = JSON.parse(result.responseBody);
console.log('Longevity score:', response.score);
```

---

## Docker Compose Services

### Services Started

```
✓ appwrite           - Main API server (http://localhost)
✓ appwrite_realtime  - WebSocket server (ws://localhost:8080)
✓ appwrite_worker_tasks    - Background job worker
✓ appwrite_worker_webhooks - Webhook processor
✓ mariadb            - Database (port 3306)
✓ redis              - Cache (port 6379)
✓ influxdb           - Analytics (port 8086)
✓ web                - Expo app (port 8081)
```

### Stop Services

```bash
docker-compose -f docker-compose.appwrite.yml down
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.appwrite.yml logs -f

# Specific service
docker-compose -f docker-compose.appwrite.yml logs -f appwrite
```

---

## Authentication

### Email/Password Auth

```typescript
import { appwriteAccount } from '@/config/appwrite';

// Create account
await appwriteAccount.create('unique()', 'user@email.com', 'password');

// Login
await appwriteAccount.createEmailPasswordSession('user@email.com', 'password');

// Get current user
const user = await appwriteAccount.get();

// Logout
await appwriteAccount.deleteSession('current');
```

### Session Management

```typescript
// Check if logged in
const user = await getCurrentUser();
if (user) {
  console.log('User is logged in:', user);
} else {
  console.log('User is not logged in');
}

// List all sessions
const sessions = await appwriteAccount.listSessions();

// Delete specific session
await appwriteAccount.deleteSession(sessionId);

// Delete all sessions
await appwriteAccount.deleteSession('current');
```

---

## Permissions & Security

### Set Document Permissions

```typescript
// Allow user to read their own pet documents
await appwriteDatabase.updateDocument(
  APPWRITE_IDS.database,
  APPWRITE_IDS.collections.pets,
  petId,
  { /* data */ },
  [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId))
  ]
);
```

### Set Collection Rules

In Appwrite Console:

1. Go to Collection → Settings
2. Set read/write permissions:
   - Public: Only authenticated users
   - User: Can only access own documents
   - Admin: Full access

---

## Troubleshooting

### Appwrite won't start

```bash
# Check logs
docker-compose -f docker-compose.appwrite.yml logs appwrite

# Increase MariaDB startup time
docker-compose -f docker-compose.appwrite.yml up -d mariadb
sleep 15
docker-compose -f docker-compose.appwrite.yml up -d
```

### "Connection refused" errors

- Ensure Appwrite is running: `docker-compose ps`
- Check endpoint in `.env.local`
- Verify firewall allows port 80

### Realtime not connecting

- Check WebSocket endpoint: `ws://localhost:8080`
- Verify Redis is running: `docker-compose logs redis`
- Check browser console for connection errors

### Storage uploads failing

- Ensure bucket exists in Appwrite Console
- Check file size limits (default: 30MB)
- Verify permissions on storage bucket

---

## Production Deployment

### Environment Variables for Production

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://appwrite.yourdomain.com/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=anima_project
_APP_DOMAIN=appwrite.yourdomain.com
_APP_DOMAIN_TARGET=appwrite.yourdomain.com
_APP_OPENSSL_KEY_V1=generate-with-openssl-rand-hex-32
```

### Enable HTTPS

```yaml
# In docker-compose.appwrite.yml
appwrite:
  environment:
    _APP_DOMAIN: appwrite.yourdomain.com
    _APP_DOMAIN_TARGET: appwrite.yourdomain.com
    _APP_OPENSSL_KEY_V1: your_openssl_key
```

### Backup Database

```bash
# Backup MariaDB
docker exec anima-mariadb mysqldump -u appwrite -p appwrite_password appwrite > backup.sql

# Backup volumes
docker run --rm -v appwrite_mariadb:/data -v $(pwd):/backup \
  alpine tar czf /backup/mariadb.tar.gz /data
```

---

## Next Steps

1. ✅ [Set up Appwrite locally](#quick-start-5-minutes)
2. ✅ Create all collections and buckets
3. ✅ Configure `.env.local`
4. ✅ Test with `PetDashboard.tsx` component
5. ✅ Implement authentication in your app
6. ✅ Deploy to production

---

## Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite SDK](https://github.com/appwrite/sdk-for-web)
- [Appwrite React Native](https://github.com/appwrite/sdk-for-web)
- [Docker Compose Setup](https://appwrite.io/docs/advanced/docker)
- [Appwrite Cloud](https://cloud.appwrite.io) - Managed hosting option
