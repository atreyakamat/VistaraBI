'use client';

import Link from 'next/link';

export default function DemoHubPage() {
  const domains = [
    {
      name: 'Retail',
      path: '/demo/retail',
      description: '5-store chain with sales, inventory, traffic, margin',
      icon: '\uD83C\uDFEA',
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'SaaS',
      path: '/demo/saas',
      description: 'MRR, ARR, churn, CAC, net revenue retention',
      icon: '\uD83D\uDCBB',
      color: 'from-purple-500 to-purple-600',
    },
    {
      name: 'E-Commerce',
      path: '/demo/ecommerce',
      description: 'Revenue, AOV, conversion, cart abandonment, LTV',
      icon: '\uD83D\uDED2',
      color: 'from-green-500 to-green-600',
    },
    {
      name: 'EdTech',
      path: '/demo/edtech',
      description: 'Enrollment, completion, scores, retention metrics',
      icon: '\uD83C\uDF93',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      name: 'Services',
      path: '/demo/services',
      description: 'Billable utilization, margins, client retention',
      icon: '\uD83D\uDCCB',
      color: 'from-amber-500 to-amber-600',
    },
    {
      name: 'Manufacturing',
      path: '/demo/manufacturing',
      description: 'OEE, yield rate, defect rate, downtime',
      icon: '\uD83C\uDFED',
      color: 'from-red-500 to-red-600',
    },
    {
      name: 'Healthcare',
      path: '/demo/healthcare',
      description: 'Patient satisfaction, readmission, wait times',
      icon: '\uD83C\uDFE5',
      color: 'from-pink-500 to-pink-600',
    },
    {
      name: 'Finance',
      path: '/demo/finance',
      description: 'Net margin, ROI, debt-to-equity, cash flow',
      icon: '\uD83D\uDCB0',
      color: 'from-cyan-500 to-cyan-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-3">VistaraBI Demo Center</h1>
          <p className="text-xl text-slate-400">
            Explore industry-specific analytics for all 8 domains
          </p>
        </div>

        {/* Domain Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {domains.map((domain) => (
            <Link key={domain.path} href={domain.path}>
              <div className="group relative overflow-hidden rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all duration-300 hover:shadow-2xl cursor-pointer h-full">
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${domain.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

                {/* Content */}
                <div className="relative p-6 h-full flex flex-col">
                  <div className="text-5xl mb-4">{domain.icon}</div>

                  <h2 className="text-2xl font-bold text-white mb-2">{domain.name}</h2>

                  <p className="text-slate-400 text-sm flex-grow mb-4">{domain.description}</p>

                  <div className="flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
                    <span className="text-sm font-semibold">Explore</span>
                    <span className="ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-slate-800 border border-slate-700 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-4">About These Demos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-400">
            <div>
              <p className="font-semibold text-white mb-2">✅ Real-Time Data</p>
              <p>
                Each dashboard generates realistic demo data tailored to that industry&apos;s KPIs.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">📊 Industry-Specific</p>
              <p>
                KPIs calculated exactly as domain experts expect them—no one-size-fits-all approach.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">🚀 Ready to Deploy</p>
              <p>
                Upload your real data and get the same dashboard instantly with your actual metrics.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 mb-4">Ready to transform your business analytics?</p>
          <Link href="/app/projects" className="inline-block">
            <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow">
              Get Started with Your Data
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
