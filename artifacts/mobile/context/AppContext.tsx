import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type MealCategory = "salad" | "main" | "side";
export type DayStatus = "cooking" | "away" | "unplanned";
export type RecipeCategory = "salad" | "main" | "side";

export interface NutritionalGroups {
  leaves?: boolean;
  vegetables?: boolean;
  roots?: boolean;
  animalProtein?: boolean;
  plantProtein?: boolean;
  grains?: boolean;
  dairy?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  imageUrl?: string;
  prepTime?: number;
  portions?: number;
  category: RecipeCategory;
  tags?: string[];
  nutritionalGroups?: NutritionalGroups;
  ingredients?: { name: string; amount: string; unit?: string }[];
  steps?: string[];
  sourceUrl?: string;
  isFavorite?: boolean;
  categoryTags?: string[];
}

export interface MealSlot {
  recipeId?: string;
  category: MealCategory;
}

export interface DayMeals {
  date: string;
  status: DayStatus;
  lunch: MealSlot[];
  dinner: MealSlot[];
}

export interface WeekPlan {
  weekId: string;
  startDate: string;
  days: Record<string, DayMeals>;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: string;
  unit?: string;
  category?: string;
  checked: boolean;
}

export interface FridgeItem {
  id: string;
  name: string;
  isLeftover?: boolean;
}

export interface Profile {
  lunchPortions: number;
  dinnerPortions: number;
  pantryBasics: string[];
  premiumPantry: string[];
  favoriteRecipeIds: string[];
}

interface AppState {
  recipes: Recipe[];
  currentWeekPlan: WeekPlan | null;
  weekHistory: WeekPlan[];
  shoppingList: ShoppingItem[];
  fridgeStock: FridgeItem[];
  profile: Profile;
}

interface AppContextType extends AppState {
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  toggleFavoriteRecipe: (id: string) => void;
  setCurrentWeekPlan: (plan: WeekPlan) => void;
  updateDayStatus: (date: string, status: DayStatus) => void;
  updateMealSlot: (
    date: string,
    mealType: "lunch" | "dinner",
    slots: MealSlot[]
  ) => void;
  setShoppingList: (items: ShoppingItem[]) => void;
  toggleShoppingItem: (id: string) => void;
  setFridgeStock: (items: FridgeItem[]) => void;
  addFridgeItems: (items: FridgeItem[]) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  getRecipeById: (id: string) => Recipe | undefined;
  generateShoppingList: () => ShoppingItem[];
  saveLeftovers: (
    mealDate: string,
    mealType: "lunch" | "dinner",
    recipeIds: string[]
  ) => void;
}

const defaultProfile: Profile = {
  lunchPortions: 1,
  dinnerPortions: 2,
  pantryBasics: [
    "salt",
    "pepper",
    "olive oil",
    "vegetable oil",
    "garlic",
    "onion",
    "water",
    "sugar",
    "flour",
    "vinegar",
  ],
  premiumPantry: [],
  favoriteRecipeIds: [],
};

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "weekplate_data";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    recipes: [],
    currentWeekPlan: null,
    weekHistory: [],
    shoppingList: [],
    fridgeStock: [],
    profile: defaultProfile,
  });

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setState((prev) => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback((newState: AppState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  const update = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = updater(prev);
        save(next);
        return next;
      });
    },
    [save]
  );

  const addRecipe = useCallback(
    (recipe: Recipe) => {
      update((prev) => ({
        ...prev,
        recipes: [...prev.recipes, recipe],
      }));
    },
    [update]
  );

  const updateRecipe = useCallback(
    (recipe: Recipe) => {
      update((prev) => ({
        ...prev,
        recipes: prev.recipes.map((r) => (r.id === recipe.id ? recipe : r)),
      }));
    },
    [update]
  );

  const deleteRecipe = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        recipes: prev.recipes.filter((r) => r.id !== id),
      }));
    },
    [update]
  );

  const toggleFavoriteRecipe = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        recipes: prev.recipes.map((r) =>
          r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
        ),
        profile: {
          ...prev.profile,
          favoriteRecipeIds: prev.profile.favoriteRecipeIds.includes(id)
            ? prev.profile.favoriteRecipeIds.filter((rid) => rid !== id)
            : [...prev.profile.favoriteRecipeIds, id],
        },
      }));
    },
    [update]
  );

  const setCurrentWeekPlan = useCallback(
    (plan: WeekPlan) => {
      update((prev) => ({
        ...prev,
        currentWeekPlan: plan,
        weekHistory: prev.weekHistory.some((w) => w.weekId === plan.weekId)
          ? prev.weekHistory.map((w) => (w.weekId === plan.weekId ? plan : w))
          : [...prev.weekHistory, plan],
      }));
    },
    [update]
  );

  const updateDayStatus = useCallback(
    (date: string, status: DayStatus) => {
      update((prev) => {
        if (!prev.currentWeekPlan) return prev;
        return {
          ...prev,
          currentWeekPlan: {
            ...prev.currentWeekPlan,
            days: {
              ...prev.currentWeekPlan.days,
              [date]: {
                ...(prev.currentWeekPlan.days[date] || {
                  date,
                  status: "unplanned",
                  lunch: [],
                  dinner: [],
                }),
                status,
              },
            },
          },
        };
      });
    },
    [update]
  );

  const updateMealSlot = useCallback(
    (date: string, mealType: "lunch" | "dinner", slots: MealSlot[]) => {
      update((prev) => {
        if (!prev.currentWeekPlan) return prev;
        const existingDay = prev.currentWeekPlan.days[date] || {
          date,
          status: "cooking" as DayStatus,
          lunch: [],
          dinner: [],
        };
        return {
          ...prev,
          currentWeekPlan: {
            ...prev.currentWeekPlan,
            days: {
              ...prev.currentWeekPlan.days,
              [date]: { ...existingDay, [mealType]: slots },
            },
          },
        };
      });
    },
    [update]
  );

  const setShoppingList = useCallback(
    (items: ShoppingItem[]) => {
      update((prev) => ({ ...prev, shoppingList: items }));
    },
    [update]
  );

  const toggleShoppingItem = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        shoppingList: prev.shoppingList.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        ),
      }));
    },
    [update]
  );

  const setFridgeStock = useCallback(
    (items: FridgeItem[]) => {
      update((prev) => ({ ...prev, fridgeStock: items }));
    },
    [update]
  );

  const addFridgeItems = useCallback(
    (items: FridgeItem[]) => {
      update((prev) => ({
        ...prev,
        fridgeStock: [...prev.fridgeStock, ...items],
      }));
    },
    [update]
  );

  const updateProfile = useCallback(
    (profile: Partial<Profile>) => {
      update((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...profile },
      }));
    },
    [update]
  );

  const getRecipeById = useCallback(
    (id: string) => {
      return state.recipes.find((r) => r.id === id);
    },
    [state.recipes]
  );

  const generateShoppingList = useCallback((): ShoppingItem[] => {
    if (!state.currentWeekPlan) return [];

    const allPantry = [
      ...state.profile.pantryBasics,
      ...state.profile.premiumPantry,
    ].map((i) => i.toLowerCase());

    const ingredientMap = new Map<
      string,
      { amount: string; unit?: string; category?: string; count: number }
    >();

    Object.values(state.currentWeekPlan.days).forEach((day) => {
      const processSlots = (
        slots: MealSlot[],
        multiplier: number
      ) => {
        slots.forEach((slot) => {
          if (!slot.recipeId) return;
          const recipe = state.recipes.find((r) => r.id === slot.recipeId);
          if (!recipe?.ingredients) return;
          recipe.ingredients.forEach((ing) => {
            const nameLower = ing.name.toLowerCase();
            if (allPantry.some((p) => nameLower.includes(p))) return;
            const key = nameLower;
            const existing = ingredientMap.get(key);
            if (existing) {
              existing.count += multiplier;
            } else {
              ingredientMap.set(key, {
                amount: ing.amount,
                unit: ing.unit,
                category: recipe.category,
                count: multiplier,
              });
            }
          });
        });
      };

      processSlots(day.lunch, state.profile.lunchPortions);
      processSlots(day.dinner, state.profile.dinnerPortions);
    });

    return Array.from(ingredientMap.entries()).map(([name, val]) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      amount: val.amount,
      unit: val.unit,
      category: val.category,
      checked: false,
    }));
  }, [state]);

  const saveLeftovers = useCallback(
    (
      mealDate: string,
      mealType: "lunch" | "dinner",
      recipeIds: string[]
    ) => {
      const leftovers: FridgeItem[] = recipeIds.map((id) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name:
          state.recipes.find((r) => r.id === id)?.name || "Unknown Recipe",
        isLeftover: true,
      }));
      addFridgeItems(leftovers);
    },
    [state.recipes, addFridgeItems]
  );

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        ...state,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        toggleFavoriteRecipe,
        setCurrentWeekPlan,
        updateDayStatus,
        updateMealSlot,
        setShoppingList,
        toggleShoppingItem,
        setFridgeStock,
        addFridgeItems,
        updateProfile,
        getRecipeById,
        generateShoppingList,
        saveLeftovers,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
