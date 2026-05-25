const sampleRecipes = [
  {
    title: "Pates tomates et basilic",
    source: "",
    description: "Une recette simple pour un soir de semaine, avec une sauce tomate douce et beaucoup de basilic.",
    prepTime: "10 min",
    cookTime: "15 min",
  servings: "2 personnes",
  difficulty: "Facile",
  category: "Plat principal",
  status: "A tester",
  ingredients: ["250 g de pates", "300 g de tomates", "1 gousse d'ail", "Basilic frais", "Huile d'olive"],
  steps: ["Cuire les pates.", "Faire revenir l'ail dans l'huile.", "Ajouter les tomates et laisser mijoter.", "Melanger avec les pates et finir avec le basilic."],
    tags: ["rapide", "vegetarien", "italien"],
    notes: "Ajouter un peu d'eau de cuisson pour lier la sauce."
  }
];

const storageKey = "personal-recipes";
const config = window.RECIPES_SUPABASE || {};
const hasSupabaseConfig = Boolean(config.url && config.anonKey && window.supabase);
const supabaseClient = hasSupabaseConfig ? window.supabase.createClient(config.url, config.anonKey) : null;

const tabs = document.querySelectorAll(".tab");
const recipesView = document.querySelector("#recipesView");
const adminView = document.querySelector("#adminView");
const recipeList = document.querySelector("#recipeList");
const template = document.querySelector("#recipeTemplate");
const searchInput = document.querySelector("#searchInput");
const ingredientInput = document.querySelector("#ingredientInput");
const form = document.querySelector("#recipeForm");
const rewriteButton = document.querySelector("#rewriteButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const submitButton = document.querySelector("#submitButton");
const importButton = document.querySelector("#importButton");
const importUrlInput = document.querySelector("#importUrlInput");
const importTextInput = document.querySelector("#importTextInput");
const emailInput = document.querySelector("#emailInput");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const authStatus = document.querySelector("#authStatus");

let editingId = null;
let currentRecipes = [];
let currentUser = null;

const fields = {
  title: document.querySelector("#titleInput"),
  source: document.querySelector("#sourceInput"),
  prepTime: document.querySelector("#prepTimeInput"),
  cookTime: document.querySelector("#cookTimeInput"),
  servings: document.querySelector("#servingsInput"),
  difficulty: document.querySelector("#difficultyInput"),
  category: document.querySelector("#categoryInput"),
  status: document.querySelector("#statusInput"),
  raw: document.querySelector("#rawInput"),
  description: document.querySelector("#descriptionInput"),
  ingredients: document.querySelector("#ingredientsInput"),
  steps: document.querySelector("#stepsInput"),
  tags: document.querySelector("#tagsInput"),
  notes: document.querySelector("#notesInput")
};

function loadLocalRecipes() {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : sampleRecipes;
}

function saveLocalRecipes(recipes) {
  localStorage.setItem(storageKey, JSON.stringify(recipes));
}

function splitLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanImportedLine(line) {
  return line
    .replace(/^[-*\d.)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function guessTitle(text) {
  const firstLine = splitLines(text)[0] || "Nouvelle recette importee";
  return cleanImportedLine(firstLine).slice(0, 70);
}

function looksLikeIngredient(line) {
  return /\b(\d+|g|kg|ml|cl|l|cuil|cuillere|tasse|pincee|sachet|oeuf|farine|sucre|sel|huile|beurre|lait|tomate|poulet|pates)\b/i.test(line);
}

function looksLikeStep(line) {
  return /\b(melange|melanger|ajoute|ajouter|faire|cuire|couper|preparer|prechauffer|mettre|verse|verser|laisse|laisser|servez|servir|enfourner)\b/i.test(line);
}

function buildImportedRecipe(text) {
  const lines = splitLines(text).map(cleanImportedLine).filter(Boolean);
  const title = guessTitle(text);
  const usefulLines = lines.filter((line) => line.toLowerCase() !== title.toLowerCase());
  const ingredientLines = usefulLines.filter(looksLikeIngredient).slice(0, 14);
  const stepLines = usefulLines.filter((line) => looksLikeStep(line) && !looksLikeIngredient(line)).slice(0, 10);
  const fallbackSteps = usefulLines.filter((line) => !ingredientLines.includes(line)).slice(0, 6);

  return {
    title,
    description: `${title} reformulee dans un style clair, personnel et facile a suivre.`,
    ingredients: ingredientLines.length ? ingredientLines : ["Ingredients a verifier depuis la source"],
    steps: stepLines.length ? stepLines : fallbackSteps.length ? fallbackSteps : ["Reprendre les etapes principales depuis la source", "Verifier les quantites", "Ajouter tes notes personnelles avant publication"],
    tags: ["importe", "a-retravailler"]
  };
}

function fromSupabase(row) {
  return {
    id: row.id,
    title: row.title,
    source: row.source || "",
    description: row.description || "",
    prepTime: row.prep_time || "",
    cookTime: row.cook_time || "",
    servings: row.servings || "",
    difficulty: row.difficulty || "Facile",
    category: row.category || "",
    status: row.status || "A tester",
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    tags: row.tags || [],
    notes: row.notes || "",
    raw: row.raw_text || ""
  };
}

function toSupabase(recipe) {
  return {
    owner_id: currentUser ? currentUser.id : null,
    title: recipe.title,
    source: recipe.source,
    description: recipe.description,
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    category: recipe.category,
    status: recipe.status,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    tags: recipe.tags,
    notes: recipe.notes,
    raw_text: recipe.raw || "",
    updated_at: new Date().toISOString()
  };
}

function canEdit() {
  return true;
}

function setAdminEnabled(enabled) {
  form.querySelectorAll("input, textarea, select, button").forEach((element) => {
    element.disabled = !enabled;
  });
  importButton.disabled = !enabled;
  importUrlInput.disabled = !enabled;
  importTextInput.disabled = !enabled;
}

async function refreshAuth() {
  if (!hasSupabaseConfig) {
    authStatus.textContent = "Mode local: les recettes restent dans ce navigateur.";
    loginButton.disabled = true;
    emailInput.disabled = true;
    logoutButton.classList.add("is-hidden");
    setAdminEnabled(true);
    return;
  }

  const { data } = await supabaseClient.auth.getUser();
  currentUser = data.user;

  if (currentUser) {
    authStatus.textContent = `Connecte: ${currentUser.email}`;
    loginButton.classList.add("is-hidden");
    logoutButton.classList.remove("is-hidden");
    emailInput.disabled = true;
    setAdminEnabled(true);
  } else {
    authStatus.textContent = "Admin temporaire ouvert: aucune connexion requise.";
    loginButton.classList.add("is-hidden");
    logoutButton.classList.add("is-hidden");
    emailInput.disabled = true;
    setAdminEnabled(true);
  }
}

async function loadRecipes() {
  if (!hasSupabaseConfig) {
    currentRecipes = loadLocalRecipes();
    return currentRecipes;
  }

  const { data, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    recipeList.innerHTML = `<p class="description">Erreur Supabase: ${error.message}</p>`;
    currentRecipes = [];
    return currentRecipes;
  }

  currentRecipes = data.map(fromSupabase);
  return currentRecipes;
}

async function saveRecipe(recipe) {
  if (!hasSupabaseConfig) {
    const recipes = loadLocalRecipes();

    if (editingId === null) {
      recipes.unshift(recipe);
    } else {
      recipes[editingId] = recipe;
    }

    saveLocalRecipes(recipes);
    return;
  }

  const payload = toSupabase(recipe);

  if (editingId === null) {
    const { error } = await supabaseClient.from("recipes").insert(payload);
    if (error) {
      authStatus.textContent = `Erreur publication: ${error.message}`;
    }
  } else {
    const { error } = await supabaseClient.from("recipes").update(payload).eq("id", editingId);
    if (error) {
      authStatus.textContent = `Erreur modification: ${error.message}`;
    }
  }
}

async function renderRecipes() {
  const query = searchInput.value.trim().toLowerCase();
  const ingredientQuery = ingredientInput.value.trim().toLowerCase();
  const loadedRecipes = await loadRecipes();
  const recipes = loadedRecipes.map((recipe, index) => ({ recipe, index })).filter(({ recipe }) => {
    const haystack = [
      recipe.title,
      recipe.description,
      recipe.difficulty || "",
      recipe.category || "",
      recipe.status || "",
      recipe.tags.join(" "),
      recipe.ingredients.join(" ")
    ].join(" ").toLowerCase();
    const ingredients = recipe.ingredients.join(" ").toLowerCase();

    return haystack.includes(query) && ingredients.includes(ingredientQuery);
  });

  recipeList.innerHTML = "";

  if (recipes.length === 0) {
    recipeList.innerHTML = '<p class="description">Aucune recette ne correspond a ta recherche.</p>';
    return;
  }

  recipes.forEach(({ recipe, index }) => {
    const card = template.content.cloneNode(true);
    card.querySelector("h2").textContent = recipe.title;
    card.querySelector(".badge").textContent = recipe.tags[0] || "recette";
    card.querySelector(".description").textContent = recipe.description;

    const meta = card.querySelector(".meta");
    [
      recipe.prepTime ? `Prep: ${recipe.prepTime}` : "",
      recipe.cookTime ? `Cuisson: ${recipe.cookTime}` : "",
      recipe.servings || "",
      recipe.difficulty || "",
      recipe.category || "",
      recipe.status || "",
      ...recipe.tags
    ].filter(Boolean).forEach((tag) => {
      const item = document.createElement("span");
      item.textContent = tag;
      meta.append(item);
    });

    const ingredients = card.querySelector(".ingredients");
    recipe.ingredients.forEach((ingredient) => {
      const item = document.createElement("li");
      item.textContent = ingredient;
      ingredients.append(item);
    });

    const steps = card.querySelector(".steps");
    recipe.steps.forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      steps.append(item);
    });

    const notesTitle = card.querySelector(".notes-title");
    const notes = card.querySelector(".notes");
    notes.textContent = recipe.notes || "";
    notesTitle.classList.toggle("is-hidden", !recipe.notes);
    notes.classList.toggle("is-hidden", !recipe.notes);

    const editButton = card.querySelector(".edit-button");
    const deleteButton = card.querySelector(".delete-button");
    editButton.disabled = !canEdit();
    deleteButton.disabled = !canEdit();
    editButton.addEventListener("click", () => editRecipe(index));
    deleteButton.addEventListener("click", () => deleteRecipe(index));

    recipeList.append(card);
  });
}

function resetForm() {
  editingId = null;
  form.reset();
  submitButton.textContent = "Publier";
  cancelEditButton.classList.add("is-hidden");
}

function editRecipe(index) {
  const recipe = currentRecipes[index];
  editingId = hasSupabaseConfig ? recipe.id : index;

  fields.title.value = recipe.title || "";
  fields.source.value = recipe.source || "";
  fields.prepTime.value = recipe.prepTime || "";
  fields.cookTime.value = recipe.cookTime || "";
  fields.servings.value = recipe.servings || "";
  fields.difficulty.value = recipe.difficulty || "Facile";
  fields.category.value = recipe.category || "";
  fields.status.value = recipe.status || "A tester";
  fields.description.value = recipe.description || "";
  fields.ingredients.value = recipe.ingredients.join("\n");
  fields.steps.value = recipe.steps.join("\n");
  fields.tags.value = recipe.tags.join(", ");
  fields.notes.value = recipe.notes || "";
  fields.raw.value = recipe.raw || "";

  submitButton.textContent = "Enregistrer";
  cancelEditButton.classList.remove("is-hidden");
  document.querySelector('[data-view="admin"]').click();
}

async function deleteRecipe(index) {
  if (!hasSupabaseConfig) {
    const recipes = loadLocalRecipes();
    recipes.splice(index, 1);
    saveLocalRecipes(recipes);
    await renderRecipes();
    return;
  }

  const recipe = currentRecipes[index];
  const { error } = await supabaseClient.from("recipes").delete().eq("id", recipe.id);

  if (error) {
    authStatus.textContent = `Erreur suppression: ${error.message}`;
    return;
  }

  await renderRecipes();
}

function fillRecipeForm(draft, rawText, sourceUrl) {
  fields.title.value = draft.title || "Nouvelle recette importee";
  fields.source.value = sourceUrl || "";
  fields.description.value = draft.description || "";
  fields.ingredients.value = (draft.ingredients || []).join("\n");
  fields.steps.value = (draft.steps || []).join("\n");
  fields.tags.value = (draft.tags || []).join(", ");
  fields.prepTime.value = draft.prepTime || "A completer";
  fields.cookTime.value = draft.cookTime || "A completer";
  fields.servings.value = draft.servings || "A completer";
  fields.difficulty.value = draft.difficulty || "Facile";
  fields.category.value = draft.category || "A classer";
  fields.status.value = draft.status || "A tester";
  fields.notes.value = draft.notes || "";
  fields.raw.value = rawText || "";
}

async function importRecipeDraft() {
  const text = importTextInput.value.trim();

  if (!text) {
    importTextInput.focus();
    return;
  }

  resetForm();
  importButton.disabled = true;
  importButton.textContent = "Reecriture IA...";

  if (hasSupabaseConfig) {
    const { data, error } = await supabaseClient.functions.invoke("rewrite-recipe", {
      body: {
        rawText: text,
        sourceUrl: importUrlInput.value.trim()
      }
    });

    if (!error && data) {
      fillRecipeForm(data, text, importUrlInput.value.trim());
      importButton.disabled = false;
      importButton.textContent = "Importer et reformater";
      return;
    }

    authStatus.textContent = `IA indisponible, import local utilise: ${error?.message || "fonction non configuree"}`;
  }

  const draft = buildImportedRecipe(text);
  fillRecipeForm(draft, text, importUrlInput.value.trim());
  importButton.disabled = false;
  importButton.textContent = "Importer et reformater";
}

function rewriteDraft() {
  const raw = fields.raw.value.trim();
  const title = fields.title.value.trim() || "Nouvelle recette";

  fields.description.value = raw
    ? `${title} retravaillee dans un style clair, simple et personnel.`
    : "Ajoute d'abord le texte brut de la recette.";

  if (!fields.ingredients.value.trim()) {
    fields.ingredients.value = "Ingredient principal\nAssaisonnement\nHuile d'olive";
  }

  if (!fields.steps.value.trim()) {
    fields.steps.value = raw
      ? "Preparer les ingredients\nSuivre les grandes etapes de la recette originale\nAjuster l'assaisonnement\nServir et ajouter une note personnelle"
      : "";
  }

  if (!fields.tags.value.trim()) {
    fields.tags.value = "a-tester, maison";
  }

  if (!fields.prepTime.value.trim()) {
    fields.prepTime.value = "A completer";
  }

  if (!fields.servings.value.trim()) {
    fields.servings.value = "A completer";
  }

  if (!fields.category.value.trim()) {
    fields.category.value = "A classer";
  }
}

async function sendLoginLink() {
  if (!hasSupabaseConfig) {
    return;
  }

  const email = emailInput.value.trim();

  if (!email) {
    emailInput.focus();
    return;
  }

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href
    }
  });

  authStatus.textContent = error ? `Erreur connexion: ${error.message}` : "Regarde ta boite mail: Supabase vient d'envoyer un lien de connexion.";
}

async function logout() {
  if (!hasSupabaseConfig) {
    return;
  }

  await supabaseClient.auth.signOut();
  currentUser = null;
  await refreshAuth();
  await renderRecipes();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    recipesView.classList.toggle("is-hidden", tab.dataset.view !== "recipes");
    adminView.classList.toggle("is-hidden", tab.dataset.view !== "admin");
  });
});

searchInput.addEventListener("input", renderRecipes);
ingredientInput.addEventListener("input", renderRecipes);
rewriteButton.addEventListener("click", rewriteDraft);
cancelEditButton.addEventListener("click", resetForm);
importButton.addEventListener("click", importRecipeDraft);
loginButton.addEventListener("click", sendLoginLink);
logoutButton.addEventListener("click", logout);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const recipe = {
    title: fields.title.value.trim(),
    source: fields.source.value.trim(),
    prepTime: fields.prepTime.value.trim(),
    cookTime: fields.cookTime.value.trim(),
    servings: fields.servings.value.trim(),
    difficulty: fields.difficulty.value,
    category: fields.category.value.trim(),
    status: fields.status.value,
    description: fields.description.value.trim(),
    ingredients: splitLines(fields.ingredients.value),
    steps: splitLines(fields.steps.value),
    tags: fields.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
    notes: fields.notes.value.trim(),
    raw: fields.raw.value.trim()
  };

  await saveRecipe(recipe);
  resetForm();
  document.querySelector('[data-view="recipes"]').click();
  await renderRecipes();
});

if (hasSupabaseConfig) {
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session ? session.user : null;
    await refreshAuth();
    await renderRecipes();
  });
}

refreshAuth();
renderRecipes();
