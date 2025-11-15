'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import basicInfo from '../../data/basicInfo.json';
import CheckoutModal from './CheckoutModal';

export default function Services() {
  const [selectedService, setSelectedService] = useState(null);
  const services = basicInfo.services || [];

  const handleHireMe = (service) => {
    setSelectedService(service);
  };

  const handleCloseModal = () => {
    setSelectedService(null);
  };

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">My Services</h2>
          <div className="w-20 h-1 bg-indigo-600 mx-auto mb-8"></div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            I offer a range of professional development services to help bring your ideas to life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-lg mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={service.icon || "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"}></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-700 mb-4 min-h-[60px]">{service.description}</p>
                
                <div className="mb-4">
                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-bold text-indigo-600">₹{service.price}</span>
                    {service.priceType && (
                      <span className="text-gray-500 ml-2 text-sm">/{service.priceType}</span>
                    )}
                  </div>
                  {service.originalPrice && (
                    <span className="text-gray-400 line-through text-sm">₹{service.originalPrice}</span>
                  )}
                </div>

                <ul className="mb-6 space-y-2">
                  {service.features && service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <svg className="w-5 h-5 text-indigo-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <motion.button
                  onClick={() => handleHireMe(service)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Pre Register for ₹{service.preRegistrationFee || '150'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedService && (
          <CheckoutModal 
            service={selectedService} 
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

