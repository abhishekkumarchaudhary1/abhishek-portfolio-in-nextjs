'use client';

import { motion } from 'framer-motion';
import basicInfo from '../../data/basicInfo.json';

export default function About() {
  const { name } = basicInfo.personalInfo;
  const education = basicInfo.education;
  const experience = basicInfo.experience;
  const { categories, otherSkills } = basicInfo.skills;

  // Map skill categories to background colors
  const bgColors = {
    'Frontend Development': 'bg-indigo-50',
    'Backend Development': 'bg-blue-50',
    'Tools & Technologies': 'bg-purple-50',
    'Other': 'bg-pink-50'
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">About Me</h2>
          <div className="w-20 h-1 bg-indigo-600 mx-auto"></div>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.p 
              className="text-lg text-gray-700 mb-6"
              variants={fadeInUp}
            >
              Hello! I&apos;m <span className="font-semibold">{name}</span>, a passionate developer with a keen eye for design and a love for creating intuitive, user-friendly applications.
            </motion.p>
            <motion.p 
              className="text-lg text-gray-700 mb-6"
              variants={fadeInUp}
            >
              With several years of experience in web development, I specialize in building responsive and performant applications using modern technologies. I enjoy tackling complex problems and turning them into simple, elegant solutions.
            </motion.p>
            <motion.p 
              className="text-lg text-gray-700 mb-8"
              variants={fadeInUp}
            >
              When I&apos;m not coding, you can find me exploring new technologies, contributing to open-source projects, or enjoying outdoor activities like hiking and photography.
            </motion.p>
            
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              variants={fadeInUp}
            >
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Education</h3>
                <ul className="space-y-2">
                  {education.map((edu, index) => (
                    <motion.li 
                      key={index} 
                      className="text-gray-700"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="font-medium">{edu.degree}</span>
                      <p className="text-sm text-gray-600">{edu.school}, {edu.years}</p>
                    </motion.li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Experience</h3>
                <ul className="space-y-2">
                  {experience.map((exp, index) => (
                    <motion.li 
                      key={index} 
                      className="text-gray-700"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="font-medium">{exp.title}</span>
                      <p className="text-sm text-gray-600">{exp.company}, {exp.years}</p>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {categories.map((category, index) => (
              <motion.div 
                key={index}
                className={`${bgColors[category.title] || 'bg-gray-50'} p-4 sm:p-6 rounded-lg`}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 break-words">
                  {category.title}
                </h3>
                <ul className="space-y-2 text-gray-700">
                  {category.skills.slice(0, 6).map((skill, skillIndex) => (
                    <li key={skillIndex}>{skill.name}</li>
                  ))}
                </ul>
              </motion.div>
            ))}

            <motion.div 
              className="bg-pink-50 p-4 sm:p-6 rounded-lg"
              whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 break-words">Other</h3>
              <ul className="space-y-2 text-gray-700">
                {otherSkills.slice(0, 6).map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
} 