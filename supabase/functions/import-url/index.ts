const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const recipeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "prepTime",
    "cookTime",
    "servings",
    "difficulty",
    "category",
    "status",
    "imageUrl",
    "ingredients",
    "steps",
    "tags",
    "notes",
    "nutrition"
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    prepTime: { type: "string" },
    cookTime: { type: "string" },
    servings: { type: "string" },
    difficulty: { type: "string", enum: ["Facile", "Moyen", "Avance"] },
    category: { type: "string" },
    status: { type: "string", enum: ["A tester", "Testee", "Validee", "Favorite"] },
    imageUrl: { type: "string" },
    ingredients: { type: "array", items: { type: "string" } },
    steps: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
    nutrition: {
      type: "object",
      additionalProperties: false,
      required: ["protein", "carbs", "fat", "fiber", "summary"],
      properties: {
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
        fiber: { type: "number" },
        summary: { type: "string" }
      }
    }
  }
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return "";
}

function findRecipeNode(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  const objectValue = value as Record<string, unknown>;
  const type = objectValue["@type"];
  const types = Array.isArray(type) ? type : [type];

  if (types.some((item) => String(item).toLowerCase() === "recipe")) {
    return objectValue;
  }

  const graph = objectValue["@graph"];
  if (graph) {
    return findRecipeNode(graph);
  }

  return null;
}

function extractJsonLdRecipe(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1].trim());
      const recipe = findRecipeNode(parsed);
      if (recipe) {
        return recipe;
      }
    } catch (_error) {
      // Some websites ship invalid JSON-LD. Ignore and use the text fallback.
    }
  }

  return null;
}

function normalizeList(value: unknown) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];

  return list.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const objectItem = item as Record<string, unknown>;
      return String(objectItem.text || objectItem.name || objectItem.value || "").trim();
    }
    return String(item).trim();
  }).filter(Boolean);
}

function stripHtml(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .slice(0, 90000)
  );
}

function buildRawText(html: string, pageUrl: string) {
  const recipe = extractJsonLdRecipe(html);
  const title = recipe?.name || getMeta(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const description = recipe?.description || getMeta(html, "og:description") || getMeta(html, "description");
  const image = normalizeList(recipe?.image)[0] || getMeta(html, "og:image");
  const ingredients = normalizeList(recipe?.recipeIngredient);
  const instructions = normalizeList(recipe?.recipeInstructions);
  const prepTime = recipe?.prepTime || "";
  const cookTime = recipe?.cookTime || "";
  const servings = recipe?.recipeYield || "";
  const category = recipe?.recipeCategory || "";
  const nutrition = recipe?.nutrition ? JSON.stringify(recipe.nutrition) : "";

  if (recipe) {
    return {
      imageUrl: String(image || ""),
      rawText: [
        `Source: ${pageUrl}`,
        `Titre: ${title}`,
        `Description: ${description}`,
        `Image: ${image}`,
        `Preparation: ${prepTime}`,
        `Cuisson: ${cookTime}`,
        `Portions: ${servings}`,
        `Categorie: ${category}`,
        `Nutrition source: ${nutrition}`,
        "Ingredients:",
        ingredients.join("\n"),
        "Etapes:",
        instructions.join("\n")
      ].filter(Boolean).join("\n").slice(0, 10000)
    };
  }

  return {
    imageUrl: String(image || ""),
    rawText: [
      `Source: ${pageUrl}`,
      `Titre: ${decodeHtml(String(title))}`,
      `Description: ${description}`,
      `Image: ${image}`,
      stripHtml(html)
    ].filter(Boolean).join("\n").slice(0, 10000)
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openAiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "url is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  let pageUrl: URL;
  try {
    pageUrl = new URL(url);
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const pageResponse = await fetch(pageUrl.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 recipe-importer"
    }
  });

  if (!pageResponse.ok) {
    return new Response(JSON.stringify({ error: `Unable to fetch URL: ${pageResponse.status}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const html = await pageResponse.text();
  const extracted = buildRawText(html, pageUrl.toString());

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      max_output_tokens: 900,
      input: [
        {
          role: "system",
          content: [
            "Tu es un assistant culinaire francophone.",
            "Transforme le contenu extrait d'une page web en fiche recette claire, personnelle et homogene.",
            "Ne recopie pas mot pour mot la source: reformule avec un style simple et naturel.",
            "Garde les quantites, temps, portions et image quand ils sont presents.",
            "Estime les valeurs nutritionnelles en grammes par portion.",
            "Si une information manque, indique 'A completer'.",
            "Sois concis."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            sourceUrl: pageUrl.toString(),
            sourceImageUrl: extracted.imageUrl,
            rawText: extracted.rawText
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "recipe",
          strict: true,
          schema: recipeSchema
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ error: data.error?.message || "OpenAI request failed" }), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const outputText = data.output
    ?.flatMap((item: Record<string, unknown>) => item.content || [])
    ?.find((content: Record<string, unknown>) => content.type === "output_text")
    ?.text;

  if (!outputText) {
    return new Response(JSON.stringify({ error: "No structured recipe returned" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(outputText, {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
