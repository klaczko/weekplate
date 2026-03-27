import { Router } from "express";

const router = Router();

const GEMINI_BASE_URL = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const GEMINI_API_KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

async function callGemini(
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[],
  model = "gemini-2.5-flash"
): Promise<string> {
  if (!GEMINI_BASE_URL || !GEMINI_API_KEY) {
    throw new Error("Gemini API not configured");
  }
  const resp = await fetch(
    `${GEMINI_BASE_URL}/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    }
  );
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

function parseJson(text: string): any {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WeekPlate/1.0; recipe-extractor)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8,es;q=0.7",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await resp.text();
    const stripped = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);
    return stripped;
  } catch {
    return "";
  }
}

router.post("/ai/extract-recipe", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });

  const pageContent = await fetchPageContent(url);

  const prompt = `You are a recipe extraction assistant. The user wants to import a recipe from: ${url}

${pageContent ? `Here is the page content:\n---\n${pageContent}\n---\n` : ""}

Extract the recipe and return a JSON object. The page may be in Portuguese, Spanish, or English — handle all correctly.

{
  "name": "Recipe Name",
  "imageUrl": "photo URL if found, else null",
  "prepTime": number (minutes total),
  "portions": number,
  "category": "salad" | "main" | "side",
  "categoryTags": ["Mediterranean"] or ["Brazilian"] or [],
  "nutritionalGroups": {
    "leaves": boolean,
    "vegetables": boolean,
    "roots": boolean,
    "animalProtein": boolean,
    "plantProtein": boolean,
    "grains": boolean,
    "dairy": boolean
  },
  "ingredients": [{ "name": "ingredient name in English", "amount": "200", "unit": "g" }],
  "steps": ["Step 1...", "Step 2..."]
}

Rules:
- Translate ingredient names to English if needed
- category "salad" = salads/raw dishes, "main" = main courses/proteins, "side" = side dishes/accompaniments
- categoryTags: only "Mediterranean" or "Brazilian" if clearly applicable
- Return ONLY valid JSON, no markdown, no explanation`;

  try {
    const text = await callGemini([{ text: prompt }]);
    const data = parseJson(text);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/ai/extract-from-image", async (req, res) => {
  const { base64, mimeType = "image/jpeg" } = req.body;
  if (!base64) return res.status(400).json({ error: "base64 required" });

  const prompt = `Look at this image of a fridge, pantry, or ingredients. List all the food ingredients you can identify.

The user may have ingredients written or visible in Portuguese, Spanish, or English — handle all.

Return a JSON object:
{ "ingredients": ["ingredient1", "ingredient2", ...] }

Return ingredient names in the language they appear (do not translate). Return ONLY valid JSON, no markdown.`;

  try {
    const text = await callGemini([
      { text: prompt },
      { inlineData: { mimeType, data: base64 } },
    ]);
    const data = parseJson(text);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/ai/extract-ingredients-text", async (req, res) => {
  const { text: inputText } = req.body;
  if (!inputText) return res.status(400).json({ error: "text required" });

  const prompt = `The user has described ingredients they have at home. The text may be in Portuguese, Spanish, or English.

Text: "${inputText}"

Extract a clean list of individual ingredients.

Return a JSON object:
{ "ingredients": ["ingredient1", "ingredient2", ...] }

Keep ingredient names in the original language the user used. Return ONLY valid JSON, no markdown.`;

  try {
    const text = await callGemini([{ text: prompt }]);
    const data = parseJson(text);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/ai/categorize-recipe", async (req, res) => {
  const { name, ingredients, steps } = req.body;

  const prompt = `You are a nutrition expert. Categorize this recipe into nutritional groups based on its ingredients.

Recipe name: ${name}
Ingredients: ${(ingredients ?? []).join(", ")}
Steps: ${(steps ?? []).slice(0, 3).join(". ")}

Return a JSON object with boolean flags for each group:
{
  "nutritionalGroups": {
    "leaves": true/false,
    "vegetables": true/false,
    "roots": true/false,
    "animalProtein": true/false,
    "plantProtein": true/false,
    "grains": true/false,
    "dairy": true/false
  }
}

- leaves: lettuce, spinach, kale, arugula, herbs used in large quantity
- vegetables: tomato, pepper, zucchini, broccoli, cucumber, corn, etc.
- roots: carrot, potato, sweet potato, beet, turnip, etc.
- animalProtein: meat, chicken, fish, seafood, eggs
- plantProtein: beans, lentils, chickpeas, tofu, tempeh, edamame
- grains: rice, pasta, bread, oats, quinoa, couscous
- dairy: milk, cheese, yogurt, cream, butter

Return ONLY valid JSON, no markdown.`;

  try {
    const text = await callGemini([{ text: prompt }]);
    const data = parseJson(text);
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
    const text = await callGemini([{ text: prompt }]);
    const data = parseJson(text);
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
    const text = await callGemini([{ text: prompt }]);
    res.json({ text });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
