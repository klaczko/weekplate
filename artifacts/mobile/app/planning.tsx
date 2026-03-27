import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import {
  getWeekDates,
  getDayName,
  getMonthDay,
  getCurrentWeekId,
  generateId,
} from "@/utils/dates";
import { generateWeekPlan } from "@/utils/ai";
import { WeekPlan, DayMeals, DayStatus, MealSlot } from "@/context/AppContext";

type Step = "days" | "fridge" | "preferences" | "generating" | "preview";

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { recipes, setCurrentWeekPlan, fridgeStock, setFridgeStock } = useApp();
  const weekDates = getWeekDates();

  const [step, setStep] = useState<Step>("days");
  const [cookingDays, setCookingDays] = useState<Set<string>>(new Set(weekDates));
  const [fridgeInput, setFridgeInput] = useState(
    fridgeStock.map((f) => f.name).join(", ")
  );
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<WeekPlan | null>(null);

  const toggleDay = (date: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCookingDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const stepConfig: Record<Step, { title: string; subtitle: string }> = {
    days: {
      title: "Cooking Days",
      subtitle: "Which days will you be home to cook?",
    },
    fridge: {
      title: "Fridge Stock",
      subtitle: "What ingredients do you have? (leftovers, fresh produce...)",
    },
    preferences: {
      title: "What do you want?",
      subtitle: "Tell us your cravings or specific recipes for this week",
    },
    generating: {
      title: "Building Your Plan",
      subtitle: "AI is crafting your perfect week...",
    },
    preview: {
      title: "Your Week Plan",
      subtitle: "Review and confirm your meal plan",
    },
  };

  const handleGenerate = async () => {
    if (recipes.length === 0) {
      Alert.alert(
        "No recipes",
        "Add some recipes first! The AI plans using your recipe bank.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/recipes") }]
      );
      return;
    }

    setStep("generating");
    setLoading(true);

    try {
      const fridgeItems = fridgeInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const data = await generateWeekPlan({
        cookingDays: weekDates.filter((d) => cookingDays.has(d)).map((d) => getDayName(d)),
        fridgeItems,
        preferences: preferences || "balanced and healthy meals",
        recipes: recipes.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          ingredients: r.ingredients?.map((i) => i.name),
        })),
      });

      if (data && data.days) {
        const days: Record<string, DayMeals> = {};
        weekDates.forEach((date) => {
          const dayData = data.days[date] ?? Object.values(data.days)[weekDates.indexOf(date)];
          const status: DayStatus = cookingDays.has(date) ? "cooking" : "away";

          const parseSlots = (rawSlots: any[]): MealSlot[] => {
            if (!Array.isArray(rawSlots)) return [];
            return rawSlots.map((s: any) => ({
              category: s.category ?? "main",
              recipeId: s.recipeId && s.recipeId !== "null" ? s.recipeId : undefined,
            }));
          };

          days[date] = {
            date,
            status: dayData?.status ?? status,
            lunch: parseSlots(dayData?.lunch ?? []),
            dinner: parseSlots(dayData?.dinner ?? []),
          };
        });

        const plan: WeekPlan = {
          weekId: getCurrentWeekId(),
          startDate: weekDates[0],
          days,
        };

        setGeneratedPlan(plan);
        setStep("preview");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Could not generate", "Please try again or plan manually.");
        setStep("preferences");
      }
    } catch {
      Alert.alert("Error", "Failed to generate plan. Please try again.");
      setStep("preferences");
    }

    setLoading(false);
  };

  const handleConfirm = () => {
    if (!generatedPlan) return;
    setCurrentWeekPlan(generatedPlan);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)/week");
  };

  const currentConfig = stepConfig[step];

  const stepOrder: Step[] = ["days", "fridge", "preferences"];
  const currentStepIdx = stepOrder.indexOf(step);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.navBar}>
          <Pressable
            style={styles.navBtn}
            onPress={() => {
              if (step === "days" || step === "generating" || step === "preview") {
                router.back();
              } else {
                const prev = stepOrder[currentStepIdx - 1];
                if (prev) setStep(prev);
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>Plan This Week</Text>
          <View style={{ width: 40 }} />
        </View>

        {step !== "generating" && step !== "preview" && (
          <View style={styles.progressRow}>
            {stepOrder.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      i <= currentStepIdx ? Colors.teal : Colors.cardBorder,
                    width: i === currentStepIdx ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        )}

        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{currentConfig.title}</Text>
          <Text style={styles.stepSubtitle}>{currentConfig.subtitle}</Text>
        </View>

        {step === "days" && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.daysGrid}>
              {weekDates.map((date) => {
                const active = cookingDays.has(date);
                return (
                  <Pressable
                    key={date}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => toggleDay(date)}
                  >
                    <Text style={[styles.dayChipDay, active && { color: Colors.background }]}>
                      {getDayName(date, true)}
                    </Text>
                    <Text style={[styles.dayChipDate, active && { color: Colors.background + "99" }]}>
                      {getMonthDay(date)}
                    </Text>
                    {active && (
                      <View style={styles.dayChipCheck}>
                        <Ionicons name="checkmark" size={14} color={Colors.background} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {step === "fridge" && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={styles.bigInput}
              value={fridgeInput}
              onChangeText={setFridgeInput}
              placeholder="zucchini, chicken breast, eggs, leftover pasta sauce..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
            />
            <Text style={styles.inputHint}>
              Separate ingredients with commas. Include leftover meals if any.
            </Text>
          </ScrollView>
        )}

        {step === "preferences" && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={styles.bigInput}
              value={preferences}
              onChangeText={setPreferences}
              placeholder="I want something light this week. Include that roasted chicken recipe from last month, and try to avoid heavy carbs for lunch..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
            />
            {recipes.length > 0 && (
              <View style={styles.recipesHint}>
                <Ionicons name="book-outline" size={14} color={Colors.teal} />
                <Text style={styles.recipesHintText}>
                  Planning using {recipes.length} recipe{recipes.length > 1 ? "s" : ""} from your bank
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {step === "generating" && (
          <View style={styles.generatingContainer}>
            <View style={styles.generatingIcon}>
              <ActivityIndicator size="large" color={Colors.teal} />
            </View>
            <Text style={styles.generatingTitle}>Crafting your perfect week</Text>
            <Text style={styles.generatingSubtitle}>
              Optimizing for batch cooking and nutritional variety...
            </Text>
          </View>
        )}

        {step === "preview" && generatedPlan && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
            showsVerticalScrollIndicator={false}
          >
            {weekDates.map((date) => {
              const day = generatedPlan.days[date];
              const lunchIds = day?.lunch.filter((s) => s.recipeId).map((s) => s.recipeId!) ?? [];
              const dinnerIds = day?.dinner.filter((s) => s.recipeId).map((s) => s.recipeId!) ?? [];
              return (
                <View key={date} style={styles.previewDay}>
                  <View style={styles.previewDayHeader}>
                    <Text style={styles.previewDayName}>{getDayName(date, true)}</Text>
                    <Text style={styles.previewDayDate}>{getMonthDay(date)}</Text>
                    <View
                      style={[
                        styles.previewStatusDot,
                        {
                          backgroundColor:
                            day?.status === "cooking"
                              ? Colors.teal
                              : day?.status === "away"
                              ? Colors.terracotta
                              : Colors.textMuted,
                        },
                      ]}
                    />
                  </View>
                  {lunchIds.length > 0 && (
                    <View style={styles.previewMeal}>
                      <Text style={styles.previewMealLabel}>Lunch</Text>
                      {lunchIds.map((id) => (
                        <Text key={id} style={styles.previewRecipeName}>
                          {recipes.find((r) => r.id === id)?.name ?? id}
                        </Text>
                      ))}
                    </View>
                  )}
                  {dinnerIds.length > 0 && (
                    <View style={styles.previewMeal}>
                      <Text style={styles.previewMealLabel}>Dinner</Text>
                      {dinnerIds.map((id) => (
                        <Text key={id} style={styles.previewRecipeName}>
                          {recipes.find((r) => r.id === id)?.name ?? id}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {(step === "days" || step === "fridge" || step === "preferences") && (
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: bottomPad + 16 },
            ]}
          >
            <Pressable
              style={styles.nextBtn}
              onPress={() => {
                const next = stepOrder[currentStepIdx + 1];
                if (next) {
                  setStep(next);
                } else {
                  handleGenerate();
                }
              }}
            >
              {currentStepIdx === stepOrder.length - 1 ? (
                <>
                  <Ionicons name="sparkles-outline" size={18} color={Colors.background} />
                  <Text style={styles.nextBtnText}>Generate Plan</Text>
                </>
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.background} />
                </>
              )}
            </Pressable>
          </View>
        )}

        {step === "preview" && (
          <View style={[styles.bottomBar, { paddingBottom: bottomPad + 16 }]}>
            <Pressable style={styles.regenBtn} onPress={() => setStep("preferences")}>
              <Ionicons name="refresh-outline" size={18} color={Colors.teal} />
              <Text style={styles.regenBtnText}>Regenerate</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark-outline" size={18} color={Colors.background} />
              <Text style={styles.confirmBtnText}>Use This Plan</Text>
            </Pressable>
          </View>
        )}
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
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
  },
  stepHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  stepTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  stepSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  scroll: { flex: 1, paddingHorizontal: 20 },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayChip: {
    width: "18%",
    minWidth: 60,
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    position: "relative",
  },
  dayChipActive: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  dayChipDay: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: Colors.text,
  },
  dayChipDate: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dayChipCheck: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  bigInput: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 140,
    textAlignVertical: "top",
  },
  inputHint: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
    lineHeight: 18,
  },
  recipesHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: Colors.tealMuted,
    borderRadius: 10,
    padding: 12,
  },
  recipesHintText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    color: Colors.teal,
  },
  generatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 40,
  },
  generatingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.tealMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  generatingTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
  },
  generatingSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  previewDay: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 10,
    gap: 8,
  },
  previewDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewDayName: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  previewDayDate: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  previewStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewMeal: { gap: 4 },
  previewMealLabel: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewRecipeName: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    paddingLeft: 8,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    backgroundColor: Colors.background,
    flexDirection: "row",
    gap: 10,
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.teal,
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.teal,
    backgroundColor: Colors.tealMuted,
  },
  regenBtnText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    color: Colors.teal,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.teal,
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
});
