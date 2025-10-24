import { StatusBar } from "expo-status-bar";
import { Redirect, Tabs } from "expo-router";
import { Text, View } from "react-native";
import { Feather } from '@expo/vector-icons';

import { icons } from "../../constants";
import { Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

const TabIcon = ({ name, color, focused }) => {
  let iconName;
  let label;
  switch (name) {
    case 'Home':
      iconName = 'home';
      label = 'Home';
      break;
    case 'Live':
      iconName = 'video';
      label = 'Live';
      break;
    case 'Friends':
      iconName = 'users';
      label = 'Friends';
      break;
    case 'Create':
      iconName = 'plus-circle';
      label = 'Create';
      break;
    case 'Inbox':
      iconName = 'message-circle';
      label = 'Inbox';
      break;
    case 'Profile':
      iconName = 'user';
      label = 'Profile';
      break;
    default:
      iconName = 'circle';
      label = name;
  }
  return (
    <View className="flex items-center justify-center" style={{gap: 2}}>
          <Feather name={iconName} size={26} color={color} />
      <Text
        className={`${focused ? "font-psemibold" : "font-pregular"} text-xs text-center`}
        style={{ color: color, marginTop: 2, lineHeight:16, minWidth: 48 }}
      >
        {label}
      </Text>
    </View>
  );
};

const TabLayout = () => {
  const { loading, isLogged } = useGlobalContext();

  if (!loading && !isLogged) return <Redirect href="/sign-in" />;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#a77df8",
          tabBarInactiveTintColor: "#8ff7fa",
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#161622",
            height: 94,
            borderTopWidth: 0,
          },
          tabBarItemStyle: {
            paddingHorizontal: 30,
            marginHorizontal: 8,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="Home"
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: "Friends",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="Friends"
                color={color}
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="create"
          options={{
            title: "Create",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="Create"
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={({ route }) => ({
            title: "Chat",
            headerShown: false,
            tabBarStyle: route.params?.inChat
              ? { display: "none" }
              : {
                  backgroundColor: "#161622",
                  height: 84,
                  borderTopWidth: 0,
                },
            tabBarItemStyle: {
              paddingHorizontal: 16,
              marginHorizontal: 8,
            },
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="Inbox"
                color={color}
                focused={focused}
              />
            ),
          })}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="Profile"
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="donation"
          options={{
            title: "Donation",
            headerShown: false,
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="go-live"
          options={{
            title: "Go Live",
            headerShown: false,
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>

      <Loader isLoading={loading} />
      <StatusBar backgroundColor="#161622" style="light" />
    </>
  );
};

export default TabLayout;
