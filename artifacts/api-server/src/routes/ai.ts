import { Router } from "express";

const router = Router();

const GEMINI_BASE_URL = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const GEMINI_API_KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

async function callGemini(prompt: string, model = "gemini-2.5-flash"): Promise<string> {
  if (!GEMINI_BASE_URL || !GEMINI_API_KEY) {
    throw new Error("Gemini API not configured");
  }
  const resp = await fetch(
    `${GEMINI_BASE_URL}/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    }
  );
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

router.post("/ai/extract-recipe", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });

  const prompt = `Extract recipe information from this URL: ${url}

Return a JSON object with:
{
  "name": "Recipe Name",
  "prepTime": number (minutes),
  "portions": number,
  "category": "salad" | "main" | "side",
  "tags": ["tag1"],
  "categoryTags": ["Mediterranean", "Brazilian"],
  "nutritionalGroups": {
    "leaves": boolean,
    "vegetables": boolean,
    "roots": boolean,
    "animalProtein": boolean,
    "plantProtein": boolean,
    "grains": boolean,
    "dairy": boolean
  },
  "ingredients": [{ "name": "ingredient", "amount": "200", "unit": "g" }],
  "steps": ["Step 1...", "Step 2..."]
}

If you cannot access the URL, make a reasonable recipe based on the URL structure. Return ONLY valid JSON, no markdown.`;

  try {
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/ai/generate-plan", async (req, res) => {
  const { cookingDays, fridgeItems, preferences, recipes } = req.body;

  const recipeList = (recipes ?? [])
    .map((r: any) => `- [${r.id}] ${r.name} (${r.category})`)
    .join("\n");

  const prompt = `You are a meal planner assistant. Generate a week plan using ONLY these recipes from the user's recipe bank.

Cooking days: ${(cookingDays ?? []).join(", ")}
Fridge stock: ${(fridgeItems ?? []).join(", ")}
User wants: ${preferences ?? "balanced and healthy meals"}

Available recipes:
${recipeList}

Rules:
- Only use recipe IDs from the list above
- Each cooking day needs lunch and dinner with slots: salad, main, side
- Optimize for batch cooking (reuse ingredients across days)
- Ensure nutritional variety across the week
- Away/non-cooking days have empty meals and status "away"

Return a JSON object:
{
  "days": {
    "YYYY-MM-DD": {
      "status": "cooking" | "away" | "unplanned",
      "lunch": [
        { "category": "salad", "recipeId": "id or null" },
        { "category": "main", "recipeId": "id or null" },
        { "category": "side", "recipeId": "id or null" }
      ],
      "dinner": [
        { "category": "salad", "recipeId": "id or null" },
        { "category": "main", "recipeId": "id or null" },
        { "category": "side", "recipeId": "id or null" }
      ]
    }
  }
}

Return ONLY the JSON, no markdown.`;

  try {
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/ai/insight", async (req, res) => {
  const { mealsCooked, daysAway, nutritionalCoverage, topRecipes } = req.body;

  const prompt = `You are a nutrition coach. Generate a brief, encouraging weekly meal planning insight.

Stats:
- Meals cooked: ${mealsCooked}
- Days away from home: ${daysAway}
- Nutritional group coverage: ${JSON.stringify(nutritionalCoverage)}
- Most used recipes: ${(topRecipes ?? []).join(", ")}

Write a 2-3 sentence insight that is encouraging, specific to their habits, and gives one actionable tip. Be conversational and warm. No markdown.`;

  try {
    const text = await callGemini(prompt);
    res.json({ text });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
