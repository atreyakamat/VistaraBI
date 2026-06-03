// Main quality intelligence orchestrator

import db from '@/lib/prisma';
import { calculateCompleteness } from './completeness-scorer';
import { calculateConsistency } from './consistency-scorer';
import { detectOutliers } from './outlier-detector';
import { gradeColumnHealth, getHealthIssues } from './column-health-grader';
import { gradeDatasetQuality, determineRiskLevel } from './dataset-quality-grader';

export async function analyzeQuality(sourceId: string): Promise<void> {
    try {
        console.log('[Quality] Starting quality analysis for source:', sourceId);

        // 1. Get cleaned dataset from Phase 2A
        const cleanedDataset = await db.cleanedDataset.findUnique({ where: { sourceId } });
        if (!cleanedDataset || cleanedDataset.status !== 'CLEANED') {
            console.log('[Quality] No cleaned dataset found, skipping quality analysis');
            return;
        }

        const data = cleanedDataset.cleanedData as unknown as Record<string, unknown>[];
        const totalRecords = data.length;

        if (totalRecords === 0) {
            console.log('[Quality] Empty dataset, skipping');
            return;
        }

        // 2. Get column metadata for intelligence
        const columnMeta = await db.columnMeta.findMany({ where: { sourceId } });

        // 3. Calculate completeness scores
        const completenessResult = calculateCompleteness(data);
        console.log('[Quality] Completeness:', completenessResult.overallScore.toFixed(2) + '%');

        // 4. Calculate consistency scores
        const consistencyResult = calculateConsistency(data, columnMeta);
        console.log('[Quality] Consistency:', consistencyResult.overallScore.toFixed(2) + '%');

        // 5. Detect outliers for numeric columns
        let totalOutliers = 0;
        const outliersByColumn = new Map<string, number>();
        const outlierRecordsToCreate: any[] = [];

        for (const col of columnMeta) {
            if (col.dataType === 'NUMBER') {
                const outlierResult = detectOutliers(data, col.originalName);

                if (outlierResult.totalOutliers > 0) {
                    outliersByColumn.set(col.originalName, outlierResult.totalOutliers);
                    totalOutliers += outlierResult.totalOutliers;

                    // Prepare outlier records for batch insert
                    for (const outlier of outlierResult.outliers) {
                        outlierRecordsToCreate.push({
                            sourceId,
                            columnName: col.originalName,
                            rowIndex: outlier.rowIndex,
                            value: outlier.value as any,
                            detectionMethod: outlier.method,
                            severity: outlier.severity,
                            expectedRange: outlier.expectedRange,
                        });
                    }
                }
            }
        }

        // Batch insert outliers
        if (outlierRecordsToCreate.length > 0) {
            await db.outlierRecord.createMany({
                data: outlierRecordsToCreate,
            });
        }

        console.log('[Quality] Outliers detected:', totalOutliers);

        // 6. Calculate accuracy score (100 - outlier %)
        const outlierPercentage = (totalOutliers / totalRecords) * 100;
        const accuracyScore = Math.max(0, 100 - outlierPercentage);

        // 7. Grade column health
        const columns = Object.keys(data[0]);
        const columnHealthToCreate: any[] = [];

        for (const colName of columns) {
            const completeness = completenessResult.columnScores.get(colName) || 0;
            const consistency = consistencyResult.columnScores.get(colName) || 100;
            const colOutliers = outliersByColumn.get(colName) || 0;
            const colOutlierPct = (colOutliers / totalRecords) * 100;

            const healthStatus = gradeColumnHealth(completeness, consistency, colOutlierPct);
            const issues = getHealthIssues(completeness, consistency, colOutlierPct, colOutliers);

            // Calculate uniqueness
            const uniqueValues = new Set(data.map(row => row[colName])).size;
            const uniqueness = (uniqueValues / totalRecords) * 100;

            columnHealthToCreate.push({
                sourceId,
                columnName: colName,
                healthStatus,
                completeness,
                consistency,
                outlierCount: colOutliers,
                uniqueness,
                issues,
            });
        }

        // Batch insert column health
        if (columnHealthToCreate.length > 0) {
            await db.columnHealth.createMany({
                data: columnHealthToCreate,
            });
        }

        // 8. Grade overall dataset quality
        const overallGrade = gradeDatasetQuality(
            completenessResult.overallScore,
            consistencyResult.overallScore,
            accuracyScore
        );

        const riskLevel = determineRiskLevel(
            completenessResult.overallScore,
            consistencyResult.overallScore,
            accuracyScore
        );

        // Count healthy vs risky records (records with no outliers)
        const riskyRecordIndices = new Set<number>();
        for (const outlier of await db.outlierRecord.findMany({ where: { sourceId } })) {
            riskyRecordIndices.add(outlier.rowIndex);
        }
        const riskyRecords = riskyRecordIndices.size;
        const healthyRecords = totalRecords - riskyRecords;

        // 9. Store QualityIntelligence
        await db.qualityIntelligence.create({
            data: {
                sourceId,
                overallGrade,
                completenessScore: completenessResult.overallScore,
                consistencyScore: consistencyResult.overallScore,
                accuracyScore,
                riskLevel,
                totalRecords,
                healthyRecords,
                riskyRecords,
                calculatedAt: new Date(),
            },
        });

        console.log('[Quality] Quality analysis complete');
        console.log('[Quality] Overall Grade:', overallGrade, '| Risk Level:', riskLevel);
        console.log('[Quality] Healthy Records:', healthyRecords, '/', totalRecords);

        // 10. Auto-trigger domain detection (Module 3 Phase 3A)
        try {
            const source = await db.source.findUnique({ where: { id: sourceId } });
            if (source) {
                const { detectDomain } = await import('@/lib/domain');
                await detectDomain(source.projectId);
            }
        } catch (domainError) {
            console.error('[Quality] Domain detection error:', domainError);
        }

    } catch (error) {
        console.error('[Quality] Error during quality analysis:', error);
    }
}
