import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} />
        <Label>Today</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="week">
        <Icon sf={{ default: "calendar", selected: "calendar.badge.clock" }} />
        <Label>Week</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="recipes">
        <Icon sf={{ default: "fork.knife", selected: "fork.knife.circle.fill" }} />
        <Label>Recipes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analysis">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Analysis</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.teal,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: Colors.tabBarBorder,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: Colors.tabBar }]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Montserrat_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="sun.max" tintColor={color} size={size} />
            ) : (
              <Ionicons name="sunny-outline" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: "Week",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={size} />
            ) : (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="fork.knife" tintColor={color} size={size} />
            ) : (
              <Ionicons name="restaurant-outline" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={size} />
            ) : (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={size} />
            ) : (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
