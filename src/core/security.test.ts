import { describe, it, expect } from 'vitest';
import { analyzeSecurity } from './security.js';
import { DependencyGraph } from './types.js';

describe('analyzeSecurity', () => {
    it('should group multiple issues for the same dependency', () => {
        const now = new Date().toISOString();
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 2);

        const graph: DependencyGraph = {
            root: 'test',
            environment: 'local',
            dependencies: [
                {
                    name: 'risky-pkg',
                    version: '1.0.0',
                    resolvedVersion: '1.0.0',
                    transitive: true,
                    introducedBy: ['parent-a'],
                    metadata: {
                        deprecated: 'This is obsolete',
                        lastPublish: oldDate.toISOString(),
                        maintainers: 1
                    }
                }
            ]
        };

        const groups = analyzeSecurity(graph);
        expect(groups).toHaveLength(1);
        expect(groups[0].dependencyName).toBe('risky-pkg');
        expect(groups[0].issues).toHaveLength(3); // deprecated, unmaintained, single-maintainer
        expect(groups[0].overallRisk).toBe('high');
        expect(groups[0].transitive).toBe(true);
        expect(groups[0].introducedBy).toContain('parent-a');
    });

    it('should calculate correct overallRisk (highest wins)', () => {
        const graph: DependencyGraph = {
            root: 'test',
            environment: 'local',
            dependencies: [
                {
                    name: 'medium-risk-pkg',
                    version: '1.0.0',
                    resolvedVersion: '1.0.0',
                    transitive: false,
                    introducedBy: [],
                    metadata: {
                        maintainers: 1, // low risk
                        lastPublish: new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString() // ~2 years ago -> medium risk
                    }
                }
            ]
        };

        const groups = analyzeSecurity(graph);
        expect(groups[0].overallRisk).toBe('medium');
    });
});
