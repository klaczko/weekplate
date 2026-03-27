const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server/api`
  : "https://replit.com/api-server/api";

export async function extractRecipeFromUrl(url: string) {
  try {
    const resp = await fetch(`${API_BASE}/ai/extract-recipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function extractIngredientsFromImage(base64: string, mimeType = "image/jpeg") {
  try {
    const resp = await fetch(`${API_BASE}/ai/extract-from-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function extractIngredientsFromText(text: string) {
  try {
    const resp = await fetch(`${API_BASE}/ai/extract-ingredients-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function categorizeRecipe(params: {
  name: string;
  ingredients: string[];
  steps: string[];
}) {
  try {
    const resp = await fetch(`${API_BASE}/ai/categorize-recipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function generateWeekPlan(params: {
  cookingDays: string[];
  fridgeItems: string[];
  preferences: string;
  recipes: { id: string; name: string; category: string; ingredients?: string[] }[];
}) {
  const resp = await fetch(`${API_BASE}/ai/generate-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!resp.ok) return null;
  return await resp.json();
}

export async function generateWeeklyInsight(params: {
  mealsCooked: number;
  daysAway: number;
  nutritionalCoverage: Record<string, number>;
  topRecipes: string[];
}) {
  try {
    const resp = await fetch(`${API_BASE}/ai/insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!resp.ok) return "Keep cooking — every meal at home is a step toward better health.";
    const data = await resp.json();
    return data.text ?? "Keep cooking — every meal at home is a step toward better health.";
  } catch {
    return "Keep cooking — every meal at home is a step toward better health.";
  }
}
