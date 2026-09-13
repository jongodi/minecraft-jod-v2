import WorldHome from '@/components/atlas/WorldHome';
import { readGallery } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const photos = (await readGallery()).filter(photo => photo.active).sort((a, b) => a.order - b.order);
  return <WorldHome initialPhotos={photos} />;
}
