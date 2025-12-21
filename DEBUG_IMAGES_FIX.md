# Fix Images Upload - Services & Gallery

## Problèmes identifiés (UPDATE)

### 1. Services Featured - Erreur FormData
**Erreur** : `Content-Type was not one of "multipart/form-data" or "application/x-www-form-urlencoded"`

**Cause** : `apiClient` forçait `Content-Type: application/json` dans tous les cas, empêchant l'envoi de FormData.

**Solution** :
- ✅ Intercepteur dans `apiClient` pour détecter FormData et supprimer le Content-Type
- ✅ Header explicite `'Content-Type': 'multipart/form-data'` dans les composants front

### 2. Gallery - Erreur 500
**Cause probable** : Même problème que services (FormData mal parsé)

**Solution** : Ajout du header Content-Type dans `GalleryAdmin.tsx`

### 3. About - Image ne s'affiche pas
**Backend** : ✅ Insertion fonctionne
**Frontend** : Route publique `/api/about/image` doit récupérer l'image

**Solution** : Logs ajoutés pour diagnostiquer si l'image est bien récupérée

## Modifications apportées

### 1. `lib/apiClient.ts`

**Avant :**
```typescript
const apiClient = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',  // ❌ Force JSON partout
  },
});
```

**Après :**
```typescript
const apiClient = axios.create({
  withCredentials: true,
  // Pas de header par défaut
});

// Intercepteur intelligent
apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    // Supprimer Content-Type pour laisser le navigateur gérer
    delete config.headers['Content-Type'];
  } else {
    // Forcer JSON pour les autres requêtes
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});
```

### 2. `app/components/admin/FeaturedServicesImagesAdmin.tsx`

```typescript
const res = await apiClient.post('/api/admin/images', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },  // ✅ Explicite
})
```

### 3. `app/components/admin/GalleryAdmin.tsx`

```typescript
// Upload initial
const uploadRes = await apiClient.post('/api/admin/upload-image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})

// Remplacement image
const uploadRes = await apiClient.post('/api/admin/upload-image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
```

### 4. Routes API (logs détaillés conservés)

- `/api/admin/images/route.ts` : Log avant insert + erreurs détaillées
- `/api/admin/gallery/images/route.ts` : Log avant insert + erreurs détaillées  
- `/api/about/image/route.ts` : Log pour diagnostiquer récupération publique

## Tests à effectuer en production

1. **Services Featured** :
   - ✅ Tester upload d'une image de service
   - ✅ Vérifier l'insertion en DB
   - ✅ Vérifier l'affichage sur la page d'accueil

2. **Gallery** :
   - ✅ Tester upload d'une image de réalisation
   - ✅ Vérifier l'insertion en DB
   - ✅ Vérifier l'affichage dans la galerie publique

3. **About** :
   - ✅ Vérifier que l'image s'affiche sur la page d'accueil
   - ✅ Consulter les logs pour voir si l'API publique récupère bien l'image

## Fichiers modifiés

1. `lib/apiClient.ts` - Intercepteur FormData
2. `app/components/admin/FeaturedServicesImagesAdmin.tsx` - Header Content-Type
3. `app/components/admin/GalleryAdmin.tsx` - Header Content-Type (2 endroits)
4. `app/api/admin/images/route.ts` - Logs détaillés
5. `app/api/admin/gallery/images/route.ts` - Logs détaillés
6. `app/api/about/image/route.ts` - Logs diagnostic

## Prochaines étapes

1. **Déployer** : `git push`
2. **Tester** chaque type d'image (services, gallery, about)
3. **Consulter logs** Vercel pour confirmer que tout fonctionne
4. **Nettoyer** les console.log une fois validé
