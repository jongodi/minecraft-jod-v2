import { DATAPACKS } from '@/data/datapacks';
import { SERVER } from '@/data/server';

/** The full list, name plus eight words, nothing to expand. */
export function PackList() {
  return (
    <div>
      <p className="max-w-prose text-body">
        {SERVER.version}. {SERVER.resourcePack} {DATAPACKS.length} datapakkar:
      </p>
      <ol className="mt-8 grid gap-x-12 lg:grid-cols-2">
        {DATAPACKS.map((pack) => (
          <li key={pack.id} className="flex items-baseline justify-between gap-6 border-t border-line py-4">
            <div>
              <p className="font-display text-name uppercase">{pack.name}</p>
              <p className="mt-1 text-meta text-muted">{pack.blurb}</p>
            </div>
            {pack.currentVersion && (
              <p className="num shrink-0 font-label text-label text-muted">{pack.currentVersion}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
