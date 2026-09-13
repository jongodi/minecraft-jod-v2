// Facts about the server that the site states. Edit here, nowhere else.

export const SERVER = {
  name: 'JOÐcraft',
  address: 'play.jodcraft.world',
  /** Shown next to the address. Update when the server is upgraded. */
  version: 'Paper 26.2',
  edition: 'Java Edition',
  /** The whole hero says this and nothing more. */
  tagline: 'Lokaður survival-þjónn fyrir vini. Allt á íslensku.',
  /** Sent to every player on join, nothing to download. */
  resourcePack: 'Eigin resource pack, hleðst sjálfkrafa þegar þú kemur inn.',
  /** Everyone who plays here. Order is the order on the site. */
  players: ['stebbias', 'AmmaGaur', 'joenana', 'ingunnbirta', 'Gamla123', 'fafnir1994', 'IMlonely', 'eikibleiki'],
} as const;
