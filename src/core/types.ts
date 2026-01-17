import { z } from 'zod';

export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RecommendedActionSchema = z.enum(['allow', 'warn', 'block']);
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

export interface RegistryMetadata {
    name: string;
    'dist-tags': { latest: string };
    time: Record<string, string>;
    maintainers: any[];
    deprecated?: string;
    description?: string;
}

export const DependencyNodeSchema = z.object({
    name: z.string(),
    version: z.string(), // Range or fixed version from package.json
    resolvedVersion: z.string(), // Actual version from lockfile
    transitive: z.boolean(),
    introducedBy: z.array(z.string()).optional(),
    metadata: z.object({
        lastPublish: z.string().optional(), // Date string
        maintainers: z.number().optional(),
        downloads: z.number().optional(),
        deprecated: z.string().optional(),
        description: z.string().optional(),
    }),
});

export type DependencyNode = z.infer<typeof DependencyNodeSchema>;

export const DependencyGraphSchema = z.object({
    root: z.string(),
    environment: z.enum(['local', 'ci', 'prod']),
    dependencies: z.array(DependencyNodeSchema),
});

export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;

export interface DriftIssue {
    dependencyName: string;
    type: 'version-mismatch' | 'range-usage' | 'transitive-drift';
    expected: string;
    actual: string;
    reason: string;
}

export interface SecurityIssue {
    dependencyName: string;
    type: 'unmaintained' | 'deprecated' | 'single-maintainer';
    reason: string;
    riskLevel: RiskLevel;
    details?: Record<string, string | number | boolean | undefined>;
}

export interface SecurityIssueGroup {
    dependencyName: string;
    transitive: boolean;
    introducedBy: string[];
    description?: string;
    issues: Omit<SecurityIssue, 'dependencyName'>[];
    overallRisk: RiskLevel;
}

export interface DriftIssueGroup {
    dependencyName: string;
    transitive: boolean;
    introducedBy: string[];
    issues: DriftIssue[];
}

export const ScanMetadataSchema = z.object({
    schemaVersion: z.literal("1.0"),
    scanId: z.string().uuid(),
    projectName: z.string(),
    projectId: z.string(),
    generatedAt: z.string().datetime(),
});

export const AnalysisReportSchema = z.object({
    summary: z.object({
        driftCount: z.number(),
        securityCount: z.number(),
        riskLevel: RiskLevelSchema,
        riskReason: z.string().optional(),
        recommendedAction: RecommendedActionSchema.optional(),
        recommendedExitCode: z.number(),
    }),
    drift: z.array(z.any()),
    security: z.array(z.any()),
});

export const ScanResultSchema = AnalysisReportSchema.extend({
    meta: ScanMetadataSchema,
});

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;
export type ScanMetadata = z.infer<typeof ScanMetadataSchema>;

export type ScanResultV1 = z.infer<typeof ScanResultSchema>;

// Internal project data before normalization
export interface RawProjectData {
    packageJson: any;
    packageLock: any;
}
