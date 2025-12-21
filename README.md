# ✂️ Salon Démo — Plateforme de prise de rendez-vous

Application web moderne de prise de rendez-vous en ligne pour salons de services  
(coiffure, esthétique, bien-être…), conçue pour être rapide à déployer, simple à utiliser et scalable.

Ce projet sert également de site de démonstration pour présenter l’ensemble des fonctionnalités de la plateforme.

---

## 🚀 Fonctionnalités principales

- Consultation des services disponibles  
- Prise de rendez-vous en ligne avec sélection de créneaux  
- Gestion des disponibilités et des horaires  
- Interface d’administration sécurisée  
- Validation / refus / modification des rendez-vous  
- Envoi d’emails transactionnels  
- Architecture multi-salons (SaaS-ready)  
- Design moderne et responsive  

---

## 🛠️ Stack technique

- Next.js (App Router)  
- React + TypeScript  
- Supabase (Base de données + Auth)  
- Tailwind CSS  
- Framer Motion  
- Docker (Supabase en local)  
- Vercel (déploiement)  

---

## 📦 Prérequis

- Node.js (18+ recommandé)  
- Docker  
- Docker Compose  
- Supabase CLI  

---

## ⚙️ Installation & lancement en local

### 1️⃣ Configuration Docker (une seule fois)

sudo usermod -aG docker $USER  
newgrp docker  

---

### 2️⃣ Lancer Supabase en local

supabase start  
supabase db reset  

Cela démarre :
- la base de données  
- l’authentification Supabase  
- les services nécessaires au projet  

---

### 3️⃣ Créer un compte Supabase

- Créer un compte sur https://supabase.com  
- Créer un nouveau projet  
- Récupérer :
  - NEXT_PUBLIC_SUPABASE_URL  
  - NEXT_PUBLIC_SUPABASE_ANON_KEY  
  - SUPABASE_SERVICE_ROLE_KEY  

---

### 4️⃣ Variables d’environnement

Créer un fichier .env.local à la racine du projet :

```env
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_application
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (SECRET - NE JAMAIS EXPOSER)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

⚠️ Le fichier .env.local ne doit jamais être commité.

---

### 5️⃣ Créer un utilisateur admin (Supabase)

UPDATE auth.users  
SET raw_app_meta_data = '{"role": "admin"}'::jsonb  
WHERE email = 'votre-email@example.com';  

Cela permet d’accéder à l’interface d’administration.

UPDATE auth.users
SET raw_app_meta_data =
  jsonb_set(
    raw_app_meta_data,
    '{salon_id}',
    '"e0b7b419-a22b-4c2c-8355-2f4af30fe1c2"',
    true
  )
WHERE email = 'jeremy.caron.labalette@gmail.com';


---

### 6️⃣ Lancer l’application

npm install  
npm run dev  

L’application est accessible sur :  
http://localhost:3000  

---

## 🌍 Déploiement en production

- Déploiement automatique via Vercel  
- Variables d’environnement définies directement dans le dashboard Vercel  
- Connexion à Supabase en production  
- HTTPS automatique  

Aucun fichier .env n’est utilisé en production.

---

## 🔐 Sécurité & bonnes pratiques

- Row Level Security (RLS) activée sur Supabase  
- Séparation stricte client / serveur  
- Clés sensibles uniquement côté serveur  
- Authentification sécurisée pour l’admin  

---

## 🧪 Mode démonstration

- Données non contractuelles  
- Emails marqués comme démo  
- Usage uniquement à des fins de présentation  

---

## 📄 Légal

- Politique de confidentialité  
- Conditions Générales d’Utilisation  
- Mentions légales  
(Toutes accessibles depuis le footer)

---

## ✨ Auteur

Jeremy Caron  
Plateforme de réservation pour salons de services
