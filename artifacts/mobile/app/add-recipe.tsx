import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors, { NutritionalGroups } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { Recipe, RecipeCategory } from "@/context/AppContext";
import { extractRecipeFromUrl } from "@/utils/ai";
import { generateId } from "@/utils/dates";

type Mode = "url" | "manual";

export default function AddRecipeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { addRecipe } = useApp();
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("main");
  const [prepTime, setPrepTime] = useState("");
  const [portions, setPortions] = useState("2");
  const [categoryTags, setCategoryTags] = useState<string[]>([]);
  const [nutritionalGroups, setNutritionalGroups] = useState<Record<string, boolean>>({});
  const [ingredients, setIngredients] = useState<{ name: string; amount: string; unit: string }[]>([
    { name: "", amount: "", unit: "" },
  ]);
  const [steps, setSteps] = useState<string[]>([""]);

  const handleUrlExtract = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const data = await extractRecipeFromUrl(url.trim());
      if (data) {
        setName(data.name ?? "");
        setCategory(data.category ?? "main");
        setPrepTime(String(data.prepTime ?? ""));
        setPortions(String(data.portions ?? 2));
        setCategoryTags(data.categoryTags ?? []);
        setNutritionalGroups(data.nutritionalGroups ?? {});
        setIngredients(
          data.ingredients?.length
            ? data.ingredients.map((i: any) => ({
                name: i.name ?? "",
                amount: String(i.amount ?? ""),
                unit: i.unit ?? "",
              }))
            : [{ name: "", amount: "", unit: "" }]
        );
        setSteps(data.steps?.length ? data.steps : [""]);
        setMode("manual");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Could not extract", "Please fill in the recipe manually.");
        setMode("manual");
      }
    } catch {
      Alert.alert("Error", "Failed to extract recipe. Please try manually.");
      setMode("manual");
    }
    setLoading(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter a recipe name.");
      return;
    }

    const recipe: Recipe = {
      id: generateId(),
      name: name.trim(),
      category,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      portions: portions ? parseInt(portions) : undefined,
      categoryTags,
      nutritionalGroups,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name, amount: i.amount, unit: i.unit || undefined })),
      steps: steps.filter((s) => s.trim()),
      sourceUrl: url || undefined,
      isFavorite: false,
    };

    addRecipe(recipe);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const categories: RecipeCategory[] = ["salad", "main", "side"];
  const cuisineTags = ["Mediterranean", "Brazilian", "Asian", "American", "Italian", "Mexican"];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.navBar}>
          <Pressable style={styles.navBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>Add Recipe</Text>
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modeTab, mode === "url" && styles.modeTabActive]}
            onPress={() => setMode("url")}
          >
            <Ionicons
              name="link-outline"
              size={14}
              color={mode === "url" ? Colors.background : Colors.textSecondary}
            />
            <Text style={[styles.modeTabText, mode === "url" && styles.modeTabTextActive]}>
              URL Import
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeTab, mode === "manual" && styles.modeTabActive]}
            onPress={() => setMode("manual")}
          >
            <Ionicons
              name="create-outline"
              size={14}
              color={mode === "manual" ? Colors.background : Colors.textSecondary}
            />
            <Text style={[styles.modeTabText, mode === "manual" && styles.modeTabTextActive]}>
              Manual
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: bottomPad + 20, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {mode === "url" ? (
            <View style={styles.urlSection}>
              <Text style={styles.urlHint}>
                Paste a recipe URL and AI will extract all the details automatically
              </Text>
              <View style={styles.urlInput}>
                <Ionicons name="link-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.urlTextInput}
                  placeholder="https://..."
                  placeholderTextColor={Colors.textMuted}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <Pressable
                style={[styles.extractBtn, loading && styles.extractBtnDisabled]}
                onPress={handleUrlExtract}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Ionicons name="sparkles-outline" size={18} color={Colors.background} />
                )}
                <Text style={styles.extractBtnText}>
                  {loading ? "Extracting..." : "Extract Recipe"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.manualLink}
                onPress={() => setMode("manual")}
              >
                <Text style={styles.manualLinkText}>Or enter manually</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Recipe Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Roasted Salmon with Lemon"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryRow}>
                  {categories.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryTab,
                        category === cat && styles.categoryTabActive,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryTabText,
                          category === cat && styles.categoryTabTextActive,
                        ]}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.inlineFields}>
                  <View style={styles.inlineField}>
                    <Text style={styles.fieldLabel}>Prep Time (min)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={prepTime}
                      onChangeText={setPrepTime}
                      keyboardType="number-pad"
                      placeholder="30"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <View style={styles.inlineField}>
                    <Text style={styles.fieldLabel}>Portions</Text>
                    <TextInput
                      style={styles.textInput}
                      value={portions}
                      onChangeText={setPortions}
                      keyboardType="number-pad"
                      placeholder="2"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Cuisine Tags</Text>
                <View style={styles.tagsWrap}>
                  {cuisineTags.map((tag) => (
                    <Pressable
                      key={tag}
                      style={[
                        styles.tagChip,
                        categoryTags.includes(tag) && styles.tagChipActive,
                      ]}
                      onPress={() =>
                        setCategoryTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          categoryTags.includes(tag) && styles.tagChipTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Nutritional Groups</Text>
                {NutritionalGroups.map((group) => (
                  <View key={group.key} style={styles.nutritionRow}>
                    <Ionicons
                      name={group.icon as any}
                      size={16}
                      color={nutritionalGroups[group.key] ? Colors.teal : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.nutritionLabel,
                        { color: nutritionalGroups[group.key] ? Colors.text : Colors.textSecondary },
                      ]}
                    >
                      {group.label}
                    </Text>
                    <Switch
                      value={!!nutritionalGroups[group.key]}
                      onValueChange={(v) =>
                        setNutritionalGroups((prev) => ({ ...prev, [group.key]: v }))
                      }
                      trackColor={{ false: Colors.cardBorder, true: Colors.tealDark }}
                      thumbColor={nutritionalGroups[group.key] ? Colors.teal : Colors.textMuted}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.fieldLabel}>Ingredients</Text>
                  <Pressable
                    onPress={() =>
                      setIngredients((prev) => [...prev, { name: "", amount: "", unit: "" }])
                    }
                  >
                    <Ionicons name="add-circle-outline" size={22} color={Colors.teal} />
                  </Pressable>
                </View>
                {ingredients.map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 2 }]}
                      value={ing.name}
                      onChangeText={(v) =>
                        setIngredients((prev) =>
                          prev.map((p, idx) => (idx === i ? { ...p, name: v } : p))
                        )
                      }
                      placeholder="Ingredient"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={ing.amount}
                      onChangeText={(v) =>
                        setIngredients((prev) =>
                          prev.map((p, idx) => (idx === i ? { ...p, amount: v } : p))
                        )
                      }
                      placeholder="Amount"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={ing.unit}
                      onChangeText={(v) =>
                        setIngredients((prev) =>
                          prev.map((p, idx) => (idx === i ? { ...p, unit: v } : p))
                        )
                      }
                      placeholder="Unit"
                      placeholderTextColor={Colors.textMuted}
                    />
                    {ingredients.length > 1 && (
                      <Pressable
                        onPress={() =>
                          setIngredients((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.fieldLabel}>Steps</Text>
                  <Pressable onPress={() => setSteps((prev) => [...prev, ""])}>
                    <Ionicons name="add-circle-outline" size={22} color={Colors.teal} />
                  </Pressable>
                </View>
                {steps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={step}
                      onChangeText={(v) =>
                        setSteps((prev) =>
                          prev.map((p, idx) => (idx === i ? v : p))
                        )
                      }
                      placeholder={`Step ${i + 1}...`}
                      placeholderTextColor={Colors.textMuted}
                      multiline
                    />
                    {steps.length > 1 && (
                      <Pressable
                        onPress={() =>
                          setSteps((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  saveBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: Colors.background,
  },
  modeToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeTabActive: { backgroundColor: Colors.teal },
  modeTabText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modeTabTextActive: { color: Colors.background },
  scroll: { flex: 1, paddingHorizontal: 20 },
  urlSection: { gap: 12, paddingTop: 8 },
  urlHint: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  urlInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  urlTextInput: {
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.text,
  },
  extractBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.teal,
    borderRadius: 12,
    paddingVertical: 16,
  },
  extractBtnDisabled: { opacity: 0.6 },
  extractBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
  manualLink: { alignItems: "center", paddingVertical: 8 },
  manualLinkText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  fieldLabel: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  textInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inlineFields: { flexDirection: "row", gap: 10 },
  inlineField: { flex: 1, gap: 6 },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardElevated,
  },
  categoryTabActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  categoryTabText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryTabTextActive: { color: Colors.background },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tagChipActive: { backgroundColor: Colors.tealMuted, borderColor: Colors.teal },
  tagChipText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tagChipTextActive: { color: Colors.teal },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nutritionLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.tealMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  stepNumText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: Colors.teal,
  },
});
