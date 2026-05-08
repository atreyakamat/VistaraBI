"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    LayoutDashboard, 
    FolderKanban, 
    LogOut, 
    Plus, 
    ArrowRight, 
    User,
    ChevronRight,
    BarChart3,
    Shield,
    Settings
} from "lucide-react";
import { api } from "@/lib/api/client";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";

interface UserData {
    id: string;
    name: string;
    email: string;
}

interface Project {
    id: string;
    name: string;
    createdAt: string;
}

export default function AppPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userRes, projectsRes] = await Promise.all([
                    api.get<{ user: UserData }>("/api/auth/me"),
                    api.get<{ projects: Project[] }>("/api/projects"),
                ]);

                if (userRes.error || !userRes.data) {
                    router.push("/login");
                    return;
                }

                setUser(userRes.data.user);

                if (projectsRes.data) {
                    setProjects(projectsRes.data.projects);
                }
            } catch (error) {
                console.error("Dashboard failed to load", error);
                router.push("/login");
            } finally {
                // Keep loading for a split second to avoid flickers and make it feel "deliberate"
                setTimeout(() => setLoading(false), 300);
            }
        };
        fetchData();
    }, [router]);

    const handleLogout = async () => {
        await api.post("/api/auth/logout");
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">VistaraBI</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Link
                            href="/app/status"
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50 transition-all"
                            title="Platform Status"
                        >
                            <Shield className="w-4 h-4" />
                            Status
                        </Link>
                        <Link
                            href="/app/settings"
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50 transition-all"
                            title="Account Settings"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-semibold text-[var(--foreground)]">{user?.name}</span>
                            <span className="text-xs text-[var(--muted)]">{user?.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg hover:bg-[var(--border)]/50 text-[var(--muted)] hover:text-red-500 transition-all group"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <DashboardSkeleton />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="space-y-12"
                        >
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold text-[var(--foreground)] tracking-tight">
                                    Welcome back, {user?.name.split(" ")[0]}!
                                </h1>
                                <p className="text-lg text-[var(--muted)]">
                                    Your BI workspace is ready. What would you like to build today?
                                </p>
                            </div>

                            {/* Onboarding Guide (shown for new users) */}
                            <OnboardingGuide
                                userName={user?.name.split(" ")[0] || 'there'}
                                projectCount={projects.length}
                                onDismiss={() => {}}
                            />

                            {/* Action Cards */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <Link
                                    href="/app/projects"
                                    className="group relative bg-[var(--card)] rounded-3xl p-8 border border-[var(--border)] hover:border-[var(--accent)]/50 hover:shadow-2xl hover:shadow-[var(--accent)]/5 transition-all"
                                >
                                    <div className="flex flex-col h-full gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--accent)] transition-all duration-300">
                                            <FolderKanban className="w-7 h-7 text-[var(--accent)] group-hover:text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-bold text-[var(--foreground)]">Projects</h3>
                                            <p className="text-[var(--muted)]">
                                                Manage your datasets, configure KPIs, and analyze domain insights.
                                            </p>
                                        </div>
                                        <div className="mt-auto pt-4 flex items-center text-[var(--accent)] font-semibold gap-2 group-hover:gap-3 transition-all">
                                            <span>
                                                {projects.length === 0
                                                    ? "Create first project"
                                                    : `View ${projects.length} project${projects.length !== 1 ? "s" : ""}`}
                                            </span>
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </Link>

                                <div className="group relative bg-[var(--card)]/50 rounded-3xl p-8 border border-[var(--border)] border-dashed overflow-hidden flex flex-col justify-center items-center text-center">
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--border)]/5 group-hover:to-[var(--accent)]/5 transition-all" />
                                    <div className="relative z-10 space-y-4">
                                        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--muted)]/10 flex items-center justify-center text-[var(--muted)]">
                                            <BarChart3 className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--muted)]">Unified Dashboard</h3>
                                            <p className="text-sm text-[var(--muted)] mt-1">Advanced cross-project analytics coming soon.</p>
                                        </div>
                                        <div className="px-4 py-1.5 rounded-full bg-[var(--border)] text-[var(--muted)] text-xs font-medium inline-block">
                                            Q3 2026
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            {projects.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-[var(--foreground)]">Recent Projects</h2>
                                        <Link href="/app/projects" className="text-sm font-semibold text-[var(--accent)] hover:underline flex items-center gap-1">
                                            View all <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        {projects.slice(0, 3).map((project, idx) => (
                                            <motion.div
                                                key={project.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                            >
                                                <Link
                                                    href={`/app/projects/${project.id}`}
                                                    className="block group bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:shadow-xl transition-all"
                                                >
                                                    <div className="flex flex-col gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/5 flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
                                                            <FolderKanban className="w-5 h-5 text-[var(--primary)]" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">{project.name}</h4>
                                                            <p className="text-xs text-[var(--muted)] mt-1">
                                                                Modified {new Date(project.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Profile Section */}
                            <section className="space-y-4">
                                <h2 className="text-2xl font-bold text-[var(--foreground)]">Your Profile</h2>
                                <div className="bg-[var(--card)] rounded-3xl p-8 border border-[var(--border)]">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-[var(--foreground)]">{user?.name}</h3>
                                            <p className="text-sm text-[var(--muted)]">{user?.email}</p>
                                        </div>
                                        <Link
                                            href="/app/settings"
                                            className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 transition-all flex items-center gap-2"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Edit Profile
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--border)]">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-[var(--foreground)]">{projects.length}</p>
                                            <p className="text-xs text-[var(--muted)] mt-1">Projects</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-[var(--foreground)]">
                                                {projects.length > 0 ? Math.min(projects.length * 4, 32) : 0}
                                            </p>
                                            <p className="text-xs text-[var(--muted)] mt-1">KPIs Tracked</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-emerald-500">Active</p>
                                            <p className="text-xs text-[var(--muted)] mt-1">Account Status</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Empty State */}
                            {projects.length === 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-br from-[var(--card)] to-[var(--background)] rounded-3xl p-12 border-2 border-dashed border-[var(--border)] text-center space-y-6 shadow-sm"
                                >
                                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 flex items-center justify-center animate-pulse-glow">
                                        <Plus className="w-10 h-10 text-[var(--accent)]" />
                                    </div>
                                    <div className="max-w-md mx-auto space-y-2">
                                        <h3 className="text-2xl font-bold text-[var(--foreground)]">
                                            Ready to transform your data?
                                        </h3>
                                        <p className="text-[var(--muted)]">
                                            Upload your business data and let VistaraBI automatically detect domains, infer KPIs, and generate strategic insights.
                                        </p>
                                    </div>
                                    <Link
                                        href="/app/projects"
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent)]/20 transition-all transform hover:-translate-y-0.5 active:scale-95"
                                    >
                                        Create Your First Project
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-[var(--border)] py-8 px-6 text-center text-sm text-[var(--muted)]">
                <p>© 2026 VistaraBI Intelligence. All rights reserved.</p>
            </footer>
        </div>
    );
}
