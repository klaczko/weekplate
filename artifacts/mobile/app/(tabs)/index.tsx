import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import {
  getTodayDateString,
  isWeekend,
  getDayName,
  getMonthDay,
  getWeekDates,
} from "@/utils/dates";
import { MealSlot } from "@/context/AppContext";

function BatchCookingAlert({ ingredient }: { ingredient: string }) {
  return (
    <View style={styles.batchAlert}>
      <Ionicons name="flame" size={14} color={Colors.terracotta} />
      <Text style={styles.batchAlertText}>
        Batch cook {ingredient} — used 3+ times this week
      </Text>
    </View>
  );
}

function MealCard({
  title,
  portions,
  slots,
  date,
  mealType,
}: {
  title: string;
  portions: number;
  slots: MealSlot[];
  date: string;
  mealType: "lunch" | "dinner";
}) {
  const { getRecipeById } = useApp();
  const filledSlots = slots.filter((s) => s.recipeId);

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealCardHeader}>
        <Text style={styles.mealCardTitle}>{title}</Text>
        <View style={styles.portionBadge}>
          <Ionicons name="person" size={10} color={Colors.textSecondary} />
          <Text style={styles.portionText}>{portions}</Text>
        </View>
      </View>
      {filledSlots.length === 0 ? (
        <Pressable
          style={styles.emptyMealSlot}
          onPress={() => router.push("/week")}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.emptyMealText}>No meal planned</Text>
        </Pressable>
      ) : (
        filledSlots.map((slot, i) => {
          const recipe = getRecipeById(slot.recipeId!);
          return (
            <Pressable
              key={i}
              style={styles.mealItem}
              onPress={() => recipe && router.push(`/recipe/${recipe.id}`)}
            >
              <View
                style={[
                  styles.mealCategoryDot,
                  {
                    backgroundColor:
                      slot.category === "salad"
                        ? Colors.teal
                        : slot.category === "main"
                        ? Colors.terracotta
                        : Colors.textMuted,
                  },
                ]}
              />
              <Text style={styles.mealItemText}>
                {recipe?.name ?? "Unknown recipe"}
              </Text>
              <Text style={styles.mealCategoryLabel}>{slot.category}</Text>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

function DidntCookModal({
  visible,
  date,
  onClose,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
}) {
  const { currentWeekPlan, saveLeftovers } = useApp();
  const [selectedMeal, setSelectedMeal] = useState<"lunch" | "dinner" | null>(null);

  const day = currentWeekPlan?.days[date];

  const handleSave = () => {
    if (!selectedMeal || !day) return;
    const slots = day[selectedMeal];
    const recipeIds = slots.filter((s) => s.recipeId).map((s) => s.recipeId!);
    saveLeftovers(date, selectedMeal, recipeIds);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Saved!",
      "Leftovers saved to your fridge stock for next week.",
      [{ text: "OK", onPress: onClose }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Which meal didn't you cook?</Text>
          <Text style={styles.modalSubtitle}>
            We'll save the ingredients to your fridge stock for next week.
          </Text>

          {(["lunch", "dinner"] as const).map((meal) => (
            <Pressable
              key={meal}
              style={[
                styles.mealChoice,
                selectedMeal === meal && styles.mealChoiceSelected,
              ]}
              onPress={() => setSelectedMeal(meal)}
            >
              <Ionicons
                name={meal === "lunch" ? "sunny-outline" : "moon-outline"}
                size={20}
                color={selectedMeal === meal ? Colors.teal : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.mealChoiceText,
                  selectedMeal === meal && { color: Colors.teal },
                ]}
              >
                {meal.charAt(0).toUpperCase() + meal.slice(1)}
              </Text>
              {selectedMeal === meal && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.teal} />
              )}
            </Pressable>
          ))}

          <Pressable
            style={[styles.confirmBtn, !selectedMeal && styles.confirmBtnDisabled]}
            onPress={handleSave}
            disabled={!selectedMeal}
          >
            <Text style={styles.confirmBtnText}>Save Leftovers</Text>
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { currentWeekPlan, recipes, profile } = useApp();
  const today = getTodayDateString();
  const weekend = isWeekend(today);
  const [showDidntCook, setShowDidntCook] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const todayPlan = currentWeekPlan?.days[today];

  if (weekend || !currentWeekPlan) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {weekend ? "Weekend Mode" : "Good morning"}
          </Text>
          <Text style={styles.dateText}>
            {getDayName(today)}, {getMonthDay(today)}
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={48} color={Colors.teal} />
          </View>
          <Text style={styles.emptyTitle}>
            {weekend ? "Plan Your Week" : "No Plan Yet"}
          </Text>
          <Text style={styles.emptySubtext}>
            {weekend
              ? "It's the weekend — perfect time to plan your meals for next week"
              : "Start your week by creating a meal plan"}
          </Text>
          <Pressable
            style={styles.planBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/planning");
            }}
          >
            <Ionicons name="sparkles-outline" size={18} color={Colors.background} />
            <Text style={styles.planBtnText}>Plan This Week</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const lunchSlots = todayPlan?.lunch ?? [];
  const dinnerSlots = todayPlan?.dinner ?? [];

  const batchIngredients: string[] = [];
  if (currentWeekPlan) {
    const ingredientCount: Record<string, number> = {};
    Object.values(currentWeekPlan.days).forEach((day) => {
      [...day.lunch, ...day.dinner].forEach((slot) => {
        if (!slot.recipeId) return;
        const recipe = recipes.find((r) => r.id === slot.recipeId);
        recipe?.ingredients?.forEach((ing) => {
          const k = ing.name.toLowerCase();
          ingredientCount[k] = (ingredientCount[k] ?? 0) + 1;
        });
      });
    });
    Object.entries(ingredientCount).forEach(([name, count]) => {
      if (count >= 3) batchIngredients.push(name);
    });
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Today's Meals</Text>
          <Text style={styles.dateText}>
            {getDayName(today)}, {getMonthDay(today)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => router.push("/(tabs)/week")}
          >
            <Ionicons name="calendar-outline" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {batchIngredients.length > 0 && (
          <View style={styles.alertsSection}>
            {batchIngredients.slice(0, 3).map((ing) => (
              <BatchCookingAlert key={ing} ingredient={ing} />
            ))}
          </View>
        )}

        <MealCard
          title="Lunch"
          portions={profile.lunchPortions}
          slots={lunchSlots}
          date={today}
          mealType="lunch"
        />
        <MealCard
          title="Dinner"
          portions={profile.dinnerPortions}
          slots={dinnerSlots}
          date={today}
          mealType="dinner"
        />

        <View style={styles.quickActions}>
          <Pressable
            style={styles.quickActionBtn}
            onPress={() => router.push("/(tabs)/recipes")}
          >
            <Ionicons name="cart-outline" size={20} color={Colors.teal} />
            <Text style={styles.quickActionText}>Shopping List</Text>
          </Pressable>
          <Pressable
            style={[styles.quickActionBtn, { borderColor: Colors.terracotta + "44" }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDidntCook(true);
            }}
          >
            <Ionicons name="close-circle-outline" size={20} color={Colors.terracotta} />
            <Text style={[styles.quickActionText, { color: Colors.terracotta }]}>
              Didn't Cook
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <DidntCookModal
        visible={showDidntCook}
        date={today}
        onClose={() => setShowDidntCook(false)}
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
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  greeting: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 22,
    color: Colors.text,
  },
  dateText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  alertsSection: {
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
  },
  batchAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.terracottaMuted,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.terracotta,
  },
  batchAlertText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: Colors.terracotta,
    flex: 1,
  },
  mealCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  mealCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealCardTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  portionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.cardElevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  portionText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyMealSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: 10,
    borderStyle: "dashed",
  },
  emptyMealText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  mealCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mealItemText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  mealCategoryLabel: {
    fontFamily: "Montserrat_300Light",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "capitalize",
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.teal + "44",
  },
  quickActionText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    color: Colors.teal,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.tealMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  planBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.teal,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 12,
  },
  planBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textMuted,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  modalSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  mealChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  mealChoiceSelected: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealMuted,
  },
  mealChoiceText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 15,
    color: Colors.textSecondary,
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
