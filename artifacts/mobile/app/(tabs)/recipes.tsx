import React, { useState, useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { Recipe } from "@/context/AppContext";
import { NutritionalGroupColors } from "@/constants/colors";

type FilterTab = "all" | "salad" | "main" | "side";

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { toggleFavoriteRecipe } = useApp();

  const groupColors = Object.entries(recipe.nutritionalGroups ?? {})
    .filter(([, v]) => v)
    .slice(0, 3)
    .map(([k]) => NutritionalGroupColors[k] ?? Colors.teal);

  return (
    <Pressable
      style={styles.recipeCard}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
    >
      <View style={styles.recipeCardLeft}>
        <View
          style={[
            styles.recipeAvatar,
            {
              backgroundColor:
                recipe.category === "salad"
                  ? Colors.tealMuted
                  : recipe.category === "main"
                  ? Colors.terracottaMuted
                  : Colors.cardElevated,
            },
          ]}
        >
          <Ionicons
            name={
              recipe.category === "salad"
                ? "leaf-outline"
                : recipe.category === "main"
                ? "restaurant-outline"
                : "layers-outline"
            }
            size={24}
            color={
              recipe.category === "salad"
                ? Colors.teal
                : recipe.category === "main"
                ? Colors.terracotta
                : Colors.textSecondary
            }
          />
        </View>
      </View>
      <View style={styles.recipeCardBody}>
        <Text style={styles.recipeName} numberOfLines={1}>
          {recipe.name}
        </Text>
        <View style={styles.recipeMeta}>
          {recipe.prepTime ? (
            <View style={styles.metaBadge}>
              <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>{recipe.prepTime} min</Text>
            </View>
          ) : null}
          <View style={styles.metaBadge}>
            <Ionicons name="layers-outline" size={11} color={Colors.textMuted} />
            <Text style={styles.metaText}>{recipe.category}</Text>
          </View>
        </View>
        {groupColors.length > 0 && (
          <View style={styles.nutritionDots}>
            {groupColors.map((color, i) => (
              <View key={i} style={[styles.nutritionDot, { backgroundColor: color }]} />
            ))}
          </View>
        )}
        {recipe.categoryTags && recipe.categoryTags.length > 0 && (
          <View style={styles.tagRow}>
            {recipe.categoryTags.slice(0, 2).map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Pressable
        style={styles.favoriteBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          toggleFavoriteRecipe(recipe.id);
        }}
        hitSlop={12}
      >
        <Ionicons
          name={recipe.isFavorite ? "heart" : "heart-outline"}
          size={20}
          color={recipe.isFavorite ? Colors.terracotta : Colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { recipes } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchesSearch =
        search === "" ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.ingredients?.some((i) =>
          i.name.toLowerCase().includes(search.toLowerCase())
        );
      const matchesFilter = filter === "all" || r.category === filter;
      return matchesSearch && matchesFilter;
    });
  }, [recipes, search, filter]);

  const filters: FilterTab[] = ["all", "salad", "main", "side"];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recipes</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/add-recipe");
          }}
        >
          <Ionicons name="add" size={20} color={Colors.background} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ingredient..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f && styles.filterTabTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: bottomPad + 90,
          gap: 10,
          paddingTop: 8,
          ...(filtered.length === 0 ? { flex: 1 } : {}),
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="restaurant-outline" size={40} color={Colors.teal} />
            </View>
            <Text style={styles.emptyTitle}>
              {search ? "No recipes found" : "No recipes yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {search
                ? "Try a different search term"
                : "Add your first recipe by tapping the + button"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 22,
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.text,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  filterTabActive: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  filterTabText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.background,
  },
  recipeCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    gap: 12,
  },
  recipeCardLeft: {},
  recipeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeCardBody: { flex: 1, gap: 4 },
  recipeName: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  recipeMeta: { flexDirection: "row", gap: 8 },
  metaBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "capitalize",
  },
  nutritionDots: { flexDirection: "row", gap: 4 },
  nutritionDot: { width: 8, height: 8, borderRadius: 4 },
  tagRow: { flexDirection: "row", gap: 6 },
  tag: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: "Montserrat_300Light",
    fontSize: 10,
    color: Colors.textSecondary,
  },
  favoriteBtn: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    minHeight: 300,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.tealMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    color: Colors.text,
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
