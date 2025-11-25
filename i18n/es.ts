/**
 * Spanish translations
 */

export default {
  // Common
  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    retry: 'Reintentar',
    confirm: 'Confirmar',
    back: 'Volver',
    close: 'Cerrar',
    yes: 'Sí',
    no: 'No',
    ok: 'OK',
    share: 'Compartir',
    review: 'Reseña',
    summary: 'Resumen',
  },

  // Trips
  trips: {
    title: 'Mis Viajes',
    loading: 'Cargando viajes...',
    empty: 'No hay viajes registrados.',
    failedToLoad: 'Error al cargar viajes',
    status: {
      upcoming: 'Próximo',
      current: 'Actual',
      past: 'Pasado',
    },
    addTrip: 'Agregar viaje',
  },

  // Trip Details
  tripDetails: {
    invalidId: 'ID de viaje inválido.',
    failedToLoad: 'No se pudo cargar el viaje.',
    deleteTitle: 'Eliminar viaje',
    deleteMessage: '¿Seguro querés eliminar este viaje? Esta acción no se puede deshacer.',
    deleteSuccess: 'El viaje fue eliminado correctamente.',
    deleteError: 'No se pudo eliminar el viaje.',
    deleteButton: 'Eliminar viaje',
    itinerary: 'Itinerario',
    loadingActivities: 'Cargando actividades...',
    noActivities: 'Aún no hay puntos en el itinerario.',
    completedBadge: 'Viaje Completado',
  },

  // Trip Summary
  tripSummary: {
    title: 'Resumen del Viaje',
    destination: 'Destino',
    dates: 'Fechas',
    activities: 'Actividades',
    activity: 'actividad',
    activitiesPlural: 'actividades',
    budget: 'Presupuesto',
    notes: 'Notas',
  },

  // Review Form
  review: {
    title: 'Tu Reseña',
    rating: 'Calificación',
    titleLabel: 'Título',
    commentLabel: 'Comentario (opcional)',
    ratingRequired: 'Por favor selecciona una calificación.',
    titleRequired: 'Por favor ingresa un título para tu reseña.',
    saving: 'Guardando...',
    saveButton: 'Guardar Reseña',
    updateButton: 'Actualizar Reseña',
    saveSuccess: 'Reseña guardada correctamente.',
    updateSuccess: 'Reseña actualizada correctamente.',
    saveError: 'No se pudo guardar la reseña.',
    loadingReview: 'Cargando reseña...',
    noReview: 'Aún no has agregado una reseña para este viaje.',
    ratings: {
      excellent: 'Excelente',
      veryGood: 'Muy bueno',
      good: 'Bueno',
      fair: 'Regular',
      poor: 'Malo',
    },
    placeholder: {
      title: 'Ej: Una experiencia increíble',
      comment: 'Comparte tu experiencia, recomendaciones, etc.',
    },
  },

  // Share Trip
  share: {
    button: 'Compartir viaje',
    title: 'Compartir Viaje',
    subtitle: 'Selecciona un amigo para compartir este viaje:',
    loadingFriends: 'Cargando amigos...',
    noFriends: 'No tienes amigos agregados.',
    goToCommunity: 'Ir a Comunidad',
    success: 'Viaje compartido con {friendName} correctamente.',
    error: 'No se pudo compartir el viaje.',
    errorLoadingFriends: 'No se pudieron cargar tus amigos.',
    shareAllTitle: 'Compartir con todos',
    shareAllMessage: '¿Deseas compartir este viaje con todos tus {count} amigos?',
    shareAllButton: 'Compartir con todos ({count})',
    shareAllSuccess: 'Compartido con {count} {friends}.\n',
    shareAllErrors: '{count} {errors} al compartir.',
    friend: 'amigo',
    friends: 'amigos',
    errorSingular: 'error',
    errorsPlural: 'errores',
    operationCompleted: 'Operación completada.',
  },

  // Community
  community: {
    title: 'Comunidad',
    sendRequest: 'Enviar solicitud',
    placeholder: 'Email o id de usuario',
    send: 'Enviar',
    hint: 'Envía por email o por id de usuario.',
    incomingRequests: 'Solicitudes entrantes',
    noIncoming: 'No hay solicitudes entrantes',
    friends: 'Amigos',
    noFriends: 'No tienes amigos aún',
    outgoingRequests: 'Solicitudes enviadas (pendientes)',
    noOutgoing: 'No hay solicitudes pendientes enviadas',
    status: 'Estado',
    removeFriend: 'Eliminar amigo',
    removeFriendConfirm: '¿Eliminar amigo?',
    shareTrips: 'Compartir viajes con {name}',
    selectTrips: 'Selecciona los viajes que quieras compartir (puedes seleccionar varios).',
    noOwnTrips: 'No se encontraron viajes propios para compartir. Solo puedes compartir viajes que posees.',
    sharing: 'Compartiendo...',
    shareSelected: 'Compartir ({count})',
    shareSuccess: 'Compartido correctamente {count} viaje(s).\n',
    shareErrors: 'Errores en {count} viaje(s):\n',
  },

  // Profile
  profile: {
    user: 'Usuario',
    email: 'Correo',
    phone: 'Teléfono',
    nationality: 'Nacionalidad',
    birthdate: 'Fecha de nacimiento',
    editProfile: 'Editar perfil',
    changePassword: 'Cambiar contraseña',
    logout: 'Cerrar Sesión',
    logoutTitle: 'Cerrar sesión',
    logoutMessage: '¿Estás seguro que quieres cerrar sesión?',
    logoutCancel: 'Cancelar',
    language: 'Idioma',
    languageDescription: 'Selecciona tu idioma preferido',
    spanish: 'Español',
    english: 'English',
  },
};

