import { SERVER_IP, SITE_NAME } from '@/components/badlands/data';
import SiteCard from '../opengraph-image';

/* The roll call's link card is the site's own, drawn every minute with
   tonight's lantern and who is in: the layout gives the roll call words of
   its own (Eftirlýst), and an openGraph without a picture would have dropped
   the root's. A wall (./[username]) draws its own card, with the member's
   print, and keeps it. The segment's config is written out here, not passed
   on from the root: Next reads it from this file as it stands. */
export const revalidate = 60;

export const alt = `${SITE_NAME} · Minecraft-heimurinn okkar. ${SERVER_IP}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return SiteCard();
}
