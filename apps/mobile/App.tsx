import { colorTokens, fontTokens } from "@comprausa/design-tokens";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: colorTokens.light.background, padding: 24 }}>
      <Text style={{ color: colorTokens.light.text, fontFamily: fontTokens.family }}>
        CompraUSA VE todavía no tiene pantallas. Esta base es solo el esqueleto móvil.
      </Text>
    </View>
  );
}
