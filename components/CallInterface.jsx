import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CallInterface = ({ 
  visible, 
  callType, 
  selectedUser, 
  currentUser, 
  onClose, 
  onCallEnd,
  onCallAccept,
  onCallReject,
  callStatus,
  callDuration,
  isMuted,
  isSpeakerOn,
  onMuteToggle,
  onSpeakerToggle,
  onEndCall,
  onAnswerCall
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStreamView, setLocalStreamView] = useState(null);
  const [remoteStreamView, setRemoteStreamView] = useState(null);

  useEffect(() => {
    if (visible && callType === 'video') {
      setupVideoViews();
    }
  }, [visible, callType]);

  const setupVideoViews = async () => {
    // Video calling functionality has been removed
    console.log('Video calling functionality is not available');
    Alert.alert('Feature Unavailable', 'Video calling features have been disabled.');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callType === 'video') {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Main Video Feed Background */}
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: '#232533'
          }}>
            {/* Remote video view */}
            {remoteStreamView && (
              <View style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0 
              }}>
                {Platform.OS === 'ios' ? (
                  <View style={{ flex: 1 }} />
                ) : (
                  <View ref={remoteVideoRef} style={{ flex: 1 }} />
                )}
              </View>
            )}
          </View>
          
          {/* Top Bar with back button and call status */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            padding: 20, 
            paddingTop: Platform.OS === 'ios' ? 50 : 20,
            backgroundColor: 'rgba(0,0,0,0.3)'
          }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
              {callStatus === 'calling' ? 'Calling...' : callStatus === 'connected' ? 'Connected' : 'Call Ended'}
            </Text>
          </View>
          
          {/* Picture-in-Picture Window (User's own video feed) - Bottom Right */}
          <View style={{
            position: 'absolute',
            bottom: 140,
            right: 20,
            width: 120,
            height: 160,
            borderRadius: 12,
            backgroundColor: '#232533',
            borderWidth: 2,
            borderColor: '#fff',
            overflow: 'hidden'
          }}>
            {/* Local video view */}
            {localStreamView && (
              <View style={{ flex: 1 }}>
                {Platform.OS === 'ios' ? (
                  <View style={{ flex: 1 }} />
                ) : (
                  <View ref={localVideoRef} style={{ flex: 1 }} />
                )}
              </View>
            )}
          </View>
          
          {/* Call Duration Timer - Above bottom controls */}
          {callStatus === 'connected' && (
            <View style={{ 
              position: 'absolute',
              bottom: 140,
              left: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 20, 
              paddingHorizontal: 16, 
              paddingVertical: 8,
            }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {formatDuration(callDuration)}
              </Text>
            </View>
          )}
          
          {/* Call Control Buttons - Bottom Bar */}
          <View style={{ 
            position: 'absolute', 
            bottom: 40, 
            left: 0, 
            right: 0, 
            flexDirection: 'row', 
            justifyContent: 'center', 
            alignItems: 'center',
            paddingHorizontal: 20
          }}>
            {callStatus === 'calling' ? (
              // Initial calling state - two buttons
              <>
                <TouchableOpacity 
                  onPress={onEndCall}
                  style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 35, 
                    backgroundColor: '#f54242', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 40
                  }}
                >
                  <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={onAnswerCall}
                  style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 35, 
                    backgroundColor: '#4CAF50', 
                    justifyContent: 'center', 
                    alignItems: 'center'
                  }}
                >
                  <MaterialCommunityIcons name="phone" size={32} color="#fff" />
                </TouchableOpacity>
              </>
            ) : callStatus === 'connected' ? (
              // Connected call state - four buttons
              <>
                <TouchableOpacity 
                  onPress={onMuteToggle}
                  style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 30, 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 20
                  }}
                >
                  <MaterialCommunityIcons 
                    name={isMuted ? "microphone-off" : "microphone"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={onSpeakerToggle}
                  style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 30, 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 20
                  }}
                >
                  <MaterialCommunityIcons 
                    name={isSpeakerOn ? "volume-high" : "volume-off"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 30, 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 20
                  }}
                >
                  <MaterialCommunityIcons 
                    name="video" 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={onEndCall}
                  style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 35, 
                    backgroundColor: '#f54242', 
                    justifyContent: 'center', 
                    alignItems: 'center'
                  }}
                >
                  <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  } else {
    // Audio call interface
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Blurred Background Image */}
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: '#232533',
            opacity: 0.3
          }} />
          
          {/* Header with back button */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            padding: 20, 
            paddingTop: Platform.OS === 'ios' ? 50 : 20,
            backgroundColor: 'rgba(0,0,0,0.3)'
          }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              {callStatus === 'calling' ? 'Calling...' : callStatus === 'connected' ? 'Connected' : 'Call Ended'}
            </Text>
          </View>
          
          {/* Profile Section */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            <View style={{ 
              width: 120, 
              height: 120, 
              borderRadius: 60, 
              marginBottom: 20, 
              borderWidth: 3, 
              borderColor: '#fff',
              backgroundColor: '#232533',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <MaterialCommunityIcons name="account" size={60} color="#fff" />
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
              {selectedUser?.username || selectedUser?.email || 'Unknown User'}
            </Text>
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 40 }}>
              Audio Call
            </Text>
          </View>
          
          {/* Call Duration Timer (only show when connected) */}
          {callStatus === 'connected' && (
            <View style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 20, 
              paddingHorizontal: 16, 
              paddingVertical: 8, 
              marginBottom: 40,
              alignSelf: 'center'
            }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {formatDuration(callDuration)}
              </Text>
            </View>
          )}
          
          {/* Call Control Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 60 }}>
            {callStatus === 'calling' ? (
              // Initial calling state - two buttons
              <>
                <TouchableOpacity 
                  onPress={onEndCall}
                  style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 35, 
                    backgroundColor: '#f54242', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 40
                  }}
                >
                  <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={onAnswerCall}
                  style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 35, 
                    backgroundColor: '#4CAF50', 
                    justifyContent: 'center', 
                    alignItems: 'center'
                  }}
                >
                  <MaterialCommunityIcons name="phone" size={32} color="#fff" />
                </TouchableOpacity>
              </>
            ) : callStatus === 'connected' ? (
              // Connected call state - three buttons
              <>
                <TouchableOpacity 
                  onPress={onMuteToggle}
                  style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 30, 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 20
                  }}
                >
                  <MaterialCommunityIcons 
                    name={isMuted ? "microphone-off" : "microphone"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={onSpeakerToggle}
                  style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 30, 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 20
                  }}
                >
                  <MaterialCommunityIcons 
                    name={isSpeakerOn ? "volume-high" : "volume-off"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={onEndCall}
                  style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 35, 
                    backgroundColor: '#f54242', 
                    justifyContent: 'center', 
                    alignItems: 'center'
                  }}
                >
                  <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  }
};

export default CallInterface;
