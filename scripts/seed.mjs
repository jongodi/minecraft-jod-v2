// A board to walk signed in: signs, a wish, a question, answers, lanterns and
// items, posted through the site's own API by three of the crew, so every
// rule the routes keep is kept here too. For a local store only: it writes
// what it is given into whatever Redis the running server reads.
//
// Usage:
//   redis-server --port 6379 --save "" &
//   REDIS_URL=redis://localhost:6379 \
//   CREW_TOKEN_STEBBIAS=local-stebbias CREW_TOKEN_JOENANA=local-joenana CREW_TOKEN_AMMAGAUR=local-ammagaur \
//     npm run dev            (or: npm run build && npm start)
//   node scripts/seed.mjs
//
// Env: BASE (default http://localhost:3000), and the same CREW_TOKEN_<NAME>
// the server was started with (default local-<name>).
// Prints each member's session cookie at the end, for a browser or shots.mjs
// (COOKIE='jod_crew_session=…' node scripts/shots.mjs shots /taflan).

const BASE = process.env.BASE ?? 'http://localhost:3000';
const host = new URL(BASE).hostname;
if (!['localhost', '127.0.0.1', '[::1]'].includes(host) && process.env.SEED_ANYWHERE !== '1') {
  console.error(`seed.mjs writes test signs into the store behind ${BASE}. It is meant for a local server; set SEED_ANYWHERE=1 if you mean it.`);
  process.exit(1);
}

const MEMBERS = ['stebbias', 'joenana', 'AmmaGaur'];
const tokenOf = name => process.env[`CREW_TOKEN_${name.toUpperCase()}`] ?? `local-${name.toLowerCase()}`;

/** One member's signed-in way of asking: the cookie the sign-in set goes with every request. */
async function signIn(username) {
  const res = await fetch(`${BASE}/api/crew/auth`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, token: tokenOf(username) }),
  });
  if (!res.ok) throw new Error(`${username} could not sign in (${res.status}): is the server running with CREW_TOKEN_${username.toUpperCase()}=${tokenOf(username)} and a REDIS_URL?`);
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const post = async (path, body) => {
    const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body) });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${username} POST ${path}: ${r.status} ${json.error ?? ''}`);
    return json;
  };
  return { username, cookie, post };
}

const [stebbi, joe, amma] = await Promise.all(MEMBERS.map(signIn));
const wall = m => `/api/crew/${m.username}/entries`;
const on = (owner, entry) => `${wall(owner)}/${entry.id}`;

/* a plain note, with a long word and a link in it (what a phone's width has to hold) */
const note = await stebbi.post(wall(stebbi), {
  text: 'Brúin yfir gilið er komin hálfa leið. Vantar steinmúrsteinahelluþrepagerðarmann í kvöld, sjá https://minecraft.wiki/w/Stone_Bricks og komið með hakann.',
});
await joe.post(`${on(stebbi, note)}/replies`, { text: 'Ég kem eftir kvöldmat, @AmmaGaur á að koma með luktirnar.' });
await amma.post(`${on(stebbi, note)}/replies`, { text: 'Luktirnar eru í kistunni við bryggjuna.' });
await joe.post(`${on(stebbi, note)}/lantern`, {});
await amma.post(`${on(stebbi, note)}/lantern`, {});
await amma.post(`${on(stebbi, note)}/react`, { item: 'diamond', given: true }).catch(e => console.warn('  (no item given: ' + e.message + ')'));

/* a wish with its reward, taken on */
const wish = await joe.post(wall(joe), { text: 'Tvo stafla af dökkri eik í þakið á hlöðunni', bounty: { reward: '12 smaragðar' } });
await amma.post(`${on(joe, wish)}/bounty`, { action: 'take' }).catch(e => console.warn('  (wish not taken: ' + e.message + ')'));

/* a question with three answers and two votes */
const ask = await amma.post(wall(amma), { text: 'Hvar á nýja lestarstöðin að standa?', poll: { choices: ['Við Joðbæ', 'Á Sveppaeyju', 'Undir Kastala Goða'] } });
await stebbi.post(`${on(amma, ask)}/vote`, { choice: 'a' });
await joe.post(`${on(amma, ask)}/vote`, { choice: 'c' });

/* a second, short note, so a day on the board holds more than one sign */
await joe.post(wall(joe), { text: 'Fann þrjá demanta undir hlöðunni. Þeir eru mínir.' });

console.log('Seeded: a note with two answers and two lanterns, a wish taken on, a question with two votes, a short note.');
console.log('Walk it at ' + BASE + '/taflan, signed in with one of:');
for (const m of [stebbi, joe, amma]) console.log(`  ${m.username.padEnd(9)} COOKIE='${m.cookie}'`);
