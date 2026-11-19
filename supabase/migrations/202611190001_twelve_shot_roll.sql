-- Requested product cap. Apply after the foundation; never discard existing photos.
begin;
alter table public.wedding_invitations alter column photo_limit set default 12;
update public.wedding_invitations set photo_limit = 12 where photo_limit > 12;
alter table public.wedding_invitations add constraint wedding_invitations_twelve_shot_cap check (photo_limit <= 12);
commit;
