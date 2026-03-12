import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Search, Lock, Download, Copy, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TextareaAutosize from 'react-textarea-autosize';

export default function Services() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [queryId, setQueryId] = useState<string | null>(null);
  
  const [unlockName, setUnlockName] = useState('');
  const [unlockEmail, setUnlockEmail] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [fullBlueprint, setFullBlueprint] = useState<any>(null);
  const [limitReached, setLimitReached] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setPreviewData(null);
    setFullBlueprint(null);
    setLimitReached(false);

    try {
      const response = await fetch('/api/generate-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_text: query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate architecture');
      }

      setPreviewData(data.preview);
      setQueryId(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockName.trim() || !unlockEmail.trim() || !queryId) return;

    setUnlocking(true);
    setError(null);

    try {
      const response = await fetch('/api/unlock-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: queryId,
          name: unlockName,
          email: unlockEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.limitReached) {
          setLimitReached(true);
        } else {
          throw new Error(data.error || 'Failed to unlock');
        }
        return;
      }

      setFullBlueprint(data.blueprint);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUnlocking(false);
    }
  };

  const copyToClipboard = () => {
    if (!fullBlueprint) return;
    navigator.clipboard.writeText(JSON.stringify(fullBlueprint, null, 2));
    alert('Copied to clipboard!');
  };

  return (
    <div className="px-6 py-20 min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full mx-auto">
        
        {!previewData && !fullBlueprint && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-serif mb-6 tracking-tight">
              TheBoringStack
            </h1>
            <p className="text-lg md:text-xl text-brand-ink/70 mb-12 max-w-2xl mx-auto font-medium">
              Get a free growth architecture powered by DeepSeek R1.
            </p>
            
            <form onSubmit={handleSearch} className="relative mb-8 flex justify-center">
              <div className="relative flex min-w-[300px] max-w-full w-full md:w-auto shadow-sm hover:shadow-md transition-shadow duration-300 rounded-[2rem] bg-white border border-brand-ink/20 focus-within:border-brand-ink focus-within:ring-4 focus-within:ring-brand-ink/5">
                <TextareaAutosize
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Describe your business and growth goal..."
                  minRows={1}
                  style={{ fieldSizing: 'content' } as any}
                  className="w-full md:w-auto min-w-[300px] max-w-[800px] pl-8 pr-20 py-6 text-xl font-serif bg-transparent border-none focus:outline-none focus:ring-0 resize-none overflow-hidden text-left leading-relaxed"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSearch(e as any);
                    }
                  }}
                />
                <div className="absolute bottom-2 right-2 flex items-center">
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="w-14 h-14 bg-brand-ink text-brand-bg rounded-full hover:bg-brand-ink/90 transition-all duration-300 disabled:opacity-50 flex items-center justify-center shrink-0 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    title="Architect My Stack"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search size={22} />
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="text-left mb-16">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs uppercase tracking-widest font-bold text-brand-ink/40">Examples</p>
                <button
                  type="button"
                  onClick={() => setQuery("I run a [Business Type] in [Location] targeting [Audience]. We currently make [Revenue] and want to [Goal] using [Specific Channels/Tools].")}
                  className="text-xs uppercase tracking-widest font-bold text-brand-accent hover:text-brand-ink transition-colors"
                >
                  Help me write a prompt
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  "Local dental clinic in Texas, $3k/month budget, need more bookings.",
                  "B2B SaaS launching in 60 days, need GTM + martech stack.",
                  "Shopify brand doing $25k/month, want to scale with automation."
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(example)}
                    className="text-left text-sm text-brand-ink/70 hover:text-brand-ink transition-colors py-2 px-4 bg-brand-ink/5 border border-brand-ink/5 hover:border-brand-ink/20"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
            
            {error && (
              <div className="mt-8 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-serif text-left">
                {error}
              </div>
            )}

            {/* Discuss Ideas Section */}
            <div className="mt-32 pt-20 border-t border-brand-ink/10 text-center">
              <h2 className="text-4xl font-serif mb-6">Just want to bounce ideas?</h2>
              <p className="text-brand-ink/60 text-lg mb-10 max-w-xl mx-auto">
                Not ready for a full technical architecture? Let's discuss your growth strategy, positioning, and marketing ideas. No strings attached.
              </p>
              <a href="/about#contact" className="inline-flex items-center gap-3 px-10 py-5 bg-white border border-brand-ink/20 text-brand-ink text-xs uppercase tracking-widest font-bold hover:border-brand-ink transition-colors">
                Let's Talk Strategy <ArrowRight size={14} />
              </a>
            </div>
          </motion.div>
        )}

        {previewData && !fullBlueprint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full"
          >
            <div className="mb-12">
              <h2 className="text-3xl font-serif mb-8 pb-4 border-b border-brand-ink/10">Prosperous Business Overview</h2>
              
              <div className="prose prose-lg max-w-none text-brand-ink/80 font-serif leading-relaxed prose-headings:font-serif prose-headings:font-normal">
                <ReactMarkdown>{previewData}</ReactMarkdown>
              </div>
            </div>

            {/* Blur overlay & Unlock Form */}
            <div className="relative mt-20">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-bg z-10 pointer-events-none" />
              <div className="opacity-20 blur-sm select-none pointer-events-none">
                <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-4">3. Full Growth Architecture & Integrations</h3>
                <p className="font-serif leading-relaxed mb-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-4">4. Strategic 90-Day Go-To-Market Plan</h3>
                <p className="font-serif leading-relaxed">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-end pb-12">
                <div className="bg-white p-8 border border-brand-ink/10 shadow-xl max-w-md w-full text-center">
                  <Lock className="mx-auto mb-4 text-brand-ink/40" size={32} />
                  <h3 className="text-xl font-serif mb-2">Get the Full PDF Blueprint</h3>
                  <p className="text-sm text-brand-ink/60 mb-6">Enter your email to receive the complete Growth Architecture, GTM strategy, and Tool Recommendations via email.</p>
                  
                  <form onSubmit={handleUnlock} className="flex flex-col gap-4">
                    <input
                      type="text"
                      placeholder="Your Name"
                      required
                      value={unlockName}
                      onChange={(e) => setUnlockName(e.target.value)}
                      className="w-full px-4 py-3 bg-brand-bg/50 border border-brand-ink/20 focus:outline-none focus:border-brand-ink text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Your Email"
                      required
                      value={unlockEmail}
                      onChange={(e) => setUnlockEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-brand-bg/50 border border-brand-ink/20 focus:outline-none focus:border-brand-ink text-sm"
                    />
                    <button
                      type="submit"
                      disabled={unlocking}
                      className="w-full py-4 bg-brand-ink text-brand-bg text-xs uppercase tracking-widest font-bold hover:bg-brand-ink/90 transition-colors disabled:opacity-50"
                    >
                      {unlocking ? 'Sending PDF...' : 'Send My Full Blueprint'}
                    </button>
                  </form>
                  {error && <p className="mt-4 text-red-600 text-xs">{error}</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {fullBlueprint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full text-center py-20"
          >
            <div className="w-20 h-20 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-4xl font-serif mb-4 italic">Sent to your Inbox.</h1>
            <p className="text-brand-ink/60 text-lg mb-12 max-w-md mx-auto">
              The full **Growth Architecture Blueprint** for your business has been sent to **{unlockEmail}** from **vrajeshshah58@gmail.com**.
            </p>
            <button 
              onClick={() => {
                setPreviewData(null);
                setFullBlueprint(null);
                setQuery('');
              }}
              className="text-xs uppercase tracking-widest font-bold text-brand-ink/40 hover:text-brand-ink transition-colors cursor-pointer"
            >
              Start another audit
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
