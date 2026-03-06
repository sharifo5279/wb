import { Inter, JetBrains_Mono } from 'next/font/google';
import './workbench.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--wb-font-ui',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--wb-font-mono',
  display: 'swap',
});

/**
 * Workbench route-segment layout.
 *
 * Responsibilities:
 *   1. Imports workbench.css (design tokens scoped to .wb-shell)
 *   2. Self-hosts Inter + JetBrains Mono via next/font and injects
 *      CSS variables (--wb-font-ui, --wb-font-mono) onto a wrapper div
 *
 * The wrapper uses `display: contents` so it is invisible to the flex
 * layout — .wb-shell remains a direct flex child of <body> for the
 * three-band layout contract.
 */
export default function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      style={{ display: 'contents' }}
    >
      {children}
    </div>
  );
}
