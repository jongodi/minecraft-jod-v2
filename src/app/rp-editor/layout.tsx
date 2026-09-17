/* JetBrains Mono is the pack editor's type and nothing else's. Imported here
   rather than in the root layout so the public pages, which never set
   --font-mono, do not carry its @font-face rules in their blocking CSS. */
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';

export default function RpEditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
