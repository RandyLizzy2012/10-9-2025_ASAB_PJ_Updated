import React, { useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, TextInput, Alert, Modal, ScrollView, Image } from "react-native";
import { icons } from "../../constants";
import { useGlobalContext } from "../../context/GlobalProvider";

const DonationPage = () => {
  const { user } = useGlobalContext();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [donationMessage, setDonationMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const presetAmounts = [
    { amount: 1, label: "$1", description: "Support my content" },
    { amount: 5, label: "$5", description: "Help keep me going" },
    { amount: 10, label: "$10", description: "Amazing support!" }
  ];

  const handleAmountSelect = (amount) => {
    if (selectedAmount === amount) {
      setSelectedAmount(null);
    } else {
      setSelectedAmount(amount);
      setShowCustomInput(false);
      setCustomAmount("");
    }
  };

  const handleCustomAmount = () => {
    if (showCustomInput) {
      setShowCustomInput(false);
      setCustomAmount("");
    } else {
      setShowCustomInput(true);
      setSelectedAmount(null);
    }
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount("");
    setShowCustomInput(false);
    setDonationMessage("");
    setIsProcessing(false);
  };

  const handleDonate = async () => {
    if (!selectedAmount && !customAmount) {
      Alert.alert("Error", "Please select an amount to donate");
      return;
    }

    const finalAmount = selectedAmount || parseFloat(customAmount);
    
    if (isNaN(finalAmount) || finalAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        "Donation Successful! 🎉",
        `Thank you for your generous donation of $${finalAmount.toFixed(2)}! Your support means the world to me.`,
        [
          {
            text: "Share",
            onPress: () => {
              // In a real app, this would share the donation
              Alert.alert("Shared!", "Thanks for sharing the love!");
              // Reset form after sharing
              resetForm();
            }
          },
          {
            text: "Done",
            onPress: () => {
              // Reset form before going back
              resetForm();
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to process donation. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSelectedAmountValue = () => {
    return selectedAmount || (customAmount ? parseFloat(customAmount) : 0);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={icons.leftArrow}
            resizeMode="contain"
            className="w-6 h-6"
          />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Support Creator</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Creator Info */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-green-400 border-2 border-white rounded-full items-center justify-center mb-4">
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                className="w-full h-full rounded-full"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-black text-xl font-bold">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </Text>
            )}
          </View>
          <Text className="text-white text-xl font-bold mb-1">
            {user?.username || "Creator"}
          </Text>
          <Text className="text-gray-400 text-center mb-4">
            Help support my content creation journey! Every donation helps me continue making amazing videos.
          </Text>
          
          {/* Progress Bar */}
          <View className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <View className="bg-green-400 h-2 rounded-full" style={{ width: '65%' }} />
          </View>
          <Text className="text-gray-400 text-sm">$1,250 raised of $2,000 goal</Text>
        </View>

        {/* Donation Amounts */}
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4">Choose Amount</Text>
          
          {/* Preset Amounts */}
          <View className="space-y-3 mb-4">
            {presetAmounts.map((preset, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleAmountSelect(preset.amount)}
                className={`p-4 rounded-xl border-2 ${
                  selectedAmount === preset.amount 
                    ? 'border-green-400 bg-green-400 bg-opacity-20' 
                    : 'border-gray-600 bg-gray-800'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className={`text-lg font-bold ${
                      selectedAmount === preset.amount ? 'text-white' : 'text-white'
                    }`}>
                      {preset.label}
                    </Text>
                    <Text className={`text-sm ${
                      selectedAmount === preset.amount ? 'text-white font-medium' : 'text-gray-400'
                    }`}>
                      {preset.description}
                    </Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 ${
                    selectedAmount === preset.amount 
                      ? 'border-green-400 bg-green-400' 
                      : 'border-gray-400'
                  }`}>
                    {selectedAmount === preset.amount && (
                      <View className="w-full h-full rounded-full bg-green-400 items-center justify-center">
                        <Text className="text-white text-xs font-bold">✓</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount */}
          <TouchableOpacity
            onPress={handleCustomAmount}
            className={`p-4 rounded-xl border-2 ${
              showCustomInput 
                ? 'border-green-400 bg-green-400 bg-opacity-20' 
                : 'border-gray-600 bg-gray-800'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className={`text-lg font-bold ${
                  showCustomInput ? 'text-white' : 'text-white'
                }`}>
                  Custom Amount
                </Text>
                <Text className={`text-sm ${
                  showCustomInput ? 'text-white font-medium' : 'text-gray-400'
                }`}>
                  Enter your own amount
                </Text>
              </View>
              <View className={`w-6 h-6 rounded-full border-2 ${
                showCustomInput 
                  ? 'border-green-400 bg-green-400' 
                  : 'border-gray-400'
              }`}>
                {showCustomInput && (
                  <View className="w-full h-full rounded-full bg-green-400 items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Custom Amount Input */}
          {showCustomInput && (
            <View className="mt-4 p-4 bg-gray-800 rounded-xl">
              <Text className="text-white text-sm mb-2">Enter Amount (USD)</Text>
              <TextInput
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                className="bg-gray-700 text-white p-3 rounded-lg text-lg font-semibold"
              />
            </View>
          )}
        </View>

        {/* Optional Message */}
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4">Leave a Message (Optional)</Text>
          <TextInput
            value={donationMessage}
            onChangeText={setDonationMessage}
            placeholder="Say something nice..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
            className="bg-gray-800 text-white p-4 rounded-xl text-base"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        {/* Donation Summary */}
        {getSelectedAmountValue() > 0 && (
          <View className="mb-8 p-4 bg-gray-800 rounded-xl">
            <Text className="text-white text-lg font-semibold mb-2">Donation Summary</Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-400">Amount:</Text>
              <Text className="text-white text-xl font-bold">${getSelectedAmountValue().toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-gray-400">Processing Fee:</Text>
              <Text className="text-gray-400">Free</Text>
            </View>
            <View className="border-t border-gray-600 mt-3 pt-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-white text-lg font-bold">Total:</Text>
                <Text className="text-green-400 text-xl font-bold">${getSelectedAmountValue().toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Donate Button */}
        <TouchableOpacity
          onPress={handleDonate}
          disabled={!getSelectedAmountValue() || isProcessing}
          className={`p-4 rounded-xl mb-8 ${
            getSelectedAmountValue() && !isProcessing
              ? 'bg-green-500' 
              : 'bg-gray-600'
          }`}
        >
          <Text className="text-white text-center text-lg font-bold">
            {isProcessing ? 'Processing...' : `Donate $${getSelectedAmountValue().toFixed(2)}`}
          </Text>
        </TouchableOpacity>

        {/* Recent Donations */}
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4">Recent Supporters</Text>
          <View className="space-y-2">
            {[
              { name: "Alex M.", amount: "$10", time: "2 hours ago" },
              { name: "Sarah K.", amount: "$5", time: "4 hours ago" },
              { name: "Mike R.", amount: "$25", time: "6 hours ago" },
              { name: "Emma L.", amount: "$1", time: "1 day ago" }
            ].map((donation, index) => (
              <View key={index} className="flex-row items-center justify-between bg-gray-800 p-3 rounded-lg">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-green-400 rounded-full items-center justify-center mr-3">
                    <Text className="text-black text-xs font-bold">
                      {donation.name.charAt(0)}
                    </Text>
                  </View>
                  <Text className="text-white font-medium">{donation.name}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-green-400 font-bold">{donation.amount}</Text>
                  <Text className="text-gray-400 text-xs">{donation.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Trust Indicators */}
        <View className="mb-8">
          <Text className="text-gray-400 text-sm text-center mb-4">
            🔒 Secure Payment • 💝 100% goes to creator • 🚫 No hidden fees
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DonationPage;
