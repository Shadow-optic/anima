import {useEffect, useState} from "react";

// ─────────────────────────────────────────────
// ANIMA Ambient Intelligence Dashboard
// Showcases all novel features deployable NOW
// ─────────────────────────────────────────────

const SCORE_COLORS = {
  Exceptional: "#10B981",
  Excellent: "#34D399",
  Good: "#60A5FA",
  Fair: "#FBBF24",
  "At Risk": "#F97316",
  Critical: "#EF4444",
};

function getScoreLabel(score) {
  if (score >= 900) return "Exceptional";
  if (score >= 750) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 400) return "Fair";
  if (score >= 200) return "At Risk";
  return "Critical";
}

// Mock data representing Twin state
const MOCK_PET = {
  name: "Luna",
  species: "DOG",
  breed: "Golden Retriever",
  age: "4 years",
  weight: 29.5,
  bcs: 6,
  photo: "🐕",
  score: 742,
  previousScore: 718,
};

const MOCK_PHOTO_VITALS = {
  bodyConditionScore: 6,
  bcsConfidence: 0.78,
  coatQuality: { overallScore: 82, sheen: 78, uniformity: 88, flags: [] },
  eyeHealth: { clarity: 92, discharge: false, redness: 8, symmetry: 96 },
  emotionalState: { state: "relaxed", confidence: 0.82, signals: ["soft_eyes", "loose_body"] },
  lastAnalyzed: "2 hours ago",
  photosThisWeek: 7,
};

const MOCK_ENV_RISKS = [
  { type: "allergy_flare", level: "elevated", score: 68, title: "Allergy Flare Risk", detail: "High grass pollen (7/12). Golden Retrievers are predisposed to environmental allergies.", icon: "🌿" },
  { type: "heat_stress", level: "moderate", score: 45, title: "Heat Advisory", detail: "28°C with 65% humidity. Limit midday outdoor activity.", icon: "🌡️" },
  { type: "parasite_exposure", level: "moderate", score: 40, title: "Tick Season Active", detail: "Peak season for your region. Ensure flea/tick prevention is current.", icon: "🪲" },
];

const MOCK_BEHAVIORAL = [
  { type: "portion_creep", signal: "Calories up 12% over 2 weeks", confidence: 0.75, healthRelevance: "high", recommendation: "Review portion sizes. Daily average went from ~1,180 to ~1,320 kcal." },
  { type: "feeding_irregularity", signal: "Dinner timing varies by 95 min", confidence: 0.80, healthRelevance: "medium", recommendation: "Try to feed dinner within a 30-minute window each day." },
];

const MOCK_FOOD_ALERTS = [
  { type: "optimization", severity: "info", title: "Save ~22% with equivalent nutrition", detail: "Taste of the Wild Pacific Stream has a similar profile to your current food at $2.10/lb vs $2.70/lb.", icon: "💰" },
];

const MOCK_CARE_TIMELINE = [
  { type: "dental", title: "Dental Cleaning", priority: "overdue", daysUntilDue: -45, detail: "Last cleaning was 16 months ago" },
  { type: "weight_check", title: "Weight Check", priority: "due_soon", daysUntilDue: 3, detail: "BCS 6/9 — monitoring every 2 weeks" },
  { type: "vaccination", title: "Bordetella Booster", priority: "upcoming", daysUntilDue: 22, detail: "Due March 15" },
  { type: "vet_visit", title: "Hip Evaluation (OFA)", priority: "upcoming", daysUntilDue: 30, detail: "Breed predisposed — recommended after age 2" },
  { type: "biocard_scan", title: "BioCard Scan", priority: "upcoming", daysUntilDue: 18, detail: "Monthly monitoring for elevated BUN trend" },
];

const MOCK_VOICE = {
  lastSession: "Today, 11:32 AM",
  duration: "22 min",
  coughCount: 0,
  respiratoryRate: 18,
  alerts: [],
  weeklyTrend: [0, 0, 1, 0, 0, 0, 0],
};

const MOCK_BIOMARKER_TRENDS = [
  { name: "BUN", current: 18.3, unit: "mg/dL", range: "7-27", status: "normal", trend: "stable", history: [16.5, 17.2, 18.0, 18.3] },
  { name: "pH", current: 6.8, unit: "pH", range: "6.0-7.5", status: "normal", trend: "stable", history: [6.9, 6.7, 6.8, 6.8] },
  { name: "Protein", current: 6.2, unit: "g/dL", range: "5.5-7.5", status: "normal", trend: "rising", history: [5.8, 5.9, 6.0, 6.2] },
];

export default function AnimaDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [scoreAnimated, setScoreAnimated] = useState(0);
  const [showPhotoVitals, setShowPhotoVitals] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [expandedRisk, setExpandedRisk] = useState(null);

  useEffect(() => {
    const target = MOCK_PET.score;
    const duration = 1500;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setScoreAnimated(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, []);

  const label = getScoreLabel(scoreAnimated);
  const color = SCORE_COLORS[label];
  const scoreDelta = MOCK_PET.score - MOCK_PET.previousScore;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0F",
      color: "#E8E6E3",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes listening-pulse {
          0%, 100% { height: 8px; }
          50% { height: 24px; }
        }
        
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.2s ease;
        }
        .card:hover {
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
        }
        
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        
        .tab {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          background: transparent;
          color: #888;
          white-space: nowrap;
        }
        .tab:hover { color: #ccc; background: rgba(255,255,255,0.05); }
        .tab.active { color: #fff; background: rgba(255,255,255,0.1); }
        
        .risk-bar {
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.1);
          overflow: hidden;
          position: relative;
        }
        .risk-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .timeline-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .listening-bar {
          width: 3px;
          background: #10B981;
          border-radius: 2px;
          animation: listening-pulse 0.8s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>
            ANIMA
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>
            {MOCK_PET.name}'s Dashboard
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: "#666" }}>Twin updated 3m ago</span>
          <div style={{
            width: 8, height: 8, borderRadius: 4,
            background: "#10B981",
            boxShadow: "0 0 8px #10B98188",
            animation: "pulse-ring 2s infinite",
          }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "16px 24px", display: "flex", gap: 4, overflowX: "auto" }}>
        {["overview", "photo vitals", "environment", "behavior", "voice", "biomarkers", "care"].map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 24px 32px", maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
        
        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
            
            {/* Score Hero */}
            <div className="card" style={{ textAlign: "center", padding: 32, position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(circle at 50% 30%, ${color}15 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />
              <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Longevity Score™</div>
              <div style={{
                fontSize: 72, fontWeight: 700, lineHeight: 1,
                fontFamily: "'JetBrains Mono', monospace",
                color,
                textShadow: `0 0 40px ${color}44`,
              }}>
                {scoreAnimated}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color, marginTop: 8 }}>{label}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                {scoreDelta > 0 ? "↑" : "↓"} {Math.abs(scoreDelta)} pts since last update
              </div>
              
              {/* Factor bars */}
              <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "left" }}>
                {[
                  { name: "Genetic", score: 68, color: "#8B5CF6" },
                  { name: "Body Condition", score: 58, color: "#F97316" },
                  { name: "Nutrition", score: 72, color: "#10B981" },
                  { name: "Age & Health", score: 82, color: "#3B82F6" },
                  { name: "Preventive Care", score: 45, color: "#EF4444" },
                  { name: "Activity", score: 76, color: "#06B6D4" },
                ].map(f => (
                  <div key={f.name} style={{ padding: "6px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
                      <span>{f.name}</span><span style={{ fontFamily: "'JetBrains Mono'" }}>{f.score}</span>
                    </div>
                    <div className="risk-bar">
                      <div className="risk-bar-fill" style={{ width: `${f.score}%`, background: f.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Insights Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="card" onClick={() => setActiveTab("photo vitals")} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Photo Vitals™</div>
                <div style={{ fontSize: 24, fontWeight: 600, marginTop: 8 }}>{MOCK_PHOTO_VITALS.photosThisWeek}</div>
                <div style={{ fontSize: 12, color: "#666" }}>photos analyzed this week</div>
                <div style={{ marginTop: 8 }}>
                  <span className="badge" style={{ background: "#10B98120", color: "#10B981" }}>Coat: {MOCK_PHOTO_VITALS.coatQuality.overallScore}/100</span>
                </div>
              </div>
              <div className="card" onClick={() => setActiveTab("voice")} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Voice Monitor</div>
                <div style={{ fontSize: 24, fontWeight: 600, marginTop: 8 }}>{MOCK_VOICE.respiratoryRate}</div>
                <div style={{ fontSize: 12, color: "#666" }}>breaths/min (resting)</div>
                <div style={{ marginTop: 8 }}>
                  <span className="badge" style={{ background: "#10B98120", color: "#10B981" }}>Normal range</span>
                </div>
              </div>
            </div>

            {/* Top Risk */}
            {MOCK_ENV_RISKS[0] && (
              <div className="card" onClick={() => setActiveTab("environment")} style={{ cursor: "pointer", borderColor: "#F9731633" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 28 }}>{MOCK_ENV_RISKS[0].icon}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{MOCK_ENV_RISKS[0].title}</span>
                      <span className="badge" style={{ background: "#F9731620", color: "#F97316", fontSize: 10 }}>ELEVATED</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{MOCK_ENV_RISKS[0].detail}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Care Timeline Preview */}
            <div className="card" onClick={() => setActiveTab("care")} style={{ cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Upcoming Care</div>
              {MOCK_CARE_TIMELINE.slice(0, 3).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div className="timeline-dot" style={{
                    background: item.priority === "overdue" ? "#EF4444" : item.priority === "due_soon" ? "#FBBF24" : "#3B82F6",
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{item.detail}</div>
                  </div>
                  <span className="badge" style={{
                    background: item.priority === "overdue" ? "#EF444420" : item.priority === "due_soon" ? "#FBBF2420" : "#3B82F620",
                    color: item.priority === "overdue" ? "#EF4444" : item.priority === "due_soon" ? "#FBBF24" : "#3B82F6",
                  }}>
                    {item.priority === "overdue" ? `${Math.abs(item.daysUntilDue)}d overdue` : `${item.daysUntilDue}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PHOTO VITALS TAB ── */}
        {activeTab === "photo vitals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
            <div className="card" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Photo Vitals™</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4, maxWidth: 360, margin: "4px auto 0" }}>
                Every photo of {MOCK_PET.name} is a health data point. We silently extract vitals from casual photos — no special poses needed.
              </div>
              <div style={{ marginTop: 16, padding: "12px 24px", background: "rgba(16,185,129,0.1)", borderRadius: 12, display: "inline-block" }}>
                <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>{MOCK_PHOTO_VITALS.photosThisWeek} photos analyzed this week</span>
              </div>
            </div>

            {/* Vitals Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Body Condition", value: `${MOCK_PHOTO_VITALS.bodyConditionScore}/9`, sub: `${Math.round(MOCK_PHOTO_VITALS.bcsConfidence * 100)}% confidence`, color: MOCK_PHOTO_VITALS.bodyConditionScore > 5 ? "#F97316" : "#10B981", icon: "⚖️" },
                { label: "Coat Quality", value: `${MOCK_PHOTO_VITALS.coatQuality.overallScore}`, sub: `Sheen ${MOCK_PHOTO_VITALS.coatQuality.sheen} · Uniform ${MOCK_PHOTO_VITALS.coatQuality.uniformity}`, color: "#10B981", icon: "✨" },
                { label: "Eye Clarity", value: `${MOCK_PHOTO_VITALS.eyeHealth.clarity}%`, sub: "No discharge · Good symmetry", color: "#10B981", icon: "👁️" },
                { label: "Mood", value: MOCK_PHOTO_VITALS.emotionalState.state, sub: MOCK_PHOTO_VITALS.emotionalState.signals.join(" · "), color: "#8B5CF6", icon: "😊" },
              ].map((v, i) => (
                <div key={i} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20 }}>{v.icon}</span>
                    <span className="badge" style={{ background: `${v.color}20`, color: v.color, fontSize: 10 }}>
                      {v.value === "relaxed" ? "HAPPY" : v.color === "#10B981" ? "GOOD" : "MONITOR"}
                    </span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: v.color }}>{v.value}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{v.label}</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{v.sub}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ borderColor: "#F9731633" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F97316" }}>📌 Insight</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                Visual BCS estimates Luna at <strong>6/9</strong> (slightly overweight). Your profile says 5. Consider a weigh-in to confirm — reducing by just 1 BCS point could add 1.8 years to her lifespan.
              </div>
            </div>
          </div>
        )}

        {/* ── ENVIRONMENT TAB ── */}
        {activeTab === "environment" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
            <div className="card" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🌍</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Environmental Intelligence</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                Real-time risk assessment using location, weather, air quality, and pollen data — tailored to {MOCK_PET.name}'s breed sensitivities.
              </div>
            </div>

            {MOCK_ENV_RISKS.map((risk, i) => (
              <div key={i} className="card" style={{
                cursor: "pointer",
                borderColor: risk.level === "high" ? "#EF444433" : risk.level === "elevated" ? "#F9731633" : "rgba(255,255,255,0.06)",
              }} onClick={() => setExpandedRisk(expandedRisk === i ? null : i)}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 28 }}>{risk.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{risk.title}</span>
                      <span className="badge" style={{
                        background: risk.level === "high" ? "#EF444420" : risk.level === "elevated" ? "#F9731620" : "#FBBF2420",
                        color: risk.level === "high" ? "#EF4444" : risk.level === "elevated" ? "#F97316" : "#FBBF24",
                      }}>{risk.level.toUpperCase()}</span>
                    </div>
                    <div className="risk-bar" style={{ marginTop: 8 }}>
                      <div className="risk-bar-fill" style={{
                        width: `${risk.score}%`,
                        background: risk.level === "high" ? "#EF4444" : risk.level === "elevated" ? "#F97316" : "#FBBF24",
                      }} />
                    </div>
                    {expandedRisk === i && (
                      <div style={{ marginTop: 10, fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                        {risk.detail}
                        <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, fontSize: 11 }}>
                          💡 <strong>Action:</strong> Wipe paws after outdoor time. Monitor for scratching, licking, or hot spots.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BEHAVIOR TAB ── */}
        {activeTab === "behavior" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
            <div className="card" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Behavioral Pattern Detection</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                Detects health-relevant patterns from app usage — no extra sensors needed. Just meal logs, weights, and activity data.
              </div>
            </div>

            {MOCK_BEHAVIORAL.map((insight, i) => (
              <div key={i} className="card" style={{
                borderColor: insight.healthRelevance === "high" ? "#F9731633" : "rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="badge" style={{
                    background: insight.healthRelevance === "high" ? "#F9731620" : "#FBBF2420",
                    color: insight.healthRelevance === "high" ? "#F97316" : "#FBBF24",
                  }}>{insight.healthRelevance} relevance</span>
                  <span style={{ fontSize: 11, color: "#555" }}>{Math.round(insight.confidence * 100)}% confidence</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{insight.signal}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>{insight.recommendation}</div>
              </div>
            ))}

            {MOCK_FOOD_ALERTS.map((alert, i) => (
              <div key={i} className="card" style={{ borderColor: "#3B82F633" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 24 }}>{alert.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{alert.title}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{alert.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── VOICE TAB ── */}
        {activeTab === "voice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
            <div className="card" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎤</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Voice Health Monitor</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4, maxWidth: 340, margin: "4px auto 0" }}>
                Listens for coughs, breathing patterns, and distress vocalizations. Audio never leaves your device — only health signals are recorded.
              </div>
            </div>

            {/* Listening toggle */}
            <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Background Listening</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Monitors while app is open</div>
              </div>
              <button onClick={() => setVoiceListening(!voiceListening)} style={{
                padding: "8px 20px", borderRadius: 100, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 12,
                background: voiceListening ? "#10B981" : "rgba(255,255,255,0.1)",
                color: voiceListening ? "#000" : "#888",
              }}>
                {voiceListening ? "Listening..." : "Start"}
              </button>
            </div>

            {voiceListening && (
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: 24 }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="listening-bar" style={{
                    animationDelay: `${i * 0.1}s`,
                    opacity: 0.5 + Math.random() * 0.5,
                  }} />
                ))}
              </div>
            )}

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>{MOCK_VOICE.respiratoryRate}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Resting RR (breaths/min)</div>
                <div className="badge" style={{ background: "#10B98120", color: "#10B981", marginTop: 6 }}>Normal</div>
              </div>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>{MOCK_VOICE.coughCount}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Coughs Today</div>
                <div className="badge" style={{ background: "#10B98120", color: "#10B981", marginTop: 6 }}>Clear</div>
              </div>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>{MOCK_VOICE.duration}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Monitored Today</div>
              </div>
            </div>

            {/* Weekly cough trend */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Weekly Cough Trend</div>
              <div style={{ display: "flex", alignItems: "end", gap: 6, height: 48 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                  <div key={day} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      height: Math.max(4, MOCK_VOICE.weeklyTrend[i] * 32),
                      background: MOCK_VOICE.weeklyTrend[i] > 2 ? "#EF4444" : MOCK_VOICE.weeklyTrend[i] > 0 ? "#FBBF24" : "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      marginBottom: 4,
                      transition: "height 0.3s",
                    }} />
                    <span style={{ fontSize: 9, color: "#555" }}>{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BIOMARKERS TAB ── */}
        {activeTab === "biomarkers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
            <div className="card" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🧬</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Biomarker Trends</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                From BioCard scans and vet lab results. Tracking molecular health over time.
              </div>
            </div>

            {MOCK_BIOMARKER_TRENDS.map((bm, i) => (
              <div key={i} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{bm.name}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>Ref: {bm.range} {bm.unit}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: bm.status === "normal" ? "#10B981" : "#F97316" }}>
                      {bm.current}
                    </div>
                    <span style={{ fontSize: 10, color: "#666" }}>{bm.unit}</span>
                  </div>
                </div>
                
                {/* Mini sparkline */}
                <div style={{ display: "flex", alignItems: "end", gap: 2, height: 32, marginTop: 12 }}>
                  {bm.history.map((val, j) => {
                    const range = bm.range.split("-").map(Number);
                    const pct = ((val - range[0]) / (range[1] - range[0])) * 100;
                    return (
                      <div key={j} style={{
                        flex: 1,
                        height: `${Math.max(10, Math.min(100, pct))}%`,
                        background: j === bm.history.length - 1 ? "#10B981" : "rgba(16,185,129,0.3)",
                        borderRadius: 2,
                      }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: "#444" }}>4 scans ago</span>
                  <span style={{ fontSize: 9, color: "#444" }}>Latest</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CARE TIMELINE TAB ── */}
        {activeTab === "care" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slide-up 0.3s ease" }}>
            <div className="card" style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Predictive Care Timeline</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                The Twin knows what care {MOCK_PET.name} needs and when. Auto-generated from breed risks, age, biomarkers, and vet history.
              </div>
            </div>

            {MOCK_CARE_TIMELINE.map((item, i) => {
              const colors = {
                overdue: { bg: "#EF444420", text: "#EF4444", dot: "#EF4444" },
                due_soon: { bg: "#FBBF2420", text: "#FBBF24", dot: "#FBBF24" },
                upcoming: { bg: "#3B82F620", text: "#3B82F6", dot: "#3B82F6" },
                scheduled: { bg: "#10B98120", text: "#10B981", dot: "#10B981" },
              }[item.priority];

              return (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  {/* Timeline line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                    <div className="timeline-dot" style={{ background: colors.dot, marginTop: 4 }} />
                    {i < MOCK_CARE_TIMELINE.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.08)", marginTop: 4 }} />
                    )}
                  </div>
                  
                  <div className="card" style={{ flex: 1, borderColor: `${colors.dot}33` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                      <span className="badge" style={{ background: colors.bg, color: colors.text }}>
                        {item.priority === "overdue" ? `${Math.abs(item.daysUntilDue)}d overdue` :
                          item.priority === "due_soon" ? `${item.daysUntilDue}d` :
                          `In ${item.daysUntilDue}d`}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{item.detail}</div>
                    <button style={{
                      marginTop: 10, padding: "6px 14px", borderRadius: 8,
                      border: `1px solid ${colors.dot}44`, background: "transparent",
                      color: colors.text, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>
                      {item.priority === "overdue" ? "Schedule Now" : "Set Reminder"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
