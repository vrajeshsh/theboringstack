import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, Download, Eye, FileText, X } from 'lucide-react';
import SectionHeading from '@/src/components/SectionHeading';

export default function AdminBlueprints() {
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingJson, setViewingJson] = useState<any | null>(null);

  useEffect(() => {
    fetchBlueprints();
  }, []);

  const fetchBlueprints = async () => {
    try {
      const res = await fetch('/api/blueprints');
      const data = await res.json();
      setBlueprints(data);
    } catch (error) {
      console.error("Error fetching blueprints:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBlueprint = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blueprint?")) return;
    try {
      await fetch(`/api/blueprints?id=${id}`, { method: 'DELETE' });
      setBlueprints(blueprints.filter(bp => bp.id !== id));
    } catch (error) {
      console.error("Error deleting blueprint:", error);
    }
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprints));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "marketing_blueprints_export.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="px-6 py-20 min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <SectionHeading 
            title="Blueprint Submissions." 
            subtitle="Admin Dashboard"
            className="mb-0"
          />
          <button 
            onClick={exportData}
            className="flex items-center gap-2 px-6 py-3 bg-brand-ink text-brand-bg text-xs uppercase tracking-widest font-bold hover:bg-brand-accent transition-colors cursor-pointer"
          >
            <Download size={14} /> Export JSON
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-brand-ink/50 font-serif italic">Loading submissions...</div>
        ) : blueprints.length === 0 ? (
          <div className="text-center py-20 border border-brand-ink/10 bg-white">
            <FileText size={48} className="mx-auto mb-4 text-brand-ink/20" />
            <p className="text-brand-ink/50 font-serif italic">No blueprints generated yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-brand-ink/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-brand-ink bg-brand-bg/50">
                    <th className="py-4 px-6 text-xs uppercase tracking-widest font-bold text-brand-ink">Date</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-widest font-bold text-brand-ink">Business</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-widest font-bold text-brand-ink">Type</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-widest font-bold text-brand-ink">Goal</th>
                    <th className="py-4 px-6 text-xs uppercase tracking-widest font-bold text-brand-ink text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-serif">
                  {blueprints.map((bp) => (
                    <tr key={bp.id} className="border-b border-brand-ink/10 hover:bg-brand-bg/50 transition-colors">
                      <td className="py-4 px-6 text-brand-ink/60">
                        {new Date(bp.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 font-bold truncate max-w-[200px]">
                        {bp.business_name}
                      </td>
                      <td className="py-4 px-6 text-brand-ink/70">
                        {bp.input_data?.businessType}
                      </td>
                      <td className="py-4 px-6 text-brand-ink/70">
                        {bp.input_data?.growthGoal}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => setViewingJson(bp.ai_output)}
                            className="p-2 text-brand-ink/50 hover:text-brand-ink transition-colors"
                            title="View Raw JSON"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => deleteBlueprint(bp.id)}
                            className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* JSON Viewer Modal */}
      {viewingJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-ink/20 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-brand-ink/10 w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl"
          >
            <div className="flex justify-between items-center p-6 border-b border-brand-ink/10">
              <h3 className="font-serif text-xl font-bold">Raw Blueprint JSON</h3>
              <button 
                onClick={() => setViewingJson(null)}
                className="p-2 text-brand-ink/50 hover:text-brand-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-brand-bg/50">
              <pre className="text-xs font-mono text-brand-ink/80 whitespace-pre-wrap break-words">
                {JSON.stringify(viewingJson, null, 2)}
              </pre>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
