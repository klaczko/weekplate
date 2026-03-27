import React, { useRef, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import {
  getWeekDates,
  getDayName,
  getMonthDay,
  getCurrentWeekId,
} from "@/utils/dates";
import {
  generateWeekPlan,
  extractIngredientsFromImage,
  extractIngredientsFromText,
} from "@/utils/ai";
import { WeekPlan, DayMeals, DayStatus, MealSlot } from "@/context/AppContext";

const MIN_RECIPES_FOR_PLAN = 10;

type Step = "days" | "fridge" | "preferences" | "generating" | "preview";

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { recipes, setCurrentWeekPlan, fridgeStock } = useApp();
  const weekDates = getWeekDates();

  const [step, setStep] = useState<Step>("days");
  const [cookingDays, setCookingDays] = useState<Set<string>>(new Set(weekDates));
  const [fridgeInput, setFridgeInput] = useState(
    fridgeStock.map((f) => f.name).join(", ")
  );
  const [preferences, setPreferences] = useState("");
  const [surpriseMe, setSurpriseMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<WeekPlan | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleDay = (date: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCookingDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const processImage = async (base64: string) => {
    setAiLoading(true);
    const data = await extractIngredientsFromImage(base64);
    if (data?.ingredients?.length) {
      const existing = fridgeInput.trim();
      const newItems = data.ingredients.join(", ");
      setFridgeInput(existing ? `${existing}, ${newItems}` : newItems);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("No ingredients found", "Try a clearer photo of your fridge or ingredients.");
    }
    setAiLoading(false);
  };

  const handlePickPhoto = () => {
    if (Platform.OS === "web") {
      Alert.alert("Photo input", "Use the gallery to pick a photo of your fridge.", [
        {
          text: "Choose from Gallery",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images",
                quality: 0.7,
                base64: true,
              });
              if (!result.canceled && result.assets?.[0]?.base64) {
                await processImage(result.assets[0].base64!);
              }
            } catch {
              Alert.alert("Error", "Could not open gallery.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    Alert.alert("Add fridge photo", "How would you like to add a photo?", [
      {
        text: "Take Photo",
        onPress: async () => {
          try {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets?.[0]?.base64) {
              await processImage(result.assets[0].base64!);
            }
          } catch {
            Alert.alert("Error", "Could not open camera.");
          }
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "images",
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets?.[0]?.base64) {
              await processImage(result.assets[0].base64!);
            }
          } catch {
            Alert.alert("Error", "Could not open gallery.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleVoiceInput = () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Voice input",
        "Type your ingredients in the box — Portuguese, Spanish, and English all work!"
      );
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Alert.alert("Not supported", "Voice input isn't available in this browser.");
      return;
    }
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR,es,en";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      setAiLoading(true);
      const data = await extractIngredientsFromText(transcript);
      if (data?.ingredients?.length) {
        const existing = fridgeInput.trim();
        const newItems = data.ingredients.join(", ");
        setFridgeInput(existing ? `${existing}, ${newItems}` : newItems);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const existing = fridgeInput.trim();
        setFridgeInput(existing ? `${existing}, ${transcript}` : transcript);
      }
      setAiLoading(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  const handleGenerate = async () => {
    setStep("generating");
    setLoading(true);
    try {
      const fridgeItems = fridgeInput
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const effectivePreferences = surpriseMe
        ? "Surprise me with a balanced, varied week. Use different recipes for each day."
        : preferences || "balanced and healthy meals";

      const data = await generateWeekPlan({
        cookingDays: weekDates
          .filter((d) => cookingDays.has(d))
          .map((d) => getDayName(d)),
        fridgeItems,
        preferences: effectivePreferences,
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
          const dayData =
            data.days[date] ??
            Object.values(data.days)[weekDates.indexOf(date)];
          const status: DayStatus = cookingDays.has(date) ? "cooking" : "away";

          const parseSlots = (rawSlots: any[]): MealSlot[] => {
            if (!Array.isArray(rawSlots)) return [];
            return rawSlots.map((s: any) => ({
              category: s.category ?? "main",
              recipeId:
                s.recipeId && s.recipeId !== "null" ? s.recipeId : undefined,
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
        Alert.alert("Could not generate", "Please try again.");
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

  const stepOrder: Step[] = ["days", "fridge", "preferences"];
  const currentStepIdx = stepOrder.indexOf(step);

  const stepTitles: Record<Step, { title: string; subtitle: string }> = {
    days: {
      title: "Cooking Days",
      subtitle: "Which days will you be home to cook?",
    },
    fridge: {
      title: "What's hiding in your fridge?",
      subtitle: "Any leftovers or fresh ingredients we should use up?",
    },
    preferences: {
      title: "Any cravings this week?",
      subtitle: "Tell us what you're in the mood for — or let us surprise you",
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

  const currentConfig = stepTitles[step];
  const notEnoughRecipes = recipes.length < MIN_RECIPES_FOR_PLAN;

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
              if (
                step === "days" ||
                step === "generating" ||
                step === "preview"
              ) {
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
                    <Text
                      style={[
                        styles.dayChipDay,
                        active && { color: Colors.background },
                      ]}
                    >
                      {getDayName(date, true)}
                    </Text>
                    <Text
                      style={[
                        styles.dayChipDate,
                        active && { color: Colors.background + "99" },
                      ]}
                    >
                      {getMonthDay(date)}
                    </Text>
                    {active && (
                      <View style={styles.dayChipCheck}>
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={Colors.background}
                        />
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
              placeholder="tomate, frango, abobrinha, eggs, leftover pasta sauce..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={5}
            />
            <Text style={styles.inputHint}>
              Portuguese, Spanish, or English — all work. Separate with commas or line breaks.
            </Text>

            <View style={styles.mediaButtons}>
              <Pressable
                style={[styles.mediaBtn, aiLoading && styles.mediaBtnLoading]}
                onPress={handlePickPhoto}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color={Colors.teal} />
                ) : (
                  <Ionicons name="camera-outline" size={22} color={Colors.teal} />
                )}
                <Text style={styles.mediaBtnText}>
                  {aiLoading ? "Identifying..." : "Photo of fridge"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.mediaBtn,
                  isRecording && styles.mediaBtnRecording,
                ]}
                onPress={handleVoiceInput}
                disabled={aiLoading}
              >
                <Ionicons
                  name={isRecording ? "stop-circle" : "mic-outline"}
                  size={22}
                  color={isRecording ? Colors.terracotta : Colors.teal}
                />
                <Text
                  style={[
                    styles.mediaBtnText,
                    isRecording && { color: Colors.terracotta },
                  ]}
                >
                  {isRecording ? "Tap to stop" : "Voice input"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {step === "preferences" && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {notEnoughRecipes ? (
              <View style={styles.notEnoughCard}>
                <Ionicons
                  name="book-outline"
                  size={32}
                  color={Colors.terracotta}
                />
                <Text style={styles.notEnoughTitle}>
                  Need more recipes first
                </Text>
                <Text style={styles.notEnoughText}>
                  Add at least {MIN_RECIPES_FOR_PLAN} recipes to your bank
                  before generating a plan. You have {recipes.length} so far —
                  just {MIN_RECIPES_FOR_PLAN - recipes.length} more to go!
                </Text>
                <Pressable
                  style={styles.goToRecipesBtn}
                  onPress={() => router.replace("/(tabs)/recipes")}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={Colors.background}
                  />
                  <Text style={styles.goToRecipesBtnText}>Add Recipes</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Pressable
                  style={[
                    styles.surpriseCheckbox,
                    surpriseMe && styles.surpriseCheckboxActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSurpriseMe((v) => !v);
                    if (!surpriseMe) setPreferences("");
                  }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      surpriseMe && styles.checkboxChecked,
                    ]}
                  >
                    {surpriseMe && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={Colors.background}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.surpriseLabel}>
                      Nothing special, surprise me! 🎲
                    </Text>
                    <Text style={styles.surpriseSubLabel}>
                      AI picks the best balanced plan from your recipes
                    </Text>
                  </View>
                </Pressable>

                {!surpriseMe && (
                  <TextInput
                    style={styles.bigInput}
                    value={preferences}
                    onChangeText={setPreferences}
                    placeholder="Quero algo leve essa semana. Include that roasted chicken recipe, avoid heavy carbs for lunch..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={5}
                  />
                )}

                {recipes.length > 0 && (
                  <View style={styles.recipesHint}>
                    <Ionicons
                      name="book-outline"
                      size={14}
                      color={Colors.teal}
                    />
                    <Text style={styles.recipesHintText}>
                      Planning using {recipes.length} recipe
                      {recipes.length > 1 ? "s" : ""} from your bank
                    </Text>
                  </View>
                )}
              </>
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
              const lunchIds =
                day?.lunch
                  .filter((s) => s.recipeId)
                  .map((s) => s.recipeId!) ?? [];
              const dinnerIds =
                day?.dinner
                  .filter((s) => s.recipeId)
                  .map((s) => s.recipeId!) ?? [];
              return (
                <View key={date} style={styles.previewDay}>
                  <View style={styles.previewDayHeader}>
                    <Text style={styles.previewDayName}>
                      {getDayName(date, true)}
                    </Text>
                    <Text style={styles.previewDayDate}>
                      {getMonthDay(date)}
                    </Text>
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
          <View style={[styles.bottomBar, { paddingBottom: bottomPad + 16 }]}>
            <Pressable
              style={[
                styles.nextBtn,
                step === "preferences" && notEnoughRecipes && styles.nextBtnDisabled,
              ]}
              onPress={() => {
                const next = stepOrder[currentStepIdx + 1];
                if (next) {
                  setStep(next);
                } else {
                  handleGenerate();
                }
              }}
              disabled={step === "preferences" && notEnoughRecipes}
            >
              {currentStepIdx === stepOrder.length - 1 ? (
                <>
                  <Ionicons
                    name="sparkles-outline"
                    size={18}
                    color={Colors.background}
                  />
                  <Text style={styles.nextBtnText}>Generate Plan</Text>
                </>
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Next</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={Colors.background}
                  />
                </>
              )}
            </Pressable>
          </View>
        )}

        {step === "preview" && (
          <View style={[styles.bottomBar, { paddingBottom: bottomPad + 16 }]}>
            <Pressable
              style={styles.regenBtn}
              onPress={() => setStep("preferences")}
            >
              <Ionicons name="refresh-outline" size={18} color={Colors.teal} />
              <Text style={styles.regenBtnText}>Regenerate</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Ionicons
                name="checkmark-outline"
                size={18}
                color={Colors.background}
              />
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
  progressDot: { height: 8, borderRadius: 4 },
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
    flex: 1,
    minWidth: 56,
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
  dayChipCheck: { position: "absolute", top: 6, right: 6 },
  bigInput: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  inputHint: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  mediaButtons: {
    flexDirection: "row",
    gap: 12,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.teal + "44",
  },
  mediaBtnLoading: {
    opacity: 0.7,
  },
  mediaBtnRecording: {
    borderColor: Colors.terracotta + "66",
    backgroundColor: Colors.terracottaMuted,
  },
  mediaBtnText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    color: Colors.teal,
  },
  notEnoughCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.terracotta + "44",
  },
  notEnoughTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    color: Colors.text,
    textAlign: "center",
  },
  notEnoughText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  goToRecipesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.teal,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  goToRecipesBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: Colors.background,
  },
  surpriseCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  surpriseCheckboxActive: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealMuted,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  surpriseLabel: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  surpriseSubLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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
  previewStatusDot: { width: 8, height: 8, borderRadius: 4 },
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
  nextBtnDisabled: {
    opacity: 0.35,
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
