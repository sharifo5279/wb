import { redirect } from 'next/navigation';

/** Root route redirects into the Notepad — there's nothing else to render. */
export default function Home() {
  redirect('/edi-notepad');
}
