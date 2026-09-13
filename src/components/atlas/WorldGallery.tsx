'use client';

import Image from 'next/image';

import { useEffect, useRef, useState } from 'react';
import type { GalleryPhoto } from '@/lib/gallery';
import AtlasDialog from './AtlasDialog';
import { Arrow } from './Arrow';

export default function WorldGallery({
  photos,
  loading,
  error,
  retry,
}: {
  photos: GalleryPhoto[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const touch = useRef<number | null>(null);
  const current = Math.min(index, Math.max(0, photos.length - 1));
  const photo = photos[current];
  function move(direction: number) {
    setIndex((value) => (value + direction + photos.length) % photos.length);
  }
  useEffect(() => {
    if (!expanded) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex(
          (value) =>
            (value + (event.key === 'ArrowLeft' ? -1 : 1) + photos.length) %
            photos.length,
        );
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [expanded, photos.length]);

  if (!photo)
    return (
      <div className="atlas-empty">
        {loading
          ? 'Loading places…'
          : error
            ? 'Couldn’t load the gallery.'
            : 'No places have been published yet.'}
        {error && (
          <button className="atlas-text-button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );

  return (
    <>
      {error && (
        <p className="atlas-notice">
          Showing the last available gallery.{' '}
          <button className="atlas-text-button" onClick={retry}>
            Refresh
          </button>
        </p>
      )}
      <div className="atlas-gallery">
        <figure className="atlas-gallery__feature">
          <button
            className="atlas-gallery__image"
            onClick={() => setExpanded(true)}
            aria-label={`Enlarge ${photo.title}`}
          >
            <Image
              unoptimized
              key={photo.id}
              src={photo.filename}
              alt={photo.title}
              width="1920"
              height="1009"
              loading="lazy"
            />
            <span className="atlas-image-corner">
              <Arrow diagonal />
            </span>
          </button>
          <figcaption>
            <div>
              <span className="atlas-eyebrow">{photo.sublabel}</span>
              <h3>{photo.title.toLocaleLowerCase()}</h3>
            </div>
            <span className="atlas-counter">
              {String(current + 1).padStart(2, '0')} /{' '}
              {String(photos.length).padStart(2, '0')}
            </span>
          </figcaption>
        </figure>
        <div className="atlas-gallery__index">
          <div className="atlas-gallery__label">
            The places we’ve made <span>↓</span>
          </div>
          <div className="atlas-place-list" aria-label="Choose a place">
            {photos.map((item, i) => (
              <button
                key={item.id}
                aria-pressed={current === i}
                onClick={() => setIndex(i)}
              >
                <span className="atlas-counter">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{item.title.toLocaleLowerCase()}</span>
                <Arrow diagonal />
              </button>
            ))}
          </div>
          <p>Built by the crew. Captured in game.</p>
        </div>
      </div>
      {expanded && (
        <AtlasDialog
          label={`World gallery: ${photo.title}`}
          onClose={() => setExpanded(false)}
          wide
        >
          <div
            className="atlas-viewer"
            onTouchStart={(event) => {
              touch.current = event.touches[0].clientX;
            }}
            onTouchEnd={(event) => {
              if (touch.current !== null) {
                const distance =
                  event.changedTouches[0].clientX - touch.current;
                if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1);
              }
              touch.current = null;
            }}
          >
            <Image
              unoptimized
              src={photo.filename}
              alt={photo.title}
              width="1920"
              height="1009"
            />
            <div className="atlas-viewer__bar">
              <button aria-label="Previous image" onClick={() => move(-1)}>
                ←
              </button>
              <p aria-live="polite">
                {photo.title}
                <span>
                  {current + 1} / {photos.length}
                </span>
              </p>
              <button aria-label="Next image" onClick={() => move(1)}>
                →
              </button>
            </div>
          </div>
        </AtlasDialog>
      )}
    </>
  );
}
