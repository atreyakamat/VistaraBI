"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    LayoutDashboard, 
    ChevronRight, 
    ArrowLeft, 
    Upload, 
    Trash2, 
    Settings, 
    Database, 
    GitBranch, 
    Target,
    Zap,
    AlertCircle,
    Info,
    RefreshCw,
    BarChart3
} from "lucide-react";
import UploadZone from "@/components/app/UploadZone";
import SourceCard from "@/components/app/SourceCard";
import DataPreview from "@/components/app/DataPreview";
import RelationshipGraph from "@/components/app/RelationshipGraph";
import CleaningSummary from "@/components/app/CleaningSummary";
import QualityDashboard from "@/components/app/QualityDashboard";
import DomainBadge from "@/components/app/DomainBadge";
import DomainSelectionPopup from "@/components/app/DomainSelectionPopup";
import { api } from "@/lib/api/client";
import { ProjectSkeleton } from "@/components/ui/skeleton";
import { SourceStatus, QualityScore, QualityGrade, RiskLevel, DataType, DomainType, DomainStatus } from "@/lib/prisma";

interface Project {
    id: string;
    name: string;
    description?: string;
}

interface Source {
    id: string;
    fileName: string;
    fileType: string;
    status: SourceStatus;
    rowCount: number;
    colCount: number;
    columns: string[];
    qualityScore?: QualityScore;
    qualityGrade?: QualityGrade;
    riskLevel?: RiskLevel;
    cleaned?: boolean;
    error?: string;
    uploadedAt: string;
}

interface SourceWithPreview extends Source {
    previewData: Record<string, unknown>[];
}

interface ColumnInfo {
    originalName: string;
    normalizedName: string;
    dataType: DataType;
    nullPercent: number;
    uniquePercent: number;
    sampleValues: unknown[];
}

interface RelationshipData {
    id: string;
    sourceA: { id: string; name: string; column: string };
    sourceB: { id: string; name: string; column: string };
    confidence: number;
    matchType: string;
}

export default function ProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [sources, setSources] = useState<Source[]>([]);
    const [relationships, setRelationships] = useState<RelationshipData[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [previewSource, setPreviewSource] = useState<SourceWithPreview | null>(null);
    const [previewColumnMeta, setPreviewColumnMeta] = useState<ColumnInfo[] | undefined>();
    const [activeTab, setActiveTab] = useState<"sources" | "relationships">("sources");
    const [error, setError] = useState<string | null>(null);
    const [cleaningSummary, setCleaningSummary] = useState<any>(null);
    const [qualityDashboard, setQualityDashboard] = useState<any>(null);
    const [domainData, setDomainData] = useState<any>(null);
    const [showDomainPopup, setShowDomainPopup] = useState(false);

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            const res = await api.get<{ project: Project, sources: Source[] }>(`/api/projects/${id}`);

            if (res.error) {
                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                setError(res.error);
                return;
            }

            if (res.data) {
                setProject(res.data.project);

                // Fetch cleaned status and quality grades for each source in parallel
                const sourcesWithExtendedInfo = await Promise.all(
                    res.data.sources.map(async (source) => {
                        if (source.status === 'READY') {
                            try {
                                const [cleanedRes, qualityRes] = await Promise.all([
                                    api.get(`/api/sources/${source.id}/cleaned`),
                                    api.get<{ quality: { overallGrade: QualityGrade, riskLevel: RiskLevel } }>(`/api/sources/${source.id}/quality`),
                                ]);

                                return {
                                    ...source,
                                    cleaned: cleanedRes.status === 200,
                                    qualityGrade: qualityRes.data?.quality?.overallGrade,
                                    riskLevel: qualityRes.data?.quality?.riskLevel,
                                };
                            } catch {
                                return { ...source, cleaned: false };
                            }
                        }
                        return { ...source, cleaned: false };
                    })
                );
                setSources(sourcesWithExtendedInfo);
            }

            // Fetch relationships
            const relRes = await api.get<{ relationships: RelationshipData[] }>(`/api/projects/${id}/relationships`);
            if (relRes.data) {
                setRelationships(relRes.data.relationships);
            }

            // Fetch domain detection
            const domainRes = await api.get<{ domain: any }>(`/api/projects/${id}/domain`);
            if (domainRes.data) {
                setDomainData(domainRes.data.domain);
            }
        } catch (err) {
            console.error("Error fetching project:", err);
            setError("Failed to load project details.");
        } finally {
            setLoading(false);
        }
    };

    const handleFilesSelected = async (files: FileList) => {
        setUploading(true);
        try {
            const formData = new FormData();
            Array.from(files).forEach((file) => {
                formData.append("files", file);
            });

            // Standard fetch for FormData as api client is for JSON
            const res = await fetch(`/api/projects/${id}/sources`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                await fetchProject();
            }
        } catch (error) {
            console.error("Error uploading files:", error);
        } finally {
            setUploading(false);
        }
    };

    const handleSourceClick = async (source: Source) => {
        if (source.status !== "READY") return;

        try {
            const [sourceRes, intelRes] = await Promise.all([
                api.get<{ source: SourceWithPreview }>(`/api/sources/${source.id}`),
                api.get<{ columns: ColumnInfo[] }>(`/api/sources/${source.id}/intelligence`),
            ]);

            if (sourceRes.data) {
                setPreviewSource(sourceRes.data.source);
            }

            if (intelRes.data) {
                setPreviewColumnMeta(intelRes.data.columns);
            }
        } catch (error) {
            console.error("Error fetching source:", error);
        }
    };

    const handleViewCleaningSummary = async (sourceId: string) => {
        try {
            const res = await api.get<{ summary: any }>(`/api/sources/${sourceId}/cleaning-summary`);
            if (res.data) {
                setCleaningSummary(res.data.summary);
            }
        } catch (error) {
            console.error("Error fetching cleaning summary:", error);
        }
    };

    const handleReClean = async () => {
        if (!cleaningSummary) return;

        try {
            const res = await api.post(`/api/sources/${cleaningSummary.sourceId}/clean`);
            if (!res.error) {
                setCleaningSummary(null);
                await fetchProject();
            }
        } catch (error) {
            console.error("Error re-cleaning source:", error);
        }
    };

    const handleViewQualityDashboard = async (sourceId: string) => {
        try {
            const [qualityRes, columnHealthRes, outliersRes, auditLogRes] = await Promise.all([
                api.get<{ quality: any }>(`/api/sources/${sourceId}/quality`),
                api.get<{ columnHealths: any[] }>(`/api/sources/${sourceId}/column-health`),
                api.get<{ outliers: any[] }>(`/api/sources/${sourceId}/outliers`),
                api.get<{ auditLog: any[] }>(`/api/sources/${sourceId}/audit-log`),
            ]);

            if (qualityRes.data) {
                setQualityDashboard({
                    quality: qualityRes.data.quality,
                    columnHealths: columnHealthRes.data?.columnHealths || [],
                    outliers: outliersRes.data?.outliers || [],
                    auditLog: auditLogRes.data?.auditLog || [],
                });
            }
        } catch (error) {
            console.error("Error fetching quality dashboard:", error);
        }
    };

    const handleSelectDomain = async (domain: string) => {
        try {
            const res = await api.post(`/api/projects/${id}/governance`, {
                action: 'set',
                domain,
                reason: `User selected ${domain} domain`,
            });
            if (!res.error) {
                await fetchProject();
                setShowDomainPopup(false);
            }
        } catch (error) {
            console.error("Error selecting domain:", error);
        }
    };

    const handleDeleteSource = async (sourceId: string) => {
        if (!confirm("Delete this data source?")) return;
        try {
            const res = await api.delete(`/api/sources/${sourceId}`);
            if (!res.error) {
                await fetchProject();
            }
        } catch (error) {
            console.error("Error deleting source:", error);
        }
    };

    const handleDeleteProject = async () => {
        if (!confirm("Delete this project? All data will be permanently removed.")) return;

        setDeleting(true);
        try {
            const res = await api.delete(`/api/projects/${id}`);
            if (!res.error) {
                router.push("/app/projects");
            }
        } catch (error) {
            console.error("Error deleting project:", error);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
            {/* Project Navigation Header */}
            <header className="sticky top-0 z-[60] border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/app/projects"
                            className="p-2 -ml-2 rounded-xl hover:bg-[var(--border)]/40 transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="h-6 w-px bg-[var(--border)]" />
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold text-[var(--foreground)] leading-none line-clamp-1">
                                {project?.name || "Loading..."}
                            </h1>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                                    Project Workspace
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3">
                            {sources.length > 0 && (
                                <DomainBadge
                                    domain={domainData?.detectedDomain || null}
                                    confidence={domainData?.confidence || 0}
                                    status={domainData?.status || 'MANUAL_REQUIRED'}
                                    onClick={() => setShowDomainPopup(true)}
                                    compact
                                />
                            )}
                            <button
                                onClick={() => setShowDomainPopup(true)}
                                className="px-3 py-1.5 text-xs font-bold bg-white border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
                                {domainData?.detectedDomain ? 'Switch Domain' : 'Define Domain'}
                            </button>
                        </div>
                        
                        <div className="h-6 w-px bg-[var(--border)] mx-1" />
                        
                        <button
                            onClick={handleDeleteProject}
                            disabled={deleting}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Delete Project"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <ProjectSkeleton />
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-20 space-y-6"
                        >
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 flex items-center justify-center">
                                <AlertCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-[var(--foreground)]">Workspace Error</h2>
                                <p className="text-[var(--muted)]">{error}</p>
                            </div>
                            <button
                                onClick={() => router.push('/app/projects')}
                                className="px-8 py-3 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] transition-all"
                            >
                                Back to Projects
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-12"
                        >
                            {/* Project Header Stats */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
                                        Data Architecture
                                    </h2>
                                    <p className="text-[var(--muted)] max-w-2xl">
                                        {project?.description || "Upload and organize your data sources to begin generating semantic insights."}
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm">
                                        <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Sources</div>
                                        <div className="text-xl font-bold text-[var(--foreground)]">{sources.length}</div>
                                    </div>
                                    <div className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm">
                                        <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Relationships</div>
                                        <div className="text-xl font-bold text-[var(--foreground)]">{relationships.length}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Module 4 Gateway */}
                            {domainData?.detectedDomain && sources.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="relative overflow-hidden bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-3xl p-8 text-white shadow-xl shadow-[var(--accent)]/20"
                                >
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="space-y-3">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                                                <Zap className="w-3.5 h-3.5" />
                                                Next Milestone
                                            </div>
                                            <h3 className="text-2xl font-bold tracking-tight">Generate Strategy Engine</h3>
                                            <p className="text-white/80 max-w-lg">
                                                Your {domainData.detectedDomain} domain is active. Continue to the KPI Engine to define your measurement blueprint and strategic goals.
                                            </p>
                                        </div>
                                        <Link
                                            href={`/app/projects/${id}/kpis`}
                                            className="whitespace-nowrap px-8 py-4 bg-white text-[var(--primary)] font-bold rounded-2xl hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-xl"
                                        >
                                            Configure KPIs →
                                        </Link>
                                    </div>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                                </motion.div>
                            )}

                            {/* Workspace Tabs */}
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--border)] pb-1">
                                    <div className="flex gap-8">
                                        <button
                                            onClick={() => setActiveTab("sources")}
                                            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
                                                activeTab === "sources"
                                                    ? "text-[var(--accent)]"
                                                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                                            }`}
                                        >
                                            Data Sources
                                            {activeTab === "sources" && (
                                                <motion.div 
                                                    layoutId="tab" 
                                                    className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent)] rounded-full" 
                                                />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("relationships")}
                                            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
                                                activeTab === "relationships"
                                                    ? "text-[var(--accent)]"
                                                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                                            }`}
                                        >
                                            Relationships
                                            {activeTab === "relationships" && (
                                                <motion.div 
                                                    layoutId="tab" 
                                                    className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent)] rounded-full" 
                                                />
                                            )}
                                        </button>
                                    </div>

                                    {activeTab === "sources" && (
                                        <div className="pb-3">
                                            <UploadZone onFilesSelected={handleFilesSelected} uploading={uploading} />
                                        </div>
                                    )}
                                </div>

                                <div className="min-h-[400px]">
                                    {activeTab === "sources" ? (
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <AnimatePresence>
                                                {sources.length === 0 ? (
                                                    <motion.div 
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="col-span-full py-20 text-center space-y-6 bg-[var(--card)] rounded-3xl border-2 border-dashed border-[var(--border)]"
                                                    >
                                                        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--background)] flex items-center justify-center">
                                                            <Database className="w-8 h-8 text-[var(--muted)]" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-lg font-bold text-[var(--foreground)]">No Data Sources</p>
                                                            <p className="text-[var(--muted)]">Upload CSV, JSON, or Excel files to begin analysis.</p>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    sources.map((source, idx) => (
                                                        <motion.div
                                                            key={source.id}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                        >
                                                            <SourceCard 
                                                                source={source} 
                                                                onClick={() => handleSourceClick(source)} 
                                                                onDelete={handleDeleteSource} 
                                                            />
                                                        </motion.div>
                                                    ))
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-8 shadow-sm h-[600px] overflow-hidden">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="space-y-1">
                                                    <h4 className="text-xl font-bold text-[var(--foreground)]">Relationship Graph</h4>
                                                    <p className="text-sm text-[var(--muted)]">Automated schema discovery and cross-source mapping.</p>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--background)] rounded-lg text-xs font-medium text-[var(--muted)] border border-[var(--border)]">
                                                    <Info className="w-4 h-4" />
                                                    Detected {relationships.length} mapping{relationships.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            <RelationshipGraph relationships={relationships} onClose={() => {}} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Overlays & Modals */}
                <AnimatePresence>
                    {previewSource && (
                        <DataPreview
                            source={previewSource}
                            columnMeta={previewColumnMeta}
                            onClose={() => {
                                setPreviewSource(null);
                                setPreviewColumnMeta(undefined);
                            }}
                            onViewCleaningSummary={() => handleViewCleaningSummary(previewSource.id)}
                            onViewQualityDashboard={() => handleViewQualityDashboard(previewSource.id)}
                        />
                    )}

                    {cleaningSummary && (
                        <CleaningSummary
                            summary={cleaningSummary}
                            onClose={() => setCleaningSummary(null)}
                            onReClean={handleReClean}
                        />
                    )}

                    {qualityDashboard && (
                        <QualityDashboard
                            quality={qualityDashboard.quality}
                            columnHealths={qualityDashboard.columnHealths}
                            outliers={qualityDashboard.outliers}
                            auditLog={qualityDashboard.auditLog}
                            onClose={() => setQualityDashboard(null)}
                        />
                    )}

                    {showDomainPopup && (
                        <DomainSelectionPopup
                            projectId={id}
                            currentDomain={domainData?.detectedDomain || null}
                            currentConfidence={domainData?.confidence || 0}
                            onSelectDomain={handleSelectDomain}
                            onClose={() => setShowDomainPopup(false)}
                        />
                    )}
                </AnimatePresence>
            </main>

            {/* Sticky Action Footer - only shown when sources are uploading or processing */}
            {uploading && (
                <div className="fixed bottom-8 right-8 z-[100]">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--foreground)] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4"
                    >
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="font-bold">Processing datasets...</span>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
