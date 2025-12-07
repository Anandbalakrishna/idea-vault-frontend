import React, { useState, useEffect } from 'react';
import { Lightbulb, Send, Sparkles, TrendingUp, Shield, AlertCircle } from 'lucide-react';

// Change this to your backend URL after deployment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const IdeaVault = () => {
  const [ideas, setIdeas] = useState([]);
  const [newIdea, setNewIdea] = useState({ title: '', description: '', category: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('submit');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('short'); // 'short' or 'full'
  const [expandedCards, setExpandedCards] = useState(new Set()); // Track individually expanded cards

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
          rowNumber: idea.rowNumber,
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

  const toggleCard = (ideaId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  const renderKPICards = (idea) => {
    if (!idea.aiEvaluation) return null;
    
    const getScoreColorHex = (score) => {
      if (score >= 8) return '#22c55e';
      if (score >= 6) return '#f59e0b';
      return '#f97316';
    };
    
    return (
      <div style={{display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'nowrap'}}>
        <div style={{background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
          <span style={{fontSize: '14px'}}>💡</span>
          <span style={{fontSize: '18px', fontWeight: '700', color: getScoreColorHex(idea.aiEvaluation.innovationScore)}}>{idea.aiEvaluation.innovationScore}</span>
        </div>
        <div style={{background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
          <span style={{fontSize: '14px'}}>⚙️</span>
          <span style={{fontSize: '18px', fontWeight: '700', color: getScoreColorHex(idea.aiEvaluation.feasibilityScore)}}>{idea.aiEvaluation.feasibilityScore}</span>
        </div>
        <div style={{background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
          <span style={{fontSize: '14px'}}>🎯</span>
          <span style={{fontSize: '18px', fontWeight: '700', color: getScoreColorHex(idea.aiEvaluation.impactScore)}}>{idea.aiEvaluation.impactScore}</span>
        </div>
        <div style={{background: '#134e4a', border: 'none', borderRadius: '6px', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
          <span style={{fontSize: '14px'}}>⭐</span>
          <span style={{fontSize: '18px', fontWeight: '700', color: '#fff'}}>{idea.aiEvaluation.overallScore}</span>
        </div>
      </div>
    );
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-amber-600';
    return 'text-orange-600';
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-800 sticky top-0 z-10 bg-black">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-lg">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Idea Vault</h1>
                <p className="text-xs text-gray-400">Anonymous & Safe - Share freely, every idea matters</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">KEARNEY</div>
              <div className="text-xs text-gray-400">PERLab</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-800 mb-8">
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
            <div className="border border-gray-700 rounded-lg p-4" style={{backgroundColor: '#2f2f2f'}}>
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
                  className="w-full px-4 py-2.5 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                  style={{ backgroundColor: '#3f3f3f' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category <span className="text-gray-400">(Optional)</span>
                </label>
                <select
                  value={newIdea.category}
                  onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                  style={{ color: newIdea.category ? 'white' : '#9ca3af', backgroundColor: '#3f3f3f' }}
                >
                  <option value="" disabled hidden>Select a category</option>
                  <option value="Technology">Technology</option>
                  <option value="Process Improvement">Process Improvement</option>
                  <option value="Cost Savings">Cost Savings</option>
                  <option value="Customer Experience">Customer Experience</option>
                  <option value="Employee Experience">Employee Experience</option>
                  <option value="Product Innovation">Product Innovation</option>
                  <option value="Other">Other</option>
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
                  className="w-full px-4 py-2.5 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all resize-none"
                  style={{ backgroundColor: '#2b2b29' }}
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
                    Idea Submitting...
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

        {/* All Ideas Tab */}
        {activeTab === 'ideas' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-16">
                <Sparkles className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
                <p className="text-gray-400">Loading ideas from Google Sheets...</p>
              </div>
            ) : (
              <>
                {/* Filter Bar with View Toggle */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="text-sm text-gray-400">
                    <strong className="text-white text-xl mr-2">{ideas.length}</strong> ideas
                  </div>
                  
                  <button className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm hover:border-orange-500 transition-all flex items-center gap-2">
                    <span>🔍</span>
                    <span>Show Filters</span>
                  </button>
                  
                  <select className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                    <option>Newest First</option>
                    <option>Highest Score</option>
                    <option>Most Innovative</option>
                    <option>Most Feasible</option>
                  </select>
                  
                  <button 
                    onClick={() => setViewMode('short')}
                    className={`px-3 py-2 border rounded-lg text-sm transition-all ${viewMode === 'short' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-700 border-gray-600 text-white hover:border-orange-500'}`}
                    title="Short View"
                  >
                    <span style={{fontSize: '16px'}}>▤</span>
                  </button>
                  
                  <button 
                    onClick={() => setViewMode('full')}
                    className={`px-3 py-2 border rounded-lg text-sm transition-all ${viewMode === 'full' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-700 border-gray-600 text-white hover:border-orange-500'}`}
                    title="Full View"
                  >
                    <span style={{fontSize: '16px'}}>☰</span>
                  </button>
                  
                  <button 
                    onClick={reevaluateAll}
                    className="ml-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all flex items-center gap-2"
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
                    {ideas.map((idea) => {
                      const isExpanded = expandedCards.has(idea.id);
                      const showFull = viewMode === 'full' || isExpanded;
                      
                      return (
                        <div 
                          key={idea.id} 
                          onClick={() => toggleCard(idea.id)}
                          className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all cursor-pointer"
                        >
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

                          {/* Short View: KPI Cards */}
                          {!showFull && renderKPICards(idea)}

                          {/* Full View: Complete AI Evaluation */}
                          {showFull && idea.aiEvaluation && (
                            <div className="border-t border-gray-700 pt-4 space-y-4">
                              <div className="flex items-center gap-2 text-orange-400 font-medium text-sm">
                                <Sparkles className="w-4 h-4" />
                                AI Evaluation
                              </div>

                              <div className="grid grid-cols-4 gap-3">
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                  <div className={`text-2xl font-bold ${getScoreColor(idea.aiEvaluation.innovationScore)}`}>
                                    {idea.aiEvaluation.innovationScore}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">Innovation</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                  <div className={`text-2xl font-bold ${getScoreColor(idea.aiEvaluation.feasibilityScore)}`}>
                                    {idea.aiEvaluation.feasibilityScore}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">Feasibility</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 text-center">
                                  <div className={`text-2xl font-bold ${getScoreColor(idea.aiEvaluation.impactScore)}`}>
                                    {idea.aiEvaluation.impactScore}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">Impact</div>
                                </div>
                                <div className="rounded-lg p-3 text-center" style={{background: '#134e4a'}}>
                                  <div className="text-2xl font-bold text-white">
                                    {idea.aiEvaluation.overallScore}
                                  </div>
                                  <div className="text-xs text-white/80 mt-1">Overall</div>
                                </div>
                              </div>

                              <div className="bg-gray-800 rounded-lg p-4">
                                <p className="text-sm text-gray-300 leading-relaxed">{idea.aiEvaluation.summary}</p>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <h4 className="text-xs font-semibold text-green-500 mb-2 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    Strengths
                                  </h4>
                                  <ul className="space-y-1">
                                    {idea.aiEvaluation.strengths.map((s, i) => (
                                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        <span>{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div>
                                  <h4 className="text-xs font-semibold text-amber-500 mb-2 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Considerations
                                  </h4>
                                  <ul className="space-y-1">
                                    {idea.aiEvaluation.considerations.map((c, i) => (
                                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                                        <span className="text-amber-500 mt-0.5">•</span>
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div>
                                  <h4 className="text-xs font-semibold text-purple-500 mb-2 flex items-center gap-1">
                                    <Send className="w-3 h-3" />
                                    Next Steps
                                  </h4>
                                  <ul className="space-y-1">
                                    {idea.aiEvaluation.nextSteps.map((n, i) => (
                                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                                        <span className="text-purple-500 mt-0.5">•</span>
                                        <span>{n}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Pending Evaluation */}
                          {!idea.aiEvaluation && (
                            <div className="border-t border-gray-700 pt-4 text-center py-4">
                              <Sparkles className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                              <p className="text-sm text-gray-400">AI evaluation in progress...</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeaVault;
