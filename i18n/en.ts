/**
 * English translations
 */

export default {
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    retry: 'Retry',
    confirm: 'Confirm',
    back: 'Back',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    share: 'Share',
    review: 'Review',
    summary: 'Summary',
  },

  // Trips
  trips: {
    title: 'My Trips',
    loading: 'Loading trips...',
    empty: 'No trips registered.',
    failedToLoad: 'Failed to load trips',
    status: {
      upcoming: 'Upcoming',
      current: 'Current',
      past: 'Past',
    },
    addTrip: 'Add trip',
  },

  // Trip Details
  tripDetails: {
    invalidId: 'Invalid trip ID.',
    failedToLoad: 'Could not load trip.',
    deleteTitle: 'Delete Trip',
    deleteMessage: 'Are you sure you want to delete this trip? This action cannot be undone.',
    deleteSuccess: 'Trip deleted successfully.',
    deleteError: 'Could not delete trip.',
    deleteButton: 'Delete trip',
    itinerary: 'Itinerary',
    loadingActivities: 'Loading activities...',
    noActivities: 'No itinerary points yet.',
    completedBadge: 'Trip Completed',
  },

  // Trip Summary
  tripSummary: {
    title: 'Trip Summary',
    destination: 'Destination',
    dates: 'Dates',
    activities: 'Activities',
    activity: 'activity',
    activitiesPlural: 'activities',
    budget: 'Budget',
    notes: 'Notes',
  },

  // Review Form
  review: {
    title: 'Your Review',
    rating: 'Rating',
    titleLabel: 'Title',
    commentLabel: 'Comment (optional)',
    ratingRequired: 'Please select a rating.',
    titleRequired: 'Please enter a title for your review.',
    saving: 'Saving...',
    saveButton: 'Save Review',
    updateButton: 'Update Review',
    saveSuccess: 'Review saved successfully.',
    updateSuccess: 'Review updated successfully.',
    saveError: 'Could not save review.',
    loadingReview: 'Loading review...',
    noReview: 'You have not added a review for this trip yet.',
    ratings: {
      excellent: 'Excellent',
      veryGood: 'Very Good',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
    },
    placeholder: {
      title: 'E.g.: An incredible experience',
      comment: 'Share your experience, recommendations, etc.',
    },
  },

  // Share Trip
  share: {
    button: 'Share trip',
    title: 'Share Trip',
    subtitle: 'Select a friend to share this trip with:',
    loadingFriends: 'Loading friends...',
    noFriends: 'You have no friends added.',
    goToCommunity: 'Go to Community',
    success: 'Trip shared with {friendName} successfully.',
    error: 'Could not share trip.',
    errorLoadingFriends: 'Could not load your friends.',
    shareAllTitle: 'Share with all',
    shareAllMessage: 'Do you want to share this trip with all your {count} friends?',
    shareAllButton: 'Share with all ({count})',
    shareAllSuccess: 'Shared with {count} {friends}.\n',
    shareAllErrors: '{count} {errors} when sharing.',
    friend: 'friend',
    friends: 'friends',
    errorSingular: 'error',
    errorsPlural: 'errors',
    operationCompleted: 'Operation completed.',
  },

  // Community
  community: {
    title: 'Community',
    sendRequest: 'Send Request',
    placeholder: 'Email or user id',
    send: 'Send',
    hint: 'Send by email or user id.',
    incomingRequests: 'Incoming Requests',
    noIncoming: 'No incoming requests',
    friends: 'Friends',
    noFriends: 'You have no friends yet',
    outgoingRequests: 'Sent Requests (pending)',
    noOutgoing: 'No pending sent requests',
    status: 'Status',
    removeFriend: 'Remove friend',
    removeFriendConfirm: 'Remove friend?',
    shareTrips: 'Share trips with {name}',
    selectTrips: 'Select the trips you want to share (you can select multiple).',
    noOwnTrips: 'No own trips found to share. You can only share trips you own.',
    sharing: 'Sharing...',
    shareSelected: 'Share ({count})',
    shareSuccess: 'Successfully shared {count} trip(s).\n',
    shareErrors: 'Errors in {count} trip(s):\n',
  },

  // Profile
  profile: {
    user: 'User',
    email: 'Email',
    phone: 'Phone',
    nationality: 'Nationality',
    birthdate: 'Date of Birth',
    editProfile: 'Edit profile',
    changePassword: 'Change password',
    logout: 'Logout',
    logoutTitle: 'Logout',
    logoutMessage: 'Are you sure you want to logout?',
    logoutCancel: 'Cancel',
    language: 'Language',
    languageDescription: 'Select your preferred language',
    spanish: 'Español',
    english: 'English',
  },
};

