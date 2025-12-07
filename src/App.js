import React, { useState, useEffect } from 'react';
import { Lightbulb, Send, Sparkles, TrendingUp, Shield, AlertCircle, Database } from 'lucide-react';

// Change this to your backend URL after deployment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Add custom CSS for select placeholder
const customStyles = `
  select option[value=""] {
    color: #6b7280;
  }
  select:invalid {
    color: #6b7280;
  }
  select:valid {
    color: white;
  }
`;

const IdeaVault = () => {
  const [ideas, setIdeas] = useState([]);
  const [newIdea, setNewIdea] = useState({ title: '', description: '', category: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('submit');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load ideas from Google Sheets on mount and when switching tabs
  useEffect(() => {
    loadIdeas();
  }, []);

  useEffect(() => {
    if (activeTab === 'ideas') {
      loadIdeas();
    }
  }, [activeTab]);

  const loadIdeas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas`);
      if (response.ok) {
        const data = await response.json();
        setIdeas(data);
      } else {
        throw new Error('Failed to load ideas');
      }
    } catch (error) {
      console.error('Error loading ideas:', error);
      setError('Could not connect to server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newIdea.title || !newIdea.description) {
      alert('Please fill in both title and description');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newIdea.title,
          description: newIdea.description,
          category: newIdea.category
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit idea');
      }

      const submittedIdea = await response.json();

      // Add to local state
      setIdeas([submittedIdea, ...ideas]);

      // Clear form
      setNewIdea({ title: '', description: '', category: '' });
      setShowSuccess(true);
      
      setTimeout(() => setShowSuccess(false), 3000);

      // Trigger AI evaluation
      evaluateIdea(submittedIdea);

    } catch (error) {
      console.error('Error submitting idea:', error);
      setError('Failed to submit idea. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const evaluateIdea = async (idea) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: idea.id,
          title: idea.title,
          description: idea.description,
          category: idea.category
        })
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate idea');
      }

      const evaluation = await response.json();

      // Update local state
      setIdeas(prevIdeas =>
        prevIdeas.map(i =>
          i.id === idea.id
            ? { ...i, aiEvaluation: evaluation, status: 'evaluated' }
            : i
        )
      );

    } catch (error) {
      console.error('Error evaluating idea:', error);
      setIdeas(prevIdeas =>
        prevIdeas.map(i =>
          i.id === idea.id
            ? { ...i, status: 'error', aiEvaluation: { summary: 'Evaluation failed. Try re-evaluating.' } }
            : i
        )
      );
    }
  };

  const reevaluateAll = async () => {
    const pendingIdeas = ideas.filter(i => !i.aiEvaluation || i.status === 'error');
    for (const idea of pendingIdeas) {
      await evaluateIdea(idea);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-amber-600';
    return 'text-orange-600';
  };

  const categories = [
    'Process Improvement',
    'Product Innovation',
    'Cost Savings',
    'Employee Experience',
    'Customer Experience',
    'Technology',
    'Other'
  ];

  return (
    <>
      <style>{customStyles}</style>
      <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-lg">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Idea Vault</h1>
                <p className="text-xs text-gray-500">Anonymous & Safe - Share freely, every idea matters</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-white">KEARNEY</div>
              <div className="text-xs text-gray-500">PERLab</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-600/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="text-xs text-red-400 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 font-medium text-sm transition-all ${
              activeTab === 'submit'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Submit Idea
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-2 font-medium text-sm transition-all ${
              activeTab === 'ideas'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Ideas ({ideas.length})
          </button>
        </div>

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">Your submission is completely anonymous. We value all ideas!</p>
                  
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Idea Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                  placeholder="A catchy title for your idea"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category <span className="text-gray-400">(Optional)</span>
                </label>
                <select
                  value={newIdea.category}
                  onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                  required={false}
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Describe Your Idea <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                  placeholder="What's your idea? How would it work? What problem does it solve? No idea is too wild - share freely!"
                  rows="6"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all resize-none"
                />
              </div>

              {showSuccess && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 border border-green-400 rounded-lg p-4 text-white text-sm font-medium flex items-center gap-2 shadow-lg">
                  <span className="text-white text-lg">✓</span>
                  Your idea has been submitted anonymously!
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    Saving to Google Sheets...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Anonymous Idea
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Ideas Tab */}
        {activeTab === 'ideas' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-16">
                <Sparkles className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
                <p className="text-gray-400">Loading ideas from Google Sheets...</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{ideas.length}</span>
                    <span className="text-sm text-gray-400">ideas in Google Sheets</span>
                  </div>
                  <button
                    onClick={reevaluateAll}
                    className="px-4 py-2 bg-gray-900 border border-gray-600 text-white rounded-lg hover:bg-gray-800 text-sm font-medium flex items-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Re-evaluate All
                  </button>
                </div>

                {ideas.length === 0 ? (
                  <div className="text-center py-16">
                    <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No ideas yet</h3>
                    <p className="text-gray-400 mb-6">Be the first to share your brilliant idea!</p>
                    <button
                      onClick={() => setActiveTab('submit')}
                      className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-all"
                    >
                      Submit First Idea
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ideas.map((idea) => (
                      <div key={idea.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">{idea.title}</h3>
                            {idea.category && (
                              <span className="inline-block px-3 py-1 bg-gray-800 text-orange-400 rounded-full text-xs font-medium border border-orange-500/20">
                                {idea.category}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(idea.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-gray-300 text-sm leading-relaxed mb-4">{idea.description}</p>

                        {idea.aiEvaluation ? (
                          <div className="border-t border-gray-700 pt-4 space-y-4">
                            <div className="flex items-center gap-2 text-orange-400 font-medium text-sm">
                              <Sparkles className="w-4 h-4" />
                              AI Evaluation
                            </div>

                            {/* Scores */}
                            <div className="grid grid-cols-4 gap-3">
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                                <div className={`text-2xl font-bold ${getScoreColor(idea.aiEvaluation.innovationScore)}`}>
                                  {idea.aiEvaluation.innovationScore}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Innovation</div>
                              </div>
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                                <div className={`text-2xl font-bold ${getScoreColor(idea.aiEvaluation.feasibilityScore)}`}>
                                  {idea.aiEvaluation.feasibilityScore}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Feasibility</div>
                              </div>
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                                <div className={`text-2xl font-bold ${getScoreColor(idea.aiEvaluation.impactScore)}`}>
                                  {idea.aiEvaluation.impactScore}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Impact</div>
                              </div>
                              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-white">
                                  {idea.aiEvaluation.overallScore}
                                </div>
                                <div className="text-xs text-white/90 mt-1">Overall</div>
                              </div>
                            </div>

                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                              <p className="text-sm text-gray-300 leading-relaxed">{idea.aiEvaluation.summary}</p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Strengths
                                </h4>
                                <ul className="text-xs text-gray-300 space-y-1.5">
                                  {idea.aiEvaluation.strengths?.map((s, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-green-400 mt-0.5">•</span>
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-amber-400 mb-2">Considerations</h4>
                                <ul className="text-xs text-gray-300 space-y-1.5">
                                  {idea.aiEvaluation.considerations?.map((c, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-amber-400 mt-0.5">•</span>
                                      <span>{c}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-purple-400 mb-2">Next Steps</h4>
                                <ul className="text-xs text-gray-300 space-y-1.5">
                                  {idea.aiEvaluation.nextSteps?.map((n, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-purple-400 mt-0.5">•</span>
                                      <span>{n}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border-t border-gray-700 pt-4 text-center py-4">
                            <Sparkles className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                            <p className="text-sm text-gray-400">AI evaluation in progress...</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default IdeaVault;