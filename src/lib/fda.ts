export interface FDADrugInfo {
  brandName: string;
  genericName?: string;
  warnings?: string;
  adverseEffects?: string;
  indicationsAndUsage?: string;
}

export async function fetchDrugWarnings(medicationName: string): Promise<FDADrugInfo | null> {
  if (!medicationName || !medicationName.trim()) {
    return null;
  }

  const query = encodeURIComponent(medicationName.trim());
  const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${query}"+openfda.generic_name:"${query}"&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`FDA API failed to find drug info for: ${medicationName}`);
      return null;
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const brandName = result.openfda?.brand_name?.[0] || medicationName;
    const genericName = result.openfda?.generic_name?.[0] || "";
    
    // Extract key sections (OpenFDA labels return array of strings)
    const warnings = result.warnings?.[0] || result.warnings_and_precautions?.[0] || "";
    const adverseEffects = result.adverse_reactions?.[0] || "";
    const indicationsAndUsage = result.indications_and_usage?.[0] || "";

    return {
      brandName,
      genericName,
      warnings: warnings.slice(0, 500) + (warnings.length > 500 ? "..." : ""),
      adverseEffects: adverseEffects.slice(0, 500) + (adverseEffects.length > 500 ? "..." : ""),
      indicationsAndUsage: indicationsAndUsage.slice(0, 500) + (indicationsAndUsage.length > 500 ? "..." : "")
    };
  } catch (error) {
    console.error("OpenFDA fetch error:", error);
    return null;
  }
}
