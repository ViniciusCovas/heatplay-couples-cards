import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const host='11111111-1111-4111-8111-111111111111';
const guest='22222222-2222-4222-8222-222222222222';
const stranger='33333333-3333-4333-8333-333333333333';
const room='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let db;
const sqlFile = path => readFile(new URL(`../${path}`,import.meta.url),'utf8');

test.before(async()=>{
 db=new PGlite();
 await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
 CREATE TABLE game_rooms(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_code text UNIQUE, status text DEFAULT 'waiting', current_phase text, host_user_id uuid, level integer, selected_language varchar, credit_status text, current_card text, used_cards text[], current_card_index integer, current_turn text, sub_turn text, proximity_question_answered boolean, player1_proximity_response boolean,player2_proximity_response boolean, created_at timestamptz DEFAULT now(),finished_at timestamptz,started_at timestamptz);
 CREATE TABLE room_participants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),room_id uuid,player_id text,is_ready boolean,player_number int, UNIQUE(room_id,player_id), UNIQUE(room_id,player_number));
 CREATE TABLE game_responses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),room_id uuid,player_id text,response text,evaluation text,evaluation_by text,honesty int,attraction int,intimacy int,surprise int,created_at timestamptz DEFAULT now());
 CREATE TABLE game_sync(id uuid,room_id uuid);
 CREATE TABLE level_selection_votes(room_id uuid,player_id text,selected_level int,created_at timestamptz DEFAULT now(),UNIQUE(room_id,player_id));
 CREATE TABLE connection_states(room_id uuid,player_id text,connection_status text,last_ping timestamptz,updated_at timestamptz,UNIQUE(room_id,player_id));
 CREATE TABLE ai_analyses(id uuid,room_id uuid);
 CREATE TABLE game_flow_queue(id uuid,room_id uuid);
 CREATE TABLE profiles(user_id uuid,last_seen timestamptz,last_login timestamptz,updated_at timestamptz);
 CREATE TABLE credits(user_id uuid PRIMARY KEY,balance integer,total_purchased integer,updated_at timestamptz);
 CREATE TABLE stripe_events(event_id text PRIMARY KEY,session_id text UNIQUE,event_type text NOT NULL,user_id uuid,credits_granted int,created_at timestamptz DEFAULT now());
 CREATE FUNCTION public.is_admin(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
 CREATE FUNCTION public.player_participates_in_room(room_id_param uuid,player_id_param text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM room_participants WHERE room_id=room_id_param AND player_id=player_id_param) $$;
 CREATE FUNCTION public.join_room_by_code(text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
 CREATE FUNCTION public.unsafe_legacy_function() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
 INSERT INTO auth.users VALUES('${host}'),('${guest}'),('${stranger}');
 INSERT INTO game_rooms(id,room_code,host_user_id) VALUES('${room}','ABC123','${host}');
 INSERT INTO room_participants(room_id,player_id,is_ready,player_number) VALUES('${room}','${host}',true,1);
 INSERT INTO game_responses(room_id,player_id,response) VALUES('${room}','${host}','private answer');
 ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
 ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
 ALTER TABLE game_responses ENABLE ROW LEVEL SECURITY;
 GRANT SELECT ON game_rooms,room_participants,game_responses TO anon,authenticated;
 GRANT UPDATE (status) ON game_rooms TO anon;
 CREATE POLICY old_anon_rooms ON game_rooms FOR SELECT TO anon USING(true);
 CREATE POLICY old_anon_responses ON game_responses FOR SELECT TO anon USING(true);
 CREATE POLICY members_read_rooms ON game_rooms FOR SELECT TO authenticated USING(host_user_id=auth.uid() OR player_participates_in_room(id,auth.uid()::text));
 CREATE POLICY members_read_participants ON room_participants FOR SELECT TO authenticated USING(player_participates_in_room(room_id,auth.uid()::text));
 CREATE POLICY members_read_responses ON game_responses FOR SELECT TO authenticated USING(player_participates_in_room(room_id,auth.uid()::text));
 `);
 // Execute the actual latest add_credits implementation, not a test double.
 const migration=await sqlFile('supabase/migrations/20250810144303_3dc50114-61a4-491a-9dc6-f161bd0097d6.sql');
 const start=migration.indexOf('CREATE OR REPLACE FUNCTION public.add_credits');
 const end=migration.indexOf('$function$;',migration.indexOf('AS $function$',start))+11;
 await db.exec(migration.slice(start,end));
 await db.exec(await sqlFile('supabase/migrations/20261026110000_private_guest_rooms.sql'));
 await db.exec(await sqlFile('supabase/migrations/20261026120000_atomic_credits_and_date_plans.sql'));
});
test.after(async()=>{await db?.close();});
async function asUser(id,operation){
 await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${id}';`);
 try { return await operation(); } finally { await db.exec('RESET ROLE;'); }
}
const grant=(event,session,user=host,credits=3)=>db.query(`SELECT grant_checkout_credits($1,$2,'test',$3,$4) result`,[event,session,user,credits]);

test('checkout is granted once across webhook + verification retries',async()=>{
 const results=await Promise.all([grant('evt_1','cs_1'),grant('verify_cs_1','cs_1'),grant('evt_1','cs_1')]);
 assert.equal(results.filter(r=>r.rows[0].result.already_processed===false).length,1);
 assert.equal((await db.query('SELECT balance FROM credits WHERE user_id=$1',[host])).rows[0].balance,3);
 await assert.rejects(()=>grant('evt_forgery','cs_1',guest),/conflict/);
});
test('a failed credit write rolls back its ledger claim; retry succeeds',async()=>{
 await db.exec("ALTER TABLE credits ADD CONSTRAINT simulated_failure CHECK(balance < 5);");
 await assert.rejects(()=>grant('evt_2','cs_2'),/simulated_failure/);
 assert.equal((await db.query("SELECT * FROM stripe_events WHERE session_id='cs_2'")).rows.length,0);
 await db.exec('ALTER TABLE credits DROP CONSTRAINT simulated_failure;');
 await grant('evt_2','cs_2');
 assert.equal((await db.query('SELECT balance FROM credits WHERE user_id=$1',[host])).rows[0].balance,6);
});
test('clients cannot call credit or legacy maintenance RPCs, nor read rooms as anon',async()=>{
 for(const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role};`);
  try {
   await assert.rejects(()=>grant('evt_bad','cs_bad'),/permission denied/);
   await assert.rejects(()=>db.query('SELECT unsafe_legacy_function()'),/permission denied/);
   await assert.rejects(()=>db.query("SELECT join_room_by_code('ABC123')"),/permission denied/);
   if(role==='anon') {
    await assert.rejects(()=>db.query('SELECT * FROM game_rooms'),/permission denied/);
    await assert.rejects(()=>db.query("UPDATE game_rooms SET status='finished'"),/permission denied/);
   }
  } finally { await db.exec('RESET ROLE'); }
 }
});
test('guest joins with their JWT; a stranger cannot enumerate or impersonate',async()=>{
 await asUser(guest,async()=>{
  assert.equal((await db.query('SELECT * FROM game_rooms')).rows.length,0);
  await assert.rejects(()=>db.query('SELECT join_room_by_code($1,$2)',['ABC123',host]),/Authentication/);
  const joined=await db.query('SELECT join_room_by_code($1,$2) result',['ABC123',guest]);
  assert.equal(joined.rows[0].result.player_number,2);
  assert.equal((await db.query('SELECT * FROM game_responses')).rows.length,1);
  const again=await db.query('SELECT join_room_by_code($1,$2) result',['ABC123',guest]);
  assert.equal(again.rows[0].result.already_joined,true);
 });
 await asUser(stranger,async()=>{
  assert.equal((await db.query('SELECT * FROM game_rooms')).rows.length,0);
  assert.equal((await db.query('SELECT * FROM game_responses')).rows.length,0);
  const full=await db.query('SELECT join_room_by_code($1,$2) result',['ABC123',stranger]);
  assert.equal(full.rows[0].result.error,'room_full');
  await assert.rejects(()=>db.query('SELECT sync_game_state_reliably($1,$2)',[room,guest]),/Identity mismatch/);
  await assert.rejects(()=>db.query('SELECT set_current_card_if_missing($1)',[room]),/Not a participant/);
  const denied=await db.query('SELECT handle_level_selection($1,$2,1) result',[room,stranger]);
  assert.equal(denied.rows[0].result.status,'error');
  assert.match(denied.rows[0].result.details,/Not a participant/);
 });
});
test('AI allowance is atomic, per identity and rolls over by day',async()=>{
 const claims=await Promise.all(Array.from({length:8},()=>db.query('SELECT claim_date_plan($1) allowed',[host])));
 assert.equal(claims.filter(r=>r.rows[0].allowed).length,5);
 await db.exec("UPDATE date_plan_usage SET usage_day=current_date-1;");
 assert.equal((await db.query('SELECT claim_date_plan($1) allowed',[host])).rows[0].allowed,true);
 await db.exec('UPDATE date_plan_usage SET requests=500;');
 assert.equal((await db.query('SELECT claim_date_plan($1) allowed',[guest])).rows[0].allowed,false);
});
