import { Ionicons } from '@expo/vector-icons';
import { apiDelete, apiGet, apiPost } from '@/helpers/api';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import PrimaryLayout from '@/components/layouts/PrimaryLayout';
import { useTranslation } from '@/i18n';
import { ShadowColors, StateColors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';
import {useCommonStyles} from "@/constants/Styles";
import { useSnackbar } from '@/contexts/SnackbarContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type Friend = {
  id: number;
  name?: string;
  email?: string;
};

type FriendRequest = {
  id: number;
  requester_id?: number;
  requester_name?: string;
  requester_email?: string;
  addressee_id?: number;
  addressee_name?: string;
  addressee_email?: string;
  status?: string;
};

type Trip = {
  id: number;
  destination: string;
  start_date?: string;
  end_date?: string;
  user_id: number;
};

export default function CommunityScreen() {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const { showSuccess, showError, showInfo } = useSnackbar();
  const styles = getStyles(AppColors);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [emailOrId, setEmailOrId] = useState('');
  const [sending, setSending] = useState(false);
    const CommonStyles = useCommonStyles();

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTargetFriend, setShareTargetFriend] = useState<Friend | null>(null);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [selectedTripIds, setSelectedTripIds] = useState<Set<number>>(new Set());
  const [sharing, setSharing] = useState(false);

  // Delete friend dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<number | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [fRes, reqRes] = await Promise.all([
        apiGet('/friends').then(r => r.data || r),
        apiGet('/friends/requests').then(r => r.data || r)
      ]);

      const friendsArr = Array.isArray(fRes) ? fRes : (fRes && fRes.rows ? fRes.rows : []);
      setFriends(friendsArr);

      const incomingArr = (reqRes && reqRes.incoming) ? reqRes.incoming : (Array.isArray(reqRes) ? reqRes : []);
      let outgoingArr = (reqRes && reqRes.outgoing) ? reqRes.outgoing : [];
      // Keep only pending outgoing requests
      outgoingArr = (outgoingArr || []).filter((o: any) => (o && o.status ? String(o.status).toLowerCase() === 'pending' : true));

      const cleanedOutgoing = (outgoingArr || []).map((o: any) => {
        if (!o || typeof o !== 'object') return o;
        const { url, share_url, backend_url, ...rest } = o;
        return rest;
      });

      setIncoming(incomingArr || []);
      setOutgoing(cleanedOutgoing || []);
    } catch (err: any) {
      const msg = (err && err.message) ? err.message : t('communityExtra.failedToLoad');
      showError(msg);
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function sendRequest() {
    if (!emailOrId) {
      showError(t('communityExtra.enterEmailOrId'));
      return;
    }
    setSending(true);
    try {
      const body: any = {};
      if (emailOrId.includes('@')) {
        body.email = emailOrId;
      } else {
        body.addressee_id = Number(emailOrId);
      }

      await apiPost('/friends', body);
      showSuccess(t('communityExtra.requestSent'));
      setEmailOrId('');
      await loadAll();
    } catch (err: any) {
      const msg = (err && err.message) ? err.message : t('communityExtra.failedToSend');
      showError(msg);
    } finally {
      setSending(false);
    }
  }

  async function acceptRequest(reqId: number) {
    try {
      await apiPost(`/friends/${reqId}/accept`);
      await loadAll();
    } catch (err) {
      showError(t('communityExtra.failedToAccept'));
    }
  }

  async function rejectRequest(reqId: number) {
    try {
      await apiPost(`/friends/${reqId}/reject`);
      await loadAll();
    } catch (err) {
      showError(t('communityExtra.failedToReject'));
    }
  }

  async function removeFriend(userId: number) {
    setFriendToDelete(userId);
    setShowDeleteDialog(true);
  }

  async function handleConfirmDelete() {
    if (!friendToDelete) return;
    
    try {
      await apiDelete(`/friends/${friendToDelete}`);
      await loadAll();
      setShowDeleteDialog(false);
      setFriendToDelete(null);
    } catch (err) {
      showError(t('communityExtra.failedToRemove'));
      setShowDeleteDialog(false);
      setFriendToDelete(null);
    }
  }

  function handleCancelDelete() {
    setShowDeleteDialog(false);
    setFriendToDelete(null);
  }

  // Helper to get current user ID
  async function getCurrentUserId(): Promise<number | null> {
    const candidates = ['/auth/me', '/users/me', '/profile'];
    for (const ep of candidates) {
      try {
        const r = await apiGet(ep);
        const data = r.data || r;
        if (data && (data.id || data.user_id || data._id)) {
          return data.id || data.user_id || data._id;
        }
      } catch (e) {
        // ignore and try next
      }
    }

    // Fallback: try to decode JWT
    try {
      const { tokenStorage } = await import('@/helpers/api');
      const token = await tokenStorage.getToken();
      if (token) {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
          if (payload) return payload.id || payload.user_id || payload.sub;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  async function openShareModal(friend: Friend) {
    setShareTargetFriend(friend);
    setSelectedTripIds(new Set());
    setShowShareModal(true);

    try {
      const trips = await apiGet('/trips');
      const tripsData = trips.data || trips;
      const tripsArr = Array.isArray(tripsData) ? tripsData : (tripsData && tripsData.rows ? tripsData.rows : []);
      const currentUserId = await getCurrentUserId();

      if (currentUserId == null) {
        setAvailableTrips([]);
        showError(t('communityExtra.cannotDetermineUser'));
        return;
      }

      const ownedTrips = tripsArr.filter((t: Trip) => Number(t?.user_id) === Number(currentUserId));
      if (ownedTrips.length === 0) {
        showInfo(t('community.noOwnTrips'));
      }
      setAvailableTrips(ownedTrips);
    } catch (err) {
      showError(t('communityExtra.failedToLoadTrips'));
      setAvailableTrips([]);
    }
  }

  function toggleTripSelection(id: number) {
    setSelectedTripIds(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  }

  async function submitShare() {
    if (!shareTargetFriend) {
      showError(t('communityExtra.noFriendSelected'));
      return;
    }
    if (!selectedTripIds.size) {
      showError(t('communityExtra.selectAtLeastOne'));
      return;
    }

    setSharing(true);
    const successes: number[] = [];
    const failures: { tripId: number; message: string }[] = [];

    for (const tripId of Array.from(selectedTripIds)) {
      try {
        await apiPost(`/trips/${tripId}/share`, {
          mode: 'viewer',
          public: false,
          shared_with_user_id: shareTargetFriend.id
        });
        successes.push(tripId);
      } catch (err: any) {
        const message = (err && err.message) ? err.message : (err && err.data && err.data.message) ? err.data.message : 'Error';
        failures.push({ tripId, message });
      }
    }

    setSharing(false);
    let msg = '';
    if (successes.length) {
      const friendWord = successes.length === 1 ? t('share.friend') : t('share.friends');
      msg += t('community.shareSuccess', { count: successes.length }) + '\n';
    }
    if (failures.length) {
      const errorWord = failures.length === 1 ? t('share.errorSingular') : t('share.errorsPlural');
      msg += t('community.shareErrors', { count: failures.length }) + failures.map(f => ` - ${f.tripId}: ${f.message}`).join('\n');
    }

    if (successes.length > 0 && failures.length === 0) {
      showSuccess(msg || t('share.operationCompleted'));
    } else if (failures.length > 0) {
      showError(msg || t('share.operationCompleted'));
    } else {
      showInfo(msg || t('share.operationCompleted'));
    }
    setShowShareModal(false);
    setShareTargetFriend(null);
    setSelectedTripIds(new Set());
    await loadAll();
  }

  function renderAvatar(name?: string, email?: string) {
    const initials = (name || email || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  }

  function renderListItem(item: any, actions: React.ReactNode, showAvatar = false) {
    const title = item.requester_name || item.addressee_name || item.name || t('communityExtra.userNumber', { number: item.requester_id || item.addressee_id || item.id });
    const subtitle = item.requester_email || item.addressee_email || item.email || '';
    //const status = item.status;

    return (
      <View key={item.id} style={styles.listItem}>
        <View style={styles.itemInfo}>
          {showAvatar && renderAvatar(item.name || item.requester_name || item.addressee_name, item.email || item.requester_email || item.addressee_email )}
          <View style={[styles.itemText, !showAvatar && styles.itemTextNoAvatar]}>
            <Text style={styles.itemTitle}>{title}</Text>
            {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
              {/*{status ? <Text style={styles.itemStatus}>{t('communityExtra.statusLabel', { status })}</Text> : null}*/}
          </View>
        </View>
        <View style={styles.itemActions}>
          {actions}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <PrimaryLayout title={t('community.title')}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF3951" />
          <Text style={CommonStyles.loadingText}>{t('communityExtra.loading')}</Text>
        </View>
      </PrimaryLayout>
    );
  }

  // Calculate padding bottom to account for tabbar
  const TABBAR_HEIGHT = 64;
  const paddingBottom = 32 + TABBAR_HEIGHT + (insets?.bottom || 0);

  return (
    <PrimaryLayout title={t('community.title')}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom }]}
      >

        {/* Send Request Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('community.sendRequest')}</Text>
          <View style={styles.sendRow}>
            <TextInput
              style={styles.input}
              placeholder={t('community.placeholder')}
              value={emailOrId}
              onChangeText={setEmailOrId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={sendRequest}
              disabled={sending}
            >
              <Text style={styles.sendButtonText}>{t('community.send')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>{t('community.hint')}</Text>
        </View>

        {/* Incoming Requests */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('community.incomingRequests')}</Text>
          {incoming.length === 0 ? (
            <Text style={styles.emptyText}>{t('community.noIncoming')}</Text>
          ) : (
            <View>
              {incoming.map(req => renderListItem(
                req,
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => acceptRequest(req.id)}
                  >
                    <Ionicons name="checkmark" size={18} color={AppColors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => rejectRequest(req.id)}
                  >
                    <Ionicons name="close" size={18} color={AppColors.error} />
                  </TouchableOpacity>
                </View>, true
              ))}
            </View>
          )}
        </View>

        {/* Friends */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('community.friends')}</Text>
          {friends.length === 0 ? (
            <Text style={styles.emptyText}>{t('community.noFriends')}</Text>
          ) : (
            <View>
              {friends.map(friend => renderListItem(
                friend,
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.shareButton]}
                    onPress={() => openShareModal(friend)}
                  >
                    <Ionicons name="share" size={18} color={StateColors.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => removeFriend(friend.id)}
                  >
                    <Ionicons name="trash" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </View>,
                true
              ))}
            </View>
          )}
        </View>

        {/* Outgoing Requests */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('community.outgoingRequests')}</Text>
          {outgoing.length === 0 ? (
            <Text style={styles.emptyText}>{t('community.noOutgoing')}</Text>
          ) : (
            <View>
              {outgoing.map(req => renderListItem(req, <View />, true))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>
              {t('community.shareTrips', { name: shareTargetFriend?.name || shareTargetFriend?.email || t('communityExtra.userNumber', { number: shareTargetFriend?.id ?? 0 }) })}
            </Text>
            <Text style={styles.modalHint}>
              {t('community.selectTrips')}
            </Text>

            <ScrollView style={styles.tripList} showsVerticalScrollIndicator={false}>
              {availableTrips.length === 0 ? (
                <Text style={styles.emptyText}>{t('communityExtra.noTripsToShare')}</Text>
              ) : (
                <View>
                  {availableTrips.map(trip => {
                    const isSelected = selectedTripIds.has(trip.id);
                    const startDate = trip.start_date ? trip.start_date.slice(0, 10) : '';
                    const endDate = trip.end_date ? trip.end_date.slice(0, 10) : '';
                    
                    return (
                      <TouchableOpacity
                        key={trip.id}
                        style={styles.tripItem}
                        onPress={() => toggleTripSelection(trip.id)}
                        disabled={sharing}
                      >
                        <View style={styles.tripInfo}>
                          <Text style={styles.tripTitle}>{trip.destination || `${t('trips.title')} #${trip.id}`}</Text>
                          <Text style={styles.tripDates}>
                            {startDate && endDate ? `${startDate} — ${endDate}` : t('communityExtra.datesNotSpecified')}
                          </Text>
                          <Text style={styles.tripOwner}>{t('communityExtra.ownerId', { id: String(trip.user_id) })}</Text>
                        </View>
                        <View style={styles.checkbox}>
                          <View style={[styles.checkboxInner, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowShareModal(false)}
                disabled={sharing}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.shareModalButton, selectedTripIds.size === 0 && styles.shareModalButtonDisabled]}
                onPress={submitShare}
                disabled={sharing || selectedTripIds.size === 0}
              >
                <Text style={styles.shareModalButtonText}>
                  {sharing ? t('community.sharing') : t('community.shareSelected', { count: selectedTripIds.size })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Friend Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title={t('community.removeFriend')}
        message={t('community.removeFriendConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        destructive={true}
      />
    </PrimaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: AppColors.backgroundPrimary,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: ShadowColors.black,
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 16,
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
    backgroundColor: AppColors.backgroundPrimary,
  },
  sendButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: AppColors.white,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
  },
  itemTextNoAvatar: {
    marginLeft: 0,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  itemSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  itemStatus: {
    fontSize: 12,
    color: AppColors.textMutedDark,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.backgroundTertiary,
  },
  acceptButton: {
    backgroundColor: StateColors.successLight,
  },
  rejectButton: {
    backgroundColor: StateColors.errorLight,
  },
  shareButton: {
    backgroundColor: StateColors.info + '20',
  },
  removeButton: {
    backgroundColor: StateColors.errorLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
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
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
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
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalCloseText: {
    fontSize: 20,
    color: AppColors.textSecondary,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  modalHint: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 16,
  },
  tripList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  tripDates: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  tripOwner: {
    fontSize: 12,
    color: AppColors.textMutedDark,
    marginTop: 2,
  },
  checkbox: {
    marginLeft: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: AppColors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.backgroundPrimary,
  },
  checkboxSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  checkmark: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: AppColors.backgroundTertiary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cancelButtonText: {
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  shareModalButton: {
    backgroundColor: AppColors.primary,
  },
  shareModalButtonDisabled: {
    backgroundColor: AppColors.textDisabled,
  },
  shareModalButtonText: {
    color: AppColors.white,
    fontWeight: '600',
  },
});