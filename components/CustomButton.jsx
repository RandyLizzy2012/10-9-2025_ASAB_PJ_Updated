import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const CustomButton = ({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading,
}) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading}
      className={containerStyles}
    >
      <LinearGradient
        colors={['#501478', '#965014']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className={`rounded-xl min-h-[62px] flex flex-row justify-center items-center ${
          isLoading ? "opacity-50" : ""
        }`}
      >
        <Text className={`text-white font-psemibold text-lg ${textStyles}`}>
          {title}
        </Text>

        {isLoading && (
          <ActivityIndicator
            animating={isLoading}
            color="#fff"
            size="small"
            className="ml-2"
          />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Google Sign In Button Component
const GoogleSignInButton = ({
  onPress,
  containerStyles,
  isLoading = false,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`bg-white rounded-xl min-h-[62px] flex flex-row justify-center items-center ${containerStyles} ${
        isLoading ? "opacity-50" : ""
      }`}
      disabled={isLoading}
    >
      <Text className="text-black font-psemibold text-lg mr-2">🔑</Text>
      <Text className="text-black font-psemibold text-lg">
        {isLoading ? "Signing in..." : "Continue with Google"}
      </Text>

      {isLoading && (
        <ActivityIndicator
          animating={isLoading}
          color="#000"
          size="small"
          className="ml-2"
        />
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;
export { GoogleSignInButton };
