// Minimal Java .properties reader — just enough to pull one key out of a Minecraft
// server.properties. Values are unescaped (Minecraft writes the pack URL with the
// colon escaped, e.g. `resource-pack=https\://host/pack.zip`).

/** Unescape a Java .properties value — handles `\:` `\=` `\\` `\t\n\r\f` and `\uXXXX`. */
export function unescapePropValue(v: string): string {
  let out = '';
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (c === '\\' && i + 1 < v.length) {
      const n = v[++i];
      if (n === 'u') { out += String.fromCharCode(parseInt(v.slice(i + 1, i + 5), 16) || 0); i += 4; }
      else if (n === 't') out += '\t';
      else if (n === 'n') out += '\n';
      else if (n === 'r') out += '\r';
      else if (n === 'f') out += '\f';
      else out += n; // ':' '=' '\' → literal
    } else out += c;
  }
  return out;
}

/** Read one key from a .properties file body (keys split on `=`, comments ignored). */
export function readProperty(text: string, wanted: string): string | null {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s+/, '');
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    if (line.slice(0, eq).trim() === wanted) return unescapePropValue(line.slice(eq + 1).replace(/^\s+/, ''));
  }
  return null;
}
