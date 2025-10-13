import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useGlobalContext } from '../../context/GlobalProvider';
import { createLiveStream } from '../../lib/livestream';
import { CustomButton } from '../../components';

const CATEGORIES = [
  'Gaming',
  'Music',
  'Entertainment',
  'Education',
  'Sports',
  'Lifestyle',
  'Technology',
  'Art',
  'Cooking',
  'Fitness',
  'Other'
];

const QUALITY_OPTIONS = [
  { label: 'Auto', value: 'auto', description: 'Adaptive quality' },
  { label: '720p', value: '720p', description: 'HD quality' },
  { label: '1080p', value: '1080p', description: 'Full HD' },
];

const GoLive = () => {
  const { user } = useGlobalContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const handlePreviewPress = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your live stream');
      return;
    }

    if (!user?.$id) {
      Alert.alert('Error', 'Please login to go live');
      return;
    }

    // Check camera permission
    if (!permission) {
      requestPermission();
      return;
    }

    if (!permission.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to preview and go live',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestPermission }
        ]
      );
      return;
    }

    // Show camera preview
    setShowPreview(true);
  };

  const handleGoLive = async () => {
    setLoading(true);
    try {
      // Create live stream in database
      const liveStream = await createLiveStream(
        user.$id,
        title.trim(),
        description.trim(),
        selectedCategory
      );

      // Close preview
      setShowPreview(false);

      // Navigate to broadcaster screen
      router.push({
        pathname: '/live-broadcast',
        params: {
          streamId: liveStream.$id,
          quality: selectedQuality,
        }
      });
    } catch (error) {
      console.error('Error starting live stream:', error);
      Alert.alert('Error', 'Failed to start live stream. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Go Live</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Live Preview Card */}
          <View style={styles.previewCard}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.previewTitle}>You're about to go live!</Text>
            <Text style={styles.previewSubtitle}>Share your moment with the world</Text>
          </View>

          {/* Stream Title */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Stream Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="What are you streaming today?"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Description */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell viewers what this stream is about..."
              placeholderTextColor="#888"
              value={description}
              onChangeText={setDescription}
              maxLength={300}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.charCount}>{description.length}/300</Text>
          </View>

          {/* Category Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonSelected
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === category && styles.categoryTextSelected
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Stream Quality Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Stream Quality</Text>
            <View style={styles.qualityContainer}>
              {QUALITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.qualityButton,
                    selectedQuality === option.value && styles.qualityButtonSelected
                  ]}
                  onPress={() => setSelectedQuality(option.value)}
                >
                  <Text
                    style={[
                      styles.qualityLabel,
                      selectedQuality === option.value && styles.qualityLabelSelected
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.qualityDescription,
                      selectedQuality === option.value && styles.qualityDescriptionSelected
                    ]}
                  >
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Live Streaming Tips</Text>
            <Text style={styles.tipItem}>• Choose a well-lit area</Text>
            <Text style={styles.tipItem}>• Check your internet connection</Text>
            <Text style={styles.tipItem}>• Engage with your viewers</Text>
            <Text style={styles.tipItem}>• Be authentic and have fun!</Text>
          </View>

          {/* Go Live Button */}
          <CustomButton
            title="Preview & Go Live"
            handlePress={handlePreviewPress}
            containerStyles={styles.goLiveButton}
            isLoading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Camera Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewModal}>
          {permission?.granted && (
            <CameraView 
              style={styles.previewCamera} 
              facing={facing}
              ref={cameraRef}
            >
              {/* Preview Overlay */}
              <View style={styles.previewOverlay}>
                {/* Top Bar */}
                <View style={styles.previewTopBar}>
                  <TouchableOpacity 
                    style={styles.previewCloseButton}
                    onPress={() => setShowPreview(false)}
                  >
                    <Text style={styles.previewCloseText}>✕</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.previewQuality}>{selectedQuality}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.previewFlipButton}
                    onPress={toggleCameraFacing}
                  >
                    <Text style={styles.previewFlipIcon}>🔄</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Bar */}
                <View style={styles.previewBottomBar}>
                  <View style={styles.previewTipsContainer}>
                    <Text style={styles.previewTip}>✓ Check lighting</Text>
                    <Text style={styles.previewTip}>✓ Frame yourself well</Text>
                    <Text style={styles.previewTip}>✓ Test audio</Text>
                  </View>
                  
                  <CustomButton
                    title={loading ? "Starting..." : "🔴 Go Live Now"}
                    handlePress={handleGoLive}
                    containerStyles={styles.goLiveNowButton}
                    isLoading={loading}
                  />
                </View>
              </View>
            </CameraView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161622',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  previewCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#a77df8',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 15,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewSubtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 25,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
  categoriesContainer: {
    paddingVertical: 5,
  },
  categoryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  categoryButtonSelected: {
    backgroundColor: '#a77df8',
    borderColor: '#a77df8',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
  },
  categoryTextSelected: {
    fontWeight: 'bold',
  },
  tipsCard: {
    backgroundColor: 'rgba(167, 125, 248, 0.1)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(167, 125, 248, 0.3)',
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipItem: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  goLiveButton: {
    marginTop: 10,
  },
  qualityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qualityButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  qualityButtonSelected: {
    backgroundColor: 'rgba(167, 125, 248, 0.2)',
    borderColor: '#a77df8',
  },
  qualityLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  qualityLabelSelected: {
    color: '#a77df8',
  },
  qualityDescription: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
  },
  qualityDescriptionSelected: {
    color: '#bbb',
  },
  previewModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewCamera: {
    flex: 1,
  },
  previewOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  previewInfo: {
    flex: 1,
    marginHorizontal: 15,
    alignItems: 'center',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewQuality: {
    color: '#a77df8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  previewFlipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFlipIcon: {
    fontSize: 20,
  },
  previewBottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewTipsContainer: {
    marginBottom: 20,
  },
  previewTip: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.9,
  },
  goLiveNowButton: {
    backgroundColor: '#ff4757',
  },
});

export default GoLive;

