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
              Get a free martech architecture according to your business needs powered by DeepSeek R1.
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
              <h2 className="text-3xl font-serif mb-8 pb-4 border-b border-brand-ink/10">Architecture Preview</h2>
              
              <div className="mb-8">
                <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-4">1. Business Model Analysis</h3>
                <div className="prose prose-sm max-w-none text-brand-ink/80 font-serif leading-relaxed">
                  <ReactMarkdown>{previewData.businessModelAnalysis}</ReactMarkdown>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-4">2. Recommended Stack (Preview)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-ink/10">
                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-widest text-brand-ink/50">Layer</th>
                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-widest text-brand-ink/50">Tool</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.recommendedStack.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-brand-ink/5">
                          <td className="py-4 px-4 font-medium">{item.layer}</td>
                          <td className="py-4 px-4 text-brand-ink/70">{item.tool}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Blur overlay & Unlock Form */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-bg z-10 pointer-events-none" />
              <div className="opacity-20 blur-sm select-none pointer-events-none">
                <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-4">3. Architecture & Integrations</h3>
                <p className="font-serif leading-relaxed mb-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-4">4. Go-To-Market Strategy</h3>
                <p className="font-serif leading-relaxed">Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-end pb-12">
                {!limitReached ? (
                  <div className="bg-white p-8 border border-brand-ink/10 shadow-xl max-w-md w-full text-center">
                    <Lock className="mx-auto mb-4 text-brand-ink/40" size={32} />
                    <h3 className="text-xl font-serif mb-2">Unlock Full Blueprint</h3>
                    <p className="text-sm text-brand-ink/60 mb-6">Enter your details to reveal the complete architecture, GTM strategy, and automations.</p>
                    
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
                        {unlocking ? 'Unlocking...' : 'Reveal Full Output'}
                      </button>
                    </form>
                    {error && <p className="mt-4 text-red-600 text-xs">{error}</p>}
                  </div>
                ) : (
                  <div className="bg-brand-ink text-brand-bg p-8 max-w-md w-full text-center">
                    <h3 className="text-xl font-serif mb-4">Limit Reached</h3>
                    <p className="text-sm text-brand-bg/70 mb-8">You've used your 3 free queries. Need deeper help? Let's build it together.</p>
                    <a href="/about#contact" className="inline-block w-full py-4 bg-brand-bg text-brand-ink text-xs uppercase tracking-widest font-bold hover:bg-brand-bg/90 transition-colors">
                      Book Strategy Session
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {fullBlueprint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-12 pb-6 border-b border-brand-ink/10">
              <h1 className="text-4xl font-serif">Growth Architecture</h1>
              <div className="flex gap-4">
                <button onClick={copyToClipboard} className="p-2 text-brand-ink/50 hover:text-brand-ink transition-colors" title="Copy to Clipboard">
                  <Copy size={20} />
                </button>
                <button className="p-2 text-brand-ink/50 hover:text-brand-ink transition-colors" title="Download PDF">
                  <Download size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-16">
              <section>
                <h2 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-6">1. Business Model Analysis</h2>
                <div className="prose prose-lg max-w-none text-brand-ink/80 font-serif leading-relaxed prose-headings:font-serif prose-headings:font-normal">
                  <ReactMarkdown>{fullBlueprint.businessModelAnalysis}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h2 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-6">2. Martech Stack</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-ink/20">
                        <th className="py-4 px-4 font-bold text-xs uppercase tracking-widest text-brand-ink/50">Layer</th>
                        <th className="py-4 px-4 font-bold text-xs uppercase tracking-widest text-brand-ink/50">Tool</th>
                        <th className="py-4 px-4 font-bold text-xs uppercase tracking-widest text-brand-ink/50">Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullBlueprint.recommendedStack.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-brand-ink/10">
                          <td className="py-5 px-4 font-medium text-sm">{item.layer}</td>
                          <td className="py-5 px-4 text-sm font-bold">{item.tool}</td>
                          <td className="py-5 px-4 text-sm text-brand-ink/70 font-serif">{item.why}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h2 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-6">3. Architecture & Integrations</h2>
                <div className="prose prose-lg max-w-none text-brand-ink/80 font-serif leading-relaxed bg-brand-ink/5 p-8 border border-brand-ink/10">
                  <ReactMarkdown>{fullBlueprint.architectureAndIntegrations}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h2 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-6">4. Go-To-Market Plan</h2>
                <div className="prose prose-lg max-w-none text-brand-ink/80 font-serif leading-relaxed">
                  <ReactMarkdown>{fullBlueprint.goToMarketStrategy}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h2 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-6">5. Core Automations</h2>
                <div className="prose prose-lg max-w-none text-brand-ink/80 font-serif leading-relaxed">
                  <ReactMarkdown>{fullBlueprint.coreAutomations}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h2 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-6">6. Growth Levers</h2>
                <div className="prose prose-lg max-w-none text-brand-ink/80 font-serif leading-relaxed">
                  <ReactMarkdown>{fullBlueprint.growthLevers}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h2 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-6">7. 90-Day Plan</h2>
                <div className="space-y-6">
                  {fullBlueprint.ninetyDayRoadmap.map((phase: any, i: number) => (
                    <div key={i} className="flex gap-6 p-6 border border-brand-ink/10">
                      <div className="flex-shrink-0 w-12 h-12 bg-brand-ink text-brand-bg flex items-center justify-center font-serif text-xl">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold mb-2">{phase.phase}</h4>
                        <p className="text-brand-ink/70 font-serif">{phase.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xs uppercase tracking-widest font-bold text-brand-ink/50 mb-6">8. Budget Tiers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fullBlueprint.estimatedBudgetTiers.map((tier: any, i: number) => (
                    <div key={i} className="p-8 border border-brand-ink/20">
                      <h4 className="font-bold text-lg mb-2">{tier.tier}</h4>
                      <div className="text-2xl font-serif mb-4">{tier.cost}</div>
                      <p className="text-brand-ink/70 text-sm">{tier.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-20 p-12 bg-brand-ink text-brand-bg text-center">
                <h3 className="text-3xl font-serif mb-6">Want a fully customized architecture with implementation support?</h3>
                <a href="/about#contact" className="inline-block px-8 py-4 bg-brand-bg text-brand-ink text-xs uppercase tracking-widest font-bold hover:bg-brand-bg/90 transition-colors">
                  Book Strategy Session
                </a>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
