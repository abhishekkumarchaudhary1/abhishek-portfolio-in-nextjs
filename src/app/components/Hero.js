'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import basicInfo from '../../data/basicInfo.json';
// import RazorpayDonation from './RazorpayDonation'; // Razorpay code kept but hidden from display

export default function Hero() {
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { name, bio, profileImage, buyMeACoffee } = basicInfo.personalInfo;
  const roles = basicInfo.roles;
  
  // Set component as mounted to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    // Initialize text with the first role when mounted
    setText(roles[0]);
  }, [roles]);
  
  useEffect(() => {
    if (!isMounted) return;
    
    const interval = setInterval(() => {
      if (index < roles.length - 1) {
        setIndex(index + 1);
      } else {
        setIndex(0);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [index, roles.length, isMounted]);
  
  useEffect(() => {
    if (!isMounted) return;
    setText(roles[index]);
  }, [index, roles, isMounted]);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <section id="home" className="pt-32 pb-20 bg-gradient-to-r from-indigo-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <motion.div 
            className="md:w-1/2 mb-10 md:mb-0"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
              Hi, I&apos;m <span className="text-indigo-600">{name}</span>
            </h1>
            <h2 className="text-2xl sm:text-3xl text-gray-700 mb-6 h-12 flex items-center">
              I&apos;m a/an{" "}
              {isMounted ? (
                <motion.span 
                  className="text-indigo-600 ml-2 inline-block min-w-[150px]"
                  key={text}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {text}
                </motion.span>
              ) : (
                <span className="text-indigo-600 ml-2 inline-block min-w-[150px]">
                  {roles[0]}
                </span>
              )}
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              {bio}
            </p>
            <div className="flex flex-wrap gap-4 mb-6">
              <motion.a 
                href="#contact" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Contact Me
              </motion.a>
              <motion.a 
                href="#projects" 
                className="bg-white hover:bg-gray-50 text-indigo-600 font-medium py-3 px-6 rounded-md border border-indigo-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View My Work
              </motion.a>
            </div>
          </motion.div>
          <motion.div 
            className="md:w-1/2 flex justify-center"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div 
              className="relative w-72 h-72 md:w-96 md:h-96 rounded-full bg-indigo-100 overflow-hidden shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              {imageError ? (
                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              ) : (
                <Image 
                  src={profileImage || '/placeholder-profile.jpg'} 
                  alt={`${name} profile picture`} 
                  fill 
                  className="object-cover" 
                  onError={handleImageError}
                  priority
                />
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
} 