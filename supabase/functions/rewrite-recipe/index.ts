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
    "ingredients",
    "steps",
    "tags",
    "notes"
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
    ingredients: {
      type: "array",
      items: { type: "string" }
    },
    steps: {
      type: "array",
      items: { type: "string" }
    },
    tags: {
      type: "array",
      items: { type: "string" }
    },
    notes: { type: "string" }
  }
};

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

  const { rawText, sourceUrl } = await req.json();

  if (!rawText || typeof rawText !== "string") {
    return new Response(JSON.stringify({ error: "rawText is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [
            "Tu es un assistant culinaire francophone.",
            "Transforme une recette brute en fiche claire, homogene et personnelle.",
            "Ne recopie pas mot pour mot la source: reformule avec un style simple et naturel.",
            "Garde les quantites utiles quand elles sont presentes.",
            "Si une information manque, indique 'A completer'.",
            "Ne mentionne pas les hashtags, emojis, appels a s'abonner ou commentaires reseaux sociaux."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            sourceUrl: sourceUrl || "",
            rawText
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
    ?.flatMap((item) => item.content || [])
    ?.find((content) => content.type === "output_text")
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
