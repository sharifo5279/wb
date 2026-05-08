import { Inter, JetBrains_Mono } from 'next/font/google';
import './notepad.css';

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

export default function NotepadLayout({
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
