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

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <SocialProof />
      <ProblemSolution />
      <CoreEngine />
      <DashboardPreview />
      <FeatureGrid />
      <AISection />
      <Security />
      <FinalCTA />
      <Footer />
    </main>
  );
}
