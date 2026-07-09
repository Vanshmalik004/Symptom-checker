import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { analyzeSymptoms } from "@/lib/ai";

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
    const {
      symptoms,
      age,
      gender,
      duration,
      existingConditions,
      language,
      weight,
      height,
      painLevel,
      currentMedications,
      allergies,
      pregnancyStatus,
      primarySymptoms = [],
      secondarySymptoms = [],
      city = ""
    } = body;

    // Validation
    if (!symptoms || !age || !gender || !duration) {
      return NextResponse.json(
        { error: "Symptoms, Age, Gender, and Duration are required fields" },
        { status: 400 }
      );
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
      return NextResponse.json({ error: "Please enter a valid age" }, { status: 400 });
    }

    const parsedWeight = weight ? parseFloat(weight) : null;
    const parsedHeight = height ? parseFloat(height) : null;
    const parsedPainLevel = painLevel ? parseInt(painLevel) : null;

    // 3. Analyze symptoms using our AI / fallback engine
    const analysis = await analyzeSymptoms({
      symptoms,
      age: parsedAge,
      gender,
      duration,
      existingConditions: existingConditions || "",
      currentMedications: currentMedications || "",
      allergies: allergies || "",
      language: language || "en",
      weight: parsedWeight,
      height: parsedHeight,
      painLevel: parsedPainLevel,
      pregnancyStatus: pregnancyStatus || null,
      city: city || "",
      primarySymptoms,
      secondarySymptoms
    });

    // 4. Store assessment in DB
    const assessment = await prisma.assessment.create({
      data: {
        userId: decoded.userId,
        symptoms,
        age: parsedAge,
        gender,
        weight: parsedWeight,
        height: parsedHeight,
        painLevel: parsedPainLevel,
        currentMedications: currentMedications || null,
        allergies: allergies || null,
        pregnancyStatus: pregnancyStatus || null,
        primarySymptoms: JSON.stringify(primarySymptoms),
        secondarySymptoms: JSON.stringify(secondarySymptoms),
        analysisResult: JSON.stringify({ ...analysis, city: city || "" }),
        duration,
        existingConditions: existingConditions || null,
        possibleCondition: analysis.possibleConditions[0]?.condition || "Unknown",
        explanation: analysis.possibleConditions[0]?.explanation || "",
        severity: analysis.severity,
        specialty: analysis.specialty,
        healthAdvice: analysis.healthAdvice,
        language: language || "en",
        chatHistory: JSON.stringify([]), // Initialize empty chat history
      },
    });

    return NextResponse.json({
      success: true,
      assessmentId: assessment.id,
      assessment,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST assessment error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze symptoms" }, { status: 500 });
  }
}

export async function GET(request: Request) {
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

    // Parse query params for search and filters
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const search = searchParams.get("search");

    // Build filter clause
    const whereClause: any = {
      userId: decoded.userId,
    };

    if (severity && severity !== "all") {
      whereClause.severity = {
        equals: severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase(), // e.g., "Mild", "Moderate", "Severe"
      };
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { symptoms: { contains: search } },
        { possibleCondition: { contains: search } },
        { specialty: { contains: search } },
      ];
    }

    // Get assessments sorted by creation date
    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      assessments: assessments.map((a: any) => ({
        ...a,
        chatHistory: a.chatHistory ? JSON.parse(a.chatHistory) : [],
      })),
    });
  } catch (error) {
    console.error("Fetch assessments endpoint error:", error);
    return NextResponse.json({ error: "Failed to fetch assessment history" }, { status: 500 });
  }
}
