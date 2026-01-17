#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import crypto from 'crypto';
import { loadProjectData } from '../adapters/fs-loader.js';
import { fetchAllMetadata } from '../adapters/npm-registry.js';
import { detectDrift } from '../core/drift.js';
import { analyzeSecurity } from '../core/security.js';
import { formatConsoleReport } from '../report/console-report.js';
import { formatJsonReport } from '../report/json-report.js';
import { ScanResultV1, RiskLevel, RecommendedAction } from '../core/types.js';
import { buildDependencyGraph } from '../core/graph.js';

const program = new Command();

program
    .name('dep-drift-sec')
    .description('Detect dependency drift and basic security risks')
    .version('1.0.0');

program
    .command('check')
    .description('Run drift and security checks on the current project')
    .option('--json', 'Output report in JSON format')
    .option('--path <path>', 'Path to the Node project', '.')
    .option('--upload', 'Upload results to SaaS (reserved)')
    .action(async (options) => {
        try {
            if (options.upload) {
                console.warn('Warning: Upload is not enabled in the open-source CLI.');
            }

            const projectPath = path.resolve(process.cwd(), options.path);
            const project = await loadProjectData(projectPath);

            // Generate stable projectId from lockfile content
            const lockfileContent = JSON.stringify(project.packageLock);
            const projectId = crypto.createHash('sha256').update(lockfileContent).digest('hex');
            const scanId = crypto.randomUUID();
            const generatedAt = new Date().toISOString();

            // 1. Extract unique deps for metadata fetching
            const lockPackages = project.packageLock.packages || {};
            const uniqueDeps = new Set<string>();
            for (const p of Object.keys(lockPackages)) {
                if (p === '' || !p.startsWith('node_modules/')) continue;
                uniqueDeps.add(p.split('node_modules/').pop()!);
            }

            // 2. Fetch metadata
            const metadataMap = await fetchAllMetadata(Array.from(uniqueDeps));

            // 3. Build normalized graph
            const graph = buildDependencyGraph(project, metadataMap, 'local');

            // 4. Analyze
            const driftGroups = detectDrift(graph);
            const securityGroups = analyzeSecurity(graph);

            // 5. Calculate Summary Totals
            const totalDriftIssues = driftGroups.reduce((acc, g) => acc + g.issues.length, 0);
            const uniqueSecurityDeps = securityGroups.length;

            // 6. Determine overall risk factors
            let overallRisk: RiskLevel = 'low';
            let riskReason = 'No significant risks detected. Your dependencies appear healthy.';
            let recommendedAction: RecommendedAction = 'allow';

            const affectedDeps = new Set([
                ...securityGroups.map(g => g.dependencyName),
                ...driftGroups.map(g => g.dependencyName)
            ]);
            const affectedCount = affectedDeps.size;
            const transitiveCount = [
                ...securityGroups.filter(g => g.transitive),
                ...driftGroups.filter(g => g.transitive && !securityGroups.some(sg => sg.dependencyName === g.dependencyName))
            ].length;

            if (affectedCount > 0) {
                const transText = transitiveCount > 0 ? ` (${transitiveCount} transitive)` : "";
                riskReason = `${affectedCount} dependenc${affectedCount > 1 ? 'ies have' : 'y has'} security or drift issues${transText}, increasing breakage and security risk.`;
            }

            if (securityGroups.some(g => g.overallRisk === 'high')) {
                overallRisk = 'high';
                recommendedAction = 'block';
            } else if (securityGroups.some(g => g.overallRisk === 'medium') || driftGroups.length > 0) {
                overallRisk = 'medium';
                recommendedAction = 'warn';
            } else if (securityGroups.some(g => g.overallRisk === 'low')) {
                overallRisk = 'low';
                recommendedAction = 'allow';
            }

            // 7. Determine Exit Code (Preserved logic)
            let exitCode = 0;
            if (totalDriftIssues > 0 && securityGroups.length > 0) exitCode = 3;
            else if (totalDriftIssues > 0) exitCode = 1;
            else if (securityGroups.length > 0) exitCode = 2;

            const report: ScanResultV1 = {
                meta: {
                    schemaVersion: "1.0",
                    scanId,
                    projectName: project.packageJson.name || 'unknown',
                    projectId,
                    generatedAt,
                },
                summary: {
                    driftCount: totalDriftIssues,
                    securityCount: uniqueSecurityDeps,
                    riskLevel: overallRisk,
                    riskReason,
                    recommendedAction,
                    recommendedExitCode: exitCode,
                },
                drift: driftGroups,
                security: securityGroups,
            };

            if (options.json) {
                process.stdout.write(formatJsonReport(report) + '\n');
            } else {
                process.stdout.write(formatConsoleReport(report) + '\n');
            }

            process.exitCode = exitCode;
        } catch (error: any) {
            if (!options.json) {
                console.error(`Error: ${error.message}`);
            } else {
                // Ensure valid JSON output for errors when in JSON mode
                process.stdout.write(JSON.stringify({ error: error.message, exitCode: 4 }) + '\n');
            }
            process.exitCode = 4;
        }
    });

program.parse(process.argv);
