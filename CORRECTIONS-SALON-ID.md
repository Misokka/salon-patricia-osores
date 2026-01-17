# 🔧 Corrections du problème de mélange d'images entre salons

## 🐛 Problème identifié

Les images de galerie se mélangeaient entre les deux salons en production, malgré la présence du champ `salon_id` dans la base de données.

**Cause racine :** Les routes API publiques ne filtraient pas par `salon_id`, ce qui permettait à tous les salons de voir toutes les images.

## ✅ Corrections apportées

### 1. Routes API corrigées

Ajout du filtre `.eq('salon_id', PUBLIC_SALON_ID)` dans les routes suivantes :

#### Images de galerie
- **`/app/api/gallery/images/route.ts`**
  - GET : Ajout du filtre `salon_id` pour récupérer uniquement les images du salon actuel

#### Disponibilités
- **`/app/api/disponibilites/route.ts`**
  - GET : Ajout du filtre `salon_id` sur les `time_slots`

- **`/app/api/disponibilites/available/route.ts`**
  - GET : Ajout du filtre `salon_id` lors de la récupération des créneaux disponibles

#### Rendez-vous
- **`/app/api/rendezvous/route.ts`**
  - POST : Ajout du filtre `salon_id` pour :
    - Vérification des créneaux
    - Mise à jour des créneaux (réservation)
    - Rollback (libération des créneaux)
    - Récupération du nom du service

- **`/app/api/rendezvous/reschedule-info/route.ts`**
  - GET : Ajout du filtre `salon_id` pour :
    - Récupération du rendez-vous
    - Récupération du service

- **`/app/api/rendezvous/reschedule-validate/route.ts`**
  - POST : Ajout du filtre `salon_id` pour :
    - Récupération du rendez-vous
    - Récupération du service (2 occurrences)

### 2. Routes déjà correctes (vérifiées)

Ces routes filtraient déjà correctement par `salon_id` :
- ✅ `/app/api/services/route.ts`
- ✅ `/app/api/services/categories/route.ts`
- ✅ `/app/api/about/image/route.ts`
- ✅ `/app/api/public/horaires/route.ts`

## 📊 Impact

### Avant
```typescript
// ❌ Récupérait TOUTES les images de TOUS les salons
const { data } = await supabase
  .from('images')
  .eq('type', 'gallery')
  .is('deleted_at', null)
```

### Après
```typescript
// ✅ Récupère uniquement les images du salon actuel
const { data } = await supabase
  .from('images')
  .eq('salon_id', PUBLIC_SALON_ID)
  .eq('type', 'gallery')
  .is('deleted_at', null)
```

## 🔍 Données de test

Exemple de la base de données avec 2 salons :
- **Salon 1 :** `00000000-0000-0000-0000-000000000001` (3 images)
- **Salon 2 :** `e0b7b419-a22b-4c2c-8355-2f4af30fe1c2` (7 images)

Avant les corrections, tous les salons voyaient les 10 images mélangées.

## 🚀 Déploiement

Pour appliquer les corrections en production :

```bash
# 1. Vérifier que le build fonctionne
npm run build

# 2. Commiter les changements
git add .
git commit -m "fix: Ajout des filtres salon_id dans les routes API publiques"

# 3. Pousser vers production
git push
```

## 🧪 Tests à effectuer

Après déploiement, vérifier :

1. **Galerie d'images**
   - [ ] Chaque salon voit uniquement ses propres images
   - [ ] L'ajout d'une image apparaît uniquement dans le bon salon

2. **Disponibilités**
   - [ ] Les créneaux affichés correspondent au bon salon
   - [ ] La réservation ne croise pas les créneaux entre salons

3. **Rendez-vous**
   - [ ] Les rendez-vous sont bien isolés par salon
   - [ ] Les modifications de rendez-vous n'affectent que le bon salon

## 📝 Notes importantes

### Architecture multi-salon

Le système utilise actuellement `PUBLIC_SALON_ID` pour identifier le salon :
```typescript
export const PUBLIC_SALON_ID = '00000000-0000-0000-0000-000000000001'
```

**Pour évoluer vers un vrai multi-salon :**
- Détecter le salon par domaine/sous-domaine
- Ou utiliser un slug dans l'URL
- Modifier `getSalonIdFromAuth()` dans `/lib/salonContext.ts`

### Sécurité RLS (Row Level Security)

Ces corrections sont au niveau applicatif. Pour une sécurité renforcée, vérifier que les **policies RLS** Supabase sont également configurées pour filtrer par `salon_id`.

## 📚 Fichiers modifiés

```
app/api/gallery/images/route.ts
app/api/disponibilites/route.ts
app/api/disponibilites/available/route.ts
app/api/rendezvous/route.ts
app/api/rendezvous/reschedule-info/route.ts
app/api/rendezvous/reschedule-validate/route.ts
```

---

**Date de correction :** 25 décembre 2024  
**Build testé :** ✅ Succès  
**Prêt pour la production :** ✅ Oui
