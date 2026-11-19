-- Run against an empty LOCAL PostgreSQL database only:
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/foundation.sql
-- The stubs below stand in for platform-managed Supabase schemas/roles.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
\ir ../migrations/202611160001_wedding_foundation.sql

do $$
begin
  if has_table_privilege('anon','public.wedding_rsvps','SELECT') then raise exception 'public RSVP leak'; end if;
  if has_table_privilege('authenticated','public.wedding_invitations','SELECT') then raise exception 'invitation leak'; end if;
  if has_function_privilege('anon','public.wedding_redeem_invitation(text,text)','EXECUTE') then raise exception 'public RPC access'; end if;
  if has_function_privilege('authenticated','public.wedding_reserve_photo(text,uuid)','EXECUTE') then raise exception 'authenticated RPC access'; end if;
end $$;

set role service_role;
insert into public.wedding_events(id,title,starts_at,camera_opens_at,camera_closes_at,reveal_at,delete_after)
values('00000000-0000-0000-0000-000000000001','Test wedding',now(),now()-interval '1 hour',now()+interval '1 day',now()+interval '2 days',now()+interval '180 days');
insert into public.wedding_invitations(id,event_id,display_name,token_hash,photo_limit,party_size,max_sessions,expires_at)
values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Test guest',repeat('a',64),2,2,1,now()+interval '2 days');
select public.wedding_redeem_invitation(repeat('a',64),repeat('b',64));

do $$
declare p public.wedding_photos; q public.wedding_photos; r public.wedding_rsvps;
begin
  begin
    perform public.wedding_redeem_invitation(repeat('c',64),repeat('d',64));
    raise exception 'test failure: invalid invite accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Invitation unavailable' then raise; end if;
  end;
  begin
    perform public.wedding_redeem_invitation(repeat('a',64),repeat('d',64));
    raise exception 'test failure: device cap bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Device limit reached' then raise; end if;
  end;
  p := public.wedding_reserve_photo(repeat('b',64),'00000000-0000-0000-0000-000000000003');
  q := public.wedding_reserve_photo(repeat('b',64),'00000000-0000-0000-0000-000000000003');
  if p.id <> q.id then raise exception 'retry was not idempotent'; end if;
  perform public.wedding_reserve_photo(repeat('b',64),'00000000-0000-0000-0000-000000000004');
  begin
    perform public.wedding_reserve_photo(repeat('b',64),'00000000-0000-0000-0000-000000000005');
    raise exception 'test failure: quota exceeded';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Roll is full' then raise; end if;
  end;
  update public.wedding_photos set upload_expires_at = now()-interval '1 second' where id = p.id;
  q := public.wedding_reserve_photo(repeat('b',64),'00000000-0000-0000-0000-000000000005');
  if (select state from public.wedding_photos where id = p.id) <> 'expired' then raise exception 'expired slot not released'; end if;
  update public.wedding_photos set state = 'deleted' where id = q.id;
  begin
    perform public.wedding_reserve_photo(repeat('b',64),'00000000-0000-0000-0000-000000000006');
    raise exception 'test failure: deleted shot restored quota';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Roll is full' then raise; end if;
  end;
  r := public.wedding_save_rsvp(repeat('b',64),'accepted',2,'Vegetarian','Congratulations');
  r := public.wedding_save_rsvp(repeat('b',64),'declined',0);
  if r.attendance <> 'declined' or (select count(*) from public.wedding_rsvps) <> 1 then raise exception 'RSVP update failed'; end if;
  begin
    perform public.wedding_save_rsvp(repeat('b',64),'accepted',3);
    raise exception 'test failure: exceeded allocated seats';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Seat allocation exceeded' then raise; end if;
  end;
  update public.wedding_events set camera_closes_at=now()-interval '1 second';
  begin
    perform public.wedding_reserve_photo(repeat('b',64),gen_random_uuid());
    raise exception 'test failure: closed camera accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Camera is closed' then raise; end if;
  end;
  update public.wedding_invitations set revoked_at=now();
  begin
    perform public.wedding_save_rsvp(repeat('b',64),'accepted',1);
    raise exception 'test failure: revoked invitation accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Session unavailable' then raise; end if;
  end;
end $$;
reset role;
select 'Foundation assertions passed' as result;
