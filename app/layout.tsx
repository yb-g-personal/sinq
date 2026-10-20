import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'sinq — music, in common', description: 'Discover what your music taste says about your friends.', metadataBase: new URL('http://localhost:3000') };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
