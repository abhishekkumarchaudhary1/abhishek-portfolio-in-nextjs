'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-800">
              Abhishek Kumar Chaudhary
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link href="#about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
            <Link href="#projects" className="text-gray-600 hover:text-gray-900">
              Projects
            </Link>
            <Link href="#skills" className="text-gray-600 hover:text-gray-900">
              Skills
            </Link>
            <Link href="#contact" className="text-gray-600 hover:text-gray-900">
              Contact
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              Home
            </Link>
            <Link href="#about" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              About
            </Link>
            <Link href="#projects" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              Projects
            </Link>
            <Link href="#skills" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              Skills
            </Link>
            <Link href="#contact" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              Contact
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
} 