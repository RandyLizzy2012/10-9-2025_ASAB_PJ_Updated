import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useGlobalContext } from "../../context/GlobalProvider";
import { getFollowers } from "../../lib/appwrite";
import { databases, appwriteConfig } from "../../lib/appwrite";
import { images } from "../../constants";
import { router } from "expo-router";

const Followers = () => {
  const { user } = useGlobalContext();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowers = async () => {
      setLoading(true);
      try {
        const ids = await getFollowers(user.$id);
        const users = await Promise.all(
          ids.map(async (uid) => {
            try {
              const u = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, uid);
              return { $id: u.$id, username: u.username, avatar: u.avatar };
            } catch {
              return { $id: uid, username: 'Unknown', avatar: images.profile };
            }
          })
        );
        setFollowers(users);
      } catch {
        setFollowers([]);
      }
      setLoading(false);
    };
    if (user?.$id) fetchFollowers();
  }, [user?.$id]);

  const handleUserPress = (userId) => {
    if (userId && userId !== user?.$id) {
      router.push(`/profile/${userId}`);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#162219ff' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 18 }}>Followers</Text>
        {loading ? (
          <ActivityIndicator color="#a77df8" size="large" style={{ marginTop: 40 }} />
        ) : followers.length === 0 ? (
          <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center', marginTop: 40 }}>No followers yet.</Text>
        ) : (
          <FlatList
            data={followers}
            keyExtractor={u => u.$id}
            renderItem={({ item: u }) => (
              <TouchableOpacity onPress={() => handleUserPress(u.$id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' }}>
                <Image source={{ uri: u.avatar || images.profile }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 16 }} />
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{u.username}</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default Followers; 