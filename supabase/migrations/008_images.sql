-- 009_images.sql
-- Table images (gallery salon + images services)
-- Gestion explicite du type d'image (gallery, service_featured, about, hero)

begin;

-- =========================
-- TABLE: images
-- =========================

create table if not exists images (
  id uuid primary key default gen_random_uuid(),

  salon_id uuid not null
    references salons(id)
    on delete cascade,

  service_id uuid
    references services(id)
    on delete cascade,

  -- 🔑 TYPE D’IMAGE (clé du problème)
  -- Permet de distinguer galerie / service / about / hero
  type text not null default 'gallery'
    check (
      type in (
        'gallery',          -- réalisations du salon
        'service_featured', -- image d’un service mis en avant
        'about',            -- image section À propos
        'hero'              -- image hero / header
      )
    ),

  image_url text not null,
  alt_text text,

  position integer not null default 0,
  is_visible boolean not null default true,

  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- =========================
-- INDEXES
-- =========================

-- Accès rapide par salon
create index if not exists idx_images_salon_id
  on images(salon_id);

-- Accès rapide par service (images de services)
create index if not exists idx_images_service_id
  on images(service_id)
  where service_id is not null;

-- Filtrage par type (CRUCIAL)
create index if not exists idx_images_type
  on images(type);

-- Tri d'affichage (gallery principalement)
create index if not exists idx_images_salon_type_position
  on images(salon_id, type, position);

-- Filtrage soft delete
create index if not exists idx_images_not_deleted
  on images(deleted_at)
  where deleted_at is null;

-- =========================
-- ROW LEVEL SECURITY
-- =========================

alter table images enable row level security;

-- =========================
-- POLICIES
-- =========================

-- 🔓 Lecture publique
-- Images visibles : gallery, about, service_featured
drop policy if exists "Public read gallery images" on images;

create policy "Public read visible images"
on images
for select
using (
  deleted_at is null
  and is_visible = true
  and type in ('gallery', 'about', 'service_featured')
);

-- 🔐 Accès admin complet
create policy "Admin full access images"
on images
for all
using (is_admin())
with check (is_admin());

commit;
