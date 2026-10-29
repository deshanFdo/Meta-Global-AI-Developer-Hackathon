import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BlueprintTo3D — AI-Powered Floor Plan to 3D Model',
  description:
    'Upload a 2D floor plan or blueprint and instantly generate an interactive 3D house model using Meta AI (Muse Spark) and Three.js. Built for the Meta Global AI Developer Hackathon 2026.',
  keywords: [
    'floor plan',
    'blueprint',
    '3D model',
    'Meta AI',
    'Muse Spark',
    'Three.js',
    'hackathon',
  ],
  authors: [{ name: 'BlueprintTo3D Team' }],
  openGraph: {
    title: 'BlueprintTo3D — AI-Powered Floor Plan to 3D Model',
    description:
      'Convert 2D floor plans into interactive 3D house models using Meta AI.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0e14',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0c0e14] text-[#e4e6ef] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
