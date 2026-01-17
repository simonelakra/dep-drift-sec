import { DependencyGraph, DependencyNode, RawProjectData, RegistryMetadata } from './types.js';

export function buildDependencyGraph(
    project: RawProjectData,
    metadataMap: Record<string, RegistryMetadata>,
    environment: 'local' | 'ci' | 'prod' = 'local'
): DependencyGraph {
    const { packageJson, packageLock } = project;
    const dependencies: DependencyNode[] = [];
    const lockPackages: Record<string, any> = packageLock.packages || {};

    const directDeps: Record<string, string> = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
    };

    // Build a map of dependency name -> list of parents that require it
    // We use both the path (for nested npm v3 style) AND the dependencies field (for flat npm v7+ style)
    const parentMap: Record<string, Set<string>> = {};
    for (const [path, pkg] of Object.entries(lockPackages)) {
        // 1. From Path Nesting (Fallback for minimized lockfiles or npm < 7)
        const pathParts = path.split('node_modules/');
        if (pathParts.length > 2) {
            const depName = pathParts[pathParts.length - 1];
            const parentName = pathParts[pathParts.length - 2].replace(/\/$/, '');
            if (!parentMap[depName]) parentMap[depName] = new Set();
            parentMap[depName].add(parentName);
        }

        // 2. From dependencies field (Standard npm behavior)
        const currentPkgName = path === '' ? (packageJson.name || 'root') : path.split('node_modules/').pop()!;
        const pkgDeps = {
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {}),
            ...(pkg.optionalDependencies || {})
        };
        for (const depName of Object.keys(pkgDeps)) {
            if (!parentMap[depName]) parentMap[depName] = new Set();
            parentMap[depName].add(currentPkgName);
        }
    }

    // Process nodes
    const processedNodes = new Map<string, DependencyNode>();

    for (const [path, pkg] of Object.entries(lockPackages)) {
        if (path === '') continue; // Skip root

        if (path.startsWith('node_modules/')) {
            const name = path.split('node_modules/').pop()!;

            // If we have multiple paths for the same package (transitive drift),
            // we'll handle them as separate nodes if their versions differ,
            // but usually buildDependencyGraph has been flat-ish so far.
            // Let's keep it simple: one node per unique package name from the lockfile's perspective.

            const versionRange = directDeps[name] || pkg.version;
            const isTransitive = !directDeps[name];
            const meta = metadataMap[name];

            // Direct parents are those who have this dependency in their path segment
            // but we filter out 'root' for the introducedBy array as requested previously
            // actually, if it's transitive, we want the non-root parents.
            const parents = Array.from(parentMap[name] || []).filter(p => p !== (packageJson.name || 'root'));

            dependencies.push({
                name,
                version: typeof versionRange === 'string' ? versionRange : pkg.version,
                resolvedVersion: pkg.version,
                transitive: isTransitive,
                introducedBy: parents,
                metadata: {
                    lastPublish: meta?.time?.[meta['dist-tags']?.latest],
                    maintainers: meta?.maintainers?.length,
                    deprecated: meta?.deprecated,
                    description: meta?.description,
                },
            });
        }
    }

    return {
        root: packageJson.name || 'root',
        environment,
        dependencies,
    };
}
