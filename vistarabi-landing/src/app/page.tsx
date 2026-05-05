import {
  Navbar,
  Hero,
  SocialProof,
  ProblemSolution,
  CoreEngine,
  FeatureGrid,
  DashboardPreview,
  AISection,
  Security,
  FinalCTA,
  Footer,
} from "@/components/landing";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 text-center">
        <p className="text-sm">
          🚀 Try the live demo now  to {" "}
          <Link href="/demo" className="font-bold underline hover:opacity-80">
            View Real Data Dashboards
          </Link>
        </p>
      </div>

      <Hero />
      <SocialProof />
      <ProblemSolution />
      <CoreEngine />
      <FeatureGrid />
      <DashboardPreview />
      <AISection />
      <Security />
      <FinalCTA />
      <Footer />
    </main>
  );
}
