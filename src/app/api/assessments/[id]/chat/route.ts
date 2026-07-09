import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { GoogleGenAI } from "@google/genai";
import { analyzeSymptoms } from "@/lib/ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 2. Fetch original assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Ensure user owns this assessment
    if (assessment.userId !== decoded.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let city = "";
    if (assessment.analysisResult) {
      try {
        city = JSON.parse(assessment.analysisResult).city || "";
      } catch (e) {}
    }

    // 3. Parse request body
    const { message } = await request.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message content is empty" }, { status: 400 });
    }

    const history = assessment.chatHistory
      ? JSON.parse(assessment.chatHistory)
      : [];

    let aiReply = "";
    let updatedAssessmentData: any = null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const languageNames: Record<string, string> = {
          en: "English",
          hi: "Hindi",
          es: "Spanish",
          fr: "French"
        };
        const currentLang = languageNames[assessment.language] || "English";

        // Query Gemini to detect new/worsened symptoms and generate a response
        const checkPrompt = `
          You are a clinical AI assistant reviewing a patient's follow-up message in a chat consultation.
          
          Original Consultation Info:
          - Symptoms Reported: "${assessment.symptoms}"
          - Possible Condition: "${assessment.possibleCondition}"
          - Severity: "${assessment.severity}"
          - Specialty: "${assessment.specialty}"
          
          Consultation Chat History:
          ${history.map((m: any) => `${m.role === "user" ? "Patient" : "AI"}: ${m.text}`).join("\n")}
          
          New Patient Message: "${message}"

          Your task:
          1. Determine if the new message reports new/additional symptoms, a change in pain level, or worsening conditions (e.g. "I also have vomiting", "Now I have chest pain", "Pain is 9").
          2. Respond strictly in JSON format with these fields:
          {
            "newSymptomsDetected": true or false,
            "updatedSymptoms": "A revised consolidated string describing all the patient's symptoms so far, incorporating the new details.",
            "responseMessage": "A concise reply (2-3 sentences max) to the user in ${currentLang} addressing their question or noting that their symptoms have changed."
          }
        `;

        const checkResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: checkPrompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        });

        const checkResult = JSON.parse(checkResponse.text || "{}");
        aiReply = checkResult.responseMessage || "";

        if (checkResult.newSymptomsDetected && checkResult.updatedSymptoms) {
          // Rerun symptom analysis with new combined symptoms
          const newAnalysis = await analyzeSymptoms({
            symptoms: checkResult.updatedSymptoms,
            age: assessment.age,
            gender: assessment.gender,
            duration: assessment.duration,
            existingConditions: assessment.existingConditions || "",
            currentMedications: assessment.currentMedications || "",
            allergies: assessment.allergies || "",
            language: assessment.language || "en",
            weight: assessment.weight,
            height: assessment.height,
            painLevel: assessment.painLevel,
            pregnancyStatus: assessment.pregnancyStatus,
            city: city || ""
          });

          updatedAssessmentData = {
            symptoms: checkResult.updatedSymptoms,
            possibleCondition: newAnalysis.possibleConditions[0]?.condition || "Unknown",
            explanation: newAnalysis.possibleConditions[0]?.explanation || "",
            severity: newAnalysis.severity,
            specialty: newAnalysis.specialty,
            healthAdvice: newAnalysis.healthAdvice,
            analysisResult: JSON.stringify({ ...newAnalysis, city }),
          };

          aiReply += `\n\n[Medical Update]: Based on the new symptoms reported, I have updated your clinical assessment report. Your severity is now evaluated as ${newAnalysis.severity}. Please check the report page for details.`;
        }
      } catch (err) {
        console.error("Gemini chatbot call failed, falling back to local chat simulation:", err);
      }
    }

    // Local fallback/simulation if Gemini was not available or failed
    if (!aiReply) {
      const lowerMsg = message.toLowerCase();
      const translations: Record<string, string> = {
        emergency: "You are describing worsening or emergency symptoms. Please seek immediate medical attention or call emergency services (911/112).",
        diet: "For your recovery, it is important to eat a balanced, light diet (such as bananas, rice, toast, and clear broths) and stay very well hydrated.",
        default: "Thank you for the update. Rest as much as possible, monitor your temperature, and seek a doctor if symptoms persist."
      };

      if (
        lowerMsg.includes("vomiting") ||
        lowerMsg.includes("fever") ||
        lowerMsg.includes("cough") ||
        lowerMsg.includes("pain") ||
        lowerMsg.includes("chest")
      ) {
        // Simple local update simulation
        const combinedSymptoms = `${assessment.symptoms} [Update: ${message}]`;
        const newAnalysis = await analyzeSymptoms({
          symptoms: combinedSymptoms,
          age: assessment.age,
          gender: assessment.gender,
          duration: assessment.duration,
          existingConditions: assessment.existingConditions || "",
          currentMedications: assessment.currentMedications || "",
          allergies: assessment.allergies || "",
          language: assessment.language || "en",
          weight: assessment.weight,
          height: assessment.height,
          painLevel: assessment.painLevel,
          pregnancyStatus: assessment.pregnancyStatus,
          city: city || ""
        });

        updatedAssessmentData = {
          symptoms: combinedSymptoms,
          possibleCondition: newAnalysis.possibleConditions[0]?.condition || "Unknown",
          explanation: newAnalysis.possibleConditions[0]?.explanation || "",
          severity: newAnalysis.severity,
          specialty: newAnalysis.specialty,
          healthAdvice: newAnalysis.healthAdvice,
          analysisResult: JSON.stringify({ ...newAnalysis, city }),
        };

        aiReply = `I have noted the new symptoms. Because your symptoms have updated, I have refreshed your analysis report. ${translations.default}`;
      } else if (
        lowerMsg.includes("worst") ||
        lowerMsg.includes("worse") ||
        lowerMsg.includes("emergency") ||
        lowerMsg.includes("critical")
      ) {
        aiReply = translations.emergency;
      } else {
        aiReply = translations.default;
      }
    }

    // 5. Append message history
    const userMsg = {
      role: "user",
      text: message,
      timestamp: new Date().toISOString(),
    };

    const assistantMsg = {
      role: "assistant",
      text: aiReply,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...history, userMsg, assistantMsg];

    // 6. Save back to DB (with updated symptoms if new symptoms were detected)
    await prisma.assessment.update({
      where: { id },
      data: {
        chatHistory: JSON.stringify(updatedHistory),
        ...(updatedAssessmentData || {}),
      },
    });

    // Fetch the final updated assessment to return
    const finalAssessment = await prisma.assessment.findUnique({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      chatHistory: updatedHistory,
      assessment: finalAssessment
        ? {
            ...finalAssessment,
            chatHistory: updatedHistory,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Chat endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
