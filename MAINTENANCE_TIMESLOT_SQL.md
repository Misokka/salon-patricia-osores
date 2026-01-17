Nettoyage des time_slots – Option 1 (recommandée)
Objectif

Empêcher la base de données de grossir inutilement en supprimant régulièrement les anciens time_slots, tout en conservant l’historique métier des rendez-vous dans la table appointments.

Cette approche est pensée pour une utilisation réelle à long terme, avec beaucoup de rendez-vous accepted.

Principe clé (à bien comprendre)

appointments = source de vérité historique

Qui

Quand

Service

Statut (pending, accepted, etc.)

time_slots = données opérationnelles temporaires

Servent à afficher les disponibilités

Peuvent (et doivent) être purgés régulièrement

👉 On accepte de supprimer des time_slots même s’ils étaient liés à des rendez-vous, car l’historique n’en dépend plus.

Prérequis indispensables

Avant toute suppression, vérifie que la table appointments contient tout ce qu’il faut pour reconstruire un rendez-vous sans time_slots.

Minimum requis dans appointments :

salon_id

appointment_date

heure de début (ou durée)

status

service_id

Si aujourd’hui l’heure vient uniquement de time_slots, il faut la recopier une fois dans appointments (backfill), puis ne plus dépendre des slots pour l’historique.

Politique de rétention recommandée

Tu choisis un nombre de jours à conserver dans time_slots.

Recommandation réaliste :

14 jours → base très légère

30 jours → plus confortable pour debug

Dans les exemples ci-dessous, on utilise 14 jours.

Étape 1 — Vérifier ce qui va être supprimé (PREVIEW)

Ce script ne modifie rien, il sert uniquement à voir l’impact.

SQL à exécuter dans le Supabase SQL Editor :

WITH params AS (
SELECT (CURRENT_DATE - 14) AS cutoff_date
)
SELECT
ts.salon_id,
COUNT(*)::int AS total_slots_to_delete,
MIN(ts.slot_date) AS oldest_slot,
MAX(ts.slot_date) AS newest_slot
FROM time_slots ts, params p
WHERE ts.slot_date < p.cutoff_date
GROUP BY ts.salon_id
ORDER BY total_slots_to_delete DESC;

➡️ Si les chiffres te semblent cohérents, tu peux passer à l’étape suivante.

Étape 2 — Supprimer les liens appointment_slots vers les vieux slots

On commence toujours par supprimer les liens, pour éviter tout problème de clé étrangère.

SQL :

WITH params AS (
SELECT (CURRENT_DATE - 14) AS cutoff_date
)
DELETE FROM appointment_slots aps
USING time_slots ts, params p
WHERE aps.time_slot_id = ts.id
AND ts.slot_date < p.cutoff_date;

Ce script :

ne supprime aucun rendez-vous

enlève seulement le lien entre un rendez-vous et un slot trop ancien

Étape 3 — Supprimer les time_slots trop anciens

Une fois les liens supprimés, on peut nettoyer les slots eux-mêmes.

SQL :

WITH params AS (
SELECT (CURRENT_DATE - 14) AS cutoff_date
)
DELETE FROM time_slots ts
USING params p
WHERE ts.slot_date < p.cutoff_date;

À ce stade :

la table time_slots est propre

la BDD ne grossira plus indéfiniment

l’historique reste intact dans appointments

Vérification après nettoyage

Pour vérifier qu’il ne reste aucun lien cassé :

SELECT COUNT(*)
FROM appointment_slots aps
LEFT JOIN time_slots ts ON ts.id = aps.time_slot_id
WHERE ts.id IS NULL;

Résultat attendu : 0

Partie spécifique : gestion des pending

Tu as fait un choix important : on garde les pending.
C’est OK, mais il faut une règle claire pour éviter les blocages et la pollution.

Règle métier recommandée

pending dans le futur → normal

pending dans le passé → ne doit plus bloquer de créneau

Même si tu conserves le rendez-vous en pending, le slot associé ne doit plus exister après la date passée.

Action minimale recommandée pour les pending

Avant ou après le nettoyage global, exécute ce script pour détacher les pending passés de leurs slots.

SQL :

WITH params AS (
SELECT CURRENT_DATE AS today
)
DELETE FROM appointment_slots aps
USING appointments a, time_slots ts, params p
WHERE aps.appointment_id = a.id
AND aps.time_slot_id = ts.id
AND a.status = 'pending'
AND ts.slot_date < p.today;

Effet :

les rendez-vous pending restent dans appointments

ils ne bloquent plus aucun créneau

les slots peuvent ensuite être supprimés sans risque

Pourquoi on ne garde pas les slots des accepted ?

Tu as eu la bonne intuition 👇

« plus tard, quasiment tous les slots seront en accepted »

C’est exactement pour ça qu’on ne doit pas les conserver :

1 salon actif = milliers de accepted / an

chaque rendez-vous = plusieurs slots

explosion de la table time_slots

➡️ L’historique appartient à appointments, pas à time_slots.

Fréquence d’exécution recommandée

Phase actuelle : manuel

1 fois par mois dans le SQL Editor Supabase

Plus tard :

script automatique (cron) si besoin

ou bouton admin interne