const TEAL = "#00b29f";
const TEAL_DARK = "#00887a";
const TERRACOTTA = "#C8714A";

export const Colors = {
  background: "#0F0F0F",
  card: "#1A1A1A",
  cardBorder: "#2A2A2A",
  cardElevated: "#222222",
  teal: TEAL,
  tealDark: TEAL_DARK,
  tealMuted: "rgba(0, 178, 159, 0.15)",
  terracotta: TERRACOTTA,
  terracottaMuted: "rgba(200, 113, 74, 0.15)",
  text: "#FFFFFF",
  textSecondary: "#9A9A9A",
  textMuted: "#555555",
  tabBar: "#121212",
  tabBarBorder: "#1E1E1E",
  tabActive: TEAL,
  tabInactive: "#555555",
  success: "#4CAF50",
  successMuted: "rgba(76, 175, 80, 0.15)",
  warning: "#FFA726",
  overlay: "rgba(0,0,0,0.7)",
  separator: "#1E1E1E",
};

export const NutritionalGroupColors: Record<string, string> = {
  leaves: "#4CAF50",
  vegetables: "#66BB6A",
  roots: "#FF7043",
  animalProtein: "#EF5350",
  plantProtein: "#AB47BC",
  grains: "#FFA726",
  dairy: "#26C6DA",
};

export const NutritionalGroups = [
  { key: "leaves", label: "Leaves", icon: "leaf-outline" },
  { key: "vegetables", label: "Vegetables", icon: "nutrition-outline" },
  { key: "roots", label: "Roots", icon: "earth-outline" },
  { key: "animalProtein", label: "Animal Protein", icon: "fish-outline" },
  { key: "plantProtein", label: "Plant Protein", icon: "flower-outline" },
  { key: "grains", label: "Grains", icon: "apps-outline" },
  { key: "dairy", label: "Dairy", icon: "water-outline" },
];

export const CategoryTags = ["salad", "main", "side", "Mediterranean", "Brazilian", "Asian", "American", "Italian"];

export const PantryBasics = [
  "salt", "pepper", "olive oil", "vegetable oil", "garlic", "onion",
  "water", "sugar", "flour", "baking soda", "vinegar", "soy sauce",
];

export default Colors;
