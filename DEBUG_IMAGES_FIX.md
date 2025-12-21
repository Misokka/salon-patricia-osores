# Fix Images Upload - Services & Gallery

## ✅ RÉSOLU - Tous les problèmes corrigés !

### Problème 1 : Services Featured - Erreur FormData ✅
**Erreur** : `Content-Type was not one of "multipart/form-data" or "application/x-www-form-urlencoded"`

**Cause** : `apiClient` forçait `Content-Type: application/json` dans tous les cas

**Solution** : Intercepteur intelligent + headers explicites

### Problème 2 : Gallery - Erreur 500 ✅
**Cause** : Même problème (FormData mal parsé)

**Solution** : Headers Content-Type explicites

### Problème 3 : Images ne s'affichent pas ✅
**Backend** : ✅ Upload et insertion fonctionnent
**Frontend** : ❌ Next.js bloquait les images externes

**Cause** : Le domaine Supabase `wtykfssiyumzfrmdpyga.supabase.co` n'était pas autorisé dans `next.config.js`

**Solution** : Ajout du domaine dans `remotePatterns`

---

## Modifications apportées

### 1. `lib/apiClient.ts` - Intercepteur FormData

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

### 5. `next.config.js` - Domaine Supabase autorisé

**Avant :**
```javascript
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'yywgluwtlhabsxbbgvqo.supabase.co',  // ❌ Ancien projet
    pathname: '/storage/v1/object/public/**',
  },
]
```

**Après :**
```javascript
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'wtykfssiyumzfrmdpyga.supabase.co',  // ✅ Nouveau projet
    pathname: '/storage/v1/object/public/**',
  },
  {
    protocol: 'https',
    hostname: 'yywgluwtlhabsxbbgvqo.supabase.co',  // Ancien (compatibilité)
    pathname: '/storage/v1/object/public/**',
  },
]
```

---

## Validation complète

### Backend ✅
- Upload vers Supabase Storage : ✅ Fonctionne
- Insertion dans table `images` : ✅ Fonctionne
- `salon_id` depuis `user.app_metadata` : ✅ Fonctionne

### Frontend ✅
- Upload services featured : ✅ Fonctionne
- Upload gallery : ✅ Fonctionne
- Upload about : ✅ Fonctionne
- Affichage images : ✅ Fonctionne (après autorisation domaine)

---

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

---

## Fichiers modifiés

1. ✅ `lib/apiClient.ts` - Intercepteur FormData
2. ✅ `app/components/admin/FeaturedServicesImagesAdmin.tsx` - Header Content-Type
3. ✅ `app/components/admin/GalleryAdmin.tsx` - Headers Content-Type (2 endroits)
4. ✅ `app/api/admin/images/route.ts` - Logs détaillés
5. ✅ `app/api/admin/gallery/images/route.ts` - Logs détaillés
6. ✅ `app/api/about/image/route.ts` - Logs diagnostic
7. ✅ `next.config.js` - Autorisation domaine Supabase `wtykfssiyumzfrmdpyga.supabase.co`

## Prochaines étapes

1. ✅ **Déployer** : `git push`
2. ✅ **Tester** : Upload + affichage pour les 3 types d'images
3. 🔜 **Nettoyer** : Supprimer les console.log temporaires après validation complète
