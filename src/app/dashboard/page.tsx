"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AssessmentSummary {
  id: string;
  possibleCondition: string;
  symptoms: string;
  severity: string;
  createdAt: string;
}

interface DashboardData {
  user: { fullName: string; email: string };
  assessments: AssessmentSummary[];
}

const uiTranslations: Record<string, any> = {
  en: {
    welcome: "Hello",
    subtitle: "Welcome to your Dooper Health symptom checker portal. Describe your symptoms below to get an instant clinical assessment and doctor specialty recommendation.",
    totalAssessments: "Total Assessments",
    mildCases: "Mild Cases",
    moderateCases: "Moderate Cases",
    severeCases: "Severe Cases",
    checkTitle: "Start New AI Symptom Check",
    symptomsLabel: "Describe your Symptoms",
    symptomsPlaceholder: "e.g., I have a throbbing headache on the right side of my head, accompanied by light sensitivity for the last two days.",
    ageLabel: "Age (in years)",
    genderLabel: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other / Prefer not to say",
    durationLabel: "Duration of Symptoms",
    conditionsLabel: "Existing Medical Conditions (Optional)",
    conditionsPlaceholder: "e.g., Hypertension, Diabetes, none",
    languageLabel: "Preferred Assessment Language",
    submitBtn: "Run AI Assessment",
    submitting: "Analyzing symptoms...",
    recentTitle: "Recent Symptom Checkups",
    recentEmpty: "No assessments completed yet. Describe your symptoms above to begin.",
    viewAssessment: "View Assessment",
    conditionCol: "Possible Condition",
    dateCol: "Checked Date",
    severityCol: "Severity Level",
    actionCol: "Actions"
  },
  hi: {
    welcome: "नमस्ते",
    subtitle: "आपके डूपर हेल्थ लक्षण चेकर पोर्टल में आपका स्वागत है। तत्काल नैदानिक मूल्यांकन और डॉक्टर विशेषज्ञ की सिफारिश प्राप्त करने के लिए नीचे अपने लक्षणों का वर्णन करें।",
    totalAssessments: "कुल मूल्यांकन",
    mildCases: "हल्के मामले",
    moderateCases: "मध्यम मामले",
    severeCases: "गंभीर मामले",
    checkTitle: "नया एआई लक्षण परीक्षण शुरू करें",
    symptomsLabel: "अपने लक्षणों का वर्णन करें",
    symptomsPlaceholder: "जैसे, मुझे पिछले दो दिनों से सिर के दाहिने हिस्से में तेज धड़कने वाला दर्द हो रहा है, साथ ही रोशनी से तकलीफ हो रही है।",
    ageLabel: "उम्र (वर्षों में)",
    genderLabel: "लिंग",
    genderMale: "पुरुष",
    genderFemale: "महिला",
    genderOther: "अन्य / कहना नहीं चाहते",
    durationLabel: "लक्षणों की अवधि",
    conditionsLabel: "मौजूदा बीमारियां (वैकल्पिक)",
    conditionsPlaceholder: "जैसे, उच्च रक्तचाप, मधुमेह, कोई नहीं",
    languageLabel: "पसंदीदा मूल्यांकन भाषा",
    submitBtn: "एआई मूल्यांकन चलाएं",
    submitting: "लक्षणों का विश्लेषण किया जा रहा है...",
    recentTitle: "हालिया लक्षण परीक्षण",
    recentEmpty: "अभी तक कोई मूल्यांकन पूरा नहीं हुआ है। शुरू करने के लिए ऊपर अपने लक्षणों का वर्णन करें।",
    viewAssessment: "मूल्यांकन देखें",
    conditionCol: "संभावित बीमारी",
    dateCol: "जांच की तारीख",
    severityCol: "गंभीरता का स्तर",
    actionCol: "कार्रवाई"
  },
  es: {
    welcome: "Hola",
    subtitle: "Bienvenido a su portal de evaluación de síntomas de Dooper Health. Describa sus síntomas a continuación para obtener una evaluación clínica instantánea y una recomendación de especialidad médica.",
    totalAssessments: "Evaluaciones Totales",
    mildCases: "Casos Leves",
    moderateCases: "Casos Moderados",
    severeCases: "Casos Graves",
    checkTitle: "Iniciar Nueva Evaluación de Síntomas",
    symptomsLabel: "Describa sus Síntomas",
    symptomsPlaceholder: "Ej. Tengo un dolor de cabeza pulsátil en el lado derecho, acompañado de sensibilidad a la luz durante los últimos dos días.",
    ageLabel: "Edad (en años)",
    genderLabel: "Género",
    genderMale: "Masculino",
    genderFemale: "Femenino",
    genderOther: "Otro / Prefiero no decirlo",
    durationLabel: "Duración de los Síntomas",
    conditionsLabel: "Condiciones Médicas Existentes (Opcional)",
    conditionsPlaceholder: "Ej. Hipertensión, Diabetes, ninguna",
    languageLabel: "Idioma de Evaluación Preferido",
    submitBtn: "Realizar Evaluación de IA",
    submitting: "Analizando síntomas...",
    recentTitle: "Evaluaciones de Síntomas Recientes",
    recentEmpty: "Aún no se han completado evaluaciones. Describa sus síntomas arriba para comenzar.",
    viewAssessment: "Ver Evaluación",
    conditionCol: "Condición Posible",
    dateCol: "Fecha de Evaluación",
    severityCol: "Nivel de Severidad",
    actionCol: "Acciones"
  },
  fr: {
    welcome: "Bonjour",
    subtitle: "Bienvenue sur votre portail d'analyse des symptômes Dooper Health. Décrivez vos symptômes ci-dessous pour obtenir une évaluation clinique instantanée et une recommandation de spécialité médicale.",
    totalAssessments: "Évaluations Totales",
    mildCases: "Cas Légers",
    moderateCases: "Cas Modérés",
    severeCases: "Cas Graves",
    checkTitle: "Démarrer un diagnostic de symptômes IA",
    symptomsLabel: "Décrivez vos Symptômes",
    symptomsPlaceholder: "Ex. J'ai un mal de tête lancinant du côté droit, accompagné d'une sensibilité à la lumière depuis deux jours.",
    ageLabel: "Âge (en années)",
    genderLabel: "Genre",
    genderMale: "Homme",
    genderFemale: "Femme",
    genderOther: "Autre / Préfère ne pas dire",
    durationLabel: "Durée des Symptômes",
    conditionsLabel: "Maladies Existantes (Optionnel)",
    conditionsPlaceholder: "Ex. Hypertension, Diabète, aucun",
    languageLabel: "Langue d'évaluation préférée",
    submitBtn: "Lancer l'évaluation IA",
    submitting: "Analyse des symptômes en cours...",
    recentTitle: "Diagnostics de symptômes récents",
    recentEmpty: "Aucune évaluation effectuée pour le moment. Décrivez vos symptômes ci-dessus pour commencer.",
    viewAssessment: "Voir l'évaluation",
    conditionCol: "Affection Possible",
    dateCol: "Date du Diagnostic",
    severityCol: "Niveau de Gravité",
    actionCol: "Actions"
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [duration, setDuration] = useState("1-2 days");
  const [existingConditions, setExistingConditions] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // New Phase 2 form states
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [painLevel, setPainLevel] = useState("5");
  const [currentMedications, setCurrentMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState("No");
  const [primarySymptoms, setPrimarySymptoms] = useState<string[]>([]);
  const [secondarySymptoms, setSecondarySymptoms] = useState<string[]>([]);
  const [city, setCity] = useState("");

  // File upload state (OCR/PDF Context)
  const [fileParsing, setFileParsing] = useState(false);
  const [uploadedFileText, setUploadedFileText] = useState("");
  const [parsedFileName, setParsedFileName] = useState("");

  // Reference Upload state (Custom RAG)
  const [referenceParsing, setReferenceParsing] = useState(false);
  const [referenceUploadMessage, setReferenceUploadMessage] = useState("");

  const fetchDashboardData = async () => {
    try {
      // Fetch user profile info
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) throw new Error("Not authenticated");
      const meData = await meRes.json();

      // Fetch assessment history
      const repRes = await fetch("/api/assessments");
      if (!repRes.ok) throw new Error("Failed to fetch assessments");
      const repData = await repRes.json();

      setData({
        user: meData.user,
        assessments: repData.assessments || [],
      });
    } catch (err) {
      console.error(err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Speech Recognition dictation
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    
    // Map locale for language
    const locales: Record<string, string> = {
      en: "en-US",
      hi: "hi-IN",
      es: "es-ES",
      fr: "fr-FR"
    };
    recognition.lang = locales[selectedLanguage] || "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSymptoms((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Handle OCR/PDF file parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileParsing(true);
    setError(null);
    setParsedFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to parse file");

      if (resData.text && resData.text.trim()) {
        const text = resData.text.trim();
        // If file name implies a prescription/report or is an image, append directly.
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes("prescription") || lowerName.includes("report") || file.type.includes("image")) {
          setSymptoms(prev => prev ? `${prev}\n\n[OCR Prescription text]:\n${text}` : text);
          setUploadedFileText(""); // Already in symptoms
        } else {
          // Store PDF context separately to be appended on submit
          setUploadedFileText(text);
        }
      } else {
        alert("The file was parsed, but no text content was found.");
      }
    } catch (err: any) {
      console.error(err);
      setError(`File upload parsing error: ${err.message}`);
    } finally {
      setFileParsing(false);
    }
  };

  // Handle RAG Reference Upload
  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReferenceParsing(true);
    setReferenceUploadMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-reference", {
        method: "POST",
        body: formData
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to upload reference");

      setReferenceUploadMessage(`✅ ${file.name} successfully indexed into Vector DB (${resData.chunksIndexed} chunks).`);
    } catch (err: any) {
      console.error(err);
      setReferenceUploadMessage(`❌ Upload error: ${err.message}`);
    } finally {
      setReferenceParsing(false);
    }
  };

  const handleCheckboxChange = (
    symptom: string, 
    list: string[], 
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(symptom)) {
      setList(list.filter(item => item !== symptom));
    } else {
      setList([...list, symptom]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Combine symptoms list
    let fullSymptomDescription = symptoms.trim();
    if (uploadedFileText) {
      fullSymptomDescription += `\\n\\n[Uploaded PDF context]:\\n${uploadedFileText}`;
    }

    if (!fullSymptomDescription && primarySymptoms.length === 0 && secondarySymptoms.length === 0) {
      setError("Please select at least one symptom or describe your symptoms.");
      return;
    }

    if (!age || !gender || !duration) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: fullSymptomDescription || `Patient reports: ${[...primarySymptoms, ...secondarySymptoms].join(", ")}`,
          age,
          gender,
          duration,
          existingConditions,
          language: selectedLanguage,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          painLevel: parseInt(painLevel),
          currentMedications,
          allergies,
          pregnancyStatus: gender === "Female" ? pregnancyStatus : "N/A",
          primarySymptoms,
          secondarySymptoms,
          city: city || ""
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to analyze symptoms");
      }

      // Redirect to assessment details page
      router.push(`/dashboard/assessments/${resData.assessmentId}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "1rem" }}>
        <div className="spinner" style={{ width: "2rem", height: "2rem", borderTopColor: "var(--primary-color)" }}></div>
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading dashboard...</p>
      </div>
    );
  }

  // Get active UI translation strings
  const t = uiTranslations[selectedLanguage] || uiTranslations.en;

  // Calculate statistics
  const totalAssessments = data?.assessments.length || 0;
  const mildAssessments = data?.assessments.filter((a) => a.severity.toLowerCase() === "mild").length || 0;
  const moderateAssessments = data?.assessments.filter((a) => a.severity.toLowerCase() === "moderate").length || 0;
  const severeAssessments = data?.assessments.filter((a) => a.severity.toLowerCase() === "severe").length || 0;

  const recentAssessments = data?.assessments.slice(0, 3) || [];

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div style={{
        padding: "2rem",
        background: "linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-color)",
        marginBottom: "2rem",
      }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          {t.welcome}, {data?.user.fullName || "User"}!
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, maxWidth: "800px" }}>
          {t.subtitle}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2.5rem",
      }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
          <div style={{ fontSize: "2rem" }}>📋</div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{totalAssessments}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>{t.totalAssessments}</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
          <div style={{ fontSize: "2rem" }}>🟢</div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{mildAssessments}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>{t.mildCases}</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
          <div style={{ fontSize: "2rem" }}>🟡</div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{moderateAssessments}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>{t.moderateCases}</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
          <div style={{ fontSize: "2rem" }}>🔴</div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{severeAssessments}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>{t.severeCases}</div>
          </div>
        </div>
      </div>

      {/* Symptom Checker Form & Sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginBottom: "2.5rem" }}>
        
        {/* Symptom Checker Card */}
        <div className="card" style={{ padding: "2rem" }}>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🤖</span> {t.checkTitle}
          </h3>

          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Primary / Secondary Checklists */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Primary Symptoms (Select all that apply)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {["Fever", "Headache", "Chest Pain", "Cough", "Vomiting", "Dizziness", "Shortness of Breath"].map(sym => (
                    <label key={sym} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={primarySymptoms.includes(sym)}
                        onChange={() => handleCheckboxChange(sym, primarySymptoms, setPrimarySymptoms)}
                        style={{ accentColor: "var(--primary-color)", width: "16px", height: "16px" }}
                      />
                      {sym}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Secondary Symptoms (Select all that apply)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {["Sore Throat", "Runny Nose", "Fatigue", "Skin Rash", "Body Aches", "Chills", "Nausea", "Diarrhea", "Abdominal Pain", "Joint/Muscle Pain"].map(sym => (
                    <label key={sym} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={secondarySymptoms.includes(sym)}
                        onChange={() => handleCheckboxChange(sym, secondarySymptoms, setSecondarySymptoms)}
                        style={{ accentColor: "var(--primary-color)", width: "16px", height: "16px" }}
                      />
                      {sym}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Symptoms Textarea */}
            <div className="form-group">
              <label className="form-label">{t.symptomsLabel} *</label>
              <div style={{ position: "relative" }}>
                <textarea
                  className="form-input"
                  style={{ minHeight: "100px", paddingRight: "3rem", resize: "vertical" }}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder={t.symptomsPlaceholder}
                  required={primarySymptoms.length === 0 && secondarySymptoms.length === 0}
                />
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  style={{
                    position: "absolute",
                    right: "10px",
                    bottom: "10px",
                    background: isListening ? "var(--primary-light)" : "var(--border-color)",
                    border: isListening ? "1px solid var(--primary-color)" : "none",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "1rem",
                    transition: "var(--transition)",
                  }}
                  title={isListening ? "Listening... click to stop" : "Use voice input"}
                >
                  {isListening ? "🎙️" : "🎤"}
                </button>
              </div>
            </div>

            {/* OCR Upload Dropzone */}
            <div className="form-group">
              <label className="form-label">Medical Report / Prescription OCR Upload</label>
              <div 
                style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: "var(--bg-color)",
                  transition: "var(--transition)",
                }}
                onClick={() => document.getElementById("clinical-upload")?.click()}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  {fileParsing ? "⌛" : "📤"}
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  {fileParsing ? "Extracting text using AI OCR..." : "Upload Clinical Report, Prescription (PDF/PNG/JPG)"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Tesseract OCR will scan the document and auto-append medical terms to your notes.
                </div>
                {parsedFileName && (
                  <div style={{ fontSize: "0.75rem", color: "var(--primary-color)", fontWeight: "bold", marginTop: "0.5rem" }}>
                    Selected File: {parsedFileName}
                  </div>
                )}
                <input
                  id="clinical-upload"
                  type="file"
                  accept="image/*, application/pdf"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {/* Custom RAG Reference Upload Dropzone */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Medical Reference Guideline PDF Upload (Local Vector DB / Clinical RAG)</label>
              <div 
                style={{
                  border: "2px dashed var(--primary-light-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: "var(--primary-light)",
                  transition: "var(--transition)",
                }}
                onClick={() => document.getElementById("reference-upload")?.click()}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  {referenceParsing ? "⚙️" : "📚"}
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary-color)" }}>
                  {referenceParsing ? "Analyzing and indexing to Vector DB..." : "Upload Clinical Reference (PDF/Image) to RAG"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  This will parse clinical reference documents and store them in the offline vector space.
                </div>
                {referenceUploadMessage && (
                  <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginTop: "0.5rem", color: "var(--text-color)" }}>
                    {referenceUploadMessage}
                  </div>
                )}
                <input
                  id="reference-upload"
                  type="file"
                  accept="image/*, application/pdf"
                  onChange={handleReferenceUpload}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {/* Vitals Form Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="age">{t.ageLabel} *</label>
                <input
                  type="number"
                  id="age"
                  className="form-input"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                  min="1"
                  max="120"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="gender">{t.genderLabel} *</label>
                <select
                  id="gender"
                  className="form-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">{t.genderMale}</option>
                  <option value="Female">{t.genderFemale}</option>
                  <option value="Other">{t.genderOther}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="weight">Weight (kg)</label>
                <input
                  type="number"
                  id="weight"
                  className="form-input"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 70"
                  min="5"
                  max="300"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="height">Height (cm)</label>
                <input
                  type="number"
                  id="height"
                  className="form-input"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 175"
                  min="50"
                  max="250"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="painLevel">
                  Pain Level (1-10): <span style={{ color: "var(--primary-color)", fontWeight: "bold" }}>{painLevel}</span>
                </label>
                <input
                  type="range"
                  id="painLevel"
                  min="1"
                  max="10"
                  step="1"
                  value={painLevel}
                  onChange={(e) => setPainLevel(e.target.value)}
                  style={{ width: "100%", accentColor: "var(--primary-color)" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="duration">{t.durationLabel} *</label>
                <select
                  id="duration"
                  className="form-input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="1-2 days">1-2 days</option>
                  <option value="3-5 days">3-5 days</option>
                  <option value="1+ weeks">1+ weeks</option>
                  <option value="1+ months">1+ months</option>
                </select>
              </div>

              {/* Conditional Pregnancy Field */}
              {gender === "Female" ? (
                <div className="form-group">
                  <label className="form-label" htmlFor="pregnancy">Are you pregnant?</label>
                  <select
                    id="pregnancy"
                    className="form-input"
                    value={pregnancyStatus}
                    onChange={(e) => setPregnancyStatus(e.target.value)}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="Unsure">Unsure</option>
                  </select>
                </div>
              ) : (
                <div className="form-group" style={{ opacity: 0.5, pointerEvents: "none" }}>
                  <label className="form-label">Pregnancy Status</label>
                  <select className="form-input" disabled value="N/A">
                    <option value="N/A">N/A (Not Female)</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="language">{t.languageLabel}</label>
                <select
                  id="language"
                  className="form-input"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  <option value="en">English (English)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="fr">Français (French)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="city">Your City (for doctor recommendations)</label>
                <input
                  type="text"
                  id="city"
                  className="form-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai, New York, London"
                />
              </div>
            </div>

            {/* Medical History */}
            <div className="form-group">
              <label className="form-label">{t.conditionsLabel}</label>
              <textarea
                className="form-input"
                style={{ minHeight: "60px", resize: "vertical" }}
                value={existingConditions}
                onChange={(e) => setExistingConditions(e.target.value)}
                placeholder={t.conditionsPlaceholder}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Current Medications</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="e.g. Aspirin, Metformin"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Known Allergies</label>
                <input
                  type="text"
                  className="form-input"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || fileParsing}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", marginTop: "1rem" }}
            >
              {submitting ? (
                <>
                  <span className="spinner"></span>
                  {t.submitting}
                </>
              ) : t.submitBtn}
            </button>
          </form>
        </div>

        {/* Sidebar Info Panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{
              width: "70px",
              height: "70px",
              fontSize: "2rem",
              margin: "0 auto 1rem",
              borderRadius: "50%",
              backgroundColor: "var(--primary-light)",
              color: "var(--primary-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
            }}>
              {data?.user.fullName.split(" ").map(p => p[0]).join("").toUpperCase().substring(0, 2) || "U"}
            </div>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>{data?.user.fullName}</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{data?.user.email}</p>
            <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "1rem 0" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.8rem" }}>
              <div style={{ textAlign: "left", padding: "0.5rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Tier</div>
                <div style={{ fontWeight: 700, color: "var(--primary-color)" }}>Standard</div>
              </div>
              <div style={{ textAlign: "left", padding: "0.5rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Engine</div>
                <div style={{ fontWeight: 700, color: "var(--success-color)" }}>Live Gemini</div>
              </div>
            </div>
          </div>
          
          <div className="card" style={{ padding: "1.5rem" }}>
            <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.9rem", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Medical Disclaimer
            </h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: "0.75rem" }}>
              This portal provides AI-powered assessments for information purposes only. It does not replace professional clinical diagnosis.
            </p>
            <span style={{ fontSize: "0.75rem", color: "var(--primary-color)", fontWeight: 700 }}>🚨 Emergency: Call 911 or 112 immediately if chest pain or shortness of breath occurs.</span>
          </div>
        </div>

      </div>

      {/* Recent History Table */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{t.recentTitle}</h3>
          {totalAssessments > 3 && (
            <Link href="/dashboard/history" style={{ color: "var(--primary-color)", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
              View All History →
            </Link>
          )}
        </div>

        {recentAssessments.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.conditionCol}</th>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.dateCol}</th>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.severityCol}</th>
                  <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "right" }}>{t.actionCol}</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <div style={{ fontWeight: 600 }}>{a.possibleCondition}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "400px" }}>
                        {a.symptoms}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem" }}>
                      {new Date(a.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <span className={`badge ${
                        a.severity.toLowerCase() === "mild"
                          ? "badge-success"
                          : a.severity.toLowerCase() === "moderate"
                          ? "badge-warning"
                          : "badge-danger"
                      }`}>
                        {a.severity}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                      <Link href={`/dashboard/assessments/${a.id}`} style={{ color: "var(--primary-color)", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                        {t.viewAssessment}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📋</div>
            <p>{t.recentEmpty}</p>
          </div>
        )}
      </div>
    </div>
  );
}
