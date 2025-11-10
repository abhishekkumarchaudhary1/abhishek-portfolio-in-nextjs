'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import basicInfo from '../../data/basicInfo.json';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { name } = basicInfo.personalInfo;

  // Mark component as mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Handle navigation click
  const handleNavClick = (e, id) => {
    e.preventDefault();
    setIsMenuOpen(false);
    
    const element = document.getElementById(id);
    if (element) {
      // Add a small delay to ensure the menu closes before scrolling
      setTimeout(() => {
        const offsetTop = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }, 10);
    }
  };

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${isMounted && isScrolled ? 'bg-white shadow-md py-3' : 'bg-white/80 backdrop-blur-sm py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          {/* Logo/Name */}
          <motion.a 
            href="#home" 
            className="text-xl font-bold text-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            onClick={(e) => handleNavClick(e, 'home')}
          >
            {name.split(' ')[0]}
            <span className="text-indigo-600">.</span>
          </motion.a>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {['home', 'about', 'skills', 'projects', 'services', 'contact'].map((item, index) => (
              <motion.a
                key={item}
                href={`#${item}`}
                className="text-sm font-medium text-gray-800 hover:text-indigo-600 transition-colors"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -3 }}
                onClick={(e) => handleNavClick(e, item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </motion.a>
            ))}
            <motion.a
              href="/terms"
              className="text-sm font-medium text-gray-800 hover:text-indigo-600 transition-colors"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              whileHover={{ y: -3 }}
            >
              Terms and Conditions
            </motion.a>
            
            {/* Resume Download Button */}
            <motion.a
              href="/resume.pdf"
              download
              className="text-sm font-medium text-white bg-indigo-600 rounded-lg px-3 py-2 hover:bg-indigo-700 transition-colors flex items-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              whileHover={{ y: -3 }}
            >
              <svg 
                className="w-4 h-4 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Resume
            </motion.a>
          </div>
          
          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden"
            onClick={toggleMenu}
            whileTap={{ scale: 0.9 }}
          >
            <svg 
              className="w-6 h-6 text-gray-900" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </motion.button>
        </nav>
        
        {/* Mobile Menu */}
        <motion.div 
          className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: isMenuOpen ? 1 : 0, 
            height: isMenuOpen ? 'auto' : 0 
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="py-3 space-y-2">
            {['home', 'about', 'skills', 'projects', 'services', 'contact'].map((item) => (
              <a
                key={item}
                href={`#${item}`}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-indigo-50 hover:text-indigo-600"
                onClick={(e) => handleNavClick(e, item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </a>
            ))}
            <a
              href="/terms"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-indigo-50 hover:text-indigo-600"
              onClick={() => setIsMenuOpen(false)}
            >
              Terms & Conditions
            </a>
            
            {/* Mobile Resume Download Button */}
            <a
              href="/resume.pdf"
              download
              className="flex items-center px-3 py-2 rounded-md text-white bg-indigo-600 font-medium hover:bg-indigo-700 transition-colors"
            >
              <svg 
                className="w-5 h-5 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Download Resume
            </a>
          </div>
        </motion.div>
      </div>
    </header>
  );
} 