import { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import GlobalProvider, { useGlobalContext } from '../context/GlobalProvider';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking'; // ✅ fix: use from expo-linking
import { getCurrentUser, account, databases, ID, Query } from '../lib/appwrite';

SplashScreen.preventAutoHideAsync();

// ✅ OAuth Handler Component
function OAuthHandler() {
  const router = useRouter();
  const { setUser, setIsLogged } = useGlobalContext();

  useEffect(() => {
    const handleDeepLink = async (url) => {
      

      if (url && url.includes('com.jsm.asabcorp://')) {
        

        // Handle any deep link from OAuth
        if (url.includes('com.jsm.asabcorp://')) {
          
          
          // Wait a bit for the session to be established
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            // Get the current account from Appwrite
            const currentAccount = await account.get();
            
            
            // Check if user exists in our database
            let existingUser;
            try {
             
              const users = await databases.listDocuments(
                '685494a1002f8417c2b2', // databaseId
                '685494cd001135a4d108', // userCollectionId
                [Query.equal("accountId", currentAccount.$id)]
              );
              
              if (users.documents.length > 0) {
                existingUser = users.documents[0];
               
              }
            } catch (error) {
              
            }

            if (existingUser) {
              // User exists, set the user data
              setUser(existingUser);
              setIsLogged(true);
              router.replace('/(tabs)/home');
              
            } else {
              // Create new user in our database
              
              const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentAccount.name)}&background=random`;
              
              const newUser = await databases.createDocument(
                '685494a1002f8417c2b2', // databaseId
                '685494cd001135a4d108', // userCollectionId
                ID.unique(),
                {
                  accountId: currentAccount.$id,
                  email: currentAccount.email,
                  username: currentAccount.name,
                  avatar: avatarUrl,
                }
              );
              
              
              setUser(newUser);
              setIsLogged(true);
              router.replace('/(tabs)/home');
              
            }
          } catch (error) {
           
            router.replace('/(auth)/sign-in');
          }
        }
        
        // No need for separate failure handling - will be caught by error handling
      }
    };

    // ✅ Handle when app is opened from deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // ✅ Listen while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove(); // clean up
    };
  }, [router, setUser, setIsLogged]);

  return null;
}

export default function RootLayout() {
  // Try to load fonts, but don't fail if they don't load
  const [loaded, error] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    if (error) {
     
      // Don't throw error, just log it and continue
    }
  }, [error]);

  useEffect(() => {
    // Hide splash screen even if fonts fail to load
    SplashScreen.hideAsync();
  }, [loaded]);

  // Always render the app, even if fonts fail to load
  return (
    <GlobalProvider>
      <OAuthHandler />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GlobalProvider>
  );
}
