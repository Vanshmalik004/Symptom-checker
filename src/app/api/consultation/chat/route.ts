import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { GoogleGenAI, Type, Schema } from "@google/genai";

// Robust emergency check function
function checkForEmergencies(
  latestMessage: string,
  gender: string,
  pregnancyStatus: string,
  painLevel: number
): { isEmergency: boolean; advice: string } {
  const query = latestMessage.toLowerCase();

  if (painLevel >= 9) {
    return {
      isEmergency: true,
      advice: "🚨 IMMEDIATE EMERGENCY CARE REQUIRED: Extreme pain level (9+/10) reported. Please call 911 / 112 or visit the nearest emergency room immediately."
    };
  }

  const redFlags = [
    "chest pain", "chest tightness", "chest pressure", "heart attack",
    "difficulty breathing", "shortness of breath", "unable to breathe", "gasping for air",
    "stroke symptoms", "slurred speech", "sudden numbness", "sudden weakness", "facial drooping", "face droop", "paralysis",
    "severe allergic reaction", "anaphylaxis", "throat closing", "swollen tongue",
    "uncontrolled bleeding", "heavy bleeding", "bleeding profusely",
    "loss of consciousness", "passed out", "fainted", "unresponsive", "seizure", "convulsions"
  ];

  const hasRedFlag = redFlags.some(flag => query.includes(flag));
  if (hasRedFlag) {
    return {
      isEmergency: true,
      advice: "🚨 EMERGENCY ALERT: Your symptoms indicate a potentially life-threatening medical emergency. Please call 911 / 112 or go to the nearest emergency room immediately. Do not delay care."
    };
  }

  // Pregnancy-related emergencies
  if (gender === "Female" && (pregnancyStatus === "Yes" || pregnancyStatus === "pregnant")) {
    const pregFlags = ["bleeding", "vaginal bleeding", "severe abdominal pain", "water broke", "ruptured", "cramps"];
    const hasPregFlag = pregFlags.some(flag => query.includes(flag));
    if (hasPregFlag) {
      return {
        isEmergency: true,
        advice: "🤰 HIGH-RISK PREGNANCY ALERT: Severe abdominal pain or vaginal bleeding during pregnancy requires immediate clinical evaluation. Please visit the nearest emergency department or contact your obstetrician immediately."
      };
    }
  }

  return { isEmergency: false, advice: "" };
}

// Offline fallback questionnaire based on turns
const FALLBACK_QUESTIONS = [
  "When exactly did these symptoms start, and have they been constant or coming and going?",
  "Can you describe the character of the pain or discomfort? (e.g., sharp, dull, throbbing, pressure, burning)",
  "Are you experiencing any accompanying symptoms such as fever, chills, nausea, vomiting, dizziness, or sweating?",
  "Have you taken any medications or home remedies for these symptoms, and did they provide any relief?",
  "Have you ever experienced similar symptoms in the past? If so, what was the diagnosis or treatment?"
];

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { messages = [], patientInfo = {}, language = "en" } = body;

    const latestUserMessage = messages[messages.length - 1]?.text || "";
    const gender = patientInfo.gender || "Male";
    const pregnancyStatus = patientInfo.pregnancyStatus || "No";
    const painLevel = parseInt(patientInfo.painLevel) || 5;

    // 3. Run Emergency Check
    const emergency = checkForEmergencies(latestUserMessage, gender, pregnancyStatus, painLevel);
    if (emergency.isEmergency) {
      return NextResponse.json({
        nextQuestion: "",
        emergencyFlag: true,
        emergencyAdvice: emergency.advice,
        hasSufficientInfo: false
      });
    }

    // Determine target language name
    const languageNames: Record<string, string> = {
      en: "English",
      hi: "Hindi",
      es: "Spanish",
      fr: "French"
    };
    const targetLang = languageNames[language] || "English";

    // 4. Try Gemini model for dynamic questioning
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
          You are an empathetic, professional clinical medical triage assistant conducting an intake consultation.
          
          Patient Profile Details:
          - Age: ${patientInfo.age}
          - Gender: ${patientInfo.gender}
          - Pregnancy Status: ${patientInfo.pregnancyStatus || "N/A"}
          - Pain Level: ${patientInfo.painLevel}/10
          - Duration: ${patientInfo.duration}
          - Existing Conditions: ${patientInfo.existingConditions || "None"}
          - Current Medications: ${patientInfo.currentMedications || "None"}
          - Allergies: ${patientInfo.allergies || "None"}
          
          Consultation chat history so far:
          ${messages.map((m: any) => `${m.role === "user" ? "Patient" : "Assistant"}: ${m.text}`).join("\n")}
          
          Instructions:
          1. Formulate the single most relevant and clinical follow-up question in ${targetLang} to narrow down the diagnosis (e.g. asking about pain location, characteristics, or specific associated symptoms).
          2. Check if the user has responded to 4 or more follow-up questions, or if the symptom profile is already very clear. If so, set hasSufficientInfo to true.
          3. Respond strictly in JSON format.
        `;

        const responseSchema: Schema = {
          type: Type.OBJECT,
          properties: {
            nextQuestion: { type: Type.STRING },
            hasSufficientInfo: { type: Type.BOOLEAN }
          },
          required: ["nextQuestion", "hasSufficientInfo"]
        };

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.2
          }
        });

        const resultText = response.text;
        if (resultText) {
          const parsed = JSON.parse(resultText);
          return NextResponse.json({
            nextQuestion: parsed.nextQuestion,
            emergencyFlag: false,
            emergencyAdvice: "",
            hasSufficientInfo: parsed.hasSufficientInfo || messages.filter((m: any) => m.role === "user").length >= 5
          });
        }
      } catch (err) {
        console.error("Gemini API consultation chat failed, falling back to local questionnaire:", err);
      }
    }

    // 5. Offline Fallback Questionnaire
    // Count user turns to determine the next question
    const userTurnCount = messages.filter((m: any) => m.role === "user").length;
    const questionIndex = Math.min(userTurnCount, FALLBACK_QUESTIONS.length - 1);
    let nextQuestion = FALLBACK_QUESTIONS[questionIndex];
    let hasSufficientInfo = userTurnCount >= 5;

    // Local translation helper for fallback
    if (language === "hi") {
      const hiQuestions = [
        "ये लक्षण कब शुरू हुए, और क्या ये लगातार बने हुए हैं या आते-जाते रहते हैं?",
        "क्या आप दर्द या बेचैनी के प्रकार का वर्णन कर सकते हैं? (जैसे तेज, हल्का, धड़कने वाला, दबाव, जलन)?",
        "क्या आपको बुखार, ठंड लगना, मतली, उल्टी, चक्कर आना या पसीना आने जैसे कोई अन्य लक्षण हैं?",
        "क्या आपने इन लक्षणों के लिए कोई दवा या घरेलू उपचार लिया है, और क्या उससे कुछ राहत मिली?",
        "क्या आपने अतीत में भी ऐसे लक्षणों का अनुभव किया है? यदि हां, तो निदान या उपचार क्या था?"
      ];
      nextQuestion = hiQuestions[questionIndex];
    } else if (language === "es") {
      const esQuestions = [
        "¿Cuándo empezaron exactamente estos síntomas y han sido constantes o van y vienen?",
        "¿Puede describir el dolor o malestar? (Ej. agudo, sordo, pulsátil, opresión, ardor)",
        "¿Tiene otros síntomas como fiebre, escalofríos, náuseas, vómitos, mareos o sudoración?",
        "¿Ha tomado medicamentos o remedios caseros, y le dieron algún alivio?",
        "¿Ha tenido síntomas similares antes? Si es así, ¿cuál fue el diagnóstico o tratamiento?"
      ];
      nextQuestion = esQuestions[questionIndex];
    } else if (language === "fr") {
      const frQuestions = [
        "Quand exactement ces symptômes ont-ils commencé, et sont-ils constants ou intermittents?",
        "Pouvez-vous décrire la douleur ou l'inconfort? (Ex. aiguë, sourde, lancinante, pression, brûlure)",
        "Ressentez-vous d'autres symptômes comme de la fièvre, des nausées, des vomissements, des vertiges?",
        "Avez-vous pris des médicaments ou des remèdes de grand-mère, et cela vous a-t-il soulagé?",
        "Avez-vous déjà eu des symptômes similaires? Si oui, quel était le traitement?"
      ];
      nextQuestion = frQuestions[questionIndex];
    }

    return NextResponse.json({
      nextQuestion,
      emergencyFlag: false,
      emergencyAdvice: "",
      hasSufficientInfo
    });

  } catch (error: any) {
    console.error("Consultation Chat Endpoint Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
