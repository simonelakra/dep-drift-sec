import { AnalysisReport, SecurityIssueGroup, DriftIssueGroup } from '../core/types.js';

export function formatConsoleReport(report: AnalysisReport): string {
    const { summary, drift, security } = report;
    let output = `\n=== dep-drift-sec Analysis ===\n`;
    output += `Risk Level: ${summary.riskLevel.toUpperCase()}\n`;
    output += `Action:     ${(summary.recommendedAction || 'allow').toUpperCase()}\n`;
    output += `Reason:     ${summary.riskReason || 'N/A'}\n\n`;
    output += `Drift Issues: ${summary.driftCount}\n`;
    output += `Security Issues: ${summary.securityCount}\n\n`;

    if (drift.length > 0) {
        output += `--- Dependency Drift ---\n`;
        (drift as DriftIssueGroup[]).forEach((group) => {
            const label = group.transitive ? '[TRANSITIVE]' : '[DIRECT]';
            const introducedBy = group.transitive && group.introducedBy.length > 0
                ? ` (via ${group.introducedBy.join(', ')})`
                : '';

            output += `${label} ${group.dependencyName}${introducedBy}\n`;
            output += `  Impact: This dependency has version fluctuations which can lead to "works on my machine" bugs.\n`;

            group.issues.forEach(issue => {
                output += `  - [${issue.type.toUpperCase()}] ${issue.reason}\n`;
                output += `    Expected: ${issue.expected}, Actual: ${issue.actual}\n`;
            });
            output += `\n`;
        });
    }

    if (security.length > 0) {
        output += `--- Security Heuristics ---\n`;
        (security as SecurityIssueGroup[]).forEach((group) => {
            const label = group.transitive ? '[TRANSITIVE]' : '[DIRECT]';
            const introducedBy = group.transitive && group.introducedBy.length > 0
                ? ` (via ${group.introducedBy.join(', ')})`
                : '';

            output += `[${group.overallRisk.toUpperCase()}] ${label} ${group.dependencyName}${introducedBy}\n`;

            // Per-dependency explanation
            if (group.overallRisk === 'high') {
                output += `  Impact: This package is deprecated or critical; it should be replaced immediately to avoid security breaches.\n`;
            } else if (group.overallRisk === 'medium') {
                output += `  Impact: This package is unmaintained; it may have hidden vulnerabilities or compatibility issues.\n`;
            } else {
                output += `  Impact: This package has minor supply chain risks (e.g., single maintainer).\n`;
            }

            if (group.description) {
                output += `  Description: ${group.description}\n`;
            }

            group.issues.forEach(issue => {
                output += `  - [${issue.type.toUpperCase()}] ${issue.reason}\n`;
                if (issue.details) {
                    const detailLines = [];
                    for (const [key, value] of Object.entries(issue.details)) {
                        if (key === 'description') continue;
                        if (value !== undefined) detailLines.push(`${key}: ${value}`);
                    }
                    if (detailLines.length > 0) {
                        output += `      Details: ${detailLines.join(', ')}\n`;
                    }
                }
            });
            output += `\n`;
        });
    }

    if (summary.driftCount === 0 && summary.securityCount === 0) {
        output += `No issues detected. Your dependencies are healthy!\n`;
    }

    output += `\nRecommended Exit Code: ${summary.recommendedExitCode}\n`;

    return output;
}
