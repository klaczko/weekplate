import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

function PortionControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.portionRow}>
      <Text style={styles.portionLabel}>{label}</Text>
      <View style={styles.portionControl}>
        <Pressable
          style={styles.portionBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (value > 1) onChange(value - 1);
          }}
        >
          <Ionicons name="remove" size={18} color={Colors.text} />
        </Pressable>
        <Text style={styles.portionValue}>{value}</Text>
        <Pressable
          style={styles.portionBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(value + 1);
          }}
        >
          <Ionicons name="add" size={18} color={Colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInput("");
    }
  };

  return (
    <View style={styles.tagInputContainer}>
      <View style={styles.tagInputRow}>
        <TextInput
          style={styles.tagInput}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable style={styles.tagAddBtn} onPress={handleAdd}>
          <Ionicons name="add" size={18} color={Colors.background} />
        </Pressable>
      </View>
      <View style={styles.tagsWrap}>
        {tags.map((tag) => (
          <Pressable
            key={tag}
            style={styles.tagChip}
            onPress={() => onRemove(tag)}
          >
            <Text style={styles.tagChipText}>{tag}</Text>
            <Ionicons name="close" size={12} color={Colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { profile, updateProfile, recipes, weekHistory } = useApp();

  const favoriteRecipes = recipes.filter((r) => r.isFavorite);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.card}>
        <SectionHeader title="Portions" />
        <PortionControl
          label="Lunch"
          value={profile.lunchPortions}
          onChange={(v) => updateProfile({ lunchPortions: v })}
        />
        <View style={styles.divider} />
        <PortionControl
          label="Dinner"
          value={profile.dinnerPortions}
          onChange={(v) => updateProfile({ dinnerPortions: v })}
        />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Pantry Basics" />
        <Text style={styles.cardSubtitle}>
          These ingredients are never added to your shopping list
        </Text>
        <TagInput
          tags={profile.pantryBasics}
          placeholder="Add basic ingredient..."
          onAdd={(tag) =>
            updateProfile({ pantryBasics: [...profile.pantryBasics, tag] })
          }
          onRemove={(tag) =>
            updateProfile({
              pantryBasics: profile.pantryBasics.filter((t) => t !== tag),
            })
          }
        />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Premium Pantry" />
        <Text style={styles.cardSubtitle}>
          Specialty items you always have (zaatar, miso, truffle oil...)
        </Text>
        <TagInput
          tags={profile.premiumPantry}
          placeholder="Add premium ingredient..."
          onAdd={(tag) =>
            updateProfile({ premiumPantry: [...profile.premiumPantry, tag] })
          }
          onRemove={(tag) =>
            updateProfile({
              premiumPantry: profile.premiumPantry.filter((t) => t !== tag),
            })
          }
        />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Favorite Recipes" />
        {favoriteRecipes.length === 0 ? (
          <View style={styles.emptyFavorites}>
            <Ionicons name="heart-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyFavText}>
              Heart recipes to see them here
            </Text>
          </View>
        ) : (
          favoriteRecipes.map((r) => (
            <View key={r.id} style={styles.favRecipeRow}>
              <Ionicons name="heart" size={16} color={Colors.terracotta} />
              <Text style={styles.favRecipeName}>{r.name}</Text>
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor:
                      r.category === "salad"
                        ? Colors.tealMuted
                        : r.category === "main"
                        ? Colors.terracottaMuted
                        : Colors.cardElevated,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryBadgeText,
                    {
                      color:
                        r.category === "salad"
                          ? Colors.teal
                          : r.category === "main"
                          ? Colors.terracotta
                          : Colors.textSecondary,
                    },
                  ]}
                >
                  {r.category}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <SectionHeader title="History" />
        <View style={styles.historyRow}>
          <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.historyText}>
            {weekHistory.length} week{weekHistory.length !== 1 ? "s" : ""} planned
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 22,
    color: Colors.text,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  sectionHeader: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  cardSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: -4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: 4,
  },
  portionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  portionLabel: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  portionControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    overflow: "hidden",
  },
  portionBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  portionValue: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    color: Colors.text,
    width: 36,
    textAlign: "center",
  },
  tagInputContainer: { gap: 10 },
  tagInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tagAddBtn: {
    width: 40,
    height: 40,
    backgroundColor: Colors.teal,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.cardElevated,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tagChipText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyFavorites: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyFavText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  favRecipeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  favRecipeName: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontFamily: "Montserrat_300Light",
    fontSize: 11,
    textTransform: "capitalize",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
