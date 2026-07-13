import { motion } from 'motion/react';
import { ArrowRight, Github, Linkedin, Mail, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeading from '@/src/components/SectionHeading';
import ProjectCard from '@/src/components/ProjectCard';

import { projects } from '@/src/data/projects';

export default function Home() {
  return (
    <div className="px-6">
      {/* Hero Section */}
      <section className="min-h-[90vh] flex flex-col justify-center max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-xs uppercase tracking-[0.4em] text-brand-ink/60 font-bold mb-6 block">
                Creative Dev / MarTech Analyst
              </span>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif leading-[0.9] mb-8 tracking-tighter">
                Vrajesh <br />
                <span className="italic text-brand-accent">Shah.</span>
              </h1>
            </motion.div>
          </div>
          <div className="lg:col-span-4 pb-4">
            <motion.p
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg md:text-xl text-brand-ink/80 leading-relaxed max-w-sm mb-8"
            >
              Building reliable marketing infrastructure and digital experiences.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-6"
            >
              <Link to="/about#contact">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group flex items-center gap-2 text-xs uppercase tracking-widest font-bold cursor-pointer"
                >
                  Let's chat <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link to="/projects">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-ink/60 hover:text-brand-ink transition-colors cursor-pointer"
                >
                  View projects
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-0 right-0 flex justify-center"
        >
          <div className="flex flex-col items-center gap-4">
            <span className="text-[10px] uppercase tracking-[0.3em] text-brand-ink/50 font-bold">Scroll</span>
          </div>
        </motion.div>
      </section>

      

      {/* Featured Projects */}
      <section className="py-32 max-w-7xl mx-auto border-t border-brand-ink/10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <SectionHeading 
            title="Selected Works." 
            subtitle="Portfolio"
            className="mb-0"
          />
          <Link to="/projects" className="text-xs uppercase tracking-widest font-bold text-brand-ink/60 hover:text-brand-ink transition-colors flex items-center gap-2">
            View all projects <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard 
              key={project.id}
              title={project.title}
              description={project.description}
              tech={project.tech}
              github={project.github}
              image={project.image}
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 bg-brand-ink text-brand-bg -mx-6 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-serif mb-12 leading-tight"
          >
            Let's build something <span className="italic text-brand-bg/60">meaningful</span> together.
          </motion.h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link to="/about#contact">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-6 bg-brand-bg text-brand-ink text-xs uppercase tracking-widest font-bold hover:bg-brand-bg/90 transition-colors cursor-pointer w-full sm:w-auto"
              >
                Start a Conversation
              </motion.button>
            </Link>
            <Link to="/blog">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-6 border border-brand-bg/20 text-brand-bg text-xs uppercase tracking-widest font-bold hover:bg-brand-bg hover:text-brand-ink transition-all cursor-pointer w-full sm:w-auto"
              >
                Read the Blog
              </motion.button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
