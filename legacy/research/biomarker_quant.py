"""
ANIMA BioCard Analysis Pipeline
================================

Computer vision pipeline for extracting biomarker concentrations
from colorimetric BioCard scans. Runs both on-device (TFLite) for
real-time preview and server-side (PyTorch) for final quantification.

Pipeline:
  Raw Image → Card Detection → Perspective Warp → Calibration
  → Well Isolation → Color Extraction → Concentration Regression
  → Validation → Results

Hardware:
  - BioCard v1: 4 wells (pH, BUN, protein, control)
  - BioCard v2: 8 wells (+ creatinine, cortisol, glucose, IgA)
"""

import numpy as np
import cv2
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum

# ─────────────────────────────────────────────
# DATA CLASSES
# ─────────────────────────────────────────────

class BiomarkerStatus(Enum):
    NORMAL = "normal"
    LOW = "low"
    HIGH = "high"
    CRITICAL = "critical"
    INVALID = "invalid"

@dataclass
class WellROI:
    """Region of interest for a single reagent well on the BioCard."""
    name: str
    x: int            # Center X (normalized coords, 0-1000)
    y: int            # Center Y (normalized coords, 0-1000)
    radius: int       # Well radius (normalized)
    biomarker: str    # "pH", "BUN", "protein", "control"
    reagent: str      # "universal_pH", "urease_BTB", "bradford"

@dataclass
class CardLayout:
    """Defines the physical layout of a BioCard version."""
    version: str
    width_mm: float
    height_mm: float
    wells: list[WellROI]
    calibration_strip: dict  # Position of color calibration patches

@dataclass
class BiomarkerReading:
    """Single biomarker result from a BioCard scan."""
    name: str
    value: float
    unit: str
    reference_min: float
    reference_max: float
    status: BiomarkerStatus
    confidence: float       # 0-1 confidence in measurement
    raw_color_lab: tuple    # (L, a, b) color values used

@dataclass
class ScanResult:
    """Complete result from processing a BioCard scan image."""
    success: bool
    card_version: str
    lot_number: str
    readings: list[BiomarkerReading]
    scan_quality: float     # 0-1 overall quality score
    warnings: list[str]
    raw_image_path: Optional[str] = None
    processed_image_path: Optional[str] = None

# ─────────────────────────────────────────────
# CARD LAYOUTS
# ─────────────────────────────────────────────

BIOCARD_V1 = CardLayout(
    version="v1",
    width_mm=85.6,   # Credit card size
    height_mm=53.98,
    wells=[
        WellROI("pH",      x=200, y=400, radius=80, biomarker="pH",      reagent="universal_pH"),
        WellROI("BUN",     x=400, y=400, radius=80, biomarker="BUN",     reagent="urease_BTB"),
        WellROI("Protein", x=600, y=400, radius=80, biomarker="protein", reagent="bradford"),
        WellROI("Control", x=800, y=400, radius=80, biomarker="control", reagent="control_dye"),
    ],
    calibration_strip={
        "white":  {"x": 100, "y": 100, "size": 50},
        "black":  {"x": 200, "y": 100, "size": 50},
        "red":    {"x": 300, "y": 100, "size": 50},
        "green":  {"x": 400, "y": 100, "size": 50},
        "blue":   {"x": 500, "y": 100, "size": 50},
    }
)

CARD_LAYOUTS = {
    "v1": BIOCARD_V1,
}

# ─────────────────────────────────────────────
# REFERENCE RANGES (canine, from veterinary literature)
# ─────────────────────────────────────────────

REFERENCE_RANGES = {
    "DOG": {
        "pH":       {"min": 6.0,  "max": 7.5,  "unit": "pH",    "critical_low": 5.0, "critical_high": 8.5},
        "BUN":      {"min": 7.0,  "max": 27.0, "unit": "mg/dL", "critical_low": 3.0, "critical_high": 50.0},
        "protein":  {"min": 5.5,  "max": 7.5,  "unit": "g/dL",  "critical_low": 3.0, "critical_high": 10.0},
    },
    "CAT": {
        "pH":       {"min": 6.0,  "max": 7.0,  "unit": "pH",    "critical_low": 5.0, "critical_high": 8.5},
        "BUN":      {"min": 16.0, "max": 36.0, "unit": "mg/dL", "critical_low": 8.0, "critical_high": 60.0},
        "protein":  {"min": 5.7,  "max": 8.9,  "unit": "g/dL",  "critical_low": 3.0, "critical_high": 12.0},
    },
}

# ─────────────────────────────────────────────
# CALIBRATION CURVES
# Mapping LAB color values → biomarker concentrations
# These are trained from lab-validated samples
# ─────────────────────────────────────────────

class CalibrationCurve:
    """
    Maps colorimetric readout to biomarker concentration.
    
    For each reagent, we have a set of known concentration → LAB color
    data points from validation experiments. We fit a polynomial
    regression to interpolate.
    """
    
    def __init__(self, name: str, concentrations: list[float], lab_values: list[tuple]):
        self.name = name
        self.concentrations = np.array(concentrations)
        self.lab_values = np.array(lab_values)
        
        # Fit polynomial to primary color channel
        # For pH: use 'a' channel (green-red axis correlates with pH indicator)
        # For BUN: use 'b' channel (yellow-blue axis for BTB indicator)
        # For protein: use 'b' channel (Bradford reagent blue shift)
        self.primary_channel = self._select_primary_channel()
        self.coefficients = np.polyfit(
            self.lab_values[:, self.primary_channel],
            self.concentrations,
            deg=3  # Cubic fit for colorimetric response curves
        )
    
    def _select_primary_channel(self) -> int:
        """Select LAB channel with highest correlation to concentration."""
        correlations = []
        for ch in range(3):
            corr = np.abs(np.corrcoef(self.lab_values[:, ch], self.concentrations)[0, 1])
            correlations.append(corr)
        return int(np.argmax(correlations))
    
    def predict(self, lab_color: tuple) -> tuple[float, float]:
        """
        Predict concentration from LAB color.
        Returns (concentration, confidence).
        """
        primary_value = lab_color[self.primary_channel]
        concentration = float(np.polyval(self.coefficients, primary_value))
        
        # Confidence based on how close this color is to our calibration data
        distances = np.abs(self.lab_values[:, self.primary_channel] - primary_value)
        min_distance = float(np.min(distances))
        typical_range = float(np.ptp(self.lab_values[:, self.primary_channel]))
        confidence = max(0.0, min(1.0, 1.0 - (min_distance / (typical_range * 0.5))))
        
        return concentration, confidence

# Example calibration data (would be replaced with real validation data)
PH_CALIBRATION = CalibrationCurve(
    name="pH_universal",
    concentrations=[4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
    lab_values=[
        (45, 60, -30),   # pH 4: red
        (50, 40, -10),   # pH 5: orange
        (55, 15, 20),    # pH 6: yellow
        (60, -10, 30),   # pH 7: green
        (55, -25, 10),   # pH 8: blue-green
        (45, -15, -20),  # pH 9: blue
        (40, 5, -40),    # pH 10: purple
    ]
)

BUN_CALIBRATION = CalibrationCurve(
    name="BUN_urease_BTB",
    concentrations=[0, 5, 10, 20, 30, 50, 80],
    lab_values=[
        (65, -15, 40),   # 0 mg/dL: yellow (BTB acidic)
        (60, -12, 30),   # 5: yellow-green
        (55, -8, 15),    # 10: green
        (48, -5, -5),    # 20: blue-green
        (42, 0, -20),    # 30: blue
        (35, 5, -35),    # 50: deep blue
        (30, 8, -45),    # 80: dark blue
    ]
)

PROTEIN_CALIBRATION = CalibrationCurve(
    name="protein_bradford",
    concentrations=[0, 1, 2, 4, 6, 8, 12],
    lab_values=[
        (70, -5, 25),    # 0 g/dL: brown (Coomassie unbound)
        (60, -8, 10),    # 1: reddish-brown
        (50, -12, -5),   # 2: transition
        (42, -10, -20),  # 4: blue
        (35, -5, -30),   # 6: deeper blue
        (30, 0, -38),    # 8: deep blue
        (25, 5, -45),    # 12: very deep blue
    ]
)

CALIBRATION_CURVES = {
    "universal_pH": PH_CALIBRATION,
    "urease_BTB": BUN_CALIBRATION,
    "bradford": PROTEIN_CALIBRATION,
}

# ─────────────────────────────────────────────
# MAIN PIPELINE
# ─────────────────────────────────────────────

class BioCardAnalyzer:
    """
    Main analysis pipeline for BioCard scans.
    
    Usage:
        analyzer = BioCardAnalyzer()
        result = analyzer.process_scan(image_path, species="DOG")
    """
    
    WARPED_SIZE = (1000, 625)  # Aspect ratio matches credit card
    MIN_CARD_AREA_RATIO = 0.1  # Card must be at least 10% of image
    
    def __init__(self):
        self.card_layouts = CARD_LAYOUTS
        self.calibration_curves = CALIBRATION_CURVES
        self.reference_ranges = REFERENCE_RANGES
    
    def process_scan(
        self,
        image_path: str,
        species: str = "DOG",
        card_version: str = "v1",
    ) -> ScanResult:
        """Full pipeline: image → biomarker readings."""
        
        warnings: list[str] = []
        
        # 1. Load and validate image
        image = cv2.imread(image_path)
        if image is None:
            return ScanResult(
                success=False, card_version=card_version, lot_number="",
                readings=[], scan_quality=0.0, warnings=["Failed to load image"]
            )
        
        # 2. Detect QR code for card metadata
        lot_number, detected_version = self._detect_qr(image)
        if detected_version:
            card_version = detected_version
        
        layout = self.card_layouts.get(card_version)
        if not layout:
            return ScanResult(
                success=False, card_version=card_version, lot_number=lot_number,
                readings=[], scan_quality=0.0,
                warnings=[f"Unknown card version: {card_version}"]
            )
        
        # 3. Detect card boundaries
        corners = self._detect_card(image)
        if corners is None:
            return ScanResult(
                success=False, card_version=card_version, lot_number=lot_number,
                readings=[], scan_quality=0.0,
                warnings=["Could not detect BioCard in image. Ensure card is on flat, contrasting surface."]
            )
        
        # 4. Perspective warp to normalized view
        warped = self._perspective_warp(image, corners)
        
        # 5. Read calibration strip & compute color correction
        color_correction = self._read_calibration_strip(warped, layout)
        if color_correction is None:
            warnings.append("Calibration strip partially unreadable. Results may have reduced accuracy.")
        
        # 6. Extract well colors
        well_colors = self._extract_well_colors(warped, layout, color_correction)
        
        # 7. Validate control well
        control_valid = self._validate_control(well_colors, layout)
        if not control_valid:
            warnings.append("Control well failed validation. Card may be expired or improperly stored.")
        
        # 8. Convert colors to concentrations
        readings = self._quantify_biomarkers(well_colors, layout, species)
        
        # 9. Compute overall scan quality
        scan_quality = self._compute_scan_quality(well_colors, control_valid, color_correction)
        
        return ScanResult(
            success=True,
            card_version=card_version,
            lot_number=lot_number,
            readings=readings,
            scan_quality=scan_quality,
            warnings=warnings,
            raw_image_path=image_path,
        )
    
    # ─────────────────────────────────────────
    # STEP 1: QR Code Detection
    # ─────────────────────────────────────────
    
    def _detect_qr(self, image: np.ndarray) -> tuple[str, Optional[str]]:
        """Detect and decode QR code on BioCard."""
        detector = cv2.QRCodeDetector()
        data, points, _ = detector.detectAndDecode(image)
        
        if data:
            # QR format: "ANIMA:v1:BC-2026-0142:2026-08"
            parts = data.split(":")
            if len(parts) >= 3 and parts[0] == "ANIMA":
                version = parts[1]
                lot = parts[2]
                return lot, version
        
        return "", None
    
    # ─────────────────────────────────────────
    # STEP 2: Card Detection
    # ─────────────────────────────────────────
    
    def _detect_card(self, image: np.ndarray) -> Optional[np.ndarray]:
        """Detect BioCard rectangle in image using edge detection."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        
        # Dilate to close gaps in edges
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=2)
        
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return None
        
        # Find largest rectangular contour
        image_area = image.shape[0] * image.shape[1]
        
        for contour in sorted(contours, key=cv2.contourArea, reverse=True):
            area = cv2.contourArea(contour)
            if area < image_area * self.MIN_CARD_AREA_RATIO:
                continue
            
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            if len(approx) == 4:
                # Verify aspect ratio is roughly credit-card shaped (1.586:1)
                rect = cv2.minAreaRect(approx)
                w, h = rect[1]
                if w == 0 or h == 0:
                    continue
                aspect = max(w, h) / min(w, h)
                if 1.3 < aspect < 1.9:  # Allow some tolerance
                    return self._order_corners(approx.reshape(4, 2))
        
        return None
    
    def _order_corners(self, pts: np.ndarray) -> np.ndarray:
        """Order corners: top-left, top-right, bottom-right, bottom-left."""
        rect = np.zeros((4, 2), dtype=np.float32)
        s = pts.sum(axis=1)
        d = np.diff(pts, axis=1)
        
        rect[0] = pts[np.argmin(s)]    # Top-left: smallest sum
        rect[2] = pts[np.argmax(s)]    # Bottom-right: largest sum
        rect[1] = pts[np.argmin(d)]    # Top-right: smallest difference
        rect[3] = pts[np.argmax(d)]    # Bottom-left: largest difference
        
        return rect
    
    # ─────────────────────────────────────────
    # STEP 3: Perspective Warp
    # ─────────────────────────────────────────
    
    def _perspective_warp(self, image: np.ndarray, corners: np.ndarray) -> np.ndarray:
        """Warp detected card to normalized rectangular view."""
        w, h = self.WARPED_SIZE
        dst = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)
        matrix = cv2.getPerspectiveTransform(corners.astype(np.float32), dst)
        warped = cv2.warpPerspective(image, matrix, (w, h))
        return warped
    
    # ─────────────────────────────────────────
    # STEP 4: Calibration Strip
    # ─────────────────────────────────────────
    
    def _read_calibration_strip(
        self, warped: np.ndarray, layout: CardLayout
    ) -> Optional[np.ndarray]:
        """
        Read calibration strip colors and compute correction matrix.
        
        The calibration strip has known colors (white, black, R, G, B).
        By comparing expected vs. observed colors, we can correct for
        lighting conditions and camera white balance.
        """
        expected_lab = {
            "white": np.array([100, 0, 0]),
            "black": np.array([0, 0, 0]),
            "red":   np.array([53, 80, 67]),
            "green": np.array([88, -86, 83]),
            "blue":  np.array([32, 79, -108]),
        }
        
        observed = {}
        w, h = self.WARPED_SIZE
        
        for name, pos in layout.calibration_strip.items():
            # Scale normalized coords to warped image
            cx = int(pos["x"] / 1000 * w)
            cy = int(pos["y"] / 1000 * h)
            r = int(pos["size"] / 1000 * min(w, h))
            
            # Extract patch
            patch = warped[max(0, cy-r):cy+r, max(0, cx-r):cx+r]
            if patch.size == 0:
                continue
            
            # Convert to LAB and get mean color
            lab_patch = cv2.cvtColor(patch, cv2.COLOR_BGR2LAB)
            observed[name] = np.mean(lab_patch.reshape(-1, 3), axis=0)
        
        if len(observed) < 3:
            return None  # Not enough calibration points
        
        # Compute simple affine color correction matrix
        # Maps observed LAB → expected LAB
        obs_matrix = np.array([observed[k] for k in observed])
        exp_matrix = np.array([expected_lab[k] for k in observed])
        
        # Least-squares fit: expected = correction @ observed + offset
        # Using pseudo-inverse for overdetermined system
        ones = np.ones((len(obs_matrix), 1))
        obs_augmented = np.hstack([obs_matrix, ones])
        correction, _, _, _ = np.linalg.lstsq(obs_augmented, exp_matrix, rcond=None)
        
        return correction
    
    # ─────────────────────────────────────────
    # STEP 5: Well Color Extraction
    # ─────────────────────────────────────────
    
    def _extract_well_colors(
        self,
        warped: np.ndarray,
        layout: CardLayout,
        color_correction: Optional[np.ndarray],
    ) -> dict[str, np.ndarray]:
        """Extract calibrated LAB color from each well."""
        w, h = self.WARPED_SIZE
        lab_image = cv2.cvtColor(warped, cv2.COLOR_BGR2LAB)
        well_colors = {}
        
        for well in layout.wells:
            # Scale to image coords
            cx = int(well.x / 1000 * w)
            cy = int(well.y / 1000 * h)
            r = int(well.radius / 1000 * min(w, h))
            
            # Create circular mask (avoid edge artifacts from meniscus)
            inner_r = int(r * 0.6)  # Use central 60% of well
            mask = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(mask, (cx, cy), inner_r, 255, -1)
            
            # Extract masked pixels
            pixels = lab_image[mask > 0]
            if len(pixels) == 0:
                well_colors[well.name] = np.array([50, 0, 0])  # Default gray
                continue
            
            # Reject outliers (bubbles, debris)
            mean_color = np.mean(pixels, axis=0)
            distances = np.sqrt(np.sum((pixels - mean_color) ** 2, axis=1))
            threshold = np.percentile(distances, 90)
            clean_pixels = pixels[distances < threshold]
            
            raw_color = np.mean(clean_pixels, axis=0) if len(clean_pixels) > 0 else mean_color
            
            # Apply calibration correction
            if color_correction is not None:
                augmented = np.append(raw_color, 1.0)
                corrected = augmented @ color_correction
                well_colors[well.name] = corrected
            else:
                well_colors[well.name] = raw_color
        
        return well_colors
    
    # ─────────────────────────────────────────
    # STEP 6: Control Validation
    # ─────────────────────────────────────────
    
    def _validate_control(self, well_colors: dict, layout: CardLayout) -> bool:
        """Validate control well shows expected color."""
        control_well = next((w for w in layout.wells if w.biomarker == "control"), None)
        if not control_well or control_well.name not in well_colors:
            return False
        
        control_color = well_colors[control_well.name]
        
        # Control well should be a specific known color (e.g., teal: L~60, a~-30, b~-10)
        expected_control = np.array([60, -30, -10])
        distance = np.sqrt(np.sum((control_color - expected_control) ** 2))
        
        # Allow delta E of 20 (fairly generous for consumer conditions)
        return distance < 20.0
    
    # ─────────────────────────────────────────
    # STEP 7: Biomarker Quantification
    # ─────────────────────────────────────────
    
    def _quantify_biomarkers(
        self,
        well_colors: dict,
        layout: CardLayout,
        species: str,
    ) -> list[BiomarkerReading]:
        """Convert well colors to biomarker concentrations."""
        readings = []
        ranges = self.reference_ranges.get(species, self.reference_ranges["DOG"])
        
        for well in layout.wells:
            if well.biomarker == "control":
                continue  # Skip control well
            
            if well.name not in well_colors:
                continue
            
            color = tuple(well_colors[well.name])
            curve = self.calibration_curves.get(well.reagent)
            ref = ranges.get(well.biomarker)
            
            if not curve or not ref:
                continue
            
            # Predict concentration from color
            value, confidence = curve.predict(color)
            
            # Clamp to physically possible range
            value = max(0, value)
            
            # Determine status
            if value < ref.get("critical_low", 0):
                status = BiomarkerStatus.CRITICAL
            elif value < ref["min"]:
                status = BiomarkerStatus.LOW
            elif value > ref.get("critical_high", 999):
                status = BiomarkerStatus.CRITICAL
            elif value > ref["max"]:
                status = BiomarkerStatus.HIGH
            else:
                status = BiomarkerStatus.NORMAL
            
            # Low confidence → invalid
            if confidence < 0.3:
                status = BiomarkerStatus.INVALID
            
            readings.append(BiomarkerReading(
                name=well.biomarker,
                value=round(value, 1),
                unit=ref["unit"],
                reference_min=ref["min"],
                reference_max=ref["max"],
                status=status,
                confidence=round(confidence, 2),
                raw_color_lab=color,
            ))
        
        return readings
    
    # ─────────────────────────────────────────
    # STEP 8: Scan Quality
    # ─────────────────────────────────────────
    
    def _compute_scan_quality(
        self,
        well_colors: dict,
        control_valid: bool,
        color_correction: Optional[np.ndarray],
    ) -> float:
        """Compute overall scan quality score (0-1)."""
        score = 0.0
        
        # Control well passed?
        score += 0.3 if control_valid else 0.0
        
        # Calibration strip readable?
        score += 0.3 if color_correction is not None else 0.1
        
        # All wells detected?
        expected_wells = 4  # v1
        detected = len(well_colors)
        score += 0.2 * (detected / expected_wells)
        
        # Color variance within wells (low variance = clean read)
        score += 0.2  # Simplified; full implementation checks per-well std
        
        return min(1.0, score)


# ─────────────────────────────────────────────
# CLI ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python biomarker_quant.py <image_path> [species] [card_version]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    species = sys.argv[2] if len(sys.argv) > 2 else "DOG"
    version = sys.argv[3] if len(sys.argv) > 3 else "v1"
    
    analyzer = BioCardAnalyzer()
    result = analyzer.process_scan(image_path, species=species, card_version=version)
    
    output = {
        "success": result.success,
        "card_version": result.card_version,
        "lot_number": result.lot_number,
        "scan_quality": result.scan_quality,
        "warnings": result.warnings,
        "readings": [
            {
                "name": r.name,
                "value": r.value,
                "unit": r.unit,
                "range": f"{r.reference_min}-{r.reference_max}",
                "status": r.status.value,
                "confidence": r.confidence,
            }
            for r in result.readings
        ],
    }
    
    print(json.dumps(output, indent=2))
