/**
 * Domain Detection Page (Module 3)
 * Displays domain detection results with confidence-based UI
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { detectDomain, confirmDomain, DomainDetection } from '../services/domainApi';

const DomainDetectionPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<DomainDetection | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Domain display names and descriptions
  const domainInfo: Record<string, { name: string; description: string; icon: string }> = {
    retail: {
      name: 'Retail',
      description: 'Product inventory, sales, and store operations',
      icon: '🏪'
    },
    ecommerce: {
      name: 'E-commerce',
      description: 'Online orders, shipping, and customer management',
      icon: '🛒'
    },
    saas: {
      name: 'SaaS',
      description: 'Subscriptions, MRR/ARR, and customer retention',
      icon: '💻'
    },
    healthcare: {
      name: 'Healthcare',
      description: 'Patient records, diagnoses, and medical treatments',
      icon: '🏥'
    },
    manufacturing: {
      name: 'Manufacturing',
      description: 'Production output, defect rates, and quality control',
      icon: '🏭'
    },
    logistics: {
      name: 'Logistics',
      description: 'Shipments, tracking, and delivery management',
      icon: '🚚'
    },
    financial: {
      name: 'Financial',
      description: 'Accounts, transactions, and financial operations',
      icon: '💰'
    },
    education: {
      name: 'Education',
      description: 'Student enrollment, grades, and course management',
      icon: '🎓'
    }
  };

  useEffect(() => {
    detectDomainForJob();
  }, [jobId]);

  const detectDomainForJob = async () => {
    if (!jobId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await detectDomain(jobId);
      setDetection(result);
      setSelectedDomain(result.domain);
    } catch (err: any) {
      setError(err.message || 'Failed to detect domain');
      console.error('Detection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!detection || !selectedDomain) return;

    setDetecting(true);
    setError(null);

    try {
      await confirmDomain(detection.domainJobId, selectedDomain);
      
      // Success - navigate to Module 4 (KPI Extraction)
      navigate(`/kpi/${detection.domainJobId}`, {
        state: {
          cleaningJobId: jobId,
          domain: selectedDomain
        }
      });
      
    } catch (err: any) {
      setError(err.message || 'Failed to confirm domain');
      console.error('Confirmation error:', err);
    } finally {
      setDetecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">Detecting Domain...</p>
          <p className="text-sm text-gray-500 mt-2">Analyzing data structure and patterns</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="text-red-600 text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-2xl font-bold text-red-900 mb-2 text-center">Detection Failed</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={detectDomainForJob}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Retry Detection
          </button>
        </div>
      </div>
    );
  }

  if (!detection) return null;

  // Render based on confidence/decision
  const renderAutoDetect = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Domain Detected ✓</h1>
                <p className="text-green-100">High confidence match found</p>
              </div>
              <div className="text-6xl">{domainInfo[detection.domain].icon}</div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Confidence Badge */}
            <div className="flex items-center justify-center mb-8">
              <div className="bg-green-100 text-green-800 px-6 py-3 rounded-full text-lg font-bold">
                {detection.confidence}% Confidence
              </div>
            </div>

            {/* Domain Info */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                {domainInfo[detection.domain].name}
              </h2>
              <p className="text-lg text-gray-600">
                {domainInfo[detection.domain].description}
              </p>
            </div>

            {/* Matches */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
                  <span className="text-2xl mr-2">🎯</span>
                  Primary Matches
                </h3>
                <ul className="space-y-2">
                  {detection.primaryMatches.map((match, idx) => (
                    <li key={idx} className="flex items-center text-blue-700">
                      <span className="mr-2">✓</span>
                      <code className="bg-blue-100 px-2 py-1 rounded text-sm">{match}</code>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center">
                  <span className="text-2xl mr-2">🔑</span>
                  Keyword Matches
                </h3>
                <ul className="space-y-2">
                  {detection.keywordMatches.slice(0, 5).map((match, idx) => (
                    <li key={idx} className="flex items-center text-purple-700">
                      <span className="mr-2">✓</span>
                      <code className="bg-purple-100 px-2 py-1 rounded text-sm text-xs">{match}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Alternative Domains Section */}
            {detection.top3Alternatives && detection.top3Alternatives.length > 0 && (
              <div className="mb-8">
                <div className="border-t-2 border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="mr-2">💡</span>
                    Other Possible Domains
                    <span className="ml-2 text-sm font-normal text-gray-500">(if you think the detection is wrong)</span>
                  </h3>
                  <div className="space-y-3">
                    {detection.top3Alternatives.slice(0, 2).map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDomain(alt.domain)}
                        className={`w-full text-left border-2 rounded-lg p-4 transition ${
                          selectedDomain === alt.domain
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-3xl">{domainInfo[alt.domain]?.icon || '📊'}</div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {domainInfo[alt.domain]?.name || alt.domain}
                              </div>
                              <div className="text-sm text-gray-600">
                                {domainInfo[alt.domain]?.description || 'Alternative domain'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-500">
                              {Math.round(alt.score)}% confidence
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action */}
            <button
              onClick={handleConfirm}
              disabled={detecting}
              className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-xl hover:from-green-600 hover:to-teal-700 transition font-bold text-lg shadow-lg disabled:opacity-50"
            >
              {detecting ? 'Confirming...' : `Continue with ${domainInfo[selectedDomain].name} Domain →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTop3Alternatives = () => (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">Select Domain</h1>
            <p className="text-yellow-100">Multiple matches detected - please select the best fit</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Confidence Badge */}
            <div className="flex items-center justify-center mb-8">
              <div className="bg-yellow-100 text-yellow-800 px-6 py-3 rounded-full text-lg font-bold">
                {detection.confidence}% Confidence
              </div>
            </div>

            {/* Top 3 Options */}
            <div className="space-y-4 mb-8">
              {/* Primary suggestion */}
              <label className="block cursor-pointer">
                <div className={`border-3 rounded-xl p-6 transition ${
                  selectedDomain === detection.domain
                    ? 'border-orange-500 bg-orange-50 shadow-lg'
                    : 'border-gray-200 hover:border-orange-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="radio"
                        name="domain"
                        value={detection.domain}
                        checked={selectedDomain === detection.domain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="w-5 h-5 text-orange-600"
                      />
                      <div className="text-4xl">{domainInfo[detection.domain].icon}</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {domainInfo[detection.domain].name}
                          <span className="ml-2 text-sm font-normal text-orange-600">(Recommended)</span>
                        </h3>
                        <p className="text-gray-600">{domainInfo[detection.domain].description}</p>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-orange-600">{detection.confidence}%</div>
                  </div>
                </div>
              </label>

              {/* Alternatives */}
              {detection.top3Alternatives.slice(0, 2).map((alt, idx) => (
                <label key={idx} className="block cursor-pointer">
                  <div className={`border-3 rounded-xl p-6 transition ${
                    selectedDomain === alt.domain
                      ? 'border-orange-500 bg-orange-50 shadow-lg'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="radio"
                          name="domain"
                          value={alt.domain}
                          checked={selectedDomain === alt.domain}
                          onChange={(e) => setSelectedDomain(e.target.value)}
                          className="w-5 h-5 text-orange-600"
                        />
                        <div className="text-4xl">{domainInfo[alt.domain].icon}</div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {domainInfo[alt.domain].name}
                          </h3>
                          <p className="text-gray-600">{domainInfo[alt.domain].description}</p>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-gray-500">{Math.round(alt.score)}%</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Action */}
            <button
              onClick={handleConfirm}
              disabled={detecting || !selectedDomain}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-4 rounded-xl hover:from-yellow-600 hover:to-orange-700 transition font-bold text-lg shadow-lg disabled:opacity-50"
            >
              {detecting ? 'Confirming...' : `Continue with ${selectedDomain ? domainInfo[selectedDomain].name : 'Selected'} Domain →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderManualSelect = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-600 to-blue-700 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">Select Domain Manually</h1>
            <p className="text-gray-100">Low confidence match - please choose your domain</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Confidence Badge */}
            <div className="flex items-center justify-center mb-8">
              <div className="bg-gray-100 text-gray-800 px-6 py-3 rounded-full text-lg font-bold">
                {detection.confidence}% Confidence
              </div>
            </div>

            {/* All Domains */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select your business domain:
              </label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full p-4 border-2 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              >
                <option value="">-- Choose Domain --</option>
                {detection.allDomains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domainInfo[domain].icon} {domainInfo[domain].name} - {domainInfo[domain].description}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Domain Preview */}
            {selectedDomain && (
              <div className="bg-blue-50 rounded-xl p-6 mb-8">
                <div className="flex items-center space-x-4">
                  <div className="text-5xl">{domainInfo[selectedDomain].icon}</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{domainInfo[selectedDomain].name}</h3>
                    <p className="text-gray-600">{domainInfo[selectedDomain].description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action */}
            <button
              onClick={handleConfirm}
              disabled={detecting || !selectedDomain}
              className="w-full bg-gradient-to-r from-gray-600 to-blue-700 text-white py-4 rounded-xl hover:from-gray-700 hover:to-blue-800 transition font-bold text-lg shadow-lg disabled:opacity-50"
            >
              {detecting ? 'Confirming...' : selectedDomain ? `Continue with ${domainInfo[selectedDomain].name} Domain →` : 'Select a Domain'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Route to appropriate UI based on decision
  switch (detection.decision) {
    case 'auto_detect':
      return renderAutoDetect();
    case 'show_top_3':
      return renderTop3Alternatives();
    case 'manual_select':
      return renderManualSelect();
    default:
      return renderAutoDetect();
  }
};

export default DomainDetectionPage;
