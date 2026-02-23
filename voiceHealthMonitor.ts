/**
 * ANIMA Voice Health Monitor
 * ===========================
 *
 * Audio-based health signal extraction from pet vocalizations.
 * Detects and tracks: coughs, respiratory rate, bark/meow changes,
 * distress vocalizations, reverse sneezes.
 *
 * DEPLOYMENT: Runs on-device using Web Audio API + TFLite.
 * No audio leaves the device — only extracted features are sent to API.
 *
 * NOVEL APPROACH:
 * Traditional pet health monitoring requires dedicated hardware (collar sensors).
 * Voice Monitor uses the phone's microphone during normal app usage to passively
 * detect health-relevant sounds. The phone is almost always near the pet when
 * the owner is using the app — that's our "sensor window."
 *
 * CLINICAL RELEVANCE:
 * - Cough frequency/pattern is a primary diagnostic signal for:
 *   - Kennel cough (paroxysmal, honking)
 *   - Heart disease (nocturnal, wet)
 *   - Tracheal collapse (goose-honk)
 *   - Allergies/irritants (dry, occasional)
 * - Respiratory rate at rest: >30 breaths/min in dogs is abnormal
 * - Vocalization changes can indicate pain, cognitive decline, anxiety
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface AudioHealthEvent {
  type: AudioEventType;
  timestamp: string;
  duration: number;          // seconds
  confidence: number;        // 0-1
  features: AudioFeatures;
  clinicalNote?: string;
}

export type AudioEventType =
  | "cough"
  | "reverse_sneeze"
  | "sneeze"
  | "wheeze"
  | "labored_breathing"
  | "bark_normal"
  | "bark_distress"
  | "bark_pain"
  | "meow_normal"
  | "meow_distress"
  | "panting_normal"
  | "panting_excessive";

export interface AudioFeatures {
  // Spectral features
  dominantFrequency: number;   // Hz
  spectralCentroid: number;    // Hz
  spectralRolloff: number;     // Hz
  mfcc: number[];              // Mel-frequency cepstral coefficients (13 coefficients)

  // Temporal features
  onsetStrength: number;       // Attack sharpness
  zeroCrossingRate: number;    // Texture indicator
  rmsEnergy: number;           // Volume

  // Derived
  estimatedRespiratoryRate?: number;  // Breaths per minute
}

export interface VoiceHealthReport {
  petId: string;
  sessionStart: string;
  sessionEnd: string;
  sessionDuration: number;     // seconds
  events: AudioHealthEvent[];
  respiratoryRate: number | null;
  coughCount: number;
  coughPattern: CoughPattern | null;
  alerts: VoiceAlert[];
  summary: string;
}

export interface CoughPattern {
  frequency: string;           // "occasional" | "frequent" | "paroxysmal"
  type: string;                // "dry" | "wet" | "honking" | "hacking"
  timing: string;              // "rest" | "activity" | "eating" | "night"
  trend: string;               // "new" | "increasing" | "stable" | "decreasing"
  possibleCauses: string[];
}

export interface VoiceAlert {
  severity: "info" | "warning" | "urgent";
  title: string;
  detail: string;
  recommendation: string;
}

// ─────────────────────────────────────────────
// AUDIO CLASSIFIER (on-device)
// ─────────────────────────────────────────────

/**
 * On-device audio classifier using Web Audio API.
 * Runs continuously while app is foregrounded (with permission).
 *
 * Architecture:
 *   Microphone → AudioContext → AnalyserNode → Feature Extraction
 *   → TFLite Classifier → Event Detection → API (features only)
 *
 * Privacy: Raw audio never leaves the device. Only numeric features
 * and event classifications are transmitted.
 */

// Feature extraction constants
const SAMPLE_RATE = 16000;       // 16kHz sufficient for pet vocalizations
const FRAME_SIZE = 512;          // ~32ms frames
const HOP_SIZE = 256;            // 50% overlap
const MEL_BANDS = 40;            // Mel spectrogram resolution
const MFCC_COEFFICIENTS = 13;    // Standard MFCC count

// Detection thresholds (tuned per event type)
const DETECTION_THRESHOLDS: Record<string, number> = {
  cough: 0.70,
  reverse_sneeze: 0.75,
  sneeze: 0.65,
  wheeze: 0.80,
  labored_breathing: 0.75,
  bark_distress: 0.70,
  bark_pain: 0.80,
  meow_distress: 0.70,
  panting_excessive: 0.65,
};

/**
 * Extract audio features from a single frame.
 * This runs on-device in the React Native audio pipeline.
 *
 * In production, this is implemented in the TFLite preprocessing
 * layer. Here we define the feature extraction logic.
 */
export function extractAudioFeatures(
  audioFrame: Float32Array,
  sampleRate: number = SAMPLE_RATE
): AudioFeatures {
  const n = audioFrame.length;

  // ── RMS Energy ──
  const rmsEnergy = Math.sqrt(
    audioFrame.reduce((sum, s) => sum + s * s, 0) / n
  );

  // ── Zero Crossing Rate ──
  let zeroCrossings = 0;
  for (let i = 1; i < n; i++) {
    if ((audioFrame[i] >= 0) !== (audioFrame[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }
  const zeroCrossingRate = zeroCrossings / (n - 1);

  // ── FFT (simplified — production uses FFTW or Web Audio AnalyserNode) ──
  // Get magnitude spectrum
  const spectrum = computeFFTMagnitude(audioFrame);
  const freqResolution = sampleRate / n;

  // ── Dominant Frequency ──
  let maxMag = 0;
  let maxIdx = 0;
  for (let i = 1; i < spectrum.length; i++) {
    if (spectrum[i] > maxMag) {
      maxMag = spectrum[i];
      maxIdx = i;
    }
  }
  const dominantFrequency = maxIdx * freqResolution;

  // ── Spectral Centroid ──
  let weightedSum = 0;
  let totalMag = 0;
  for (let i = 0; i < spectrum.length; i++) {
    weightedSum += i * freqResolution * spectrum[i];
    totalMag += spectrum[i];
  }
  const spectralCentroid = totalMag > 0 ? weightedSum / totalMag : 0;

  // ── Spectral Rolloff (85th percentile) ──
  const threshold = totalMag * 0.85;
  let cumulative = 0;
  let rolloffIdx = 0;
  for (let i = 0; i < spectrum.length; i++) {
    cumulative += spectrum[i];
    if (cumulative >= threshold) {
      rolloffIdx = i;
      break;
    }
  }
  const spectralRolloff = rolloffIdx * freqResolution;

  // ── Onset Strength (simple energy derivative) ──
  const onsetStrength = rmsEnergy; // Simplified; full implementation uses spectral flux

  // ── MFCC (simplified) ──
  // In production: proper mel filterbank + DCT
  // Here: approximate with log-spaced frequency band energies
  const mfcc = computeApproximateMFCC(spectrum, sampleRate, MFCC_COEFFICIENTS);

  return {
    dominantFrequency,
    spectralCentroid,
    spectralRolloff,
    mfcc,
    onsetStrength,
    zeroCrossingRate,
    rmsEnergy,
  };
}

/**
 * Classify an audio event from extracted features.
 * In production, this is a TFLite model. Here we define
 * rule-based heuristics as the initial classifier.
 *
 * Training data sources:
 * - ESC-50 (environmental sound classification)
 * - AudioSet (Google's large-scale audio dataset)
 * - Custom dataset from veterinary clinics (cough recordings)
 * - Kaggle pet sound datasets
 */
export function classifyAudioEvent(
  features: AudioFeatures,
  species: "DOG" | "CAT",
  recentEvents: AudioHealthEvent[] = [],
): AudioHealthEvent | null {
  // Gate: ignore if too quiet (background noise)
  if (features.rmsEnergy < 0.01) return null;

  let type: AudioEventType | null = null;
  let confidence = 0;
  let clinicalNote: string | undefined;

  // ── Cough Detection ──
  // Coughs: sharp onset, broadband spectrum, 100-300ms duration,
  // dominant frequency typically 200-600Hz, high zero-crossing rate
  if (
    features.onsetStrength > 0.3 &&
    features.dominantFrequency > 150 && features.dominantFrequency < 800 &&
    features.zeroCrossingRate > 0.15 &&
    features.spectralCentroid > 500 && features.spectralCentroid < 3000
  ) {
    type = "cough";
    confidence = 0.7;

    // Sub-classify cough type
    if (features.spectralCentroid < 800) {
      clinicalNote = "Low-frequency cough — possibly wet/productive";
    } else if (features.dominantFrequency > 400 && species === "DOG") {
      clinicalNote = "Honking quality — consider tracheal collapse if brachycephalic";
    }
  }

  // ── Reverse Sneeze Detection (dogs) ──
  // Rhythmic, rapid inhalation sounds. Very distinctive pattern.
  if (
    species === "DOG" &&
    features.dominantFrequency > 200 && features.dominantFrequency < 500 &&
    features.zeroCrossingRate > 0.25 &&
    features.rmsEnergy > 0.05
  ) {
    // Check if rhythmic (multiple similar events in 5s window)
    const recentSimilar = recentEvents.filter(
      (e) => e.type === "reverse_sneeze" &&
        (Date.now() - new Date(e.timestamp).getTime()) < 5000
    );
    if (recentSimilar.length >= 2) {
      type = "reverse_sneeze";
      confidence = 0.75;
      clinicalNote = "Reverse sneeze episode — usually benign, common in brachycephalic breeds";
    }
  }

  // ── Excessive Panting Detection ──
  // Rhythmic breathing at high rate. Distinguish from normal post-exercise panting.
  if (
    features.dominantFrequency > 50 && features.dominantFrequency < 200 &&
    features.rmsEnergy > 0.02 && features.rmsEnergy < 0.1 &&
    features.zeroCrossingRate < 0.1
  ) {
    // Count breathing cycles to estimate respiratory rate
    // This is simplified — production uses autocorrelation on 10s windows
    type = "panting_normal";
    confidence = 0.6;
  }

  // ── Distress Vocalization ──
  // Higher pitch than normal, increased energy, irregular pattern
  if (
    features.dominantFrequency > 500 &&
    features.rmsEnergy > 0.15 &&
    features.spectralRolloff > 4000
  ) {
    type = species === "DOG" ? "bark_distress" : "meow_distress";
    confidence = 0.65;
    clinicalNote = "Vocalization has distress characteristics — monitor for pain or anxiety";
  }

  if (!type || confidence < (DETECTION_THRESHOLDS[type] || 0.5)) {
    return null;
  }

  return {
    type,
    timestamp: new Date().toISOString(),
    duration: FRAME_SIZE / SAMPLE_RATE,
    confidence,
    features,
    clinicalNote,
  };
}

// ─────────────────────────────────────────────
// SESSION ANALYSIS (server-side)
// ─────────────────────────────────────────────

/**
 * Analyze a batch of audio events from a listening session.
 * The app collects events on-device and ships them to the API
 * when the session ends (app backgrounded or user navigates away).
 */
export function analyzeVoiceSession(
  petId: string,
  events: AudioHealthEvent[],
  sessionDuration: number,
  species: "DOG" | "CAT",
): VoiceHealthReport {
  const alerts: VoiceAlert[] = [];

  // ── Cough analysis ──
  const coughs = events.filter((e) => e.type === "cough");
  const coughCount = coughs.length;
  let coughPattern: CoughPattern | null = null;

  if (coughCount > 0) {
    const coughRate = coughCount / (sessionDuration / 60); // per minute

    let frequency: string;
    if (coughRate > 5) frequency = "paroxysmal";
    else if (coughRate > 1) frequency = "frequent";
    else frequency = "occasional";

    // Determine cough type from spectral features
    const avgCentroid = coughs.reduce((s, c) => s + c.features.spectralCentroid, 0) / coughCount;
    let coughType: string;
    if (avgCentroid < 800) coughType = "wet";
    else if (avgCentroid > 2000) coughType = "dry";
    else coughType = "hacking";

    // Check for honking (tracheal collapse indicator)
    const honkingCoughs = coughs.filter(
      (c) => c.features.dominantFrequency > 400 && c.features.dominantFrequency < 600
    );
    if (honkingCoughs.length > coughCount * 0.5) coughType = "honking";

    const possibleCauses: string[] = [];
    if (coughType === "wet") possibleCauses.push("Upper respiratory infection", "Pneumonia", "Heart disease");
    if (coughType === "dry") possibleCauses.push("Kennel cough", "Allergies", "Environmental irritant");
    if (coughType === "honking" && species === "DOG") possibleCauses.push("Tracheal collapse", "Reverse sneezing");

    coughPattern = {
      frequency,
      type: coughType,
      timing: "rest", // Would need time-of-day context
      trend: "new",    // Would compare to historical
      possibleCauses,
    };

    // Generate alerts
    if (coughRate > 5) {
      alerts.push({
        severity: "urgent",
        title: "Frequent coughing detected",
        detail: `${coughCount} coughs detected in ${Math.round(sessionDuration / 60)} minutes. Pattern appears ${coughType}.`,
        recommendation: "Schedule a vet visit within 24-48 hours. Record a video of coughing episodes to show the vet.",
      });
    } else if (coughRate > 1) {
      alerts.push({
        severity: "warning",
        title: "Repeated coughing noted",
        detail: `${coughCount} coughs in this session. Worth monitoring over the next few days.`,
        recommendation: "Track cough frequency. If it persists for 3+ days or worsens, consult your vet.",
      });
    }
  }

  // ── Respiratory rate estimation ──
  // From panting/breathing events, estimate breaths per minute
  const breathingEvents = events.filter(
    (e) => e.type === "panting_normal" || e.type === "panting_excessive" || e.type === "labored_breathing"
  );

  let respiratoryRate: number | null = null;
  if (breathingEvents.length >= 5) {
    // Use dominant frequency periodicity to estimate rate
    const avgFreq = breathingEvents.reduce((s, e) => s + e.features.dominantFrequency, 0) / breathingEvents.length;
    // Dogs at rest: 15-30 bpm normal. Panting: up to 200.
    respiratoryRate = Math.round(avgFreq / 5); // Very rough estimate

    if (species === "DOG" && respiratoryRate > 40) {
      // Could be normal panting or concerning if at rest
      alerts.push({
        severity: "info",
        title: "Elevated respiratory rate detected",
        detail: `Estimated ${respiratoryRate} breaths/min. Normal resting rate for dogs is 15-30/min.`,
        recommendation: "Count breaths while your pet is sleeping for the most accurate resting respiratory rate.",
      });
    }
  }

  // ── Distress vocalization ──
  const distressEvents = events.filter(
    (e) => e.type === "bark_distress" || e.type === "meow_distress" || e.type === "bark_pain"
  );

  if (distressEvents.length >= 3) {
    alerts.push({
      severity: "warning",
      title: "Distress vocalizations detected",
      detail: `${distressEvents.length} vocalizations with distress characteristics in this session.`,
      recommendation: "Check for obvious sources of pain or anxiety. If behavior continues, consult your vet.",
    });
  }

  const summary = generateSessionSummary(events, coughCount, respiratoryRate, sessionDuration);

  return {
    petId,
    sessionStart: events[0]?.timestamp || new Date().toISOString(),
    sessionEnd: events[events.length - 1]?.timestamp || new Date().toISOString(),
    sessionDuration,
    events,
    respiratoryRate,
    coughCount,
    coughPattern,
    alerts,
    summary,
  };
}

function generateSessionSummary(
  events: AudioHealthEvent[],
  coughCount: number,
  rr: number | null,
  duration: number,
): string {
  if (events.length === 0) {
    return `${Math.round(duration / 60)}-minute listening session. No health-relevant sounds detected.`;
  }

  const parts: string[] = [`${Math.round(duration / 60)}-minute session:`];

  if (coughCount > 0) parts.push(`${coughCount} cough${coughCount > 1 ? "s" : ""} detected`);
  if (rr) parts.push(`estimated respiratory rate ~${rr}/min`);

  const uniqueTypes = new Set(events.map((e) => e.type));
  const otherTypes = Array.from(uniqueTypes).filter((t) => t !== "cough" && !t.startsWith("panting"));
  if (otherTypes.length > 0) parts.push(`other sounds: ${otherTypes.join(", ")}`);

  return parts.join(". ") + ".";
}

// ─────────────────────────────────────────────
// AUDIO PROCESSING UTILITIES
// ─────────────────────────────────────────────

function computeFFTMagnitude(signal: Float32Array): Float32Array {
  // Simplified DFT for feature extraction
  // Production: use WebAudio AnalyserNode.getFloatFrequencyData()
  const n = signal.length;
  const halfN = Math.floor(n / 2);
  const magnitude = new Float32Array(halfN);

  for (let k = 0; k < halfN; k++) {
    let real = 0;
    let imag = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      real += signal[t] * Math.cos(angle);
      imag -= signal[t] * Math.sin(angle);
    }
    magnitude[k] = Math.sqrt(real * real + imag * imag) / n;
  }

  return magnitude;
}

function computeApproximateMFCC(
  spectrum: Float32Array,
  sampleRate: number,
  numCoefficients: number,
): number[] {
  // Simplified MFCC: log energy in mel-spaced frequency bands + DCT
  const numBands = 26;
  const maxFreq = sampleRate / 2;
  const melMax = 2595 * Math.log10(1 + maxFreq / 700);

  const bandEnergies: number[] = [];

  for (let i = 0; i < numBands; i++) {
    const melLow = (i / numBands) * melMax;
    const melHigh = ((i + 1) / numBands) * melMax;
    const freqLow = 700 * (Math.pow(10, melLow / 2595) - 1);
    const freqHigh = 700 * (Math.pow(10, melHigh / 2595) - 1);

    const binLow = Math.floor((freqLow / maxFreq) * spectrum.length);
    const binHigh = Math.ceil((freqHigh / maxFreq) * spectrum.length);

    let energy = 0;
    for (let b = binLow; b < Math.min(binHigh, spectrum.length); b++) {
      energy += spectrum[b] * spectrum[b];
    }

    bandEnergies.push(Math.log(Math.max(energy, 1e-10)));
  }

  // DCT to get MFCCs
  const mfcc: number[] = [];
  for (let k = 0; k < numCoefficients; k++) {
    let sum = 0;
    for (let n = 0; n < numBands; n++) {
      sum += bandEnergies[n] * Math.cos((Math.PI * k * (n + 0.5)) / numBands);
    }
    mfcc.push(sum);
  }

  return mfcc;
}
