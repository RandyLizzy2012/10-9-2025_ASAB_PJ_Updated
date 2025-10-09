import { useState, useEffect } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, FlatList, TouchableOpacity, Image, TextInput } from "react-native";
import { Query } from 'react-native-appwrite';

import { icons } from "../../constants";
import { databases, appwriteConfig, getCurrentUser } from "../../lib/appwrite";
import { useGlobalContext } from "../../context/GlobalProvider";

const Friends = () => {
  const { user: currentUser } = useGlobalContext();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const userResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId
        );
        
        // Filter out the current user
        const otherUsers = userResponse.documents.filter(user => user.$id !== currentUser?.$id);
        setUsers(otherUsers);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserPress = (userId) => {
    router.push(`/profile/${userId}`);
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleUserPress(item.$id)}
      className="flex-row items-center p-4 bg-gray rounded-lg mb-3"
      activeOpacity={0.7}
    >
      <View className="w-12 h-12 border border-gray-400 rounded-full flex justify-center items-center mr-4">
        <Image
          source={{ uri: item.avatar }}
          className="w-[90%] h-[90%] rounded-full"
          resizeMode="cover"
        />
      </View>
      
      <View className="flex-1">
        <Text className="text-white font-psemibold text-lg">
          {item.username}
        </Text>
        <Text className="text-gray-300 text-sm">
          {item.isPrivate ? "🔒 Private Profile" : "🌐 Public Profile"}
        </Text>
      </View>
      
      <Image
        source={icons.rightArrow}
        className="w-5 h-5"
        resizeMode="contain"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="bg-primary h-full">
      <View className="px-4 py-6">
        <Text className="text-2xl text-white font-psemibold mb-6">Discover Users</Text>
        
        {/* Search Input */}
        <View className="flex-row items-center bg-black rounded-lg px-4 py-3 mb-6">
          <Image
            source={icons.search}
            className="w-5 h-5 mr-3"
            resizeMode="contain"
          />
          <TextInput
            placeholder="Search users..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-white text-base"
          />
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg">Loading users...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.$id}
            renderItem={renderUser}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-gray-300 text-lg text-center">
                  {searchQuery ? "No users found matching your search" : "No users found"}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default Friends; 