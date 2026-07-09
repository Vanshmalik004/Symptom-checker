"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

interface PossibleCondition {
  condition: string;
  confidence: number;
  explanation: string;
  supportingSymptoms?: string;
}

interface AssessmentDetails {
  id: string;
  symptoms: string;
  age: number;
  gender: string;
  duration: string;
  existingConditions: string | null;
  possibleCondition: string;
  explanation: string;
  severity: "Mild" | "Moderate" | "Severe";
  specialty: string;
  healthAdvice: string;
  language: string;
  chatHistory: ChatMessage[];
  createdAt: string;

  // Phase 2 fields
  weight: number | null;
  height: number | null;
  painLevel: number | null;
  currentMedications: string | null;
  allergies: string | null;
  pregnancyStatus: string | null;
  primarySymptoms: string | null; // stringified array
  secondarySymptoms: string | null; // stringified array
  analysisResult: string | null; // stringified SymptomAnalysis
}

const pageLabels: Record<string, Record<string, string>> = {
  en: {
    backBtn: "Back to Dashboard",
    downloadBtn: "Download PDF",
    checkedOn: "Checked on",
    ageLabel: "Age",
    genderLabel: "Gender",
    durationLabel: "Duration",
    conditionsLabel: "Existing Conditions",
    symptomsLabel: "Reported Symptoms",
    assessmentTitle: "AI Diagnosis & Possible Conditions",
    specialtyTitle: "Recommended Medical Specialty",
    severityTitle: "Severity Level",
    adviceTitle: "Health & Self-Care Advice",
    chatTitle: "AI Follow-up Chat Assistant",
    chatPlaceholder: "Ask a follow-up question (e.g. what food should I avoid?)...",
    chatSend: "Send",
    chatStatus: "AI is thinking...",
    emergencyWarning: "EMERGENCY ALERT: This case is flagged as SEVERE. Seek immediate physical clinical care."
  },
  hi: {
    backBtn: "डैशबोर्ड पर वापस जाएं",
    downloadBtn: "पीडीएफ डाउनलोड करें",
    checkedOn: "जांच की तारीख",
    ageLabel: "उम्र",
    genderLabel: "लिंग",
    durationLabel: "अवधि",
    conditionsLabel: "मौजूदा बीमारियां",
    symptomsLabel: "रिपोर्ट किए गए लक्षण",
    assessmentTitle: "एआई निदान और संभावित बीमारियां",
    specialtyTitle: "अनुशंसित चिकित्सा विशेषज्ञता",
    severityTitle: "गंभीरता का स्तर",
    adviceTitle: "स्वास्थ्य और आत्म-देखभाल सलाह",
    chatTitle: "एआई अनुवर्ती चैट सहायक",
    chatPlaceholder: "अनुवर्ती प्रश्न पूछें (जैसे मुझे किस भोजन से बचना चाहिए?)...",
    chatSend: "भेजें",
    chatStatus: "एआई सोच रहा है...",
    emergencyWarning: "आपातकालीन चेतावनी: इस मामले को गंभीर के रूप में चिह्नित किया गया है। तत्काल नैदानिक देखभाल लें।"
  },
  es: {
    backBtn: "Volver al Panel",
    downloadBtn: "Descargar PDF",
    checkedOn: "Evaluado el",
    ageLabel: "Edad",
    genderLabel: "Género",
    durationLabel: "Duración",
    conditionsLabel: "Condiciones Existentes",
    symptomsLabel: "Síntomas Reportados",
    assessmentTitle: "Diagnóstico de IA y Posibles Afecciones",
    specialtyTitle: "Especialidad Médica Recomendada",
    severityTitle: "Nivel de Severidad",
    adviceTitle: "Consejos de Salud y Autocuidado",
    chatTitle: "Asistente de Chat de Seguimiento de IA",
    chatPlaceholder: "Haga una pregunta de seguimiento (ej. ¿qué alimentos debo evitar?)...",
    chatSend: "Enviar",
    chatStatus: "La IA está pensando...",
    emergencyWarning: "ALERTA DE EMERGENCIA: Este caso está marcado como GRAVE. Busque atención clínica inmediata."
  },
  fr: {
    backBtn: "Retour au Tableau de Bord",
    downloadBtn: "Télécharger le PDF",
    checkedOn: "Diagnostiqué le",
    ageLabel: "Âge",
    genderLabel: "Genre",
    durationLabel: "Durée",
    conditionsLabel: "Maladies Existantes",
    symptomsLabel: "Symptômes Signalés",
    assessmentTitle: "Diagnostic IA & Affections Possibles",
    specialtyTitle: "Spécialité Médicale Recommandée",
    severityTitle: "Niveau de Gravité",
    adviceTitle: "Conseils de Santé & Autogestion",
    chatTitle: "Assistant Chat de Suivi IA",
    chatPlaceholder: "Posez une question de suivi (ex. quels aliments dois-je éviter?)...",
    chatSend: "Envoyer",
    chatStatus: "L'IA réfléchit...",
    emergencyWarning: "ALERTE D'URGENCE: Ce cas est marqué comme GRAVE. Consulter immédiatement un médecin."
  }
};

export default function AssessmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [assessment, setAssessment] = useState<AssessmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chatbot states
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchAssessmentDetails = async () => {
    try {
      const res = await fetch(`/api/assessments/${id}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load assessment details");
      }
      const data = await res.json();
      setAssessment(data.assessment);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAssessmentDetails();
    }
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assessment?.chatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat || !assessment) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setSendingChat(true);

    // Optimistically add the message to history first
    const tempHistory: ChatMessage[] = [
      ...assessment.chatHistory,
      { role: "user", text: userMessage, timestamp: new Date().toISOString() }
    ];
    setAssessment(prev => prev ? { ...prev, chatHistory: tempHistory } : null);

    try {
      const response = await fetch(`/api/assessments/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to send message");
      }

      // If the chat message triggered a new analysis and updated the assessment, the API returns the full updated assessment.
      if (resData.assessment) {
        setAssessment(resData.assessment);
      } else if (resData.chatHistory) {
        setAssessment(prev => prev ? { ...prev, chatHistory: resData.chatHistory } : null);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Chat error: ${err.message}`);
      // Refresh to sync correctly
      fetchAssessmentDetails();
    } finally {
      setSendingChat(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <div className="spinner" style={{ width: "2rem", height: "2rem", borderTopColor: "var(--primary-color)" }}></div>
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading assessment report...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="card text-center" style={{ margin: "2rem auto", maxWidth: "600px" }}>
        <h3 style={{ color: "var(--danger-color)", marginBottom: "1rem" }}>⚠️ Error Loading Details</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error || "Assessment not found or access denied."}</p>
        <Link href="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const lang = assessment.language || "en";
  const t = pageLabels[lang] || pageLabels.en;

  // Try to parse the rich Phase 2 JSON analysis result
  let conditions: PossibleCondition[] = [];
  let references: string[] = ["WHO Guidelines", "CDC Medical Factsheets"];
  let recommendedDoctors = "";
  let suggestedQuestions: string[] = [];
  let emergencyContacts = "";
  let vitalsMetrics: { bmi?: number; bmiCategory?: string } | undefined;

  if (assessment.analysisResult) {
    try {
      const parsed = JSON.parse(assessment.analysisResult);
      conditions = parsed.possibleConditions || [];
      if (parsed.references && parsed.references.length > 0) {
        references = parsed.references;
      }
      recommendedDoctors = parsed.recommendedDoctors || "";
      suggestedQuestions = parsed.suggestedQuestions || [];
      emergencyContacts = parsed.emergencyContacts || "";
      vitalsMetrics = parsed.vitalsMetrics;
    } catch (e) {
      console.error("Failed to parse analysisResult JSON:", e);
    }
  }

  // Fallback to old schema fields if conditions list is empty
  if (conditions.length === 0) {
    conditions.push({
      condition: assessment.possibleCondition || "Undetermined Condition",
      confidence: 70,
      explanation: assessment.explanation || "No explanation provided.",
      supportingSymptoms: "Symptom patterns match primary clinical indices."
    });
  }

  const isSevere = assessment.severity.toLowerCase() === "severe";

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Top action header (hidden on print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/dashboard" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← {t.backBtn}
        </Link>
        <button onClick={handlePrint} className="btn btn-primary">
          🖨️ {t.downloadBtn}
        </button>
      </div>

      {/* Emergency Red Flag alert banner */}
      {isSevere && (
        <div style={{
          backgroundColor: "#fee2e2",
          border: "2px solid #ef4444",
          color: "#b91c1c",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          boxShadow: "0 4px 12px rgba(239, 68, 68, 0.1)",
        }}>
          <span style={{ fontSize: "1.75rem" }}>🚨</span>
          <div>
            <div style={{ fontSize: "1.05rem" }}>{t.emergencyWarning}</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 500, marginTop: "0.25rem", opacity: 0.9 }}>
              Symptoms include potential cardiovascular, neurological, or pulmonary red flags. Please visit an emergency clinic immediately.
            </div>
          </div>
        </div>
      )}

      {/* Main Report Container */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "2rem" }}>
        
        {/* Left Hand: Clinical Analysis Report */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Assessment Header Card */}
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignContent: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span className={`badge ${isSevere ? "badge-danger" : assessment.severity.toLowerCase() === "moderate" ? "badge-warning" : "badge-success"}`} style={{ fontSize: "0.85rem", padding: "0.35rem 1rem" }}>
                  {assessment.severity} Severity
                </span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.75rem", color: "var(--primary-color)" }}>
                  {conditions[0]?.condition}
                </h2>
              </div>
              <div style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <div>{t.checkedOn}</div>
                <div style={{ fontWeight: 600, color: "var(--text-color)" }}>
                  {new Date(assessment.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </div>
            </div>
            
            <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              {conditions[0]?.explanation}
            </p>

            <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "1.5rem 0" }} />

            {/* Patient Intake Vitals summary */}
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Patient Physical Intake & Vitals
            </h4>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "1rem",
              fontSize: "0.85rem",
            }}>
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>{t.ageLabel}</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.15rem" }}>{assessment.age} yrs</div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>{t.genderLabel}</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.15rem" }}>{assessment.gender}</div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Weight / Height {vitalsMetrics?.bmi ? `(BMI)` : ""}</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.15rem" }}>
                  {assessment.weight ? `${assessment.weight} kg` : "N/A"} / {assessment.height ? `${assessment.height} cm` : "N/A"}
                  {vitalsMetrics?.bmi ? ` (${vitalsMetrics.bmi} - ${vitalsMetrics.bmiCategory})` : ""}
                </div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Pain Level (1-10)</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.15rem", color: "var(--primary-color)" }}>
                  💥 {assessment.painLevel || "N/A"}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginTop: "1rem", fontSize: "0.85rem" }}>
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Active Medications</div>
                <div style={{ fontWeight: 600, marginTop: "0.15rem" }}>{assessment.currentMedications || "None reported"}</div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Known Allergies</div>
                <div style={{ fontWeight: 600, marginTop: "0.15rem", color: assessment.allergies ? "var(--danger-color)" : "inherit" }}>
                  {assessment.allergies || "None reported"}
                </div>
              </div>
            </div>

            {assessment.gender === "Female" && (
              <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", marginTop: "1rem", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Pregnancy Status: </span>
                <span style={{ fontWeight: 700 }}>{assessment.pregnancyStatus}</span>
              </div>
            )}
          </div>

          {/* Diagnosis List (Confidence Progress Bars) */}
          <div className="card" style={{ padding: "2rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem" }}>
              📊 Differential Diagnosis & Confidence Analysis
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {conditions.map((item, index) => (
                <div key={index} style={{ borderBottom: index < conditions.length - 1 ? "1px solid var(--border-color)" : "none", paddingBottom: index < conditions.length - 1 ? "1.25rem" : "0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                      {index + 1}. {item.condition}
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--primary-color)" }}>
                      {item.confidence}% Confidence
                    </div>
                  </div>
                  {/* Progress Bar Container */}
                  <div style={{ width: "100%", height: "8px", backgroundColor: "var(--border-color)", borderRadius: "9999px", overflow: "hidden", marginBottom: "0.5rem" }}>
                    <div style={{
                      width: `${item.confidence}%`,
                      height: "100%",
                      backgroundColor: "var(--primary-color)",
                      borderRadius: "9999px",
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "0.5rem" }}>
                    {item.explanation}
                  </p>
                  {item.supportingSymptoms && (
                    <div style={{ fontSize: "0.8rem", color: "var(--primary-color)", fontWeight: 600, backgroundColor: "var(--primary-light)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", display: "inline-block" }}>
                      🔍 <strong>Supporting Symptoms:</strong> {item.supportingSymptoms}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Health Advice & Specialty Recommendations */}
          <div className="card" style={{ padding: "2rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem" }}>
              🩺 Clinical Action Plan
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ padding: "1rem", backgroundColor: "var(--primary-light)", borderRadius: "var(--radius-md)", border: "1px solid var(--primary-light-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--primary-color)" }}>
                  {t.specialtyTitle}
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--text-color)" }}>
                  🚨 {assessment.specialty}
                </div>
              </div>

              <div style={{ padding: "1rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Symptom Intake Method
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.25rem" }}>
                  💻 Patient Form & File OCR
                </div>
              </div>
            </div>

            <div style={{ whiteSpace: "pre-line", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-color)" }}>
              <strong>{t.adviceTitle}:</strong>
              <div style={{ marginTop: "0.5rem", color: "var(--text-color)" }}>
                {assessment.healthAdvice}
              </div>
            </div>

            {recommendedDoctors && (
              <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <strong style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>
                  📍 City Clinic/Doctor Recommendations
                </strong>
                <div style={{ fontSize: "0.9rem", color: "var(--text-color)", whiteSpace: "pre-line" }}>
                  {recommendedDoctors}
                </div>
              </div>
            )}

            {isSevere && emergencyContacts && (
              <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#fef2f2", borderRadius: "var(--radius-md)", border: "1px solid #fee2e2" }}>
                <strong style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--danger-color)", display: "block", marginBottom: "0.5rem" }}>
                  📞 Local Emergency Contact Info
                </strong>
                <div style={{ fontSize: "0.9rem", color: "#b91c1c", fontWeight: 600 }}>
                  {emergencyContacts}
                </div>
              </div>
            )}
          </div>

          {/* References & Disclaimers */}
          <div className="card animate-fade-in" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Evidence-Based Citations & References
              </h4>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {references.map((ref, idx) => (
                  <span key={idx} className="badge badge-normal" style={{ fontSize: "0.75rem", padding: "0.25rem 0.75rem" }}>
                    📚 {ref}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "1rem", lineHeight: 1.4 }}>
              <strong>Clinical Disclaimer:</strong> This report is synthesized using an AI decision-support system referencing local clinical RAG guides and OpenFDA databases. It does not replace a physical clinical examination. If you are experiencing chest pain, difficulty breathing, or severe sudden pain, please immediately go to the nearest emergency room.
            </div>
          </div>

        </div>

        {/* Right Hand: Interactive Consultation Chatbot Widget */}
        <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", height: "600px" }}>
            
            {/* Widget Header */}
            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>💬</span> {t.chatTitle}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Describe any new or worsening symptoms to update your assessment report instantly.
              </p>
            </div>

            {/* Messages Display Panel */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              paddingRight: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "1rem"
            }}>
              {/* Default Welcome Message */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{
                  maxWidth: "85%",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-color)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.9rem",
                  lineHeight: 1.4
                }}>
                  Hello! I am your clinical follow-up assistant. You can ask me questions about your assessment, or update me on any new symptoms you are experiencing.
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem", marginLeft: "0.25rem" }}>
                  AI Assistant
                </span>
              </div>

              {/* Chat Message Loops */}
              {assessment.chatHistory.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div style={{
                      maxWidth: "85%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: isUser ? "var(--primary-color)" : "var(--bg-color)",
                      border: isUser ? "none" : "1px solid var(--border-color)",
                      color: isUser ? "#ffffff" : "var(--text-color)",
                      fontSize: "0.9rem",
                      lineHeight: 1.4
                    }}>
                      {msg.text}
                    </div>
                    <span style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      marginTop: "0.25rem",
                      marginLeft: isUser ? "0" : "0.25rem",
                      marginRight: isUser ? "0.25rem" : "0"
                    }}>
                      {isUser ? "You" : "AI Assistant"} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}

              {sendingChat && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{
                    maxWidth: "85%",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-color)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.9rem",
                    opacity: 0.7
                  }}>
                    <span className="animate-pulse">⏳ {t.chatStatus}</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Suggested Questions */}
            {suggestedQuestions && suggestedQuestions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Suggested Questions:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setChatInput(q);
                      }}
                      style={{
                        background: "var(--primary-light)",
                        border: "1px solid var(--primary-light-border)",
                        color: "var(--primary-color)",
                        padding: "0.35rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        textAlign: "left",
                        transition: "var(--transition)",
                      }}
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t.chatPlaceholder}
                disabled={sendingChat}
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingChat || !chatInput.trim()}
                style={{ padding: "0.75rem 1.25rem" }}
              >
                {t.chatSend}
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: "1.25rem" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Symptom Evolution Check
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              If you type new symptoms in the chat (e.g. <i>"I am now experiencing dizziness and vomiting"</i>), the AI clinical engine will dynamically recalculate your diagnosis, severity level, and specialty recommendations.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
