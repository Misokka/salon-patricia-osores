import axios from 'axios';

/**
 * Client axios configuré pour inclure les credentials (cookies) dans les requêtes
 * Utilisé pour les appels aux routes API admin qui nécessitent l'authentification
 */
const apiClient = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  withCredentials: true, // ⚠️ CRUCIAL : inclut les cookies Supabase dans les requêtes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour logger les erreurs en développement
if (process.env.NODE_ENV === 'development') {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('[apiClient] Request failed:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
      return Promise.reject(error);
    }
  );
}

export default apiClient;
