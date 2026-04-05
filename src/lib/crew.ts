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
// Uses Vercel KV in production (when KV_REST_API_URL is set),
// falls back to local filesystem for development.

const PROFILES_DIR = path.join(process.cwd(), 'src', 'data', 'profiles');

function hasKV(): boolean {
  return !!process.env.KV_REST_API_URL;
}

export async function readProfile(username: string): Promise<CrewProfile> {
  const key = `crew:profile:${username.toLowerCase()}`;

  if (hasKV()) {
    try {
      const { kv } = await import('@vercel/kv');
      const data = await kv.get<CrewProfile>(key);
      return data ?? { username, bio: '', photos: [], posts: [] };
    } catch {
      return { username, bio: '', photos: [], posts: [] };
    }
  }

  // Filesystem fallback (local dev)
  const file = path.join(PROFILES_DIR, `${username.toLowerCase()}.json`);
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
    const { kv } = await import('@vercel/kv');
    await kv.set(key, profile);
    return;
  }

  // Filesystem fallback (local dev)
  await fs.mkdir(PROFILES_DIR, { recursive: true });
  const file = path.join(PROFILES_DIR, `${profile.username.toLowerCase()}.json`);
  await fs.writeFile(file, JSON.stringify(profile, null, 2) + '\n', 'utf-8');
}

// ─── Crew auth ────────────────────────────────────────────────────────────────

export const CREW_COOKIE = 'jod_crew_session';

export interface CrewSession { username: string }

// Crew tokens stored as CREW_TOKEN_<UPPERCASE_USERNAME>=token in env
export function getCrewToken(username: string): string | undefined {
  const key = `CREW_TOKEN_${username.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return process.env[key];
}

export async function getCrewSession(): Promise<CrewSession | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(CREW_COOKIE)?.value;
    if (!value) return null;
    // value format: "username:token" — split on first colon only
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
