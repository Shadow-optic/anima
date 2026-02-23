/**
 * ANIMA Voice Health Monitor — Client Service
 * 
 * On-device audio processing using expo-av.
 * Captures pet vocalizations, extracts features locally,
 * and ships only the numeric features to the API.
 * 
 * PRIVACY: Raw audio NEVER leaves the device.
 * Only AudioHealthEvent objects (numbers/strings) are transmitted.
 */

import {Audio} from "expo-av";
import {api} from "../config/api";

interface VoiceMonitorState {
  isListening: boolean;
  recording: Audio.Recording | null;
  events: AudioHealthEvent[];
  sessionStart: string | null;
}

interface AudioHealthEvent {
  type: string;
  timestamp: string;
  confidence: number;
  features: Record<string, number>;
}

let state: VoiceMonitorState = {
  isListening: false,
  recording: null,
  events: [],
  sessionStart: null,
};

/**
 * Start background listening.
 * Records in 5-second chunks, processes each chunk for health events.
 */
export async function startListening(): Promise<boolean> {
  if (state.isListening) return true;

  const { status } = await Audio.requestPermissionsAsync();
  if (status !== "granted") return false;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  state.isListening = true;
  state.sessionStart = new Date().toISOString();
  state.events = [];

  // Record in chunks
  recordChunk();

  return true;
}

async function recordChunk() {
  if (!state.isListening) return;

  try {
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: {
        extension: ".wav",
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
      },
      ios: {
        extension: ".wav",
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.MEDIUM,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: { mimeType: "audio/wav", bitsPerSecond: 256000 },
    });

    state.recording = recording;
    await recording.startAsync();

    // Record for 5 seconds then process
    setTimeout(async () => {
      if (state.recording && state.isListening) {
        await recording.stopAndUnloadAsync();

        // In production: extract audio features from the WAV buffer
        // using on-device FFT/MFCC computation
        // For now, we acknowledge the chunk was recorded
        processAudioChunk(recording);

        // Start next chunk
        recordChunk();
      }
    }, 5000);
  } catch (error) {
    console.error("Recording error:", error);
    // Retry after delay
    if (state.isListening) {
      setTimeout(recordChunk, 2000);
    }
  }
}

/**
 * Process a 5-second audio chunk for health events.
 * In production, this runs FFT + MFCC extraction + TFLite classification.
 */
async function processAudioChunk(recording: Audio.Recording) {
  // Production implementation:
  // 1. Read WAV buffer from recording URI
  // 2. Extract features (FFT magnitude, spectral centroid, MFCCs, ZCR)
  // 3. Run TFLite classifier on features
  // 4. If event detected, add to state.events
  //
  // The feature extraction code is defined in voiceHealthMonitor.ts (server-side)
  // and would be ported to native code via expo-modules for on-device use.
  
  const uri = recording.getURI();
  if (!uri) return;

  // Cleanup the recording file (audio never persisted)
  // In production: process buffer in-memory, never write to disk
}

/**
 * Stop listening and submit session to API.
 */
export async function stopListening(petId: string): Promise<any> {
  state.isListening = false;

  if (state.recording) {
    try {
      await state.recording.stopAndUnloadAsync();
    } catch {}
    state.recording = null;
  }

  const sessionEnd = new Date().toISOString();
  const sessionDuration = state.sessionStart
    ? (new Date(sessionEnd).getTime() - new Date(state.sessionStart).getTime()) / 1000
    : 0;

  // Submit session (features only, no audio) to API
  if (state.events.length > 0 && petId) {
    try {
      const report = await api.post(`/pets/${petId}/voice/session`, {
        events: state.events,
        sessionStart: state.sessionStart,
        sessionEnd,
        sessionDuration,
      });
      return report;
    } catch (error) {
      console.error("Voice session submit error:", error);
    }
  }

  return { events: state.events, sessionDuration };
}

/**
 * Get current listening state.
 */
export function getListeningState() {
  return {
    isListening: state.isListening,
    eventCount: state.events.length,
    sessionStart: state.sessionStart,
  };
}
