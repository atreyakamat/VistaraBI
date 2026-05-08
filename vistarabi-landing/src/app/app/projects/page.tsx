"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FolderKanban, 
    Plus, 
    ChevronRight, 
    Trash2, 
    X, 
    Search,
    LayoutGrid,
    LayoutList,
    Clock,
    MoreVertical,
    Upload,
    BarChart3,
    Sparkles,
    CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Project {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
}

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get<{ projects: Project[] }>("/api/projects");
            if (res.error) {
                if (res.status === 401) router.push("/login");
                return;
            }
            if (res.data) setProjects(res.data.projects);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setCreating(true);
        try {
            const res = await api.post<{ project: Project }>("/api/projects", { 
                name: newName, 
                description: newDesc 
            });

            if (res.data) {
                setProjects([res.data.project, ...projects]);
                setShowCreate(false);
                setNewName("");
                setNewDesc("");
            }
        } catch (error) {
            console.error("Error creating project:", error);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteTarget(id);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await api.delete(`/api/projects/${deleteTarget}`);
            if (res.status === 200 || res.status === 204) {
                setProjects(projects.filter(p => p.id !== deleteTarget));
                toast.success('Project deleted successfully.');
            } else {
                toast.error('Failed to delete project.');
            }
        } catch {
            toast.error('An error occurred. Please try again.');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/app" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/10 group-hover:scale-105 transition-transform">
                                <FolderKanban className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold tracking-tight text-[var(--foreground)] leading-none">VistaraBI</span>
                                <span className="text-[10px] font-bold text-[var(--muted)] tracking-widest uppercase mt-1">Intelligence</span>
                            </div>
                        </Link>
                        <span className="text-[var(--border)] font-light text-2xl">/</span>
                        <span className="font-semibold text-[var(--foreground)]">Projects</span>
                    </div>
                    
                    <button
                        onClick={() => setShowCreate(true)}
                        className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white font-bold rounded-xl hover:bg-[var(--accent)] transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        New Project
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold text-[var(--foreground)] tracking-tight">Your Projects</h1>
                        <p className="text-lg text-[var(--muted)]">Manage your data environments and strategic insights</p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="md:hidden p-2.5 bg-[var(--primary)] text-white rounded-xl shadow-lg"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] space-y-4">
                                    <Skeleton className="w-12 h-12 rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                    <Skeleton className="h-4 w-1/3" />
                                </div>
                            ))
                        ) : filteredProjects.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-full py-20 text-center space-y-6"
                            >
                                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[var(--accent)]/10 to-[var(--primary)]/10 flex items-center justify-center">
                                    <FolderKanban className="w-10 h-10 text-[var(--accent)] opacity-60" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-[var(--foreground)]">
                                        {searchQuery ? `No results for "${searchQuery}"` : "Welcome to VistaraBI"}
                                    </h3>
                                    <p className="text-[var(--muted)] max-w-sm mx-auto">
                                        {searchQuery ? "Try a different search term" : "Create your first project and let AI turn your data into insights in minutes."}
                                    </p>
                                </div>
                                {!searchQuery && (
                                    <div className="max-w-md mx-auto space-y-4">
                                        {/* Onboarding checklist */}
                                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-left space-y-4">
                                            <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Your first 3 steps</p>
                                            {[
                                                { icon: Plus, label: 'Create a Project', desc: 'Name your analytics workspace', done: false },
                                                { icon: Upload, label: 'Upload Your Data', desc: 'Drop in a CSV, Excel, or JSON file', done: false },
                                                { icon: BarChart3, label: 'Explore AI Dashboard', desc: 'KPIs & insights generate automatically', done: false },
                                            ].map(({ icon: Icon, label, desc }) => (
                                                <div key={label} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                                                        <Icon className="w-4 h-4 text-[var(--accent)]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[var(--foreground)]">{label}</p>
                                                        <p className="text-xs text-[var(--muted)]">{desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setShowCreate(true)}
                                            className="w-full px-8 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Get Started — Create Project
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            filteredProjects.map((project, index) => (
                                <motion.div
                                    key={project.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                >
                                    <Link
                                        href={`/app/projects/${project.id}`}
                                        className="block group h-full relative bg-[var(--card)] rounded-3xl p-8 border border-[var(--border)] hover:border-[var(--accent)]/50 hover:shadow-2xl hover:shadow-[var(--accent)]/5 transition-all overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--primary)] to-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--accent)] transition-all duration-300">
                                                <FolderKanban className="w-7 h-7 text-[var(--accent)] group-hover:text-white" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Health pill */}
                                                {(() => {
                                                    const age = Date.now() - new Date(project.createdAt).getTime();
                                                    const days = age / (1000 * 60 * 60 * 24);
                                                    if (days < 7) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">🟢 Active</span>;
                                                    if (days < 30) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">🟡 Stale</span>;
                                                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">🔴 Needs Attention</span>;
                                                })()}
                                                <button
                                                    onClick={(e) => handleDelete(project.id, e)}
                                                    className="p-2 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <div className="p-2 rounded-lg text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--accent)] transition-colors">{project.name}</h3>
                                                <p className="text-sm text-[var(--muted)] line-clamp-2 mt-2 h-10">
                                                    {project.description || "No description provided."}
                                                </p>
                                            </div>
                                            
                                            <div className="pt-4 border-t border-[var(--border)] flex items-center gap-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                                                <Clock className="w-3 h-3" />
                                                <span>Created {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreate(false)}
                            className="absolute inset-0 bg-[var(--foreground)]/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-[var(--card)] rounded-3xl shadow-2xl p-8 border border-[var(--border)]"
                        >
                            <button
                                onClick={() => setShowCreate(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--background)] text-[var(--muted)] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">New Project</h2>
                                <p className="text-[var(--muted)] mt-1">Initialize a new data analysis environment</p>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
                                        Project Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g., E-Commerce Q1 Audit"
                                        className="w-full px-5 py-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all font-medium"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
                                        Description
                                    </label>
                                    <textarea
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="Briefly describe the goals of this project..."
                                        rows={4}
                                        className="w-full px-5 py-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all resize-none"
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1 py-4 border-2 border-[var(--border)] text-[var(--foreground)] font-bold rounded-2xl hover:bg-[var(--background)] transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating || !newName.trim()}
                                        className="flex-1 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] disabled:opacity-50 transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-95"
                                    >
                                        {creating ? "Creating..." : "Create Project"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !deleting && setDeleteTarget(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-[var(--card)] rounded-3xl shadow-2xl p-8 border border-[var(--border)]"
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--foreground)]">Delete Project?</h3>
                                    <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
                                        This will permanently delete the project and all associated data, KPIs, and dashboards. This cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                    className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
