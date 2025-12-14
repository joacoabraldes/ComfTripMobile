/**
 * ShareTripButton component - Allows users to share a completed trip with friends
 */
import { apiGet, apiPost } from '@/helpers/api';
import { useTranslation } from '@/i18n';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Friend } from '@/types';
import { ShadowColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';
import { useSnackbar } from '@/contexts/SnackbarContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ShareTripButtonProps {
  tripId: number;
  tripDestination: string;
  showButton?: boolean;
  initialVisible?: boolean;
  onClose?: () => void;
}

export default function ShareTripButton({ tripId, tripDestination, showButton = true, initialVisible = false, onClose }: ShareTripButtonProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const { showSuccess, showError } = useSnackbar();
  const router = useRouter();
  const [showModal, setShowModal] = useState<boolean>(initialVisible);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sharing, setSharing] = useState<boolean>(false);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [showShareAllDialog, setShowShareAllDialog] = useState(false);

  // Sync showModal with initialVisible prop when it changes
  // This ensures the modal opens when the component is mounted with initialVisible=true
  useEffect(() => {
    if (initialVisible !== showModal) {
      setShowModal(initialVisible);
    }
  }, [initialVisible, showModal]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/friends');
      const data = res?.data || res;
      const friendsArr = Array.isArray(data) ? data : (data?.rows || []);
      setFriends(friendsArr);
    } catch (err: any) {
      showError(t('share.errorLoadingFriends'));
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
      showSuccess(t('share.success', { friendName }));
      handleCloseModal();
    } catch (err: any) {
      const message = err?.message || t('share.error');
      showError(message);
    } finally {
      setSharing(false);
      setSelectedFriendId(null);
    }
  };

  const handleShareAll = () => {
    if (friends.length === 0) {
      showError(t('share.noFriends'));
      return;
    }
    setShowShareAllDialog(true);
  };

  const handleConfirmShareAll = async () => {
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
      }
    }

    setSharing(false);
    setShowModal(false);
    setShowShareAllDialog(false);
    
    let message = '';
    if (successCount > 0) {
      const friendsText = successCount === 1 ? t('share.friend') : t('share.friends');
      message += t('share.shareAllSuccess', { count: successCount, friends: friendsText });
    }
    if (failCount > 0) {
      const errorsText = failCount === 1 ? t('share.errorSingular') : t('share.errorsPlural');
      message += t('share.shareAllErrors', { count: failCount, errors: errorsText });
    }
    
    if (successCount > 0 && failCount === 0) {
      showSuccess(message || t('share.operationCompleted'));
    } else if (failCount > 0) {
      showError(message || t('share.operationCompleted'));
    } else {
      showSuccess(message || t('share.operationCompleted'));
    }
  };

  const handleCancelShareAll = () => {
    setShowShareAllDialog(false);
  };

  // Load friends when modal opens (similar to web version)
  useEffect(() => {
    if (showModal && friends.length === 0 && !loading) {
      loadFriends();
    }
  }, [showModal]);

  const handleCloseModal = () => {
    setShowModal(false);
    // Reset selected friend when closing
    setSelectedFriendId(null);
    if (onClose) onClose();
  };

  return (
    <>
      {showButton && (
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleOpenModal}
          accessibilityLabel={t('share.button')}
        >
          <MaterialIcons name="share" size={22} color={AppColors.text} />
        </TouchableOpacity>
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('share.title')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
                disabled={sharing}
              >
                <MaterialIcons name="close" size={24} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>{tripDestination}</Text>
            <Text style={styles.modalHint}>{t('share.subtitle')}</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={AppColors.primary} />
                <Text style={styles.loadingText}>{t('share.loadingFriends')}</Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('share.noFriends')}</Text>
                <TouchableOpacity
                  style={styles.communityButton}
                  onPress={() => {
                    handleCloseModal();
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
                          <ActivityIndicator size="small" color={AppColors.primary} />
                        ) : (
                          <MaterialIcons name="chevron-right" size={24} color={AppColors.textMutedDark} />
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
                    <MaterialIcons name="group" size={20} color={AppColors.white} />
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

      <ConfirmDialog
        visible={showShareAllDialog}
        title={t('share.shareAllTitle')}
        message={t('share.shareAllMessage', { count: friends.length })}
        confirmText={t('common.share')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmShareAll}
        onCancel={handleCancelShareAll}
        destructive={false}
      />
    </>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  shareButton: {
    position: 'absolute',
    right: 60,
    top: 36,
    backgroundColor: AppColors.backgroundTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: AppColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: ShadowColors.black,
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
    color: AppColors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  communityButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  communityButtonText: {
    color: AppColors.white,
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
    backgroundColor: AppColors.backgroundTertiary,
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
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  friendEmail: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  shareAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  shareAllButtonDisabled: {
    opacity: 0.6,
  },
  shareAllButtonText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

