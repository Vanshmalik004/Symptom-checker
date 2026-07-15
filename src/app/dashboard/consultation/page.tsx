"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export default function InteractiveConsultationPage() {
  const router = useRouter();

  // Step state: 1 = Profile & Vitals Form, 2 = Intake Chat
  const [step, setStep] = useState<number>(1);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [fullName, setFullName] = useState<string>("");

  // Step 1 Form States
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("Male");
  const [pregnancyStatus, setPregnancyStatus] = useState<string>("No");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [painLevel, setPainLevel] = useState<string>("5");
  const [duration, setDuration] = useState<string>("1-2 days");
  const [city, setCity] = useState<string>("");
  const [existingConditions, setExistingConditions] = useState<string>("");
  const [currentMedications, setCurrentMedications] = useState<string>("");
  const [allergies, setAllergies] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");

  // Step 2 Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hello! I am your clinical triage assistant. To help me evaluate your symptoms, please describe what you are experiencing in detail.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Emergency Flags
  const [emergencyAlert, setEmergencyAlert] = useState<{ active: boolean; advice: string }>({
    active: false,
    advice: ""
  });
  const [hasSufficient, setHasSufficient] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user details to check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setFullName(data.user.fullName);
      } catch (err) {
        console.error(err);
        router.push("/login");
      } finally {
        setLoadingProfile(false);
      }
    };
    checkAuth();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice Input Speech Recognition
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

    const locales: Record<string, string> = {
      en: "en-US",
      hi: "hi-IN",
      es: "es-ES",
      fr: "fr-FR"
    };
    recognition.lang = locales[language] || "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
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

  // Submit Vitals and go to step 2
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || isNaN(parseInt(age)) || parseInt(age) <= 0 || parseInt(age) > 120) {
      setErrorMessage("Please enter a valid age.");
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  // User submits a chat response
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = chatInput.trim();
    if (!userText || sendingMessage || emergencyAlert.active) return;

    setChatInput("");
    setSendingMessage(true);
    setErrorMessage(null);

    const newUserMessage: ChatMessage = {
      role: "user",
      text: userText,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    try {
      const response = await fetch("/api/consultation/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          patientInfo: {
            age: parseInt(age),
            gender,
            weight: weight ? parseFloat(weight) : null,
            height: height ? parseFloat(height) : null,
            painLevel: parseInt(painLevel),
            duration,
            city,
            existingConditions,
            currentMedications,
            allergies,
            pregnancyStatus: gender === "Female" ? pregnancyStatus : "N/A"
          },
          language
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to process chat response.");
      }

      if (resData.emergencyFlag) {
        setEmergencyAlert({
          active: true,
          advice: resData.emergencyAdvice
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: resData.emergencyAdvice,
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: resData.nextQuestion,
            timestamp: new Date().toISOString()
          }
        ]);
        setHasSufficient(resData.hasSufficientInfo);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred. Please try again.");
      // Remove last user message on failure to allow retry
      setMessages((prev) => prev.slice(0, -1));
      setChatInput(userText);
    } finally {
      setSendingMessage(false);
    }
  };

  // Compile full assessment and create DB record
  const handleGenerateAssessment = async () => {
    if (generatingReport) return;
    setGeneratingReport(true);
    setErrorMessage(null);

    // Compile dialogue history into symptoms field
    const userInputs = messages.filter(m => m.role === "user").map(m => m.text);
    const initialSymptoms = userInputs[0] || "No description provided.";
    
    let combinedSymptomString = `Initial Symptoms: ${initialSymptoms}\n\nIntake Consultation Conversation:\n`;
    
    let userIndex = 0;
    messages.forEach((m) => {
      if (m.role === "assistant") {
        combinedSymptomString += `Doctor Assistant: "${m.text}"\n`;
      } else {
        combinedSymptomString += `Patient: "${m.text}"\n`;
        userIndex++;
      }
    });

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: combinedSymptomString,
          age,
          gender,
          duration,
          existingConditions,
          language,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          painLevel: parseInt(painLevel),
          currentMedications,
          allergies,
          pregnancyStatus: gender === "Female" ? pregnancyStatus : "N/A",
          primarySymptoms: [],
          secondarySymptoms: [],
          city
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to finalize consultation report.");
      }

      // Redirect to report
      router.push(`/dashboard/assessments/${resData.assessmentId}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Could not generate clinical report.");
      setGeneratingReport(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex-center" style={{ minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "1rem" }}>
        <div className="spinner" style={{ width: "2rem", height: "2rem", borderTopColor: "var(--primary-color)" }}></div>
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Initializing Clinical Triage Portal...</p>
      </div>
    );
  }

  // Count user inputs in step 2
  const userTurnsCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto" }}>
      
      {/* Navigation Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <Link href="/dashboard" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Back to Dashboard
        </Link>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Patient: <strong style={{ color: "var(--text-color)" }}>{fullName}</strong>
        </span>
      </div>

      {errorMessage && (
        <div className="error-box" style={{ marginBottom: "1.5rem" }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: Vitals & Profile intake */}
      {step === 1 && (
        <div className="card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--primary-color)" }}>
            Step 1: Patient Profile & Intake Vitals
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Please fill in your basic health profile and current vitals to initiate your interactive symptom consultation.
          </p>

          <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              
              <div className="form-group">
                <label className="form-label" htmlFor="age">Age (in years) *</label>
                <input
                  type="number"
                  id="age"
                  className="form-input"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 35"
                  min="1"
                  max="120"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="gender">Gender *</label>
                <select
                  id="gender"
                  className="form-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Prefer not to say</option>
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
                  placeholder="e.g. 170"
                  min="50"
                  max="250"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="painLevel">
                  Pain Scale (1-10): <span style={{ color: "var(--primary-color)", fontWeight: "bold" }}>{painLevel}</span>
                </label>
                <input
                  type="range"
                  id="painLevel"
                  min="1"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(e.target.value)}
                  style={{ width: "100%", accentColor: "var(--primary-color)", marginTop: "0.25rem" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="duration">Symptoms Duration *</label>
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
                <label className="form-label" htmlFor="language">Preferred Assessment Language</label>
                <select
                  id="language"
                  className="form-input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="fr">Français (French)</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" htmlFor="city">Your City (for doctor recommendations)</label>
                <input
                  type="text"
                  id="city"
                  className="form-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangalore, Mumbai, New York"
                />
              </div>

            </div>

            <div className="form-group">
              <label className="form-label">Existing Medical Conditions</label>
              <textarea
                className="form-input"
                style={{ minHeight: "60px", resize: "vertical" }}
                value={existingConditions}
                onChange={(e) => setExistingConditions(e.target.value)}
                placeholder="e.g. Hypertension, Asthma"
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
                  placeholder="e.g. Metformin, Aspirin"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Known Allergies</label>
                <input
                  type="text"
                  className="form-input"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Lactose"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", marginTop: "1rem" }}>
              Start Clinical Intake Chat →
            </button>

          </form>
        </div>
      )}

      {/* Step 2: Interactive Intake Chat */}
      {step === 2 && (
        <div className="card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", minHeight: "550px" }}>
          
          {/* Chat Header */}
          <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>🩺</span> Clinical Intake Consultation
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Answer the clinical triage questions. The AI will formulate your differential diagnosis based on details gathered.
              </p>
            </div>
            
            {/* Question intake indicator */}
            {!emergencyAlert.active && (
              <div style={{ padding: "0.35rem 0.75rem", backgroundColor: "var(--primary-light)", borderRadius: "var(--radius-sm)", border: "1px solid var(--primary-light-border)", fontSize: "0.8rem", fontWeight: 700, color: "var(--primary-color)" }}>
                Question {userTurnsCount} of 5
              </div>
            )}
          </div>

          {/* Messages Display */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1.25rem",
            paddingRight: "0.5rem",
            maxHeight: "350px",
            minHeight: "250px"
          }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isUser ? "var(--primary-color)" : "var(--bg-color)",
                    border: isUser ? "none" : "1px solid var(--border-color)",
                    color: isUser ? "#ffffff" : "var(--text-color)",
                    fontSize: "0.9rem",
                    lineHeight: 1.45,
                    boxShadow: "var(--shadow-sm)"
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem", marginLeft: isUser ? "0" : "0.25rem", marginRight: isUser ? "0.25rem" : "0" }}>
                    {isUser ? "Patient (You)" : "Doctor Assistant"}
                  </span>
                </div>
              );
            })}

            {sendingMessage && (
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
                  <span className="animate-pulse">⏳ Evaluating response...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Emergency High Priority warning block */}
          {emergencyAlert.active && (
            <div style={{
              backgroundColor: "#fee2e2",
              border: "2px solid #ef4444",
              color: "#b91c1c",
              padding: "1.25rem",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "0.9rem",
              marginBottom: "1.25rem",
              boxShadow: "var(--shadow-md)"
            }}>
              <div>⚠️ {emergencyAlert.advice}</div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <Link href="/dashboard" className="btn btn-secondary" style={{ color: "#0f172a", textDecoration: "none", fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleGenerateAssessment}
                  className="btn btn-primary"
                  style={{ backgroundColor: "#ef4444", border: "none", fontSize: "0.8rem", padding: "0.5rem 1rem" }}
                  disabled={generatingReport}
                >
                  {generatingReport ? "Creating Alert Report..." : "Generate Emergency Report"}
                </button>
              </div>
            </div>
          )}

          {/* Consultation Chat input form */}
          {!emergencyAlert.active && (
            <form onSubmit={handleSendChatMessage} style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: "100%", paddingRight: "3rem" }}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe details regarding your symptoms here..."
                  disabled={sendingMessage || generatingReport}
                  required
                />
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: isListening ? "var(--primary-light)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                  title={isListening ? "Listening... click to stop" : "Speak your symptoms"}
                >
                  {isListening ? "🎙️" : "🎤"}
                </button>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingMessage || generatingReport || !chatInput.trim()}
                style={{ padding: "0.75rem 1.25rem" }}
              >
                Send
              </button>
            </form>
          )}

          {/* Step 2 Finish Consultation Button bar */}
          {!emergencyAlert.active && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {hasSufficient ? "✅ AI clinical assistant has enough details to run diagnostics." : "💡 Tip: Answer at least 3-4 questions for a detailed report."}
              </span>
              
              <button
                type="button"
                onClick={handleGenerateAssessment}
                className={`btn ${hasSufficient ? "btn-primary" : "btn-secondary"}`}
                disabled={generatingReport || userTurnsCount === 0}
                style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem" }}
              >
                {generatingReport ? (
                  <>
                    <span className="spinner" style={{ marginRight: "0.5rem" }}></span>
                    Analyzing...
                  </>
                ) : (
                  "Generate Report Now"
                )}
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
