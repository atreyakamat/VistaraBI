"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import UploadZone from "@/components/app/UploadZone";
import SourceCard from "@/components/app/SourceCard";
import DataPreview from "@/components/app/DataPreview";
import RelationshipGraph from "@/components/app/RelationshipGraph";
import CleaningSummary from "@/components/app/CleaningSummary";
import QualityDashboard from "@/components/app/QualityDashboard";
import DomainBadge from "@/components/app/DomainBadge";
import DomainExplanation from "@/components/app/DomainExplanation";
import DomainSelection from "@/components/app/DomainSelection";
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
    const [showRelationships, setShowRelationships] = useState(false);
    const [activeTab, setActiveTab] = useState<"sources" | "relationships">("sources");
    const [error, setError] = useState<string | null>(null);
    const [cleaningSummary, setCleaningSummary] = useState<any>(null);
    const [qualityDashboard, setQualityDashboard] = useState<any>(null);
    const [domainData, setDomainData] = useState<any>(null);
    const [showDomainExplanation, setShowDomainExplanation] = useState(false);
    const [showDomainSelection, setShowDomainSelection] = useState(false);

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            console.log('Fetching project:', id);
            const res = await fetch(`/api/projects/${id}`);
            console.log('Response status:', res.status);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('Project fetch error:', res.status, errorData);

                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                setError(`Error ${res.status}: ${errorData.error || 'Failed to fetch project'} `);
                setLoading(false);
                return;
            }
            const data = await res.json();
            console.log('Project loaded:', data.project?.name);
            setProject(data.project);

            // Fetch cleaned status and quality grades for each source
            const sourcesWithExtendedInfo = await Promise.all(
                (data.sources || []).map(async (source: Source) => {
                    if (source.status === 'READY') {
                        try {
                            const [cleanedRes, qualityRes] = await Promise.all([
                                fetch(`/api/sources/${source.id}/cleaned`),
                                fetch(`/api/sources/${source.id}/quality`),
                            ]);

                            const qualityData = qualityRes.ok ? await qualityRes.json() : null;

                            return {
                                ...source,
                                cleaned: cleanedRes.ok,
                                qualityGrade: qualityData?.quality?.overallGrade,
                                riskLevel: qualityData?.quality?.riskLevel,
                            };
                        } catch {
                            return { ...source, cleaned: false };
                        }
                    }
                    return { ...source, cleaned: false };
                })
            );
            setSources(sourcesWithExtendedInfo);

            // Fetch relationships
            const relRes = await fetch(`/api/projects/${id}/relationships`);
            if (relRes.ok) {
                const relData = await relRes.json();
                setRelationships(relData.relationships || []);
            }

            // Fetch domain detection (Module 3 Phase 3A)
            const domainRes = await fetch(`/api/projects/${id}/domain`);
            if (domainRes.ok) {
                const domainResult = await domainRes.json();
                setDomainData(domainResult.domain);
            }
        } catch (err) {
            console.error("Error fetching project:", err);
            setError(err instanceof Error ? err.message : 'Unknown error');
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

            const res = await fetch(`/api/projects/${id}/sources`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                // Refresh project data
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
            // Fetch source with preview data
            const sourceRes = await fetch(`/api/sources/${source.id}`);
            // Fetch column intelligence
            const intelRes = await fetch(`/api/sources/${source.id}/intelligence`);

            if (sourceRes.ok) {
                const data = await sourceRes.json();
                setPreviewSource(data.source);
            }

            if (intelRes.ok) {
                const intelData = await intelRes.json();
                setPreviewColumnMeta(intelData.columns);
            }
        } catch (error) {
            console.error("Error fetching source:", error);
        }
    };

    const handleViewCleaningSummary = async (sourceId: string) => {
        try {
            const res = await fetch(`/api/sources/${sourceId}/cleaning-summary`);
            if (res.ok) {
                const data = await res.json();
                setCleaningSummary(data.summary);
            }
        } catch (error) {
            console.error("Error fetching cleaning summary:", error);
        }
    };

    const handleReClean = async () => {
        if (!cleaningSummary) return;

        try {
            const res = await fetch(`/api/sources/${cleaningSummary.sourceId}/clean`, {
                method: 'POST',
            });

            if (res.ok) {
                setCleaningSummary(null);
                // Refresh project data
                await fetchProject();
            }
        } catch (error) {
            console.error("Error re-cleaning source:", error);
        }
    };

    const handleViewQualityDashboard = async (sourceId: string) => {
        try {
            // Fetch quality intelligence, column health, outliers, and audit log in parallel
            const [qualityRes, columnHealthRes, outliersRes, auditLogRes] = await Promise.all([
                fetch(`/api/sources/${sourceId}/quality`),
                fetch(`/api/sources/${sourceId}/column-health`),
                fetch(`/api/sources/${sourceId}/outliers`),
                fetch(`/api/sources/${sourceId}/audit-log`),
            ]);

            const qualityData = qualityRes.ok ? await qualityRes.json() : null;
            const columnHealthData = columnHealthRes.ok ? await columnHealthRes.json() : null;
            const outliersData = outliersRes.ok ? await outliersRes.json() : null;
            const auditLogData = auditLogRes.ok ? await auditLogRes.json() : null;

            if (qualityData) {
                setQualityDashboard({
                    quality: qualityData.quality,
                    columnHealths: columnHealthData?.columnHealths || [],
                    outliers: outliersData?.outliers || [],
                    auditLog: auditLogData?.auditLog || [],
                });
            }
        } catch (error) {
            console.error("Error fetching quality dashboard:", error);
        }
    };

    const handleSelectDomain = async (domain: string) => {
        try {
            const res = await fetch(`/api/projects/${id}/domain`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain }),
            });
            if (res.ok) {
                const result = await res.json();
                setDomainData(result.domain);
                setShowDomainExplanation(false);
            }
        } catch (error) {
            console.error("Error selecting domain:", error);
        }
    };

    const handleConfirmDomainSelection = async (domain: string, selectedKPIs: string[]) => {
        try {
            // Use governance API to set domain properly
            const res = await fetch(`/api/projects/${id}/governance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set',
                    domain,
                    reason: `User selected ${domain} domain with ${selectedKPIs.length} KPIs`,
                }),
            });
            if (res.ok) {
                // Refresh project data to get updated domain
                await fetchProject();
                setShowDomainSelection(false);
                console.log('Domain and KPIs set:', domain, selectedKPIs);
                // TODO: Store selected KPIs for Module 4
            }
        } catch (error) {
            console.error("Error confirming domain selection:", error);
        }
    };

    const handleDeleteSource = async (sourceId: string) => {
        try {
            const res = await fetch(`/api/sources/${sourceId}`, { method: 'DELETE' });
            if (res.ok) {
                // Refresh project data
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
            const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/app/projects");
            }
        } catch (error) {
            console.error("Error deleting project:", error);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="animate-spin w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Failed to Load Project</h2>
                    <p className="text-[var(--muted)] mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/app/projects')}
                        className="px-5 py-2.5 bg-[var(--primary)] text-white font-semibold rounded-xl hover:bg-[var(--accent)] transition-colors"
                    >
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="border-b border-[var(--border)] bg-[var(--card)]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/app" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <span className="text-xl font-semibold text-[var(--foreground)]">VistaraBI</span>
                        </Link>
                        <span className="text-[var(--muted)]">/</span>
                        <Link href="/app/projects" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                            Projects
                        </Link>
                        <span className="text-[var(--muted)]">/</span>
                        <span className="font-medium text-[var(--foreground)]">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Domain Badge (Module 3 Phase 3A) */}
                        {sources.length > 0 && (
                            <>
                                <DomainBadge
                                    domain={domainData?.detectedDomain || null}
                                    confidence={domainData?.confidence || 0}
                                    status={domainData?.status || 'MANUAL_REQUIRED'}
                                    onClick={() => setShowDomainExplanation(true)}
                                    compact
                                />
                                <button
                                    onClick={() => setShowDomainSelection(true)}
                                    className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
                                >
                                    {domainData?.detectedDomain ? 'Change Domain' : 'Select Domain'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleDeleteProject}
                            disabled={deleting}
                            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {deleting ? "Deleting..." : "Delete Project"}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Project Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">{project.name}</h1>
                        {project.description && <p className="text-[var(--muted)]">{project.description}</p>}
                    </div>

                    {/* Upload Zone */}
                    <div className="mb-8">
                        <UploadZone onFilesSelected={handleFilesSelected} uploading={uploading} />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 p-1 bg-[var(--background)] rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab("sources")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "sources"
                                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                                : "text-[var(--muted)] hover:text-[var(--foreground)]"
                                }`}
                        >
                            Data Sources
                            {sources.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-[var(--accent)]/10 text-[var(--accent)] rounded">
                                    {sources.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("relationships")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "relationships"
                                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                                : "text-[var(--muted)] hover:text-[var(--foreground)]"
                                }`}
                        >
                            Relationships
                            {relationships.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-[var(--accent)]/10 text-[var(--accent)] rounded">
                                    {relationships.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Sources Tab */}
                    {activeTab === "sources" && (
                        <>
                            {sources.length === 0 ? (
                                <div className="text-center py-12 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--muted)]/10 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-[var(--muted)]">No data sources yet</p>
                                    <p className="text-sm text-[var(--muted)]">Upload files above to get started</p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sources.map((source) => (
                                        <SourceCard key={source.id} source={source} onClick={() => handleSourceClick(source)} onDelete={handleDeleteSource} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Relationships Tab */}
                    {activeTab === "relationships" && (
                        <RelationshipGraph relationships={relationships} onClose={() => setShowRelationships(false)} />
                    )}
                </motion.div>

                {/* Preview Modal */}
                {previewSource && (
                    <DataPreview
                        source={previewSource}
                        columnMeta={previewColumnMeta}
                        onClose={() => {
                            setPreviewSource(null);
                            setPreviewColumnMeta(undefined);
                        }}
                        onViewCleaningSummary={() => handleViewCleaningSummary(previewSource.id)}
                    />
                )}

                {/* Cleaning Summary Modal */}
                {cleaningSummary && (
                    <CleaningSummary
                        summary={cleaningSummary}
                        onClose={() => setCleaningSummary(null)}
                        onReClean={handleReClean}
                    />
                )}

                {/* Quality Dashboard Modal */}
                {qualityDashboard && (
                    <QualityDashboard
                        quality={qualityDashboard.quality}
                        columnHealths={qualityDashboard.columnHealths}
                        outliers={qualityDashboard.outliers}
                        auditLog={qualityDashboard.auditLog}
                        onClose={() => setQualityDashboard(null)}
                    />
                )}

                {/* Domain Explanation Modal (Module 3 Phase 3A) */}
                {showDomainExplanation && domainData && (
                    <DomainExplanation
                        domain={domainData.detectedDomain}
                        confidence={domainData.confidence}
                        status={domainData.status}
                        scoringBreakdown={domainData.scoringBreakdown || {}}
                        matchedColumns={domainData.matchedColumns || []}
                        explanation={domainData.explanation || ''}
                        onClose={() => setShowDomainExplanation(false)}
                        onSelectDomain={handleSelectDomain}
                    />
                )}

                {/* Domain Selection Modal (Module 3 Phase 3B) */}
                {showDomainSelection && (
                    <DomainSelection
                        currentDomain={domainData?.detectedDomain || null}
                        onClose={() => setShowDomainSelection(false)}
                        onConfirm={handleConfirmDomainSelection}
                    />
                )}
            </main>
        </div>
    );
}
