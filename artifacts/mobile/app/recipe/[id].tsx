import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors, { NutritionalGroupColors, NutritionalGroups } from "@/constants/colors";
import { useApp } from "@/context/AppContext";

export default function RecipeDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipeById, toggleFavoriteRecipe, deleteRecipe, profile } = useApp();
  const recipe = getRecipeById(id);

  const [portionMultiplier, setPortionMultiplier] = useState(1);

  if (!recipe) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Recipe not found</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert("Delete Recipe", "Are you sure you want to delete this recipe?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteRecipe(recipe.id);
          router.back();
        },
      },
    ]);
  };

  const activeGroups = Object.entries(recipe.nutritionalGroups ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  const categoryColor =
    recipe.category === "salad"
      ? Colors.teal
      : recipe.category === "main"
      ? Colors.terracotta
      : Colors.textMuted;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.navBar}>
        <Pressable
          style={styles.navBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.navActions}>
          <Pressable
            style={styles.navBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavoriteRecipe(recipe.id);
            }}
          >
            <Ionicons
              name={recipe.isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={recipe.isFavorite ? Colors.terracotta : Colors.text}
            />
          </Pressable>
          <Pressable
            style={styles.navBtn}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.terracotta} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { backgroundColor: categoryColor + "22" }]}>
          <View style={[styles.heroIcon, { backgroundColor: categoryColor + "33" }]}>
            <Ionicons
              name={
                recipe.category === "salad"
                  ? "leaf-outline"
                  : recipe.category === "main"
                  ? "restaurant-outline"
                  : "layers-outline"
              }
              size={56}
              color={categoryColor}
            />
          </View>
          <View
            style={[styles.categoryPill, { backgroundColor: categoryColor }]}
          >
            <Text style={styles.categoryPillText}>{recipe.category}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.recipeName}>{recipe.name}</Text>

          <View style={styles.metaRow}>
            {recipe.prepTime ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.metaText}>{recipe.prepTime} min</Text>
              </View>
            ) : null}
            {recipe.portions ? (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.metaText}>{recipe.portions} portions</Text>
              </View>
            ) : null}
            {recipe.sourceUrl ? (
              <View style={styles.metaItem}>
                <Ionicons name="link-outline" size={16} color={Colors.teal} />
                <Text style={[styles.metaText, { color: Colors.teal }]}>Source</Text>
              </View>
            ) : null}
          </View>

          {recipe.categoryTags && recipe.categoryTags.length > 0 && (
            <View style={styles.tagRow}>
              {recipe.categoryTags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {activeGroups.length > 0 && (
            <View style={styles.nutritionSection}>
              <Text style={styles.sectionTitle}>Nutritional Groups</Text>
              <View style={styles.nutritionGroups}>
                {activeGroups.map((key) => {
                  const group = NutritionalGroups.find((g) => g.key === key);
                  const color = NutritionalGroupColors[key];
                  return (
                    <View
                      key={key}
                      style={[styles.nutritionChip, { backgroundColor: color + "22" }]}
                    >
                      <Ionicons
                        name={group?.icon as any ?? "ellipse"}
                        size={12}
                        color={color}
                      />
                      <Text style={[styles.nutritionChipText, { color }]}>
                        {group?.label ?? key}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                <View style={styles.portionAdjust}>
                  <Pressable
                    onPress={() => setPortionMultiplier((p) => Math.max(1, p - 1))}
                    style={styles.portionBtn}
                  >
                    <Ionicons name="remove" size={14} color={Colors.text} />
                  </Pressable>
                  <Text style={styles.portionMultText}>×{portionMultiplier}</Text>
                  <Pressable
                    onPress={() => setPortionMultiplier((p) => p + 1)}
                    style={styles.portionBtn}
                  >
                    <Ionicons name="add" size={14} color={Colors.text} />
                  </Pressable>
                </View>
              </View>
              {recipe.ingredients.map((ing, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientAmount}>
                    {ing.amount
                      ? `${parseFloat(ing.amount) * portionMultiplier} ${ing.unit ?? ""}`.trim()
                      : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {recipe.steps && recipe.steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preparation</Text>
              {recipe.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  navActions: { flexDirection: "row", gap: 8 },
  scroll: { flex: 1 },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 16,
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 0,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryPill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  categoryPillText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    color: Colors.background,
    textTransform: "capitalize",
  },
  content: { padding: 20, gap: 20 },
  recipeName: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 26,
    color: Colors.text,
    lineHeight: 34,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tagText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nutritionSection: { gap: 10 },
  sectionTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  nutritionGroups: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nutritionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  nutritionChipText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
  },
  section: { gap: 12 },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  portionAdjust: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 10,
    overflow: "hidden",
  },
  portionBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  portionMultText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: Colors.teal,
    width: 32,
    textAlign: "center",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.teal,
  },
  ingredientName: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    textTransform: "capitalize",
  },
  ingredientAmount: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.tealMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumberText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: Colors.teal,
  },
  stepText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 18,
    color: Colors.textSecondary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
  },
});
