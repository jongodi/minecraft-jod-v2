import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth';
import { getCustomPacks, addCustomPack } from '@/lib/custom-datapacks';
import type { DatapackSource } from '@/data/datapacks';

// GET — list all custom packs
export async function GET() {
  if (!(await requireAdmin())) return unauthorizedResponse();
  return NextResponse.json(await getCustomPacks());
}

// POST — create a new custom pack
// Body: { name, description, category, source, modrinthSlug?, githubRepo?, gameVersion, serverFile? }
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorizedResponse();

  const body = await req.json() as Record<string, unknown>;
  const { name, description, category, source, modrinthSlug, githubRepo, gameVersion, serverFile } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 });
  }
  if (!source || !['modrinth', 'github', 'manual'].includes(source as string)) {
    return NextResponse.json({ error: 'source must be modrinth, github, or manual' }, { status: 400 });
  }

  try {
    const pack = await addCustomPack({
      name:         name.trim(),
      description:  (description as string).trim(),
      category:     (category as string).trim().toUpperCase(),
      source:       source as DatapackSource,
      modrinthSlug: typeof modrinthSlug === 'string' && modrinthSlug.trim() ? modrinthSlug.trim() : undefined,
      githubRepo:   typeof githubRepo   === 'string' && githubRepo.trim()   ? githubRepo.trim()   : undefined,
      gameVersion:  typeof gameVersion  === 'string' && gameVersion.trim()  ? gameVersion.trim()  : '26.1',
      serverFile:   typeof serverFile   === 'string' && serverFile.trim()   ? serverFile.trim()   : undefined,
    });
    return NextResponse.json(pack, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save' },
      { status: 500 }
    );
  }
}
