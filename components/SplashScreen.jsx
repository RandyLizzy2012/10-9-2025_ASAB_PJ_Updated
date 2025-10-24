import React, { useState } from 'react';
import { View, Image, StyleSheet, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onComplete }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const splashImages = [
    require('../assets/images/splash1.png'),
    require('../assets/images/splash2.png'),
    require('../assets/images/splash3.png'),
    require('../assets/images/splash4.png'),
  ];

  const handleSwipe = (event) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // Check for swipe gesture (minimum distance or velocity) - more sensitive
      const isSwipeLeft = translationX < -20 || velocityX < -200;
      const isSwipeRight = translationX > 20 || velocityX > 200;
      
      // Swipe left to go to next image - instant switch
      if (isSwipeLeft && currentImageIndex < splashImages.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      }
      // Swipe right to go to previous image - instant switch
      else if (isSwipeRight && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      }
      // If on last image and swipe left, complete splash screen
      else if (isSwipeLeft && currentImageIndex === splashImages.length - 1) {
        onComplete();
      }
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient
        colors={['#321E0A', '#1a1a2e', '#000000']}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <PanGestureHandler onHandlerStateChange={handleSwipe}>
          <View style={styles.imageContainer}>
            <Image
              key={currentImageIndex}
              source={splashImages[currentImageIndex]}
              style={styles.splashImage}
              resizeMode="cover"
            />
            
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              {splashImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentImageIndex ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>
            
            {/* Swipe instruction */}
            <Text style={styles.instructionText}>
              {currentImageIndex < splashImages.length - 1 
                ? 'Swipe left to continue' 
                : 'Swipe left to start'
              }
            </Text>
          </View>
        </PanGestureHandler>
      </LinearGradient>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  splashImage: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
    // Ensure instant rendering without any transitions
    transform: [{ translateX: 0 }, { translateY: 0 }],
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#FF8E01',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  instructionText: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 40,
  },
});

export default SplashScreen;
