'use client';

import { motion } from 'framer-motion';
import basicInfo from '../../data/basicInfo.json';

export default function Skills() {
  const { categories, otherSkills } = basicInfo.skills;

  return (
    <section id="skills" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">My Skills</h2>
          <div className="w-20 h-1 bg-indigo-600 mx-auto mb-8"></div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            I've developed a diverse set of skills throughout my journey as a developer.
            Here are the technologies and tools I work with.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {categories.map((category, categoryIndex) => (
            <motion.div 
              key={categoryIndex} 
              className="bg-gray-50 rounded-lg p-8 shadow-sm"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">{category.title}</h3>
              <div className="space-y-6">
                {category.skills.map((skill, skillIndex) => (
                  <div key={skillIndex}>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-800 font-medium">{skill.name}</span>
                      <span className="text-gray-600">{skill.level}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <motion.div 
                        className="bg-indigo-600 h-2.5 rounded-full" 
                        style={{ width: 0 }}
                        animate={{ width: `${skill.level}%` }}
                        transition={{ duration: 1, delay: 0.2 + (skillIndex * 0.1) }}
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-10">Other Skills & Interests</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {otherSkills.map((skill, index) => (
              <motion.span 
                key={index} 
                className="px-6 py-3 bg-gray-100 text-gray-800 rounded-full text-sm font-medium"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.1, backgroundColor: "#EEF2FF", color: "#4F46E5" }}
              >
                {skill}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
} 