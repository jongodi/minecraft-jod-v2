import { promises as fs } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';

export const CREW_USERNAMES = [
  'stebbias',
  'AmmaGaur',
  'joenana',
  'ingunnbirta',
  'Gamla123',
  'fafnir1994',
  'IMlonely',
  'eikibleiki',
] as const;

export type CrewUsername = typeof CREW_USERNAMES[number];

export interface CrewPost {
  id:        string;
  text:      string;
  createdAt: string;
}

export interface CrewPhoto {
  id:         string;
  filename:   string;
  caption:    string;
  uploadedAt: string;
}

export interface CrewProfile {
  username:  string;
  bio:       string;
  photos:    CrewPhoto[];
  posts:     CrewPost[];
}

// ─── Storage backend ──────────────────────────────────────────────────────────
// Priority order:
//   1. Vercel KV (production) — when KV_REST_API_URL is set
//   2. Local filesystem src/data/profiles — for local dev
//   3. /tmp fallback — if running on Vercel but KV not yet configured

// Check for KV_REST_API_URL (set by Vercel Redis / Upstash integration)
function hasKV(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Detect if we're running on Vercel (filesystem is read-only)
function isVercel(): boolean {
  return !!process.env.VERCEL;
}

function profilesDir(): string {
  // /tmp is writable on Vercel; use it as last-resort fallback
  if (isVercel() && !hasKV()) return '/tmp/jod-profiles';
  return path.join(process.cwd(), 'src', 'data', 'profiles');
}

export async function readProfile(username: string): Promise<CrewProfile> {
  const key = `crew:profile:${username.toLowerCase()}`;

  if (hasKV()) {
    try {
      const { kv } = await import('@vercel/kv');
      const data = await kv.get<CrewProfile>(key);
      return data ?? { username, bio: '', photos: [], posts: [] };
    } catch (e) {
      console.error('KV readProfile error:', e);
      return { username, bio: '', photos: [], posts: [] };
    }
  }

  const dir  = profilesDir();
  const file = path.join(dir, `${username.toLowerCase()}.json`);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw) as CrewProfile;
  } catch {
    return { username, bio: '', photos: [], posts: [] };
  }
}

export async function writeProfile(profile: CrewProfile): Promise<void> {
  const key = `crew:profile:${profile.username.toLowerCase()}`;

  if (hasKV()) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(key, profile);
      return;
    } catch (e) {
      console.error('KV writeProfile error:', e);
      throw new Error('Storage error: failed to save profile');
    }
  }

  const dir  = profilesDir();
  const file = path.join(dir, `${profile.username.toLowerCase()}.json`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(profile, null, 2) + '\n', 'utf-8');
}

// ─── Crew auth ────────────────────────────────────────────────────────────────

export const CREW_COOKIE = 'jod_crew_session';

export interface CrewSession { username: string }

export function getCrewToken(username: string): string | undefined {
  const key = `CREW_TOKEN_${username.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return process.env[key];
}

export async function getCrewSession(): Promise<CrewSession | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(CREW_COOKIE)?.value;
    if (!value) return null;
    const colonIdx = value.indexOf(':');
    if (colonIdx === -1) return null;
    const username = value.slice(0, colonIdx);
    const token    = value.slice(colonIdx + 1);
    if (!username || !token) return null;
    const expected = getCrewToken(username);
    if (!expected || expected !== token) return null;
    return { username };
  } catch {
    return null;
  }
}
