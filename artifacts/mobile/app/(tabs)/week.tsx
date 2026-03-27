import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
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
  getTodayDateString,
} from "@/utils/dates";
import { DayStatus, MealSlot } from "@/context/AppContext";

function StatusBadge({ status }: { status: DayStatus }) {
  const config = {
    cooking: { color: Colors.teal, label: "Cooking", icon: "restaurant-outline" },
    away: { color: Colors.terracotta, label: "Away", icon: "airplane-outline" },
    unplanned: { color: Colors.textMuted, label: "Unplanned", icon: "ellipsis-horizontal" },
  }[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.color + "22" }]}>
      <Ionicons name={config.icon as any} size={10} color={config.color} />
      <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function MealSlotRow({ slot, getRecipeById }: { slot: MealSlot; getRecipeById: (id: string) => any }) {
  const recipe = slot.recipeId ? getRecipeById(slot.recipeId) : null;
  const dotColor =
    slot.category === "salad"
      ? Colors.teal
      : slot.category === "main"
      ? Colors.terracotta
      : Colors.textMuted;

  return (
    <View style={styles.slotRow}>
      <View style={[styles.slotDot, { backgroundColor: dotColor }]} />
      <Text style={styles.slotText} numberOfLines={1}>
        {recipe?.name ?? "—"}
      </Text>
    </View>
  );
}

function DayCard({
  date,
  isToday,
}: {
  date: string;
  isToday: boolean;
}) {
  const { currentWeekPlan, updateDayStatus, getRecipeById } = useApp();
  const day = currentWeekPlan?.days[date];
  const status: DayStatus = day?.status ?? "unplanned";

  const lunchSlots = day?.lunch.filter((s) => s.recipeId) ?? [];
  const dinnerSlots = day?.dinner.filter((s) => s.recipeId) ?? [];

  const cycleStatus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cycle: DayStatus[] = ["cooking", "away", "unplanned"];
    const next = cycle[(cycle.indexOf(status) + 1) % cycle.length];
    updateDayStatus(date, next);
  };

  return (
    <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
      <View style={styles.dayCardHeader}>
        <View>
          <Text style={[styles.dayName, isToday && { color: Colors.teal }]}>
            {getDayName(date, true)}
          </Text>
          <Text style={styles.dayDate}>{getMonthDay(date)}</Text>
        </View>
        <Pressable onPress={cycleStatus}>
          <StatusBadge status={status} />
        </Pressable>
      </View>

      {status === "cooking" ? (
        <View style={styles.mealsGrid}>
          <View style={styles.mealColumn}>
            <View style={styles.mealColumnHeader}>
              <Ionicons name="sunny-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.mealColumnTitle}>Lunch</Text>
            </View>
            {lunchSlots.length > 0 ? (
              lunchSlots.map((slot, i) => (
                <MealSlotRow key={i} slot={slot} getRecipeById={getRecipeById} />
              ))
            ) : (
              <Text style={styles.emptySlotText}>Not planned</Text>
            )}
          </View>
          <View style={styles.mealDivider} />
          <View style={styles.mealColumn}>
            <View style={styles.mealColumnHeader}>
              <Ionicons name="moon-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.mealColumnTitle}>Dinner</Text>
            </View>
            {dinnerSlots.length > 0 ? (
              dinnerSlots.map((slot, i) => (
                <MealSlotRow key={i} slot={slot} getRecipeById={getRecipeById} />
              ))
            ) : (
              <Text style={styles.emptySlotText}>Not planned</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.awayPlaceholder}>
          <Ionicons
            name={status === "away" ? "airplane-outline" : "add-circle-outline"}
            size={16}
            color={status === "away" ? Colors.terracotta : Colors.textMuted}
          />
          <Text
            style={[
              styles.awayText,
              {
                color:
                  status === "away" ? Colors.terracotta + "88" : Colors.textMuted,
              },
            ]}
          >
            {status === "away" ? "Away from home" : "Tap status to plan"}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function WeekScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { currentWeekPlan } = useApp();
  const weekDates = getWeekDates();
  const today = getTodayDateString();

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>This Week</Text>
          <Text style={styles.headerSubtitle}>Mon — Fri</Text>
        </View>
        <Pressable
          style={styles.planBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/planning");
          }}
        >
          <Ionicons name="sparkles-outline" size={16} color={Colors.background} />
          <Text style={styles.planBtnText}>Plan</Text>
        </Pressable>
      </View>

      {!currentWeekPlan ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={48} color={Colors.teal} />
          </View>
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Text style={styles.emptySubtext}>
            Use the Plan button to create your week's meal plan with AI
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: bottomPad + 90, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {weekDates.map((date) => (
            <DayCard key={date} date={date} isToday={date === today} />
          ))}
        </ScrollView>
      )}
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
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 22,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.teal,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  planBtnText: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    color: Colors.background,
  },
  scroll: { flex: 1, paddingHorizontal: 20 },
  dayCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dayCardToday: {
    borderColor: Colors.teal + "55",
    backgroundColor: Colors.tealMuted,
  },
  dayCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  dayName: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    color: Colors.text,
  },
  dayDate: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusLabel: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
  },
  mealsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  mealColumn: { flex: 1, gap: 4 },
  mealDivider: {
    width: 1,
    backgroundColor: Colors.separator,
  },
  mealColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  mealColumnTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slotText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  emptySlotText: {
    fontFamily: "Montserrat_300Light",
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  awayPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  awayText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
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
});
