import { afterEach, describe, expect, it } from 'vitest';
import { photoFromDraft, photosNotIn } from '@/lib/crew-photos';

const id = '0f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b';
const withStore = () => { process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_ABC_secret'; };
afterEach(() => { delete process.env.BLOB_READ_WRITE_TOKEN; });

describe('photoFromDraft', () => {
  it('accepts a print from the member\'s own folder, public or private store', () => {
    withStore();
    expect(photoFromDraft('stebbias', { id, url: `https://abc.public.blob.vercel-storage.com/crew/stebbias/${id}.webp`, caption: 'x', takenAt: '2026-09-10T20:15:33.000Z' }))
      .toMatchObject({ id, caption: 'x', takenAt: '2026-09-10T20:15:33.000Z' });
    expect(photoFromDraft('Stebbias', { id, url: `/api/blob/crew/stebbias/${id}.png` })).not.toBeNull();
  });

  it('accepts the local screenshots folder only while developing without a store', () => {
    expect(photoFromDraft('stebbias', { id, url: `/screenshots/upload-${id}.webp` })).not.toBeNull();
    withStore();
    expect(photoFromDraft('stebbias', { id, url: `/screenshots/upload-${id}.webp` })).toBeNull();
  });

  it('refuses a print hosted in somebody else\'s Blob store', () => {
    withStore();
    expect(photoFromDraft('stebbias', { id, url: `https://other.public.blob.vercel-storage.com/crew/stebbias/${id}.webp` })).toBeNull();
    expect(photoFromDraft('stebbias', { id, url: `https://blob.vercel-storage.com/crew/stebbias/${id}.webp` })).toBeNull();
  });

  it('drops a draft that is not an object or whose path does not decode, without throwing', () => {
    expect(photoFromDraft('stebbias', null)).toBeNull();
    expect(photoFromDraft('stebbias', { id, url: '/api/blob/%E0' })).toBeNull();
  });

  it('refuses anything from elsewhere', () => {
    withStore();
    expect(photoFromDraft('stebbias', { id, url: `https://abc.public.blob.vercel-storage.com/crew/joenana/${id}.webp` })).toBeNull();
    expect(photoFromDraft('stebbias', { id, url: `https://abc.public.blob.vercel-storage.com/gallery/${id}.webp` })).toBeNull();
    expect(photoFromDraft('stebbias', { id, url: 'https://evil.example/crew/stebbias/x.png' })).toBeNull();
    expect(photoFromDraft('stebbias', { id: 'not-a-uuid', url: `/api/blob/crew/stebbias/${id}.png` })).toBeNull();
    expect(photoFromDraft('stebbias', { id, url: `/api/blob/crew/stebbias/${id}.exe` })).toBeNull();
  });
});

describe('photosNotIn', () => {
  it('lists the prints that were taken down', () => {
    const a = { id: 'a', filename: '/screenshots/upload-a.webp', caption: '', uploadedAt: '', takenAt: null };
    const b = { ...a, id: 'b' };
    const entry = { id: 'e', text: '', photos: [a, b], placeId: null, createdAt: '', lanterns: [], replies: [] };
    expect(photosNotIn(entry, [b]).map(p => p.id)).toEqual(['a']);
  });
});
