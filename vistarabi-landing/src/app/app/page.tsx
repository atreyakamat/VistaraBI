"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface User {
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
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userRes, projectsRes] = await Promise.all([
                    fetch("/api/auth/me"),
                    fetch("/api/projects"),
                ]);

                if (!userRes.ok) {
                    router.push("/login");
                    return;
                }

                const userData = await userRes.json();
                setUser(userData.user);

                if (projectsRes.ok) {
                    const projectsData = await projectsRes.json();
                    setProjects(projectsData.projects);
                }
            } catch {
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="animate-spin w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="border-b border-[var(--border)] bg-[var(--card)]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <span className="text-xl font-semibold text-[var(--foreground)]">VistaraBI</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-[var(--muted)]">{user?.email}</span>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
                        Welcome back, {user?.name}!
                    </h1>
                    <p className="text-[var(--muted)] mb-8">
                        Your BI workspace is ready. Start uploading data to generate insights.
                    </p>

                    {/* Quick Actions */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <Link
                            href="/app/projects"
                            className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center group-hover:bg-[var(--accent)] transition-colors">
                                    <svg className="w-7 h-7 text-[var(--accent)] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--foreground)] mb-1">Projects</h3>
                                    <p className="text-sm text-[var(--muted)]">
                                        {projects.length === 0
                                            ? "Create your first project"
                                            : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
                                    </p>
                                </div>
                                <svg className="w-5 h-5 text-[var(--muted)] ml-auto group-hover:text-[var(--accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>

                        <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] opacity-60">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-[var(--muted)]/10 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--foreground)] mb-1">Dashboards</h3>
                                    <p className="text-sm text-[var(--muted)]">Coming soon</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Projects */}
                    {projects.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Projects</h2>
                                <Link href="/app/projects" className="text-sm text-[var(--accent)] hover:underline">
                                    View all
                                </Link>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                {projects.slice(0, 3).map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/app/projects/${project.id}`}
                                        className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all"
                                    >
                                        <h4 className="font-medium text-[var(--foreground)] mb-1">{project.name}</h4>
                                        <p className="text-xs text-[var(--muted)]">
                                            Created {new Date(project.createdAt).toLocaleDateString()}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {projects.length === 0 && (
                        <div className="bg-[var(--card)] rounded-2xl p-8 border border-dashed border-[var(--border)] text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                                Create your first project
                            </h3>
                            <p className="text-[var(--muted)] mb-4">
                                Upload your business data and let VistaraBI transform it into insights
                            </p>
                            <Link
                                href="/app/projects"
                                className="inline-block px-6 py-3 bg-[var(--primary)] text-white font-semibold rounded-xl hover:bg-[var(--accent)] transition-colors"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
