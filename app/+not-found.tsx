import {Link, Stack} from "expo-router";
import {StyleSheet, Text, View} from "react-native";
import {theme} from "@/config/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={s.container}>
        <Text style={s.title}>This screen does not exist.</Text>
        <Link href="/" style={s.link}>
          Go to home screen
        </Link>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  title: {
    marginBottom: 20,
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  link: {
    color: theme.colors.info,
    fontSize: 15,
  },
});
