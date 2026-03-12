import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-ink text-brand-bg py-20 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
        <div className="md:col-span-8">
          <Link to="/" className="font-serif text-3xl mb-6 block">TheBoringStack</Link>
          <p className="text-brand-bg/60 max-w-md mb-12 leading-relaxed text-lg">
            Creative Developer and MarTech Analyst building high-performance marketing infrastructure and generative engine optimization experiences.
          </p>
          <div className="flex gap-6">
            <a href="https://github.com/vrajeshsh" target="_blank" rel="noopener noreferrer" className="hover:text-brand-bg/40 transition-colors">
              <Github size={24} />
            </a>
            <a href="https://www.linkedin.com/in/vrajeshsh/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-bg/40 transition-colors">
              <Linkedin size={24} />
            </a>
            <a href="mailto:vrajeshshah58@gmail.com" className="hover:text-brand-bg/40 transition-colors">
              <Mail size={24} />
            </a>
          </div>
        </div>

        <div className="md:col-span-4">
          <h4 className="text-xs uppercase tracking-widest font-bold text-brand-bg/40 mb-8">Navigation</h4>
          <ul className="space-y-6 text-brand-bg/80 text-sm uppercase tracking-widest mb-12">
            <li><Link to="/" className="hover:text-brand-bg transition-colors">Home</Link></li>
            <li><Link to="/services" className="hover:text-brand-bg transition-colors">Services</Link></li>
            <li><Link to="/projects" className="hover:text-brand-bg transition-colors">Projects</Link></li>
            <li><Link to="/blog" className="hover:text-brand-bg transition-colors">Blog</Link></li>
            <li><Link to="/about" className="hover:text-brand-bg transition-colors">About</Link></li>
          </ul>
          
          <h4 className="text-xs uppercase tracking-widest font-bold text-brand-bg/40 mb-8">Contact</h4>
          <a href="mailto:vrajeshshah58@gmail.com" className="hover:text-brand-bg transition-colors font-sans text-sm font-medium text-brand-bg/80">
            vrajeshshah58@gmail.com
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-brand-bg/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-brand-bg/40 uppercase tracking-widest">
        <p>© {new Date().getFullYear()} The Boring Stack. No rights reserved, just vibes.</p>
        <p>Vibe coded at 2AM with elite delusion</p>
      </div>
    </footer>
  );
}
