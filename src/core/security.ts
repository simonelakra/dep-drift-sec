import { DependencyGraph, SecurityIssue, SecurityIssueGroup, RiskLevel } from './types.js';

export function analyzeSecurity(graph: DependencyGraph): SecurityIssueGroup[] {
    const groups: SecurityIssueGroup[] = [];
    const now = new Date();
    const eighteenMonthsAgo = new Date();
    eighteenMonthsAgo.setMonth(now.getMonth() - 18);

    // We check each unique dependency name in the graph
    const dependencyMap = new Map<string, SecurityIssueGroup>();

    for (const node of graph.dependencies) {
        if (dependencyMap.has(node.name)) continue;

        const { metadata } = node;
        const issues: Omit<SecurityIssue, 'dependencyName'>[] = [];

        // 1. Deprecated
        if (metadata.deprecated) {
            issues.push({
                type: 'deprecated',
                reason: `The author of "${node.name}" has marked this library as obsolete (deprecated). Message: "${metadata.deprecated}". It is highly recommended to find a modern alternative as it will likely no longer receive updates.`,
                riskLevel: 'high',
                details: {
                    message: metadata.deprecated,
                    latestVersion: node.resolvedVersion,
                    description: metadata.description
                }
            });
        }

        // 2. Unmaintained
        if (metadata.lastPublish) {
            const lastPublishDate = new Date(metadata.lastPublish);
            if (lastPublishDate < eighteenMonthsAgo) {
                const monthsSince = Math.round((now.getTime() - lastPublishDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
                issues.push({
                    type: 'unmaintained',
                    reason: `The last update for "${node.name}" was on ${lastPublishDate.toLocaleDateString()} (more than 18 months ago). A library that is no longer updated may contain unpatched security vulnerabilities or become incompatible with newer Node.js versions.`,
                    riskLevel: 'medium',
                    details: {
                        lastUpdate: lastPublishDate.toISOString().split('T')[0],
                        monthsSinceLastUpdate: monthsSince,
                        version: node.resolvedVersion,
                        description: metadata.description
                    }
                });
            }
        }

        // 3. Single maintainer
        if (metadata.maintainers === 1) {
            issues.push({
                type: 'single-maintainer',
                reason: `"${node.name}" is managed by only one person. This is risky because if this person stops maintaining it or if their account is compromised, there is no one else to fix issues quickly.`,
                riskLevel: 'low',
                details: {
                    maintainerCount: 1,
                    description: metadata.description
                }
            });
        }

        if (issues.length > 0) {
            // Calculate overallRisk
            const riskOrder = { 'low': 0, 'medium': 1, 'high': 2 };
            let overallRisk: RiskLevel = 'low';
            for (const issue of issues) {
                if (riskOrder[issue.riskLevel] > riskOrder[overallRisk]) {
                    overallRisk = issue.riskLevel;
                }
            }

            const group: SecurityIssueGroup = {
                dependencyName: node.name,
                transitive: node.transitive,
                introducedBy: node.introducedBy || [],
                description: metadata.description,
                issues,
                overallRisk
            };

            dependencyMap.set(node.name, group);
            groups.push(group);
        }
    }

    return groups;
}
