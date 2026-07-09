import { GoogleGenAI, Type, Schema } from "@google/genai";
import { searchVectorDB, SearchableDoc } from "./vector_db";
import { fetchDrugWarnings } from "./fda";
import fs from "fs";
import path from "path";

export interface PatientCase {
  symptoms: string;
  age: number;
  gender: string;
  duration: string;
  existingConditions: string;
  currentMedications: string;
  allergies: string;
  language: string;
  weight?: number | null;
  height?: number | null;
  painLevel?: number | null;
  pregnancyStatus?: string | null;
  city?: string | null;
  primarySymptoms?: string[];
  secondarySymptoms?: string[];
}

export interface PossibleCondition {
  condition: string;
  confidence: number;
  explanation: string;
  supportingSymptoms: string; // Explains why it matches the patient's symptoms
}

export interface SymptomAnalysis {
  possibleConditions: PossibleCondition[];
  severity: "Mild" | "Moderate" | "Severe";
  specialty: string;
  healthAdvice: string;
  references: string[];
  recommendedDoctors?: string;
  suggestedQuestions?: string[];
  emergencyContacts?: string;
  vitalsMetrics?: {
    bmi?: number;
    bmiCategory?: string;
  };
}

export const disclaimerTranslations: Record<string, string> = {
  en: "This assessment is AI-generated and should not be considered a medical diagnosis. Please consult a licensed healthcare professional for proper evaluation and treatment.",
  hi: "यह मूल्यांकन एआई-जनित है और इसे चिकित्सा निदान नहीं माना जाना चाहिए। कृपया उचित मूल्यांकन और उपचार के लिए एक लाइसेंस प्राप्त स्वास्थ्य सेवा पेशेवर से परामर्श लें।",
  es: "Esta evaluación es generada por IA y no debe considerarse un diagnóstico médico. Consulte a un profesional de la salud con licencia para una evaluación y tratamiento adecuados.",
  fr: "Cette évaluation est générée par l'IA et ne doit pas être considérée como un diagnostic médical. Veuillez consulter un professionnel de la santé qualifié pour une évaluation et un traitement appropriés."
};

// Check for emergency triggers (Double-lock safety logic)
function checkSafetyOverrides(
  symptomsText: string,
  currentSeverity: "Mild" | "Moderate" | "Severe",
  painLevel: number | null
): { severity: "Mild" | "Moderate" | "Severe"; redFlag: boolean; emergencyAdvice: string } {
  const query = symptomsText.toLowerCase();
  
  const severeTriggers = [
    "chest pain",
    "difficulty breathing",
    "shortness of breath",
    "slurred speech",
    "sudden numbness",
    "paralysis",
    "severe head injury",
    "unconscious",
    "seizure",
    "heavy bleeding",
    "poisoning",
    "loss of consciousness"
  ];

  const hasSevereTrigger = severeTriggers.some((trigger) => query.includes(trigger));
  const isHighPain = painLevel !== null && painLevel >= 9;

  if (hasSevereTrigger || isHighPain) {
    return {
      severity: "Severe",
      redFlag: true,
      emergencyAdvice: "🚨 IMMEDIATE MEDICAL ATTENTION RECOMMENDED: Critical symptom patterns or extreme pain levels detected. Please contact emergency medical services (911/112) or go to the nearest emergency room immediately. Do not delay care."
    };
  }

  return {
    severity: currentSeverity,
    redFlag: false,
    emergencyAdvice: ""
  };
}

// Generate Emergency Contacts based on City/Language
function getEmergencyContacts(city: string | null, lang: string): string {
  const c = (city || "").toLowerCase();
  if (c.includes("delhi") || c.includes("mumbai") || c.includes("bangalore") || c.includes("india")) {
    return "India: Ambulance 102, National Emergency Number 112, Police 100";
  }
  if (c.includes("london") || c.includes("uk") || c.includes("united kingdom")) {
    return "United Kingdom: emergency services 999 or 111 (non-emergency NHS)";
  }
  if (c.includes("paris") || c.includes("france")) {
    return "France: SAMU 15, European Emergency Number 112";
  }
  // Default US/Global
  return "United States & Canada: Emergency Services 911. International: 112 or your local emergency services.";
}

// Recommend specific clinics/doctors based on city and recommended specialty
function getDoctorRecommendations(city: string | null, specialty: string): string {
  const cleanCity = (city || "").trim();
  if (!cleanCity) {
    return `Please consult a specialist in ${specialty} at your nearest multi-specialty hospital or medical clinic.`;
  }

  const recommendations: Record<string, Record<string, string[]>> = {
    delhi: {
      "General Physician": ["Max Super Speciality Hospital, Saket", "Fortis Flt. Lt. Rajan Dhall Hospital, Vasant Kunj"],
      "Cardiologist": ["Fortis Escorts Heart Institute, Okhla", "Indraprastha Apollo Hospitals, Sarita Vihar"],
      "Neurologist": ["All India Institute of Medical Sciences (AIIMS)", "Medanta - The Medicity, Gurugram (NCR)"],
      "Pulmonologist": ["Vallabhbhai Patel Chest Institute", "Apollo Hospitals, Jasola"],
      "Dermatologist": ["Dr. Ram Manohar Lohia Hospital", "Skin Alive Clinic, Greater Kailash"],
      "Gastroenterologist": ["ILBS Hospital, Vasant Kunj", "Sir Ganga Ram Hospital, Rajinder Nagar"],
      "Gynecologist": ["Safdarjung Hospital", "Moolchand Medcity, Lajpat Nagar"]
    },
    mumbai: {
      "General Physician": ["Hinduja Hospital, Mahim", "Kokilaben Dhirubhai Ambani Hospital, Andheri"],
      "Cardiologist": ["Asian Heart Institute, Bandra Kurla Complex", "Jaslok Hospital, Pedder Road"],
      "Neurologist": ["KEM Hospital, Parel", "Bombay Hospital, Marine Lines"],
      "Pulmonologist": ["Lilavati Hospital & Research Centre, Bandra", "H.N. Reliance Foundation Hospital"],
      "Dermatologist": ["Tata Memorial Hospital, Parel", "Kaya Skin Clinic, Juhu"],
      "Gastroenterologist": ["Global Hospitals, Parel", "Nanavati Super Speciality Hospital, Vile Parle"],
      "Gynecologist": ["Wadia Maternity Hospital, Parel", "Breach Candy Hospital"]
    },
    "new york": {
      "General Physician": ["Mount Sinai Doctors Midtown", "NYU Langone Ambulatory Care"],
      "Cardiologist": ["NewYork-Presbyterian / Columbia University Medical Center", "Mount Sinai Heart"],
      "Neurologist": ["NYU Langone Comprehensive Epilepsy Center", "Columbia Doctors Neurology"],
      "Pulmonologist": ["Weill Cornell Medicine Pulmonology", "Mount Sinai Respiratory Institute"],
      "Dermatologist": ["Schweiger Dermatology Group", "NYU Langone Dermatology"],
      "Gastroenterologist": ["Mount Sinai Gastroenterology", "NYU Langone Gastrointestinal Division"],
      "Gynecologist": ["Presbyterian Weill Cornell Obstetrics", "NYU Langone OB/GYN"]
    }
  };

  const lookupCity = cleanCity.toLowerCase();
  let cityKey = "";
  if (lookupCity.includes("delhi") || lookupCity.includes("ncr")) cityKey = "delhi";
  else if (lookupCity.includes("mumbai") || lookupCity.includes("bombay")) cityKey = "mumbai";
  else if (lookupCity.includes("new york") || lookupCity.includes("ny") || lookupCity.includes("nyc")) cityKey = "new york";

  if (cityKey && recommendations[cityKey]) {
    const list = recommendations[cityKey][specialty] || recommendations[cityKey]["General Physician"];
    return `Based on your location in ${cleanCity}, we recommend consulting: \n- ${list.join("\n- ")}`;
  }

  // Generic recommendation
  return `Local recommendations for ${specialty} in ${cleanCity}:\n- ${specialty} Department at ${cleanCity} General Hospital\n- ${cleanCity} Medical Care Center`;
}

// Retrieve context documents using local vector DB
function getRAGContext(symptoms: string): { contextText: string; references: string[] } {
  const references: string[] = [];
  let searchableDocs: SearchableDoc[] = [];

  // 1. Load medical_kb.json (standard guidelines)
  try {
    const kbPath = path.join(process.cwd(), "src/lib/medical_kb.json");
    if (fs.existsSync(kbPath)) {
      const raw = fs.readFileSync(kbPath, "utf-8");
      const kbData = JSON.parse(raw);
      kbData.forEach((d: any) => {
        searchableDocs.push({
          id: `kb_${d.condition.replace(/\s+/g, "_")}`,
          title: d.condition,
          text: `${d.description}. Symptoms: ${d.condition}. Specialty: ${d.specialty}. Advice: ${d.advice}`,
          source: d.references?.join(", ") || "Clinical Guideline",
          metadata: d
        });
      });
    }
  } catch (e) {
    console.error("Error reading medical_kb.json:", e);
  }

  // 2. Load custom_kb.json (user-uploaded guidelines)
  try {
    const customKbPath = path.join(process.cwd(), "src/lib/custom_kb.json");
    if (fs.existsSync(customKbPath)) {
      const raw = fs.readFileSync(customKbPath, "utf-8");
      const customData = JSON.parse(raw);
      if (Array.isArray(customData)) {
        customData.forEach((d: any) => {
          searchableDocs.push(d);
        });
      }
    }
  } catch (e) {
    console.error("Error reading custom_kb.json:", e);
  }

  // 3. Search vector database
  const searchResults = searchVectorDB(symptoms, searchableDocs, 5);
  
  const contextParts = searchResults.map(res => {
    const d = res.doc;
    if (d.metadata && d.metadata.references) {
      d.metadata.references.forEach((r: string) => {
        if (!references.includes(r)) references.push(r);
      });
    } else if (d.source && !references.includes(d.source)) {
      references.push(d.source);
    }
    return `[Title: ${d.title} (Source: ${d.source})]\nContent: ${d.text}`;
  });

  return {
    contextText: contextParts.join("\n\n"),
    references: references.length > 0 ? references : ["Local Medical Reference Guideline"]
  };
}

export async function analyzeSymptoms(patient: PatientCase): Promise<SymptomAnalysis> {
  const {
    symptoms,
    age,
    gender,
    duration,
    existingConditions = "",
    currentMedications = "",
    allergies = "",
    language = "en",
    weight = null,
    height = null,
    painLevel = null,
    pregnancyStatus = "No",
    city = ""
  } = patient;

  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Fetch Local RAG Context via Vector DB Similarity Search
  const { contextText: ragContext, references: ragReferences } = getRAGContext(symptoms);

  // 2. Fetch OpenFDA Drug Info
  let fdaContext = "";
  const citedReferences = [...ragReferences];
  if (currentMedications && currentMedications.trim()) {
    const meds = currentMedications.split(",").map(m => m.trim());
    for (const med of meds) {
      const info = await fetchDrugWarnings(med);
      if (info) {
        fdaContext += `Drug: ${info.brandName} (${info.genericName || "generic"})\nWarnings: ${info.warnings || "none"}\nAdverse Effects: ${info.adverseEffects || "none"}\n\n`;
      }
    }
    if (fdaContext && !citedReferences.includes("OpenFDA Database")) {
      citedReferences.push("OpenFDA Database");
    }
  }

  // Calculate Vitals BMI if weight and height are provided
  let bmi: number | undefined;
  let bmiCategory: string | undefined;
  if (weight && height) {
    const heightInMeters = height / 100;
    bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 25) bmiCategory = "Normal weight";
    else if (bmi < 30) bmiCategory = "Overweight";
    else bmiCategory = "Obese";
  }

  // 3. AI Analysis with Gemini (if API key exists)
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const languageNames: Record<string, string> = {
        en: "English",
        hi: "Hindi",
        es: "Spanish",
        fr: "French"
      };
      const targetLangName = languageNames[language] || "English";

      const prompt = `
        You are an advanced medical diagnostic decision-support system. Analyze the patient's case and output a structured diagnostic assessment in ${targetLangName}.
        
        Patient Case Intake Info:
        - Age: ${age}
        - Gender: ${gender}
        - Symptoms: ${symptoms}
        - Duration: ${duration}
        - Pain Level: ${painLevel || "Not provided"} / 10
        - Weight: ${weight ? `${weight} kg` : "Not provided"}
        - Height: ${height ? `${height} cm` : "Not provided"}
        - BMI: ${bmi ? `${bmi} (${bmiCategory})` : "Not calculated"}
        - Pregnancy Status: ${gender === "Female" ? pregnancyStatus : "N/A"}
        - City: ${city || "Not provided"}
        - Existing Conditions: ${existingConditions || "None"}
        - Current Medications: ${currentMedications || "None"}
        - Allergies: ${allergies || "None"}

        Local Clinical Reference Guidelines (Vector DB retrieved context):
        ${ragContext || "No local guidelines found for these symptoms."}

        OpenFDA Drug Warnings & Contraindications:
        ${fdaContext || "No drug data found."}

        Instructions:
        1. Formulate the top 3 possible conditions with confidence percentages (0-100), brief descriptions (explanation), and a field "supportingSymptoms" explaining exactly why each condition matches the user's specific symptoms.
        2. Assign a severity level: "Mild", "Moderate", or "Severe".
        3. Recommend a medical specialty department (e.g. General Physician, Cardiologist, Neurologist, Pulmonologist, Dermatologist, Gastroenterologist, Gynecologist, ENT Specialist).
        4. Give detailed self-care advice (healthAdvice), taking any drug warnings, BMI status, existing conditions, or allergies into consideration. Avoid recommending prescription medicines.
        5. Cite references: Include local guideline sources (WHO, CDC, NHS, MedlinePlus) and add "OpenFDA Database" if medications were analyzed.
        6. Provide 3 specific, clickable suggested follow-up questions relevant to this diagnosis.
        7. Recommend clinics/doctors matching their city (${city}) and specialty.
        8. Provide emergency contact suggestions (e.g., 911 / 112) based on their city/country.
        9. Strictly output the result in ${targetLangName}.
      `;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          possibleConditions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                condition: { type: Type.STRING },
                confidence: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                supportingSymptoms: { type: Type.STRING }
              },
              required: ["condition", "confidence", "explanation", "supportingSymptoms"]
            }
          },
          severity: { type: Type.STRING, enum: ["Mild", "Moderate", "Severe"] },
          specialty: { type: Type.STRING },
          healthAdvice: { type: Type.STRING },
          references: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          recommendedDoctors: { type: Type.STRING },
          suggestedQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          emergencyContacts: { type: Type.STRING }
        },
        required: ["possibleConditions", "severity", "specialty", "healthAdvice", "references", "recommendedDoctors", "suggestedQuestions", "emergencyContacts"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.1
        }
      });

      const resultText = response.text;
      if (resultText) {
        const analysis: SymptomAnalysis = JSON.parse(resultText);

        // Apply Double-Lock Safety Override Layer
        const safety = checkSafetyOverrides(symptoms, analysis.severity, painLevel);
        if (safety.redFlag) {
          analysis.severity = "Severe";
          analysis.healthAdvice = `${safety.emergencyAdvice}\n\n${analysis.healthAdvice}`;
          if (!analysis.references.includes("WHO Red Flag Emergency Rules")) {
            analysis.references.push("WHO Red Flag Emergency Rules");
          }
        }

        // Add BMI vitals metrics to JSON
        if (bmi) {
          analysis.vitalsMetrics = { bmi, bmiCategory };
        }

        return analysis;
      }
    } catch (error) {
      console.error("Gemini API call failed, falling back to local engine:", error);
    }
  }

  // 4. Local Fallback Engine (Offline / API key missing / Error)
  const defaultLang = language;
  
  // Reload KB raw docs to parse details
  let rawKbDocs: any[] = [];
  try {
    const kbPath = path.join(process.cwd(), "src/lib/medical_kb.json");
    if (fs.existsSync(kbPath)) {
      rawKbDocs = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to parse fallback raw KB docs", e);
  }

  // Match symptoms text to fallback KB entries using simple term counts
  const query = symptoms.toLowerCase();
  const scoredMatches = rawKbDocs.map(doc => {
    let score = 0;
    const condName = doc.condition.toLowerCase();
    const condDesc = doc.description.toLowerCase();
    
    if (query.includes(condName)) score += 10;
    
    // Count word matches
    const words = query.split(/\W+/).filter(w => w.length > 3);
    words.forEach(w => {
      if (condDesc.includes(w)) score += 2;
    });

    return { doc, score };
  }).filter(item => item.score > 0);

  scoredMatches.sort((a, b) => b.score - a.score);

  const matchedDocs = scoredMatches.map(m => m.doc);
  const possibleConditions: PossibleCondition[] = matchedDocs.slice(0, 3).map((doc, idx) => {
    const conf = idx === 0 ? 85 : idx === 1 ? 60 : 35;
    return {
      condition: doc.condition,
      confidence: conf,
      explanation: doc.description,
      supportingSymptoms: `Patient reports: "${symptoms.slice(0, 60)}${symptoms.length > 60 ? "..." : ""}" which overlaps with clinical signs of ${doc.condition}.`
    };
  });

  // Default fallback if no match
  if (possibleConditions.length === 0) {
    possibleConditions.push({
      condition: "General Health Concern",
      confidence: 65,
      explanation: "Your symptoms do not match our standard diagnostic guidelines database. Requires assessment by a clinical physician.",
      supportingSymptoms: "Symptom description contains general indicators that require physical vital screening."
    });
  }

  const topMatchDoc = matchedDocs[0] || {
    condition: "General Consultation",
    severity: "Mild",
    specialty: "General Physician",
    advice: "Maintain rest, stay hydrated, and monitor symptoms hourly.",
    references: ["Local Clinical RAG Guidelines"]
  };

  let severity: "Mild" | "Moderate" | "Severe" = topMatchDoc.severity;
  let specialty = topMatchDoc.specialty;
  let healthAdvice = topMatchDoc.advice;

  // Add Vitals-aware Advice
  if (bmi) {
    healthAdvice += `\n\n[Vitals Alert]: Your BMI is ${bmi} (${bmiCategory}). Maintain a healthy diet and consult your physician regarding weight management.`;
  }
  if (painLevel && painLevel >= 8) {
    severity = "Severe";
    healthAdvice = `⚠️ [Pain Alert - Level ${painLevel}/10]: Widespread or intense pain reported. Avoid physical stress, and consult a doctor immediately.\n\n${healthAdvice}`;
  }
  if (gender === "Female" && pregnancyStatus === "Yes") {
    healthAdvice = `🤰 [Pregnancy Alert]: Please consult your obstetrician before taking any home remedies or medications. Avoid dehydration.\n\n${healthAdvice}`;
  }

  // Safety Double-lock override
  const safety = checkSafetyOverrides(symptoms, severity, painLevel);
  if (safety.redFlag) {
    severity = "Severe";
    healthAdvice = `${safety.emergencyAdvice}\n\n${healthAdvice}`;
    if (!citedReferences.includes("WHO Red Flag Emergency Rules")) {
      citedReferences.push("WHO Red Flag Emergency Rules");
    }
  }

  // Clinic recommendations based on City
  const recommendedDoctors = getDoctorRecommendations(city, specialty);

  // Suggested follow-up questions
  const suggestedQuestions = [
    `What specific self-care measures are recommended for ${possibleConditions[0].condition}?`,
    `Are there any active medications I should avoid for this condition?`,
    `When should I consult a physical doctor for these symptoms?`
  ];

  const emergencyContacts = getEmergencyContacts(city, defaultLang);

  // Translate to target language for fallback
  if (defaultLang !== "en") {
    if (defaultLang === "hi") {
      specialty = specialty.replace("General Physician", "सामान्य चिकित्सक").replace("Cardiologist", "हृदय रोग विशेषज्ञ");
      healthAdvice = "कृपया ध्यान दें: यह रिपोर्ट एक स्वचालित मूल्यांकन है। अधिक विश्राम लें, पर्याप्त पानी पीते रहें, और यदि लक्षण बने रहें तो तुरंत डॉक्टर से संपर्क करें।";
    } else if (defaultLang === "es") {
      healthAdvice = "Nota: Este es un informe de soporte clínico sintetizado de forma automatizada. Descanse, manténgase hidratado y consulte a un médico si los síntomas empeoran.";
    } else if (defaultLang === "fr") {
      healthAdvice = "Note: Ceci est une évaluation automatisée d'aide à la décision clinique. Veuillez vous reposer, bien vous hydrater et consulter un médecin si les symptômes persistent.";
    }
  }

  return {
    possibleConditions,
    severity,
    specialty,
    healthAdvice,
    references: citedReferences,
    recommendedDoctors,
    suggestedQuestions,
    emergencyContacts,
    vitalsMetrics: bmi ? { bmi, bmiCategory } : undefined
  };
}
