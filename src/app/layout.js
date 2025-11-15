import './globals.css';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import ClientWrapper from './components/ClientWrapper';
import ToastProvider from './components/ToastProvider';

// Use dynamic imports for components with client-side logic
const Navigation = dynamic(() => import('./components/Navigation'));
const Footer = dynamic(() => import('./components/Footer'));

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Portfolio',
  description: 'My personal portfolio website',
  icons: {
    icon: '/abhishekportfoliologowithwhitebg.svg',
    shortcut: '/abhishekportfoliologowithwhitebg.svg',
    apple: '/abhishekportfoliologowithwhitebg.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className} suppressHydrationWarning>
        <ToastProvider>
          <ClientWrapper>
            <Navigation />
          </ClientWrapper>
          <main>
            {children}
          </main>
          <ClientWrapper>
            <Footer />
          </ClientWrapper>
        </ToastProvider>
      </body>
    </html>
  );
}
