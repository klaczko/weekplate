import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors, { NutritionalGroupColors, NutritionalGroups } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { generateWeeklyInsight } from "@/utils/ai";

type TimeView = "weekly" | "monthly" | "overtime";

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NutritionalBar({
  label,
  count,
  maxCount,
  color,
}: {
  label: string;
  count: number;
  maxCount: number;
  color: string;
}) {
  const pct = maxCount > 0 ? count / maxCount : 0;
  return (
    <View style={styles.nutritionBarRow}>
      <Text style={styles.nutritionBarLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.nutritionBarTrack}>
        <View
          style={[styles.nutritionBarFill, { width: `${pct * 100}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={styles.nutritionBarCount}>{count}</Text>
    </View>
  );
}

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { currentWeekPlan, recipes, weekHistory } = useApp();
  const [view, setView] = useState<TimeView>("weekly");
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const stats = useMemo(() => {
    const plans = view === "weekly"
      ? currentWeekPlan ? [currentWeekPlan] : []
      : weekHistory.slice(-4);

    let mealsCooked = 0;
    let daysAway = 0;
    let mealsWithVegetables = 0;
    let newRecipesUsed = new Set<string>();
    const nutritionalCoverage: Record<string, number> = {};
    const topRecipesCount: Record<string, number> = {};

    plans.forEach((plan) => {
      Object.values(plan.days).forEach((day) => {
        if (day.status === "away") { daysAway++; return; }
        const allSlots = [...day.lunch, ...day.dinner];
        allSlots.forEach((slot) => {
          if (!slot.recipeId) return;
          mealsCooked++;
          newRecipesUsed.add(slot.recipeId);
          topRecipesCount[slot.recipeId] = (topRecipesCount[slot.recipeId] ?? 0) + 1;
          const recipe = recipes.find((r) => r.id === slot.recipeId);
          if (recipe?.nutritionalGroups) {
            const groups = recipe.nutritionalGroups;
            if (groups.vegetables || groups.leaves || groups.roots) mealsWithVegetables++;
            Object.entries(groups).forEach(([key, val]) => {
              if (val) nutritionalCoverage[key] = (nutritionalCoverage[key] ?? 0) + 1;
            });
          }
        });
      });
    });

    const topRecipes = Object.entries(topRecipesCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => recipes.find((r) => r.id === id)?.name ?? id);

    const vegetablePct =
      mealsCooked > 0 ? Math.round((mealsWithVegetables / mealsCooked) * 100) : 0;

    return {
      mealsCooked,
      daysAway,
      vegetablePct,
      newRecipesUsed: newRecipesUsed.size,
      nutritionalCoverage,
      topRecipes,
    };
  }, [currentWeekPlan, recipes, view, weekHistory]);

  const maxNutrition = useMemo(
    () => Math.max(1, ...Object.values(stats.nutritionalCoverage)),
    [stats.nutritionalCoverage]
  );

  const fetchInsight = async () => {
    if (loadingInsight) return;
    setLoadingInsight(true);
    try {
      const text = await generateWeeklyInsight({
        mealsCooked: stats.mealsCooked,
        daysAway: stats.daysAway,
        nutritionalCoverage: stats.nutritionalCoverage,
        topRecipes: stats.topRecipes,
      });
      setInsight(text);
    } catch {
      setInsight("Keep cooking — every meal at home is a step toward better health.");
    }
    setLoadingInsight(false);
  };

  useEffect(() => {
    if (stats.mealsCooked > 0) fetchInsight();
  }, [view]);

  const views: TimeView[] = ["weekly", "monthly", "overtime"];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analysis</Text>
      </View>

      <View style={styles.viewToggle}>
        {views.map((v) => (
          <Pressable
            key={v}
            style={[styles.viewTab, view === v && styles.viewTabActive]}
            onPress={() => setView(v)}
          >
            <Text
              style={[styles.viewTabText, view === v && styles.viewTabTextActive]}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {insight || loadingInsight ? (
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIconWrap}>
                <Ionicons name="sparkles" size={18} color={Colors.teal} />
              </View>
              <Text style={styles.insightTitle}>Weekly Insight</Text>
            </View>
            {loadingInsight ? (
              <View style={styles.insightLoading}>
                <ActivityIndicator size="small" color={Colors.teal} />
                <Text style={styles.insightLoadingText}>Generating insight...</Text>
              </View>
            ) : (
              <Text style={styles.insightText}>{insight}</Text>
            )}
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard
            icon="restaurant-outline"
            label="Meals Cooked"
            value={stats.mealsCooked}
            color={Colors.teal}
          />
          <StatCard
            icon="airplane-outline"
            label="Days Away"
            value={stats.daysAway}
            color={Colors.terracotta}
          />
          <StatCard
            icon="leaf-outline"
            label="With Veggies"
            value={`${stats.vegetablePct}%`}
            color={Colors.success}
          />
          <StatCard
            icon="sparkles-outline"
            label="Recipes Used"
            value={stats.newRecipesUsed}
            color={Colors.warning}
          />
        </View>

        <View style={styles.nutritionSection}>
          <Text style={styles.sectionTitle}>Nutritional Balance</Text>
          <Text style={styles.sectionSubtitle}>Meals including each group</Text>
          <View style={styles.nutritionBars}>
            {NutritionalGroups.map((group) => (
              <NutritionalBar
                key={group.key}
                label={group.label}
                count={stats.nutritionalCoverage[group.key] ?? 0}
                maxCount={maxNutrition}
                color={NutritionalGroupColors[group.key]}
              />
            ))}
          </View>
        </View>

        {stats.topRecipes.length > 0 && (
          <View style={styles.topRecipesSection}>
            <Text style={styles.sectionTitle}>Most Used Recipes</Text>
            {stats.topRecipes.map((name, i) => (
              <View key={i} style={styles.topRecipeRow}>
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: i === 0 ? Colors.teal : Colors.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankText,
                      { color: i === 0 ? Colors.background : Colors.textSecondary },
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text style={styles.topRecipeName}>{name}</Text>
              </View>
            ))}
          </View>
        )}

        {stats.mealsCooked === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtext}>
              Cook some meals to see your nutritional analysis
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 22,
    color: Colors.text,
  },
  viewToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  viewTabActive: { backgroundColor: Colors.teal },
  viewTabText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewTabTextActive: { color: Colors.background },
  scroll: { flex: 1 },
  insightCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.tealMuted,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.teal + "33",
    gap: 10,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.teal + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    color: Colors.teal,
  },
  insightText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  insightLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  insightLoadingText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 26,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  nutritionSection: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  nutritionBars: { gap: 10 },
  nutritionBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nutritionBarLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    width: 100,
  },
  nutritionBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.cardElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  nutritionBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  nutritionBarCount: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    width: 24,
    textAlign: "right",
  },
  topRecipesSection: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
    gap: 10,
  },
  topRecipeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  rankText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
  },
  topRecipeName: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
    gap: 12,
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
