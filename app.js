const sampleRecipes = [
  {
    title: "Pates tomates et basilic",
    source: "",
    description: "Une recette simple pour un soir de semaine, avec une sauce tomate douce et beaucoup de basilic.",
    prepTime: "10 min",
    cookTime: "15 min",
    servings: "2 personnes",
    difficulty: "Facile",
    ingredients: ["250 g de pates", "300 g de tomates", "1 gousse d'ail", "Basilic frais", "Huile d'olive"],
    steps: ["Cuire les pates.", "Faire revenir l'ail dans l'huile.", "Ajouter les tomates et laisser mijoter.", "Melanger avec les pates et finir avec le basilic."],
    tags: ["rapide", "vegetarien", "italien"]
  }
];

const storageKey = "personal-recipes";
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
let editingIndex = null;

const fields = {
  title: document.querySelector("#titleInput"),
  source: document.querySelector("#sourceInput"),
  prepTime: document.querySelector("#prepTimeInput"),
  cookTime: document.querySelector("#cookTimeInput"),
  servings: document.querySelector("#servingsInput"),
  difficulty: document.querySelector("#difficultyInput"),
  raw: document.querySelector("#rawInput"),
  description: document.querySelector("#descriptionInput"),
  ingredients: document.querySelector("#ingredientsInput"),
  steps: document.querySelector("#stepsInput"),
  tags: document.querySelector("#tagsInput")
};

function loadRecipes() {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : sampleRecipes;
}

function saveRecipes(recipes) {
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

function importRecipeDraft() {
  const text = importTextInput.value.trim();

  if (!text) {
    importTextInput.focus();
    return;
  }

  const draft = buildImportedRecipe(text);
  resetForm();
  fields.title.value = draft.title;
  fields.source.value = importUrlInput.value.trim();
  fields.description.value = draft.description;
  fields.ingredients.value = draft.ingredients.join("\n");
  fields.steps.value = draft.steps.join("\n");
  fields.tags.value = draft.tags.join(", ");
  fields.prepTime.value = "A completer";
  fields.cookTime.value = "A completer";
  fields.servings.value = "A completer";
  fields.difficulty.value = "Facile";
  fields.raw.value = text;
}

function renderRecipes() {
  const query = searchInput.value.trim().toLowerCase();
  const ingredientQuery = ingredientInput.value.trim().toLowerCase();
  const recipes = loadRecipes().map((recipe, index) => ({ recipe, index })).filter(({ recipe }) => {
    const haystack = [
      recipe.title,
      recipe.description,
      recipe.difficulty || "",
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

    card.querySelector(".edit-button").addEventListener("click", () => editRecipe(index));
    card.querySelector(".delete-button").addEventListener("click", () => deleteRecipe(index));

    recipeList.append(card);
  });
}

function resetForm() {
  editingIndex = null;
  form.reset();
  submitButton.textContent = "Publier";
  cancelEditButton.classList.add("is-hidden");
}

function editRecipe(index) {
  const recipes = loadRecipes();
  const recipe = recipes[index];
  editingIndex = index;

  fields.title.value = recipe.title || "";
  fields.source.value = recipe.source || "";
  fields.prepTime.value = recipe.prepTime || "";
  fields.cookTime.value = recipe.cookTime || "";
  fields.servings.value = recipe.servings || "";
  fields.difficulty.value = recipe.difficulty || "Facile";
  fields.description.value = recipe.description || "";
  fields.ingredients.value = recipe.ingredients.join("\n");
  fields.steps.value = recipe.steps.join("\n");
  fields.tags.value = recipe.tags.join(", ");
  fields.raw.value = "";

  submitButton.textContent = "Enregistrer";
  cancelEditButton.classList.remove("is-hidden");
  document.querySelector('[data-view="admin"]').click();
}

function deleteRecipe(index) {
  const recipes = loadRecipes();
  recipes.splice(index, 1);
  saveRecipes(recipes);
  renderRecipes();
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const recipes = loadRecipes();
  const recipe = {
    title: fields.title.value.trim(),
    source: fields.source.value.trim(),
    prepTime: fields.prepTime.value.trim(),
    cookTime: fields.cookTime.value.trim(),
    servings: fields.servings.value.trim(),
    difficulty: fields.difficulty.value,
    description: fields.description.value.trim(),
    ingredients: splitLines(fields.ingredients.value),
    steps: splitLines(fields.steps.value),
    tags: fields.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean)
  };

  if (editingIndex === null) {
    recipes.unshift(recipe);
  } else {
    recipes[editingIndex] = recipe;
  }

  saveRecipes(recipes);
  resetForm();
  document.querySelector('[data-view="recipes"]').click();
  renderRecipes();
});

renderRecipes();
