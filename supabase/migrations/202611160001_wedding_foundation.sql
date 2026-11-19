-- Foundation only: NOT applied to a live Supabase project.
-- Browser clients have no table or RPC access. Vercel must authorize every request.
begin;

create table public.wedding_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  starts_at timestamptz not null,
  camera_opens_at timestamptz not null,
  camera_closes_at timestamptz not null,
  reveal_at timestamptz not null,
  delete_after timestamptz not null,
  gallery_enabled boolean not null default false,
  check (camera_closes_at > camera_opens_at),
  check (delete_after > camera_closes_at and delete_after > reveal_at)
);

create table public.wedding_hosts (
  event_id uuid not null references public.wedding_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (event_id, user_id)
);

create table public.wedding_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.wedding_events(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  party_size smallint not null default 1 check (party_size between 1 and 20),
  photo_limit smallint not null default 24 check (photo_limit between 1 and 100),
  max_sessions smallint not null default 3 check (max_sessions between 1 and 20),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index wedding_invitations_event_idx on public.wedding_invitations(event_id);

create table public.wedding_guest_sessions (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.wedding_invitations(id) on delete cascade,
  session_hash text not null unique check (session_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index wedding_sessions_invitation_idx on public.wedding_guest_sessions(invitation_id);

create table public.wedding_rsvps (
  invitation_id uuid primary key references public.wedding_invitations(id) on delete cascade,
  attendance text not null check (attendance in ('accepted','declined')),
  seats smallint not null check (seats between 0 and 20),
  dietary text not null default '' check (char_length(dietary) <= 1000),
  message text not null default '' check (char_length(message) <= 1000),
  updated_at timestamptz not null default now(),
  check ((attendance = 'declined' and seats = 0) or (attendance = 'accepted' and seats > 0))
);

create table public.wedding_photos (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.wedding_invitations(id) on delete cascade,
  client_id uuid not null,
  object_path text not null unique,
  state text not null default 'reserved' check (state in ('reserved','stored','approved','rejected','deleted','expired')),
  upload_expires_at timestamptz not null,
  bytes integer check (bytes between 1 and 6291456),
  width integer check (width between 1 and 20000),
  height integer check (height between 1 and 20000),
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  unique (invitation_id, client_id)
);
create index wedding_photos_invitation_state_idx on public.wedding_photos(invitation_id,state);

create table public.wedding_audit_log (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.wedding_events(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  target_id uuid,
  created_at timestamptz not null default now()
);

-- Defense in depth: all app access is through authorized server routes.
alter table public.wedding_events enable row level security;
alter table public.wedding_hosts enable row level security;
alter table public.wedding_invitations enable row level security;
alter table public.wedding_guest_sessions enable row level security;
alter table public.wedding_rsvps enable row level security;
alter table public.wedding_photos enable row level security;
alter table public.wedding_audit_log enable row level security;
revoke all on public.wedding_events, public.wedding_hosts, public.wedding_invitations,
  public.wedding_guest_sessions, public.wedding_rsvps, public.wedding_photos,
  public.wedding_audit_log from anon, authenticated;
grant all on public.wedding_events, public.wedding_hosts, public.wedding_invitations,
  public.wedding_guest_sessions, public.wedding_rsvps, public.wedding_photos,
  public.wedding_audit_log to service_role;
grant usage, select on sequence public.wedding_audit_log_id_seq to service_role;

-- Vercel generates random 32-byte tokens and supplies their SHA-256 hex hashes.
-- Locking the invitation prevents simultaneous redemptions exceeding device limits.
create function public.wedding_redeem_invitation(p_token_hash text, p_session_hash text)
returns public.wedding_guest_sessions
language plpgsql security invoker set search_path = '' as $$
declare
  invitation public.wedding_invitations;
  guest_session public.wedding_guest_sessions;
begin
  select * into invitation from public.wedding_invitations
    where token_hash = p_token_hash for update;
  if not found or invitation.revoked_at is not null or invitation.expires_at <= now() then
    raise exception 'Invitation unavailable' using errcode = 'P0001';
  end if;
  if (select count(*) from public.wedding_guest_sessions
      where invitation_id = invitation.id and revoked_at is null and expires_at > now()) >= invitation.max_sessions then
    raise exception 'Device limit reached' using errcode = 'P0001';
  end if;
  insert into public.wedding_guest_sessions(invitation_id,session_hash,expires_at)
    values(invitation.id,p_session_hash,least(invitation.expires_at,now() + interval '90 days'))
    returning * into guest_session;
  return guest_session;
end;
$$;

-- One quota shared by an invitation on all devices. Retries reuse a client UUID.
-- Expired uploads do not count; rejected/deleted uploaded photos still consume a shot.
create function public.wedding_reserve_photo(p_session_hash text, p_client_id uuid)
returns public.wedding_photos
language plpgsql security invoker set search_path = '' as $$
declare
  guest_session public.wedding_guest_sessions;
  invitation public.wedding_invitations;
  wedding public.wedding_events;
  photo public.wedding_photos;
  photo_id uuid;
begin
  select * into guest_session from public.wedding_guest_sessions
    where session_hash = p_session_hash and revoked_at is null and expires_at > now();
  if not found then raise exception 'Session unavailable' using errcode = 'P0001'; end if;
  select * into invitation from public.wedding_invitations where id = guest_session.invitation_id for update;
  if invitation.revoked_at is not null or invitation.expires_at <= now() then
    raise exception 'Invitation unavailable' using errcode = 'P0001';
  end if;
  select * into wedding from public.wedding_events where id = invitation.event_id;
  if now() < wedding.camera_opens_at or now() >= wedding.camera_closes_at then
    raise exception 'Camera is closed' using errcode = 'P0001';
  end if;
  update public.wedding_photos set state = 'expired'
    where invitation_id = invitation.id and state = 'reserved' and upload_expires_at <= now();
  select * into photo from public.wedding_photos where invitation_id = invitation.id and client_id = p_client_id;
  if found then return photo; end if;
  if (select count(*) from public.wedding_photos where invitation_id = invitation.id and state <> 'expired') >= invitation.photo_limit then
    raise exception 'Roll is full' using errcode = 'P0001';
  end if;
  photo_id := gen_random_uuid();
  insert into public.wedding_photos(id,invitation_id,client_id,object_path,upload_expires_at)
    values(photo_id,invitation.id,p_client_id,
      wedding.id::text || '/' || invitation.id::text || '/' || photo_id::text || '.jpg',
      now() + interval '2 hours 5 minutes') returning * into photo;
  return photo;
end;
$$;

create function public.wedding_save_rsvp(p_session_hash text, p_attendance text,
  p_seats integer, p_dietary text default '', p_message text default '')
returns public.wedding_rsvps
language plpgsql security invoker set search_path = '' as $$
declare
  invitation public.wedding_invitations;
  response public.wedding_rsvps;
begin
  select i.* into invitation from public.wedding_invitations i
    join public.wedding_guest_sessions s on s.invitation_id = i.id
    where s.session_hash = p_session_hash and s.revoked_at is null and s.expires_at > now()
      and i.revoked_at is null and i.expires_at > now() for update of i;
  if not found then raise exception 'Session unavailable' using errcode = 'P0001'; end if;
  if p_seats > invitation.party_size then
    raise exception 'Seat allocation exceeded' using errcode = 'P0001';
  end if;
  insert into public.wedding_rsvps(invitation_id,attendance,seats,dietary,message)
    values(invitation.id,p_attendance,p_seats,p_dietary,p_message)
    on conflict(invitation_id) do update set attendance = excluded.attendance,
      seats = excluded.seats, dietary = excluded.dietary, message = excluded.message, updated_at = now()
    returning * into response;
  return response;
end;
$$;

revoke all on function public.wedding_redeem_invitation(text,text) from public, anon, authenticated;
revoke all on function public.wedding_reserve_photo(text,uuid) from public, anon, authenticated;
revoke all on function public.wedding_save_rsvp(text,text,integer,text,text) from public, anon, authenticated;
grant execute on function public.wedding_redeem_invitation(text,text) to service_role;
grant execute on function public.wedding_reserve_photo(text,uuid) to service_role;
grant execute on function public.wedding_save_rsvp(text,text,integer,text,text) to service_role;

-- No storage.objects policies are created. Only trusted server/signed URLs can access.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('wedding-photos','wedding-photos',false,6291456,array['image/jpeg']),
        ('wedding-site-media','wedding-site-media',false,6291456,array['image/jpeg','image/png','image/webp']);

commit;
