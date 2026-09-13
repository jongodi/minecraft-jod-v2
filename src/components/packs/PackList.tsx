import { DATAPACKS } from '@/data/datapacks';
import { SERVER } from '@/data/server';

/** The full list, name plus eight words. Names link to the pack on Modrinth. */
export function PackList() {
  return (
    <div>
      <p className="max-w-prose text-body">
        {SERVER.version}. {SERVER.resourcePack} {DATAPACKS.length} datapakkar:
      </p>
      <ol className="mt-8 grid gap-x-12 lg:grid-cols-2">
        {DATAPACKS.map((pack) => (
          <li key={pack.modrinth} className="flex items-baseline justify-between gap-6 border-t border-line py-4">
            <div>
              <a
                href={`https://modrinth.com/datapack/${pack.modrinth}`}
                rel="noopener"
                className="inline-block py-1 font-display text-name uppercase"
              >
                {pack.name}
              </a>
              <p className="text-meta text-muted">{pack.blurb}</p>
            </div>
            <p className="num shrink-0 font-label text-label text-muted">{pack.version}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
