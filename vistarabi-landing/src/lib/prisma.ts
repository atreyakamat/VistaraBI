// In-memory database for pilot/demo
// Uses globalThis to persist across HMR in development

// ============ TYPES ============

interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

interface Project {
    id: string;
    userId: string;
    name: string;
    description?: string;
    createdAt: Date;
}

export type SourceStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type DataType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
export type QualityScore = 'GOOD' | 'PARTIAL' | 'POOR';

interface Source {
    id: string;
    projectId: string;
    fileName: string;
    fileType: string;
    status: SourceStatus;
    rowCount: number;
    colCount: number;
    columns: string[];
    data: Record<string, unknown>[];
    qualityScore?: QualityScore;
    error?: string;
    uploadedAt: Date;
}

// Column intelligence
export interface ColumnMeta {
    id: string;
    sourceId: string;
    originalName: string;
    normalizedName: string;
    dataType: DataType;
    nullPercent: number;
    uniquePercent: number;
    sampleValues: unknown[];
}

// Relationship between datasets
export type MatchType = 'NAME_MATCH' | 'VALUE_OVERLAP';

export interface Relationship {
    id: string;
    projectId: string;
    sourceAId: string;
    sourceBId: string;
    sourceAName: string;
    sourceBName: string;
    columnA: string;
    columnB: string;
    confidence: number;
    matchType: MatchType;
}

// Cleaned dataset (warehouse layer)
export type CleaningStatus = 'CLEANING' | 'CLEANED' | 'FAILED';

export interface CleanedDataset {
    id: string;
    sourceId: string;
    cleanedData: Record<string, unknown>[];
    cleanedRowCount: number;
    cleanedColCount: number;
    cleanedColumns: string[];
    status: CleaningStatus;
    error?: string;
    cleanedAt: Date;
}

// Cleaning log (purification metadata)
export interface CleaningLog {
    id: string;
    sourceId: string;
    nullsFilled: number;
    duplicatesRemoved: number;
    datesNormalized: number;
    currenciesNormalized: number;
    textsStandardized: number;
    emptyColumnsRemoved: number;
    originalRowCount: number;
    cleanedRowCount: number;
    createdAt: Date;
}

// Quality intelligence (Phase 2B)
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type HealthStatus = 'GOOD' | 'PARTIAL' | 'POOR';

export interface QualityIntelligence {
    id: string;
    sourceId: string;
    overallGrade: QualityGrade;
    completenessScore: number;  // 0-100
    consistencyScore: number;   // 0-100
    accuracyScore: number;      // 0-100 (100 - outlier %)
    riskLevel: RiskLevel;
    totalRecords: number;
    healthyRecords: number;
    riskyRecords: number;
    calculatedAt: Date;
}

export interface ColumnHealth {
    id: string;
    sourceId: string;
    columnName: string;
    healthStatus: HealthStatus;
    completeness: number;       // % non-null
    consistency: number;         // % matching expected pattern
    outlierCount: number;
    uniqueness: number;          // % unique values
    issues: string[];            // List of detected issues
}

export interface OutlierRecord {
    id: string;
    sourceId: string;
    columnName: string;
    rowIndex: number;
    value: unknown;
    detectionMethod: 'IQR' | 'Z_SCORE';
    severity: 'MILD' | 'MODERATE' | 'EXTREME';
    expectedRange?: string;
}

export interface TransformationAudit {
    id: string;
    sourceId: string;
    transformationType: string;  // 'NULL_FILL', 'DUPLICATE_REMOVE', etc.
    affectedColumn?: string;
    affectedRowCount: number;
    beforeValue?: string;
    afterValue?: string;
    timestamp: Date;
}

// Domain Detection (Module 3 Phase 3A)
export type DomainType =
    | 'ECOMMERCE' | 'SAAS' | 'EDTECH' | 'RETAIL'
    | 'SERVICES' | 'MANUFACTURING' | 'HEALTHCARE' | 'FINANCE';

export type DomainStatus = 'AUTO_ASSIGNED' | 'MANUAL_REQUIRED' | 'MANUALLY_SELECTED';

export interface DomainDetection {
    id: string;
    projectId: string;
    detectedDomain: DomainType | null;
    confidence: number;
    status: DomainStatus;
    scoringBreakdown: Record<DomainType, number>;
    matchedColumns: string[];
    explanation: string;
    detectedAt: Date;
}

// Domain Governance (Module 3 Phase 3B)
export type GovernanceStatus = 'AUTO' | 'MANUAL' | 'LOCKED';

export interface DomainGovernance {
    id: string;
    projectId: string;
    activeDomain: DomainType | null;       // Final governed domain
    governanceStatus: GovernanceStatus;     // AUTO / MANUAL / LOCKED
    isLocked: boolean;                      // Lock prevents auto-reclassification
    version: number;                        // Increments on each change
    changedBy: string;                      // User who made the change
    changeReason: string;                   // Why domain was set/changed
    lastUpdated: Date;
}

export interface DomainHistory {
    id: string;
    projectId: string;
    version: number;
    previousDomain: DomainType | null;
    newDomain: DomainType | null;
    previousStatus: GovernanceStatus;
    newStatus: GovernanceStatus;
    changedBy: string;
    changeReason: string;
    confidence: number;                     // Confidence at time of change
    changedAt: Date;
}

// AI Domain Reasoning (Module 3 Phase 3C)
export interface AIDomainReasoning {
    id: string;
    projectId: string;
    // Rule-based detection results
    ruleBasedDomain: DomainType | null;
    ruleBasedConfidence: number;
    matchedColumns: string[];
    unmatchedColumns: string[];
    // AI semantic analysis
    aiRecommendedDomain: DomainType | null;
    aiSemanticConfidence: number;
    aiAlternativeDomain: DomainType | null;
    aiAlternativeConfidence: number;
    aiReasoning: string;
    aiSemanticSignals: string[];
    aiColumnInsights: string;
    // Combined results
    combinedConfidence: number;
    finalDomain: DomainType | null;
    wasAutoAssigned: boolean;
    // Metadata
    ollamaModel: string;
    processingTimeMs: number;
    createdAt: Date;
}

// KPI Discovery (Module 4 Phase 4A)
export interface KPIDiscovery {
    projectId: string;
    domain: DomainType;
    totalKPIsAnalyzed: number;
    computableKPIs: any[];
    partialKPIs: any[];
    discoveredAt: Date;
}

// KPI Blueprint (Module 4 Phase 4B)
export interface ApprovedKPI {
    kpiId: string;
    kpiName: string;
    formula: string;
    category: string;
    matchedColumns: string[];
    confidence: number;
    addedAt: Date;
}

export interface KPIBlueprint {
    id: string;
    projectId: string;
    kpis: ApprovedKPI[];
    version: number;
    isLocked: boolean;
    lockedAt: Date | null;
    lockedBy: string | null;
    createdAt: Date;
}

export interface KPIBlueprintHistory {
    id: string;
    projectId: string;
    version: number;
    action: 'ADD' | 'REMOVE' | 'LOCK';
    kpiId: string;
    kpiName: string;
    changedBy: string;
    changedAt: Date;
}

// ============ STORAGE (GLOBAL TO SURVIVE HMR) ============

interface DbStore {
    users: Map<string, User>;
    projects: Map<string, Project>;
    sources: Map<string, Source>;
    columnMetas: Map<string, ColumnMeta>;
    relationships: Map<string, Relationship>;
    cleanedDatasets: Map<string, CleanedDataset>;
    cleaningLogs: Map<string, CleaningLog>;
    qualityIntelligence: Map<string, QualityIntelligence>;
    columnHealths: Map<string, ColumnHealth>;
    outlierRecords: Map<string, OutlierRecord>;
    transformationAudits: Map<string, TransformationAudit>;
    domainDetections: Map<string, DomainDetection>;
    domainGovernances: Map<string, DomainGovernance>;
    domainHistories: Map<string, DomainHistory>;
    aiDomainReasonings: Map<string, AIDomainReasoning>;
    kpiDiscoveries: Map<string, KPIDiscovery>;
    kpiBlueprints: Map<string, KPIBlueprint>;
    kpiBlueprintHistories: Map<string, KPIBlueprintHistory>;
    aiKpiProposals: Map<string, any>; // AI-invented KPI proposals
    initialized: boolean;
}

// Extend globalThis type
declare global {
    // eslint-disable-next-line no-var
    var __vistaraDb: DbStore | undefined;
}

// Initialize or get existing store
function getStore(): DbStore {
    if (!globalThis.__vistaraDb) {
        console.log('[VistaraDB] Initializing in-memory database...');
        globalThis.__vistaraDb = {
            users: new Map(),
            projects: new Map(),
            sources: new Map(),
            columnMetas: new Map(),
            relationships: new Map(),
            cleanedDatasets: new Map(),
            cleaningLogs: new Map(),
            qualityIntelligence: new Map(),
            columnHealths: new Map(),
            outlierRecords: new Map(),
            transformationAudits: new Map(),
            domainDetections: new Map(),
            domainGovernances: new Map(),
            domainHistories: new Map(),
            aiDomainReasonings: new Map(),
            kpiDiscoveries: new Map(),
            kpiBlueprints: new Map(),
            kpiBlueprintHistories: new Map(),
            aiKpiProposals: new Map(),
            initialized: false,
        };
    }

    // Add demo user on first init
    if (!globalThis.__vistaraDb.initialized) {
        const DEMO_USER_ID = 'demo-user-001';
        globalThis.__vistaraDb.users.set(DEMO_USER_ID, {
            id: DEMO_USER_ID,
            name: 'Demo User',
            email: 'demo@vistarabi.com',
            password: '$2b$10$58zpZBHFErlUA6JZrsISneOeD5ng6WgQnb3B5KVNmV4qY5QmQ8sVy', // demo123
            createdAt: new Date(),
        });
        globalThis.__vistaraDb.initialized = true;
        console.log('[VistaraDB] Demo user created: demo@vistarabi.com / demo123');
    }

    return globalThis.__vistaraDb;
}

// Use getters to always get fresh references from store (HMR safe)
const getUsers = () => getStore().users;
const getProjects = () => getStore().projects;
const getSources = () => getStore().sources;
const getColumnMetas = () => getStore().columnMetas;
const getRelationships = () => getStore().relationships;
const getCleanedDatasets = () => getStore().cleanedDatasets;
const getCleaningLogs = () => getStore().cleaningLogs;
const getQualityIntelligence = () => getStore().qualityIntelligence;
const getColumnHealths = () => getStore().columnHealths;
const getOutlierRecords = () => getStore().outlierRecords;
const getTransformationAudits = () => getStore().transformationAudits;
const getDomainDetections = () => getStore().domainDetections;
const getDomainGovernances = () => getStore().domainGovernances;
const getDomainHistories = () => getStore().domainHistories;
const getAiDomainReasonings = () => getStore().aiDomainReasonings;
const getKpiDiscoveries = () => getStore().kpiDiscoveries;
const getKpiBlueprints = () => getStore().kpiBlueprints;
const getKpiBlueprintHistories = () => getStore().kpiBlueprintHistories;
const getAiKpiProposals = () => getStore().aiKpiProposals;

// Keep old references for backward compatibility (these call the getters)
const users = { get values() { return getUsers().values.bind(getUsers()); }, get entries() { return getUsers().entries.bind(getUsers()); }, get: (k: string) => getUsers().get(k), set: (k: string, v: any) => getUsers().set(k, v), delete: (k: string) => getUsers().delete(k) } as any;
const projects = { get values() { return getProjects().values.bind(getProjects()); }, get entries() { return getProjects().entries.bind(getProjects()); }, get: (k: string) => getProjects().get(k), set: (k: string, v: any) => getProjects().set(k, v), delete: (k: string) => getProjects().delete(k) } as any;
const sources = { get values() { return getSources().values.bind(getSources()); }, get entries() { return getSources().entries.bind(getSources()); }, get: (k: string) => getSources().get(k), set: (k: string, v: any) => getSources().set(k, v), delete: (k: string) => getSources().delete(k) } as any;
const columnMetas = { get values() { return getColumnMetas().values.bind(getColumnMetas()); }, get entries() { return getColumnMetas().entries.bind(getColumnMetas()); }, get: (k: string) => getColumnMetas().get(k), set: (k: string, v: any) => getColumnMetas().set(k, v), delete: (k: string) => getColumnMetas().delete(k) } as any;
const relationships = { get values() { return getRelationships().values.bind(getRelationships()); }, get entries() { return getRelationships().entries.bind(getRelationships()); }, get: (k: string) => getRelationships().get(k), set: (k: string, v: any) => getRelationships().set(k, v), delete: (k: string) => getRelationships().delete(k) } as any;
const cleanedDatasets = { get values() { return getCleanedDatasets().values.bind(getCleanedDatasets()); }, get entries() { return getCleanedDatasets().entries.bind(getCleanedDatasets()); }, get: (k: string) => getCleanedDatasets().get(k), set: (k: string, v: any) => getCleanedDatasets().set(k, v), delete: (k: string) => getCleanedDatasets().delete(k) } as any;
const cleaningLogs = { get values() { return getCleaningLogs().values.bind(getCleaningLogs()); }, get entries() { return getCleaningLogs().entries.bind(getCleaningLogs()); }, get: (k: string) => getCleaningLogs().get(k), set: (k: string, v: any) => getCleaningLogs().set(k, v), delete: (k: string) => getCleaningLogs().delete(k) } as any;
const qualityIntelligence = { get values() { return getQualityIntelligence().values.bind(getQualityIntelligence()); }, get entries() { return getQualityIntelligence().entries.bind(getQualityIntelligence()); }, get: (k: string) => getQualityIntelligence().get(k), set: (k: string, v: any) => getQualityIntelligence().set(k, v), delete: (k: string) => getQualityIntelligence().delete(k) } as any;
const columnHealths = { get values() { return getColumnHealths().values.bind(getColumnHealths()); }, get entries() { return getColumnHealths().entries.bind(getColumnHealths()); }, get: (k: string) => getColumnHealths().get(k), set: (k: string, v: any) => getColumnHealths().set(k, v), delete: (k: string) => getColumnHealths().delete(k) } as any;
const outlierRecords = { get values() { return getOutlierRecords().values.bind(getOutlierRecords()); }, get entries() { return getOutlierRecords().entries.bind(getOutlierRecords()); }, get: (k: string) => getOutlierRecords().get(k), set: (k: string, v: any) => getOutlierRecords().set(k, v), delete: (k: string) => getOutlierRecords().delete(k) } as any;
const transformationAudits = { get values() { return getTransformationAudits().values.bind(getTransformationAudits()); }, get entries() { return getTransformationAudits().entries.bind(getTransformationAudits()); }, get: (k: string) => getTransformationAudits().get(k), set: (k: string, v: any) => getTransformationAudits().set(k, v), delete: (k: string) => getTransformationAudits().delete(k) } as any;
const domainDetections = { get values() { return getDomainDetections().values.bind(getDomainDetections()); }, get entries() { return getDomainDetections().entries.bind(getDomainDetections()); }, get: (k: string) => getDomainDetections().get(k), set: (k: string, v: any) => getDomainDetections().set(k, v), delete: (k: string) => getDomainDetections().delete(k) } as any;
const domainGovernances = { get values() { return getDomainGovernances().values.bind(getDomainGovernances()); }, get entries() { return getDomainGovernances().entries.bind(getDomainGovernances()); }, get: (k: string) => getDomainGovernances().get(k), set: (k: string, v: any) => getDomainGovernances().set(k, v), delete: (k: string) => getDomainGovernances().delete(k) } as any;
const domainHistories = { get values() { return getDomainHistories().values.bind(getDomainHistories()); }, get entries() { return getDomainHistories().entries.bind(getDomainHistories()); }, get: (k: string) => getDomainHistories().get(k), set: (k: string, v: any) => getDomainHistories().set(k, v), delete: (k: string) => getDomainHistories().delete(k) } as any;
const aiDomainReasonings = { get values() { return getAiDomainReasonings().values.bind(getAiDomainReasonings()); }, get entries() { return getAiDomainReasonings().entries.bind(getAiDomainReasonings()); }, get: (k: string) => getAiDomainReasonings().get(k), set: (k: string, v: any) => getAiDomainReasonings().set(k, v), delete: (k: string) => getAiDomainReasonings().delete(k) } as any;
const kpiDiscoveries = { get values() { return getKpiDiscoveries().values.bind(getKpiDiscoveries()); }, get entries() { return getKpiDiscoveries().entries.bind(getKpiDiscoveries()); }, get: (k: string) => getKpiDiscoveries().get(k), set: (k: string, v: any) => getKpiDiscoveries().set(k, v), delete: (k: string) => getKpiDiscoveries().delete(k) } as any;
const kpiBlueprints = { get values() { return getKpiBlueprints().values.bind(getKpiBlueprints()); }, get entries() { return getKpiBlueprints().entries.bind(getKpiBlueprints()); }, get: (k: string) => getKpiBlueprints().get(k), set: (k: string, v: any) => getKpiBlueprints().set(k, v), delete: (k: string) => getKpiBlueprints().delete(k) } as any;
const kpiBlueprintHistories = { get values() { return getKpiBlueprintHistories().values.bind(getKpiBlueprintHistories()); }, get entries() { return getKpiBlueprintHistories().entries.bind(getKpiBlueprintHistories()); }, get: (k: string) => getKpiBlueprintHistories().get(k), set: (k: string, v: any) => getKpiBlueprintHistories().set(k, v), delete: (k: string) => getKpiBlueprintHistories().delete(k) } as any;

// ============ DATABASE API ============

const db = {
    // User operations
    user: {
        findUnique: async ({ where, select }: { where: { email?: string; id?: string }; select?: Record<string, boolean> }): Promise<User | null | Record<string, unknown>> => {
            let user: User | null = null;

            if (where.email) {
                for (const u of users.values()) {
                    if (u.email === where.email) {
                        user = u;
                        break;
                    }
                }
            }
            if (where.id) {
                user = users.get(where.id) || null;
            }

            if (!user) return null;

            if (select) {
                const result: Record<string, unknown> = {};
                for (const key of Object.keys(select)) {
                    if (select[key] && key in user) {
                        result[key] = user[key as keyof User];
                    }
                }
                return result;
            }

            return user;
        },

        create: async ({ data }: { data: { name: string; email: string; password: string } }) => {
            const id = crypto.randomUUID();
            const user: User = {
                id,
                name: data.name,
                email: data.email,
                password: data.password,
                createdAt: new Date(),
            };
            users.set(id, user);
            console.log('[VistaraDB] User created:', user.email);
            return user;
        },
    },

    // Project operations
    project: {
        findMany: async ({ where }: { where?: { userId?: string } } = {}) => {
            const results: Project[] = [];
            for (const project of projects.values()) {
                if (!where?.userId || project.userId === where.userId) {
                    results.push(project);
                }
            }
            return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        },

        findUnique: async ({ where }: { where: { id: string } }) => {
            const project = projects.get(where.id);
            console.log('[VistaraDB] findUnique project:', where.id, project ? 'FOUND' : 'NOT FOUND');
            return project || null;
        },

        create: async ({ data }: { data: { userId: string; name: string; description?: string } }) => {
            const id = crypto.randomUUID();
            const project: Project = {
                id,
                userId: data.userId,
                name: data.name,
                description: data.description,
                createdAt: new Date(),
            };
            projects.set(id, project);
            console.log('[VistaraDB] Project created:', project.id, project.name);
            return project;
        },

        delete: async ({ where }: { where: { id: string } }) => {
            const project = projects.get(where.id);
            if (project) {
                projects.delete(where.id);
                // Delete associated sources, columns, and relationships
                for (const [sourceId, source] of sources.entries()) {
                    if (source.projectId === where.id) {
                        sources.delete(sourceId);
                        for (const [colId, col] of columnMetas.entries()) {
                            if (col.sourceId === sourceId) {
                                columnMetas.delete(colId);
                            }
                        }
                    }
                }
                for (const [relId, rel] of relationships.entries()) {
                    if (rel.projectId === where.id) {
                        relationships.delete(relId);
                    }
                }
                console.log('[VistaraDB] Project deleted:', where.id);
            }
            return project;
        },
    },

    // Source operations
    source: {
        findMany: async ({ where }: { where?: { projectId?: string } } = {}) => {
            const results: Source[] = [];
            for (const source of sources.values()) {
                if (!where?.projectId || source.projectId === where.projectId) {
                    results.push(source);
                }
            }
            return results.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
        },

        findUnique: async ({ where }: { where: { id: string } }) => {
            return sources.get(where.id) || null;
        },

        create: async ({ data }: { data: Omit<Source, 'id'> }) => {
            const id = crypto.randomUUID();
            const source: Source = { id, ...data };
            sources.set(id, source);
            console.log('[VistaraDB] Source created:', source.fileName);
            return source;
        },

        update: async ({ where, data }: { where: { id: string }; data: Partial<Source> }) => {
            const source = sources.get(where.id);
            if (source) {
                const updated = { ...source, ...data };
                sources.set(where.id, updated);
                return updated;
            }
            return null;
        },

        delete: async ({ where }: { where: { id: string } }) => {
            const source = sources.get(where.id);
            if (source) {
                sources.delete(where.id);
                for (const [colId, col] of columnMetas.entries()) {
                    if (col.sourceId === where.id) {
                        columnMetas.delete(colId);
                    }
                }
            }
            return source;
        },
    },

    // Column metadata operations
    columnMeta: {
        findMany: async ({ where }: { where?: { sourceId?: string } } = {}) => {
            const results: ColumnMeta[] = [];
            for (const col of columnMetas.values()) {
                if (!where?.sourceId || col.sourceId === where.sourceId) {
                    results.push(col);
                }
            }
            return results;
        },

        create: async ({ data }: { data: Omit<ColumnMeta, 'id'> }) => {
            const id = crypto.randomUUID();
            const col: ColumnMeta = { id, ...data };
            columnMetas.set(id, col);
            return col;
        },

        deleteMany: async ({ where }: { where: { sourceId: string } }) => {
            let count = 0;
            for (const [colId, col] of columnMetas.entries()) {
                if (col.sourceId === where.sourceId) {
                    columnMetas.delete(colId);
                    count++;
                }
            }
            return { count };
        },
    },

    // Relationship operations
    relationship: {
        findMany: async ({ where }: { where?: { projectId?: string } } = {}) => {
            const results: Relationship[] = [];
            for (const rel of relationships.values()) {
                if (!where?.projectId || rel.projectId === where.projectId) {
                    results.push(rel);
                }
            }
            return results.sort((a, b) => b.confidence - a.confidence);
        },

        create: async ({ data }: { data: Omit<Relationship, 'id'> }) => {
            const id = crypto.randomUUID();
            const rel: Relationship = { id, ...data };
            relationships.set(id, rel);
            return rel;
        },

        deleteMany: async ({ where }: { where: { projectId: string } }) => {
            let count = 0;
            for (const [relId, rel] of relationships.entries()) {
                if (rel.projectId === where.projectId) {
                    relationships.delete(relId);
                    count++;
                }
            }
            return { count };
        },
    },

    // Cleaned dataset operations
    cleanedDataset: {
        findUnique: async ({ where }: { where: { sourceId: string } }) => {
            for (const dataset of cleanedDatasets.values()) {
                if (dataset.sourceId === where.sourceId) {
                    return dataset;
                }
            }
            return null;
        },

        create: async ({ data }: { data: Omit<CleanedDataset, 'id'> }) => {
            const id = crypto.randomUUID();
            const dataset: CleanedDataset = { id, ...data };
            cleanedDatasets.set(id, dataset);
            console.log('[VistaraDB] CleanedDataset created for source:', data.sourceId);
            return dataset;
        },

        update: async ({ where, data }: { where: { sourceId: string }; data: Partial<CleanedDataset> }) => {
            for (const [id, dataset] of cleanedDatasets.entries()) {
                if (dataset.sourceId === where.sourceId) {
                    const updated = { ...dataset, ...data };
                    cleanedDatasets.set(id, updated);
                    return updated;
                }
            }
            return null;
        },

        delete: async ({ where }: { where: { sourceId: string } }) => {
            for (const [id, dataset] of cleanedDatasets.entries()) {
                if (dataset.sourceId === where.sourceId) {
                    cleanedDatasets.delete(id);
                    return dataset;
                }
            }
            return null;
        },
    },

    // Cleaning log operations
    cleaningLog: {
        findUnique: async ({ where }: { where: { sourceId: string } }) => {
            for (const log of cleaningLogs.values()) {
                if (log.sourceId === where.sourceId) {
                    return log;
                }
            }
            return null;
        },

        create: async ({ data }: { data: Omit<CleaningLog, 'id'> }) => {
            const id = crypto.randomUUID();
            const log: CleaningLog = { id, ...data };
            cleaningLogs.set(id, log);
            console.log('[VistaraDB] CleaningLog created for source:', data.sourceId);
            return log;
        },

        delete: async ({ where }: { where: { sourceId: string } }) => {
            for (const [id, log] of cleaningLogs.entries()) {
                if (log.sourceId === where.sourceId) {
                    cleaningLogs.delete(id);
                    return log;
                }
            }
            return null;
        },
    },

    // Quality intelligence operations
    qualityIntelligence: {
        findUnique: async ({ where }: { where: { sourceId: string } }) => {
            for (const qi of qualityIntelligence.values()) {
                if (qi.sourceId === where.sourceId) {
                    return qi;
                }
            }
            return null;
        },

        create: async ({ data }: { data: Omit<QualityIntelligence, 'id'> }) => {
            const id = crypto.randomUUID();
            const qi: QualityIntelligence = { id, ...data };
            qualityIntelligence.set(id, qi);
            console.log('[VistaraDB] QualityIntelligence created for source:', data.sourceId);
            return qi;
        },

        update: async ({ where, data }: { where: { sourceId: string }; data: Partial<QualityIntelligence> }) => {
            for (const [id, qi] of qualityIntelligence.entries()) {
                if (qi.sourceId === where.sourceId) {
                    const updated = { ...qi, ...data };
                    qualityIntelligence.set(id, updated);
                    return updated;
                }
            }
            return null;
        },

        delete: async ({ where }: { where: { sourceId: string } }) => {
            for (const [id, qi] of qualityIntelligence.entries()) {
                if (qi.sourceId === where.sourceId) {
                    qualityIntelligence.delete(id);
                    return qi;
                }
            }
            return null;
        },
    },

    // Column health operations
    columnHealth: {
        findMany: async ({ where }: { where?: { sourceId?: string } } = {}) => {
            const results: ColumnHealth[] = [];
            for (const ch of columnHealths.values()) {
                if (!where?.sourceId || ch.sourceId === where.sourceId) {
                    results.push(ch);
                }
            }
            return results;
        },

        create: async ({ data }: { data: Omit<ColumnHealth, 'id'> }) => {
            const id = crypto.randomUUID();
            const ch: ColumnHealth = { id, ...data };
            columnHealths.set(id, ch);
            return ch;
        },

        deleteMany: async ({ where }: { where: { sourceId: string } }) => {
            let count = 0;
            for (const [id, ch] of columnHealths.entries()) {
                if (ch.sourceId === where.sourceId) {
                    columnHealths.delete(id);
                    count++;
                }
            }
            return { count };
        },
    },

    // Outlier record operations
    outlierRecord: {
        findMany: async ({ where }: { where?: { sourceId?: string } } = {}) => {
            const results: OutlierRecord[] = [];
            for (const outlier of outlierRecords.values()) {
                if (!where?.sourceId || outlier.sourceId === where.sourceId) {
                    results.push(outlier);
                }
            }
            return results.sort((a, b) => {
                const severityOrder = { EXTREME: 3, MODERATE: 2, MILD: 1 };
                return severityOrder[b.severity] - severityOrder[a.severity];
            });
        },

        create: async ({ data }: { data: Omit<OutlierRecord, 'id'> }) => {
            const id = crypto.randomUUID();
            const outlier: OutlierRecord = { id, ...data };
            outlierRecords.set(id, outlier);
            return outlier;
        },

        deleteMany: async ({ where }: { where: { sourceId: string } }) => {
            let count = 0;
            for (const [id, outlier] of outlierRecords.entries()) {
                if (outlier.sourceId === where.sourceId) {
                    outlierRecords.delete(id);
                    count++;
                }
            }
            return { count };
        },
    },

    // Transformation audit operations
    transformationAudit: {
        findMany: async ({ where }: { where?: { sourceId?: string } } = {}) => {
            const results: TransformationAudit[] = [];
            for (const audit of transformationAudits.values()) {
                if (!where?.sourceId || audit.sourceId === where.sourceId) {
                    results.push(audit);
                }
            }
            return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        },

        create: async ({ data }: { data: Omit<TransformationAudit, 'id'> }) => {
            const id = crypto.randomUUID();
            const audit: TransformationAudit = { id, ...data };
            transformationAudits.set(id, audit);
            return audit;
        },

        deleteMany: async ({ where }: { where: { sourceId: string } }) => {
            let count = 0;
            for (const [id, audit] of transformationAudits.entries()) {
                if (audit.sourceId === where.sourceId) {
                    transformationAudits.delete(id);
                    count++;
                }
            }
            return { count };
        },
    },

    // Domain Detection (Module 3 Phase 3A)
    domainDetection: {
        findUnique: async ({ where }: { where: { id?: string; projectId?: string } }) => {
            if (where.id) {
                return domainDetections.get(where.id) || null;
            }
            if (where.projectId) {
                for (const detection of domainDetections.values()) {
                    if (detection.projectId === where.projectId) {
                        return detection;
                    }
                }
            }
            return null;
        },

        findMany: async ({ where }: { where?: { projectId?: string } } = {}) => {
            const results: DomainDetection[] = [];
            for (const detection of domainDetections.values()) {
                if (!where?.projectId || detection.projectId === where.projectId) {
                    results.push(detection);
                }
            }
            return results;
        },

        create: async ({ data }: { data: DomainDetection }) => {
            domainDetections.set(data.id, data);
            return data;
        },

        update: async ({ where, data }: { where: { id?: string; projectId?: string }; data: Partial<DomainDetection> }) => {
            let existing: DomainDetection | null = null;

            if (where.id) {
                existing = domainDetections.get(where.id) || null;
            } else if (where.projectId) {
                for (const detection of domainDetections.values()) {
                    if (detection.projectId === where.projectId) {
                        existing = detection;
                        break;
                    }
                }
            }

            if (existing) {
                const updated = { ...existing, ...data };
                domainDetections.set(existing.id, updated);
                return updated;
            }
            return null;
        },

        delete: async ({ where }: { where: { id?: string; projectId?: string } }) => {
            if (where.id) {
                const detection = domainDetections.get(where.id);
                if (detection) {
                    domainDetections.delete(where.id);
                    return detection;
                }
            }
            if (where.projectId) {
                for (const [id, detection] of domainDetections.entries()) {
                    if (detection.projectId === where.projectId) {
                        domainDetections.delete(id);
                        return detection;
                    }
                }
            }
            return null;
        },
    },

    // Domain Governance (Module 3 Phase 3B)
    domainGovernance: {
        findUnique: async ({ where }: { where: { id?: string; projectId?: string } }) => {
            if (where.id) {
                return domainGovernances.get(where.id) || null;
            }
            if (where.projectId) {
                for (const gov of domainGovernances.values()) {
                    if (gov.projectId === where.projectId) {
                        return gov;
                    }
                }
            }
            return null;
        },

        create: async ({ data }: { data: any }) => {
            domainGovernances.set(data.id, data);
            return data;
        },

        update: async ({ where, data }: { where: { id?: string; projectId?: string }; data: any }) => {
            let existing: any = null;

            if (where.id) {
                existing = domainGovernances.get(where.id);
            } else if (where.projectId) {
                for (const gov of domainGovernances.values()) {
                    if (gov.projectId === where.projectId) {
                        existing = gov;
                        break;
                    }
                }
            }

            if (existing) {
                const updated = { ...existing, ...data };
                domainGovernances.set(existing.id, updated);
                return updated;
            }
            return null;
        },
    },

    // Domain History (Module 3 Phase 3B)
    domainHistory: {
        findMany: async ({ where }: { where?: { projectId?: string } } = {}) => {
            const results: any[] = [];
            for (const history of domainHistories.values()) {
                if (!where?.projectId || history.projectId === where.projectId) {
                    results.push(history);
                }
            }
            return results;
        },

        create: async ({ data }: { data: any }) => {
            domainHistories.set(data.id, data);
            return data;
        },
    },

    // AI Domain Reasoning (Module 3 Phase 3C)
    aiDomainReasoning: {
        findUnique: async ({ where }: { where: { id?: string; projectId?: string } }) => {
            if (where.id) {
                return aiDomainReasonings.get(where.id) || null;
            }
            if (where.projectId) {
                for (const reasoning of aiDomainReasonings.values()) {
                    if (reasoning.projectId === where.projectId) {
                        return reasoning;
                    }
                }
            }
            return null;
        },

        upsert: async ({ where, data }: { where: { projectId: string }; data: any }) => {
            // Find existing by projectId
            let existingId: string | null = null;
            for (const [id, reasoning] of aiDomainReasonings.entries()) {
                if (reasoning.projectId === where.projectId) {
                    existingId = id;
                    break;
                }
            }

            if (existingId) {
                const updated = { ...aiDomainReasonings.get(existingId), ...data };
                aiDomainReasonings.set(existingId, updated);
                return updated;
            } else {
                aiDomainReasonings.set(data.id, data);
                return data;
            }
        },

        create: async ({ data }: { data: any }) => {
            aiDomainReasonings.set(data.id, data);
            return data;
        },
    },

    // KPI Discovery (Module 4 Phase 4A)
    kpiDiscovery: {
        findUnique: async ({ where }: { where: { projectId: string } }) => {
            for (const kpi of kpiDiscoveries.values()) {
                if (kpi.projectId === where.projectId) {
                    return kpi;
                }
            }
            return null;
        },

        upsert: async ({ where, data }: { where: { projectId: string }; data: any }) => {
            for (const [id, kpi] of kpiDiscoveries.entries()) {
                if (kpi.projectId === where.projectId) {
                    const updated = { ...kpi, ...data };
                    kpiDiscoveries.set(id, updated);
                    return updated;
                }
            }
            kpiDiscoveries.set(where.projectId, data);
            return data;
        },

        create: async ({ data }: { data: any }) => {
            kpiDiscoveries.set(data.projectId, data);
            return data;
        },
    },

    // KPI Blueprint (Module 4 Phase 4B)
    kpiBlueprint: {
        findUnique: async ({ where }: { where: { projectId: string } }) => {
            for (const bp of kpiBlueprints.values()) {
                if (bp.projectId === where.projectId) return bp;
            }
            return null;
        },

        upsert: async ({ where, data }: { where: { projectId: string }; data: any }) => {
            for (const [id, bp] of kpiBlueprints.entries()) {
                if (bp.projectId === where.projectId) {
                    const updated = { ...bp, ...data };
                    kpiBlueprints.set(id, updated);
                    return updated;
                }
            }
            kpiBlueprints.set(data.id || where.projectId, data);
            return data;
        },

        update: async ({ where, data }: { where: { projectId: string }; data: any }) => {
            for (const [id, bp] of kpiBlueprints.entries()) {
                if (bp.projectId === where.projectId) {
                    const updated = { ...bp, ...data };
                    kpiBlueprints.set(id, updated);
                    return updated;
                }
            }
            return null;
        },
    },

    kpiBlueprintHistory: {
        findMany: async ({ where }: { where?: { projectId?: string } } = {}) => {
            const results: any[] = [];
            for (const h of kpiBlueprintHistories.values()) {
                if (!where?.projectId || h.projectId === where.projectId) {
                    results.push(h);
                }
            }
            return results.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
        },

        create: async ({ data }: { data: any }) => {
            kpiBlueprintHistories.set(data.id, data);
            return data;
        },
    },

    // AI KPI Proposals (Module 4 Phase 4C)
    aiKpiProposals: {
        findMany: async ({ where }: { where?: { projectId?: string } } = {}) => {
            const results: any[] = [];
            for (const p of getAiKpiProposals().values()) {
                if (!where?.projectId || p.projectId === where.projectId) {
                    results.push(p);
                }
            }
            return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
        },

        findUnique: async ({ where }: { where: { id: string } }) => {
            return getAiKpiProposals().get(where.id) || null;
        },

        create: async ({ data }: { data: any }) => {
            getAiKpiProposals().set(data.id, data);
            return data;
        },

        update: async ({ where, data }: { where: { id: string }; data: any }) => {
            const existing = getAiKpiProposals().get(where.id);
            if (existing) {
                const updated = { ...existing, ...data };
                getAiKpiProposals().set(where.id, updated);
                return updated;
            }
            return null;
        },

        delete: async ({ where }: { where: { id: string } }) => {
            const existing = getAiKpiProposals().get(where.id);
            if (existing) {
                getAiKpiProposals().delete(where.id);
            }
            return existing || null;
        },
    },
};

export default db;
