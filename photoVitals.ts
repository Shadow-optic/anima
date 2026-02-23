/**
 * ANIMA Photo Vitals Client Service
 * 
 * On-device ML inference for real-time pet health extraction from photos.
 * Ships features to API for deeper analysis and Twin ingestion.
 * 
 * In production: TFLite model loaded into Expo's native module system.
 * This service orchestrates: capture → preprocess → infer → API → display.
 */

import * as ImagePicker from "expo-image-picker";
import {api} from "../config/api";

export interface PhotoVitalsConfig {
  useCameraDirectly: boolean;   // true = open camera, false = gallery
  quality: number;              // 0-1
  analyzeOnDevice: boolean;     // If TFLite model available
}

const DEFAULT_CONFIG: PhotoVitalsConfig = {
  useCameraDirectly: false,
  quality: 0.8,
  analyzeOnDevice: false, // Will be true once TFLite is bundled
};

/**
 * Capture or select image and run Photo Vitals analysis.
 */
export async function captureAndAnalyze(
  petId: string,
  config: Partial<PhotoVitalsConfig> = {},
): Promise<PhotoVitalsResult | null> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Request permissions
  const { status } = cfg.useCameraDirectly
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    throw new Error("Permission not granted");
  }

  // Launch picker or camera
  const result = cfg.useCameraDirectly
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: cfg.quality,
        base64: true,
        exif: true,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: cfg.quality,
        base64: true,
        exif: true,
      });

  if (result.canceled || !result.assets[0].base64) {
    return null;
  }

  const image = result.assets[0];

  // Ship to API for full analysis
  const analysis = await api.post<PhotoVitalsResult>(`/pets/${petId}/photo-vitals`, {
    imageBase64: image.base64,
    metadata: {
      source: cfg.useCameraDirectly ? "camera" : "gallery",
      width: image.width,
      height: image.height,
      timestamp: new Date().toISOString(),
    },
  });

  return analysis;
}

export interface PhotoVitalsResult {
  bodyConditionScore: number | null;
  bcsConfidence: number;
  coatQuality: { overallScore: number; sheen: number; uniformity: number; flags: string[] } | null;
  eyeHealth: { clarity: number; discharge: boolean; redness: number; symmetry: number } | null;
  dentalIndicators: { tartarLevel: number; gumColor: string; gumColorConcern: boolean } | null;
  emotionalState: { state: string; confidence: number; signals: string[] } | null;
  recommendations: string[];
  assessableRegions: string[];
}
