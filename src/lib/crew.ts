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

const PROFILES_DIR = path.join(process.cwd(), 'src', 'data', 'profiles');

export async function readProfile(username: string): Promise<CrewProfile> {
  const file = path.join(PROFILES_DIR, `${username.toLowerCase()}.json`);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw) as CrewProfile;
  } catch {
    // Return empty profile if not found
    return { username, bio: '', photos: [], posts: [] };
  }
}

export async function writeProfile(profile: CrewProfile): Promise<void> {
  await fs.mkdir(PROFILES_DIR, { recursive: true });
  const file = path.join(PROFILES_DIR, `${profile.username.toLowerCase()}.json`);
  await fs.writeFile(file, JSON.stringify(profile, null, 2) + '\n', 'utf-8');
}

// ─── Crew auth ────────────────────────────────────────────────────────────────

export const CREW_COOKIE = 'jod_crew_session';

export interface CrewSession { username: string }

// Crew tokens stored as CREW_TOKEN_USERNAME=token in env
export function getCrewToken(username: string): string | undefined {
  const key = `CREW_TOKEN_${username.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return process.env[key];
}

export async function getCrewSession(): Promise<CrewSession | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(CREW_COOKIE)?.value;
    if (!value) return null;
    // value format: "username:token"
    const [username, token] = value.split(':');
    if (!username || !token) return null;
    const expected = getCrewToken(username);
    if (!expected || expected !== token) return null;
    return { username };
  } catch {
    return null;
  }
}
