/**
 * ShareTripButton component - Allows users to share a completed trip with friends
 */
import { apiGet, apiPost } from '@/helpers/api';
import { useTranslation } from '@/i18n';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Friend } from '@/types';

interface ShareTripButtonProps {
  tripId: number;
  tripDestination: string;
}

export default function ShareTripButton({ tripId, tripDestination }: ShareTripButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sharing, setSharing] = useState<boolean>(false);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/friends');
      const data = res?.data || res;
      const friendsArr = Array.isArray(data) ? data : (data?.rows || []);
      setFriends(friendsArr);
    } catch (err: any) {
      console.error('Error loading friends:', err);
      Alert.alert(t('common.error'), t('share.errorLoadingFriends'));
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async () => {
    setShowModal(true);
    if (friends.length === 0) {
      await loadFriends();
    }
  };

  const handleShare = async (friendId: number) => {
    if (sharing) return;

    setSelectedFriendId(friendId);
    setSharing(true);
    try {
      await apiPost(`/trips/${tripId}/share`, {
        mode: 'viewer',
        public: false,
        shared_with_user_id: friendId,
      });
      
      const friend = friends.find(f => f.id === friendId);
      const friendName = friend?.name || friend?.email || `Usuario ${friendId}`;
      Alert.alert(
        t('common.success'),
        t('share.success', { friendName })
      );
      setShowModal(false);
      setSelectedFriendId(null);
    } catch (err: any) {
      console.error('Error sharing trip:', err);
      const message = err?.message || t('share.error');
      Alert.alert(t('common.error'), message);
    } finally {
      setSharing(false);
      setSelectedFriendId(null);
    }
  };

  const handleShareAll = async () => {
    if (friends.length === 0) {
      Alert.alert(t('common.error'), t('share.noFriends'));
      return;
    }

    Alert.alert(
      t('share.shareAllTitle'),
      t('share.shareAllMessage', { count: friends.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.share'),
          onPress: async () => {
            setSharing(true);
            let successCount = 0;
            let failCount = 0;

            for (const friend of friends) {
              try {
                await apiPost(`/trips/${tripId}/share`, {
                  mode: 'viewer',
                  public: false,
                  shared_with_user_id: friend.id,
                });
                successCount++;
              } catch (err) {
                failCount++;
                console.error(`Error sharing with friend ${friend.id}:`, err);
              }
            }

            setSharing(false);
            setShowModal(false);
            
            let message = '';
            if (successCount > 0) {
              const friendsText = successCount === 1 ? t('share.friend') : t('share.friends');
              message += t('share.shareAllSuccess', { count: successCount, friends: friendsText });
            }
            if (failCount > 0) {
              const errorsText = failCount === 1 ? t('share.errorSingular') : t('share.errorsPlural');
              message += t('share.shareAllErrors', { count: failCount, errors: errorsText });
            }
            
            Alert.alert(t('common.success'), message || t('share.operationCompleted'));
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleOpenModal}
        accessibilityLabel={t('share.button')}
      >
        <MaterialIcons name="share" size={22} color="#2d2d2d" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('share.title')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
                disabled={sharing}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>{tripDestination}</Text>
            <Text style={styles.modalHint}>{t('share.subtitle')}</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FF3951" />
                <Text style={styles.loadingText}>{t('share.loadingFriends')}</Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('share.noFriends')}</Text>
                <TouchableOpacity
                  style={styles.communityButton}
                  onPress={() => {
                    setShowModal(false);
                    router.push('/(tabs)/community');
                  }}
                >
                  <Text style={styles.communityButtonText}>{t('share.goToCommunity')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView style={styles.friendsList} showsVerticalScrollIndicator={false}>
                  {friends.map((friend) => {
                    const isSharing = sharing && selectedFriendId === friend.id;
                    const friendName = friend.name || friend.email || `Usuario ${friend.id}`;
                    
                    return (
                      <TouchableOpacity
                        key={friend.id}
                        style={[styles.friendItem, isSharing && styles.friendItemDisabled]}
                        onPress={() => handleShare(friend.id)}
                        disabled={sharing}
                      >
                        <View style={styles.friendInfo}>
                          <View style={styles.friendAvatar}>
                            <Text style={styles.friendAvatarText}>
                              {(friend.name || friend.email || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.friendDetails}>
                            <Text style={styles.friendName}>{friendName}</Text>
                            {friend.email && friend.name && (
                              <Text style={styles.friendEmail}>{friend.email}</Text>
                            )}
                          </View>
                        </View>
                        {isSharing ? (
                          <ActivityIndicator size="small" color="#FF3951" />
                        ) : (
                          <MaterialIcons name="chevron-right" size={24} color="#999" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {friends.length > 1 && (
                  <TouchableOpacity
                    style={[styles.shareAllButton, sharing && styles.shareAllButtonDisabled]}
                    onPress={handleShareAll}
                    disabled={sharing}
                  >
                    <MaterialIcons name="group" size={20} color="#FFF" />
                    <Text style={styles.shareAllButtonText}>
                      {t('share.shareAllButton', { count: friends.length })}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    position: 'absolute',
    right: 60,
    top: 36,
    backgroundColor: '#edededff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#777',
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  communityButton: {
    backgroundColor: '#FF3951',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  communityButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  friendsList: {
    maxHeight: 300,
    marginBottom: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F8F8F8',
    marginBottom: 8,
  },
  friendItemDisabled: {
    opacity: 0.6,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3951',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  friendEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  shareAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3951',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  shareAllButtonDisabled: {
    opacity: 0.6,
  },
  shareAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

