import { SERVER_IP, SITE_NAME } from '@/components/badlands/data';
import SiteCard from '../opengraph-image';

/* The board's link card is the site's own, drawn every minute with tonight's
   lantern and who is in. Without a card of its own here, the board's page
   set an openGraph of its own words and the root's picture went with the
   rest of the root's: a pasted /taflan showed two lines of text and no
   picture, where every other page carries one. A card of the board itself
   (its newest lines on a slip) can take this one's place later.
   The segment's config is written out here, not passed on from the root:
   Next reads it from this file as it stands. */
export const revalidate = 60;

export const alt = `${SITE_NAME} · Minecraft-heimurinn okkar. ${SERVER_IP}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return SiteCard();
}
