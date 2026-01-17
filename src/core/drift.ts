import { DependencyGraph, DriftIssue, DriftIssueGroup } from './types.js';

export function detectDrift(graph: DependencyGraph): DriftIssueGroup[] {
    const groups: DriftIssueGroup[] = [];
    const groupMap = new Map<string, DriftIssueGroup>();

    const getGroup = (name: string): DriftIssueGroup => {
        if (!groupMap.has(name)) {
            const node = graph.dependencies.find(d => d.name === name);
            const group: DriftIssueGroup = {
                dependencyName: name,
                transitive: node?.transitive ?? false,
                introducedBy: node?.introducedBy ?? [],
                issues: []
            };
            groupMap.set(name, group);
            groups.push(group);
        }
        return groupMap.get(name)!;
    };

    for (const node of graph.dependencies) {
        // 1. Check for ^ or ~ on direct dependencies
        if (!node.transitive) {
            const range = node.version;
            if (range.startsWith('^') || range.startsWith('~')) {
                getGroup(node.name).issues.push({
                    dependencyName: node.name,
                    type: 'range-usage',
                    expected: range,
                    actual: range,
                    reason: `The dependency "${node.name}" uses a "${range[0]}" symbol (e.g., ^ or ~). This means npm might automatically install a newer version. To ensure everyone uses the exact same version, it is better to use a fixed version (e.g., "1.2.3" instead of "${range}").`
                });
            }
        }
    }

    // 2. Detect multiple versions of the same dependency (Transitive Drift)
    const versionMap: Record<string, Set<string>> = {};
    for (const node of graph.dependencies) {
        if (!versionMap[node.name]) versionMap[node.name] = new Set();
        versionMap[node.name].add(node.resolvedVersion);
    }

    for (const [name, versions] of Object.entries(versionMap)) {
        if (versions.size > 1) {
            getGroup(name).issues.push({
                dependencyName: name,
                type: 'transitive-drift',
                expected: Array.from(versions)[0],
                actual: Array.from(versions).join(', '),
                reason: `Multiple versions of "${name}" are present in your project (${Array.from(versions).join(', ')}). This often happens when different libraries require incompatible versions of the same dependency. This can increase project size and cause unpredictable bugs.`
            });
        }
    }

    return groups.filter(g => g.issues.length > 0);
}
