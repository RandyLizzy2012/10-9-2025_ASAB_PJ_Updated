import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Dimensions, Alert, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { images } from "../../constants";
import { createUser, signInWithGoogle } from "../../lib/appwrite";
import { CustomButton, FormField, GoogleSignInButton } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

const SignUp = () => {
  const { setUser, setIsLogged } = useGlobalContext();

  const [isSubmitting, setSubmitting] = useState(false);
  const [isGoogleSubmitting, setGoogleSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const submit = async () => {
    if (form.username === "" || form.email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!form.email.includes('@') || !form.email.includes('.')) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createUser(form.email, form.password, form.username);
      setUser(result);
      setIsLogged(true);
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    try {
      const result = await signInWithGoogle();
      setUser(result);
      setIsLogged(true);
      Alert.alert("Success", "Signed up with Google successfully");
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={['#032727', '#000']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      className="h-full"
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

            <Text className="text-2xl font-bold text-white font-psemibold mb-8">
              Sign up
            </Text>

          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(e) => setForm({ ...form, username: e })}
            placeholder="Your unique username"
            otherStyles="mt-6"
          />

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

          <CustomButton
            title="Sign Up"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="flex justify-center pt-5 items-center">
            <Text className="text-gray-300">Already have an account? </Text>
            <Link
              href="/sign-in"
              className="text-lg font-psemibold text-secondary"
            >
              Login
            </Link>
          </View>
          
          {/* White bottom indicator line */}
          <View />
        </View>
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
};

export default SignUp;
