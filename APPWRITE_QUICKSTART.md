# ANIMA + Appwrite: Quick Start Guide

## 🚀 Get Started in 10 Minutes

### Step 1: Start Appwrite Backend (2 minutes)

```bash
docker-compose -f docker-compose.appwrite.yml up -d
```

Wait for all services to be healthy:
```bash
docker-compose -f docker-compose.appwrite.yml ps
# All should show "healthy"
```

### Step 2: Access Appwrite Console (1 minute)

Open your browser: **http://localhost**

**Create your admin account** (first signup = admin):
- Email: `test@example.com`
- Password: `password123`

### Step 3: Set Up Collections & Buckets (3 minutes)

**Create Project:**
1. Click "Create Project"
2. Name: `ANIMA`
3. ID: `anima_project`

**Create Database:**
1. Go to Databases → Create Database
2. Name: `anima_db`
3. ID: `anima_db`

**Create Collections:**

Go to Database → Collections and create each:

| Collection | ID | Purpose |
|------------|----|----|
| Users | `users` | User accounts |
| Pets | `pets` | Pet profiles |
| Biomarkers | `biomarkers` | Health markers (BUN, creatinine, etc.) |
| Meals | `meals` | Food logs |
| Weights | `weights` | Weight tracking |
| Vet Records | `vet_records` | Veterinary data |
| Activity Logs | `activity_logs` | Exercise/activity data |
| Longevity Scores | `longevity_scores` | Calculated health scores |

**Create Storage Buckets:**

Go to Storage and create:

| Bucket | ID | Purpose |
|--------|----|----|
| Pet Photos | `pet_photos` | Pet profile pictures |
| BioCard Scans | `biocard_scans` | Scan images |
| Vet Documents | `vet_documents` | Vet records files |

### Step 4: Get API Key (1 minute)

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name: `ANIMA Web`
4. Scopes: Select all (or at least `database.read`, `database.write`, `storage.read`, `storage.write`)
5. Copy the key

### Step 5: Configure Your App (1 minute)

Edit `.env.local`:

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=http://localhost/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=anima_project
EXPO_PUBLIC_APPWRITE_API_KEY=paste_your_api_key_here
```

### Step 6: Start Web App (1 minute)

```bash
docker-compose -f docker-compose.appwrite.yml up web
```

Access: **http://localhost:8081**

You should see the PetDashboard with connection status showing green ✅

---

## 📱 What You Can Do Now

### From the Web App (http://localhost:8081):

✅ **Create Pets**
- Add pet name and breed
- Auto-creates in Appwrite database

✅ **Log Meals**
- Records what your pet ate
- Stored in `meals` collection

✅ **Log Biomarkers**
- Record health metrics (BUN, creatinine, etc.)
- Stored in `biomarkers` collection

✅ **View Real-Time Data**
- See all your pets
- View recent biomarkers
- All synced with Appwrite

### From Appwrite Console (http://localhost):

✅ **View Collections**
- Click Collections → Browse documents
- See all pet data in real-time

✅ **Test Queries**
- Database → Collections → Queries
- Run queries like "Get all dogs"

✅ **Manage Permissions**
- Settings → Permissions
- Control who can access what

---

## 🗂️ File Structure

```
anima/
├── config/
│   └── appwrite.ts              ← SDK initialization & helpers
├── hooks/
│   └── useAppwrite.ts           ← React hooks for data
├── components/
│   └── PetDashboard.tsx         ← Example component
├── docker-compose.appwrite.yml  ← Services config
├── Dockerfile.appwrite          ← Build config
├── .env.local                   ← Your credentials
├── APPWRITE_SETUP.md            ← Detailed guide
└── APPWRITE_QUICKSTART.md       ← This file
```

---

## 🔌 Code Examples

### Initialize Appwrite

```typescript
// app.tsx or your root component
import { initAppwrite } from '@/config/appwrite';

export default function App() {
  React.useEffect(() => {
    initAppwrite();
  }, []);

  return <YourApp />;
}
```

### Fetch User's Pets

```typescript
import { useAppwritePets } from '@/hooks/useAppwrite';

export function Pets() {
  const { pets, loading } = useAppwritePets(userId);

  if (loading) return <Text>Loading...</Text>;

  return (
    <FlatList
      data={pets}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  );
}
```

### Log a Meal

```typescript
import { useAppwriteMealLogger } from '@/hooks/useAppwrite';

export function LogMealButton() {
  const { logMealEntry } = useAppwriteMealLogger(petId);

  const handleLog = async () => {
    const success = await logMealEntry({
      type: 'BREAKFAST',
      items: [{ name: 'Dog kibble', amountGrams: 200, calories: 600 }],
      totalCalories: 600
    });
    
    if (success) alert('Meal logged!');
  };

  return <Button title="Log Meal" onPress={handleLog} />;
}
```

### Get Biomarkers

```typescript
import { useAppwriteBiomarkers } from '@/hooks/useAppwrite';

export function PetBiomarkers() {
  const { biomarkers, addBiomarker } = useAppwriteBiomarkers(petId);

  return (
    <FlatList
      data={biomarkers}
      renderItem={({ item }) => (
        <View>
          <Text>Date: {new Date(item.recordedAt).toLocaleDateString()}</Text>
          {item.biomarkers.map(bm => (
            <Text key={bm.name}>
              {bm.name}: {bm.value} {bm.unit}
            </Text>
          ))}
        </View>
      )}
    />
  );
}
```

---

## 🌐 Appwrite Services Running

| Service | URL | Purpose |
|---------|-----|---------|
| **Appwrite Console** | http://localhost | Admin dashboard |
| **Appwrite API** | http://localhost/v1 | REST API |
| **Realtime** | ws://localhost:8080 | WebSocket updates |
| **MariaDB** | localhost:3306 | Database |
| **Redis** | localhost:6379 | Cache |
| **InfluxDB** | http://localhost:8086 | Analytics |
| **Expo Web** | http://localhost:8081 | Your app |

---

## ✅ Checklist: Getting Started

- [ ] Run `docker-compose -f docker-compose.appwrite.yml up -d`
- [ ] Wait for all services to be healthy
- [ ] Open http://localhost and create admin account
- [ ] Create project `anima_project`
- [ ] Create database `anima_db`
- [ ] Create all 8 collections (see Step 3)
- [ ] Create all 3 storage buckets (see Step 3)
- [ ] Get API key from Settings
- [ ] Update `.env.local` with API key
- [ ] Run `docker-compose -f docker-compose.appwrite.yml up web`
- [ ] Open http://localhost:8081
- [ ] Create a pet and test features!

---

## 🆘 Troubleshooting

### "Cannot connect to Appwrite"
```bash
# Check services are running
docker-compose -f docker-compose.appwrite.yml ps

# Check logs
docker-compose -f docker-compose.appwrite.yml logs appwrite

# Restart
docker-compose -f docker-compose.appwrite.yml restart
```

### "Project not found" error
- Make sure you created project with ID: `anima_project`
- Check in Appwrite Console under Projects

### "Collection not found"
- Collections must be created with exact IDs (see Step 3)
- Verify in Appwrite Console → Database → Collections

### "API Key invalid"
- Get new key: Appwrite Console → Settings → API Keys
- Paste into `.env.local`
- Restart web app: `docker-compose restart web`

### "Upload failed" errors
- Verify buckets exist in Appwrite Console → Storage
- Check file size (default limit: 30MB)
- Ensure API key has storage permissions

---

## 📚 Next Steps

1. ✅ Complete this quickstart
2. Read [APPWRITE_SETUP.md](./APPWRITE_SETUP.md) for detailed docs
3. Explore [PetDashboard.tsx](./components/PetDashboard.tsx) example component
4. Build your features using `useAppwrite*` hooks
5. Deploy Appwrite and app to production
6. Connect iOS/Android builds via EAS

---

## 🎯 Where's Everything?

| What | Where |
|------|-------|
| Pet data | Appwrite Console → Database → pets collection |
| Biomarkers | Appwrite Console → Database → biomarkers collection |
| Pet photos | Appwrite Console → Storage → pet_photos bucket |
| App running | http://localhost:8081 |
| Appwrite Console | http://localhost |
| Code examples | [PetDashboard.tsx](./components/PetDashboard.tsx) |
| Hooks | [useAppwrite.ts](./hooks/useAppwrite.ts) |
| Config | [config/appwrite.ts](./config/appwrite.ts) |

---

**Ready to build? Start with Step 1! 🚀**
