import { describe, it, expect } from 'vitest';
import { detectDrift } from './drift.js';
import { DependencyGraph } from './types.js';

describe('detectDrift', () => {
    it('should detect range usage in direct dependencies', () => {
        const graph: DependencyGraph = {
            root: 'test',
            environment: 'local',
            dependencies: [
                {
                    name: 'lodash',
                    version: '^4.17.21',
                    resolvedVersion: '4.17.21',
                    transitive: false,
                    introducedBy: [],
                    metadata: {}
                }
            ]
        };

        const groups = detectDrift(graph);
        expect(groups).toHaveLength(1);
        expect(groups[0].dependencyName).toBe('lodash');
        expect(groups[0].issues).toHaveLength(1);
        expect(groups[0].issues[0].type).toBe('range-usage');
    });

    it('should detect transitive drift (multiple versions)', () => {
        const graph: DependencyGraph = {
            root: 'test',
            environment: 'local',
            dependencies: [
                {
                    name: 'lodash',
                    version: '4.17.1',
                    resolvedVersion: '4.17.1',
                    transitive: true,
                    introducedBy: ['a'],
                    metadata: {}
                },
                {
                    name: 'lodash',
                    version: '4.17.21',
                    resolvedVersion: '4.17.21',
                    transitive: true,
                    introducedBy: ['b'],
                    metadata: {}
                }
            ]
        };

        const groups = detectDrift(graph);
        expect(groups).toHaveLength(1);
        expect(groups[0].dependencyName).toBe('lodash');
        expect(groups[0].issues.some(i => i.type === 'transitive-drift')).toBe(true);
    });

    it('should return no issues for pinned versions and no duplication', () => {
        const graph: DependencyGraph = {
            root: 'test',
            environment: 'local',
            dependencies: [
                {
                    name: 'lodash',
                    version: '4.17.21',
                    resolvedVersion: '4.17.21',
                    transitive: false,
                    introducedBy: [],
                    metadata: {}
                }
            ]
        };

        const groups = detectDrift(graph);
        expect(groups).toHaveLength(0);
    });
});
