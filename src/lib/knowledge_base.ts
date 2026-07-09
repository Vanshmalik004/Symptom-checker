import fs from "fs";
import path from "path";

export interface MedicalCondition {
  condition: string;
  description: string;
  severity: "Mild" | "Moderate" | "Severe";
  specialty: string;
  advice: string;
  references: string[];
}

export function searchKnowledgeBase(symptomsText: string): MedicalCondition[] {
  try {
    const filePath = path.join(process.cwd(), "src/lib/medical_kb.json");
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = fs.readFileSync(filePath, "utf-8");
    const database: MedicalCondition[] = JSON.parse(rawData);

    const query = symptomsText.toLowerCase();
    const matches: { condition: MedicalCondition; score: number }[] = [];

    for (const item of database) {
      let score = 0;
      const condName = item.condition.toLowerCase();
      const condDesc = item.description.toLowerCase();
      const condAdv = item.advice.toLowerCase();
      const condSpec = item.specialty.toLowerCase();

      // Check condition name matches
      if (query.includes(condName) || condName.includes(query)) {
        score += 10;
      }

      // Check descriptions / keywords
      const keywords = condDesc.split(/\W+/).filter((w) => w.length > 3);
      for (const kw of keywords) {
        if (query.includes(kw)) {
          score += 2;
        }
      }

      // Check for matching symptoms like fever, cough, chest pain
      const matchingTerms = ["fever", "headache", "chest pain", "cough", "vomiting", "dizziness", "shortness of breath"];
      for (const term of matchingTerms) {
        if (query.includes(term) && (condDesc.includes(term) || condAdv.includes(term) || condSpec.includes(term))) {
          score += 3;
        }
      }

      if (score > 0) {
        matches.push({ condition: item, score });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    return matches.map((m) => m.condition);
  } catch (error) {
    console.error("Error searching local knowledge base:", error);
    return [];
  }
}
