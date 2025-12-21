# Fix Images Upload - Services & Gallery

## Problème identifié

Les routes `/api/admin/images` (services featured) et `/api/admin/gallery/images` retournaient des erreurs 500, contrairement à `/api/admin/about/image` qui fonctionne.

## Diagnostic

Toutes les routes étaient correctement implémentées :
- ✅ Récupération de `salonId` depuis `verifyAdminAuth()`
- ✅ Utilisation de `supabaseAdmin` (SERVICE_ROLE_KEY)
- ✅ Envoi de tous les champs requis par la table `images`

**Mais** les erreurs étaient silencieuses ! Les catch blocks ne loguaient pas les erreurs réelles de Supabase.

## Modifications apportées

### 1. `/api/admin/images/route.ts` (Services Featured)

**Avant :**
```typescript
if (insertError) {
  return NextResponse.json(
    { success: false, error: 'Erreur création image' },
    { status: 500 }
  )
}

} catch (error) {
  return NextResponse.json(
    { success: false, error: 'Erreur serveur interne' },
    { status: 500 }
  )
}
```

**Après :**
```typescript
// Log des données avant insert
const insertData = { salon_id: salonId, service_id: serviceId, ... }
console.log('[POST /api/admin/images] Inserting:', JSON.stringify(insertData, null, 2))

if (insertError) {
  console.error('[POST /api/admin/images] Insert error:', insertError)
  return NextResponse.json(
    { success: false, error: insertError.message || 'Erreur création image' },
    { status: 500 }
  )
}

} catch (error) {
  console.error('[POST /api/admin/images] Unexpected error:', error)
  return NextResponse.json(
    { success: false, error: error instanceof Error ? error.message : 'Erreur serveur interne' },
    { status: 500 }
  )
}
```

### 2. `/api/admin/gallery/images/route.ts` (Gallery)

**Changements identiques :**
- ✅ Log des données avant insert (POST)
- ✅ Log des erreurs Supabase avec `error.message`
- ✅ Log des erreurs catch avec messages détaillés
- ✅ Appliqué sur POST, PATCH, DELETE

## Prochaines étapes

1. **Déployer** en production
2. **Tester** upload d'une image service et d'une image gallery
3. **Vérifier les logs** Vercel :
   - Si insertion réussit → Problem solved
   - Si erreur → Les logs montreront exactement le problème (FK violation, contrainte, etc.)

## Flux actuel (cohérent avec "about")

### About Image (✅ fonctionne)
1. Upload Storage → `/api/admin/upload-image`
2. PATCH DB → `/api/admin/about/image` avec `{ imageUrl }`

### Gallery Images (🔄 diagnostiqué)
1. Upload Storage → `/api/admin/upload-image`
2. POST DB → `/api/admin/gallery/images` avec `{ imageUrl, altText, serviceId }`

### Services Featured (🔄 diagnostiqué)
1. POST direct → `/api/admin/images` (upload + insert en une fois)

## Architecture validée

```typescript
// Toutes les routes utilisent ce pattern
const { salonId, error: authError } = await verifyAdminAuth()
if (authError) return authError

// Insert avec salonId depuis session
await supabaseAdmin.from('images').insert({
  salon_id: salonId,  // ✅ depuis user.app_metadata.salon_id
  type: 'gallery' | 'service_featured' | 'about',
  image_url: publicUrl,
  service_id: serviceId || null,
  // ... autres champs
})
```

## Notes importantes

- **SERVICE_ROLE_KEY** bypass les RLS → pas de problème de permissions
- **salon_id** vient TOUJOURS de `user.app_metadata.salon_id` (pas hardcodé)
- **Logs temporaires** seront nettoyés après diagnostic en production
- **Schéma DB** validé : tous les champs requis sont envoyés

## Fichiers modifiés

1. `app/api/admin/images/route.ts`
2. `app/api/admin/gallery/images/route.ts`
