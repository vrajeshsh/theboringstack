import { useState } from 'react';
import { motion } from 'motion/react';
import SectionHeading from '@/src/components/SectionHeading';
import { ArrowRight, Download, Award, Briefcase, Code, Send, Mail, Share2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const highlights = [
  {
    icon: <Briefcase size={20} />,
    title: 'MarTech Analyst',
    description: 'Helping teams implement CDP, CRM, and automation workflows that actually work.'
  },
  {
    icon: <Code size={20} />,
    title: 'Web Development',
    description: 'Building clean, accessible web applications using modern tools and frameworks.'
  },
  {
    icon: <Award size={20} />,
    title: 'Cloud Infrastructure',
    description: 'Working with cloud services to build reliable data pipelines and infrastructure.'
  }
];

export default function About() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!re.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    
    setStatus('sending');
    // Simulate API call
    setTimeout(() => setStatus('success'), 1500);
  };

  return (
    <div className="px-6 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-start mb-32">
          <div className="lg:col-span-7">
            <SectionHeading 
              title="The Story Behind the Stack." 
              subtitle="Me, basically"
            />
            <div className="prose prose-lg text-brand-ink/70 leading-relaxed space-y-6">
              <p>
                I'm Vrajesh Shah, a Creative Dev and MarTech Analyst. I spend my time at the intersection of high-end design, technical precision, and marketing strategy.
              </p>
              <p>
                I've spent my career helping brands turn complex data into meaningful customer experiences. I believe that technology should be an enabler, not a bottleneck that makes you want to pull your hair out.
              </p>
              <p>
                Whether I'm building a custom analytics dashboard or standing up a foundational marketing stack for a startup, my focus is always on performance, scalability, and editorial quality. In my downtime, I enjoy helping small brands and ambitious entrepreneurs build the digital foundations they need to scale.
              </p>
            </div>
            
            <div className="mt-12 flex flex-wrap gap-6">
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="./Vrajesh_Shah_Resume_final (1).docx" 
                download
                className="inline-flex items-center gap-3 px-8 py-4 bg-brand-ink text-brand-bg text-xs uppercase tracking-widest font-bold hover:bg-brand-accent transition-colors cursor-pointer"
              >
                Download Resume <Download size={14} />
              </motion.a>
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://www.linkedin.com/in/vrajeshsh/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-3 px-8 py-4 border border-brand-ink/10 text-brand-ink text-xs uppercase tracking-widest font-bold hover:bg-brand-ink hover:text-brand-bg transition-all cursor-pointer"
              >
                LinkedIn Profile <ArrowRight size={14} />
              </motion.a>
            </div>
          </div>
          
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-[4/5] bg-brand-ink/5 overflow-hidden"
            >
              <img 
                src="./PXL_20240411_203024698.MP.jpg" 
                alt="Vrajesh Shah"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 border-[20px] border-brand-bg/10 pointer-events-none" />
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-10 border border-brand-ink/5 bg-white"
            >
              <div className="w-12 h-12 bg-brand-ink text-brand-bg flex items-center justify-center mb-8">
                {item.icon}
              </div>
              <h3 className="text-sm font-mono uppercase tracking-widest mb-4 font-bold">{item.title}</h3>
              <p className="text-sm text-brand-ink/60 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <section className="py-32 border-t border-brand-ink/10">
          <SectionHeading 
            title="Stuff I'm Good At." 
            subtitle="Skills"
            align="center"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <h4 className="font-serif font-bold uppercase tracking-widest text-xs mb-4">MarTech</h4>
              <ul className="text-sm text-brand-ink/60 space-y-2">
                <li>CDP (Segment, mParticle)</li>
                <li>CRM (Salesforce, HubSpot)</li>
                <li>Automation (Klaviyo, Braze)</li>
                <li>Experimentation (Optimizely)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif font-bold uppercase tracking-widest text-xs mb-4">Development</h4>
              <ul className="text-sm text-brand-ink/60 space-y-2">
                <li>React / Next.js</li>
                <li>TypeScript</li>
                <li>Node.js / Express</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif font-bold uppercase tracking-widest text-xs mb-4">Data & Cloud</h4>
              <ul className="text-sm text-brand-ink/60 space-y-2">
                <li>AWS (Lambda, S3, RDS)</li>
                <li>PostgreSQL / MongoDB</li>
                <li>Google Analytics 4</li>
                <li>Looker Studio</li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif font-bold uppercase tracking-widest text-xs mb-4">Strategy</h4>
              <ul className="text-sm text-brand-ink/60 space-y-2">
                <li>Product Architecture</li>
                <li>Technical SEO</li>
                <li>Conversion Optimization</li>
                <li>Lead Gen Systems</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-32 border-t border-brand-ink/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
            <div className="lg:col-span-5">
              <SectionHeading 
                title="Get in Touch." 
                subtitle="Contact"
              />
              <p className="text-brand-ink/60 text-lg leading-relaxed mb-12">
                Whether you're looking to stand up your marketing stack, build a creative digital experience, or just want to say hi, I'd love to hear from you.
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-brand-ink/5 flex items-center justify-center text-brand-ink">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-bold text-brand-ink/40 mb-2">Email</h4>
                    <a href="mailto:vrajeshshah58@gmail.com" className="text-lg font-serif hover:text-brand-accent transition-colors">
                      vrajeshshah58@gmail.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-brand-ink/5 flex items-center justify-center text-brand-ink">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-bold text-brand-ink/40 mb-2">Socials</h4>
                    <div className="flex gap-4">
                      <a href="https://www.linkedin.com/in/vrajeshsh/" target="_blank" rel="noopener noreferrer" className="text-lg font-serif hover:text-brand-accent transition-colors">LinkedIn</a>
                      <a href="https://github.com/vrajeshsh" target="_blank" rel="noopener noreferrer" className="text-lg font-serif hover:text-brand-accent transition-colors">GitHub</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              {status === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-brand-ink/5 p-12 text-center h-full flex flex-col justify-center items-center"
                >
                  <div className="w-20 h-20 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center mb-8">
                    <Send size={32} />
                  </div>
                  <h3 className="text-3xl font-serif mb-4 italic">Message Sent.</h3>
                  <p className="text-brand-ink/60 mb-8">
                    Thank you for reaching out. I'll get back to you as soon as possible.
                  </p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStatus('idle')}
                    className="text-xs uppercase tracking-widest font-bold text-brand-ink/40 hover:text-brand-ink transition-colors cursor-pointer"
                  >
                    Send another message
                  </motion.button>
                </motion.div>
              ) : (
                <form 
                  name="contact" 
                  data-netlify="true" 
                  method="POST"
                  onSubmit={handleSubmit} 
                  className="bg-white border border-brand-ink/5 p-12 space-y-8"
                >
                  <input type="hidden" name="form-name" value="contact" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Full Name</label>
                      <input 
                        required
                        type="text" 
                        className="w-full border-b border-brand-ink/10 py-3 focus:border-brand-ink outline-none transition-colors font-serif text-lg"
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Email Address</label>
                      <div className="relative">
                        <input 
                          required
                          type="email" 
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) validateEmail(e.target.value);
                          }}
                          onBlur={(e) => validateEmail(e.target.value)}
                          className={cn(
                            "w-full border-b py-3 focus:border-brand-ink outline-none transition-colors font-serif text-lg",
                            emailError ? "border-red-500" : "border-brand-ink/10"
                          )}
                          placeholder="jane@example.com"
                        />
                        {emailError && (
                          <p className="absolute left-0 -bottom-5 text-[10px] uppercase tracking-widest font-bold text-red-500">
                            {emailError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Subject</label>
                    <input 
                      required
                      type="text" 
                      className="w-full border-b border-brand-ink/10 py-3 focus:border-brand-ink outline-none transition-colors font-serif text-lg"
                      placeholder="Project Inquiry"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Message</label>
                    <textarea 
                      required
                      rows={5}
                      className="w-full border-b border-brand-ink/10 py-3 focus:border-brand-ink outline-none transition-colors font-serif text-lg resize-none"
                      placeholder="Tell me about your project..."
                    />
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={status === 'sending'}
                    className="w-full py-6 bg-brand-ink text-brand-bg text-xs uppercase tracking-widest font-bold hover:bg-brand-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {status === 'sending' ? 'Sending...' : 'Send Message'}
                    <Send size={14} />
                  </motion.button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
