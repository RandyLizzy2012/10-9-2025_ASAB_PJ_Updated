import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from 'expo-linear-gradient';
import { images } from "../../constants";
import FormField from "../../components/FormField";
import CustomButton from "../../components/CustomButton";
import { signIn, getCurrentUser } from "../../lib/appwrite";
import { useRouter } from "expo-router";
import { useGlobalContext } from "../../context/GlobalProvider";

const SignIn = () => {
  const router = useRouter();
  const { setUser, setIsLogged } = useGlobalContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (form.email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all the fields");
    }

    setIsSubmitting(true);
    try {
      const session = await signIn(form.email, form.password);
      const user = await getCurrentUser();
      setUser(user);
      setIsLogged(true);
      Alert.alert("Success", "User signed in successfully");
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={['#032727', '#000']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="h-full">
        {/* Background Logo */}
        <View className="absolute inset-0 justify-center items-center opacity-10">
          <Image
            source={images.logo}
            resizeMode="contain"
            className="w-[370px] h-[450px]"
          />
        </View>
        
        <ScrollView>
        <View className="w-full justify-end min-h-[90vh] px-4 py-6">

          <View className="space-y-4">
            <Text className="text-2xl font-bold text-white text-center">
              Sign In to ASAB
            </Text>
            <Text className="text-gray-300 text-center">
              Welcome back! Please sign in to your account
            </Text>
          </View>

          <View className="space-y-4 mt-8">
            <FormField
              title="Email"
              value={form.email}
              handleChangeText={(e) => setForm({ ...form, email: e })}
              otherStyles="mt-7"
              keyboardType="email-address"
            />

            <FormField
              title="Password"
              value={form.password}
              handleChangeText={(e) => setForm({ ...form, password: e })}
              otherStyles="mt-7"
            />
          </View>

          <CustomButton
            title="Sign In"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-300">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/sign-up")}>
              <Text className="text-secondary">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default SignIn;
