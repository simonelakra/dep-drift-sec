import axios from 'axios';
import { RegistryMetadata } from '../core/types.js';

const REGISTRY_URL = 'https://registry.npmjs.org';

export async function fetchNpmMetadata(packageName: string): Promise<RegistryMetadata | null> {
    try {
        const response = await axios.get(`${REGISTRY_URL}/${packageName}`, {
            timeout: 5000,
        });
        return response.data;
    } catch (error: any) {
        // If not found or error, return null (might be private or deleted)
        return null;
    }
}

export async function fetchAllMetadata(packageNames: string[]): Promise<Record<string, RegistryMetadata>> {
    const metadataMap: Record<string, RegistryMetadata> = {};

    // For MVP, we fetch sequentially or in small chunks to avoid registry rate limits
    // but since we might have many transitive deps, we'll do them in parallel with a limit if needed.
    // Here we'll just do a simple Promise.all for now.

    const results = await Promise.all(
        packageNames.map(async (name) => {
            const meta = await fetchNpmMetadata(name);
            return { name, meta };
        })
    );

    for (const { name, meta } of results) {
        if (meta) {
            metadataMap[name] = meta;
        }
    }

    return metadataMap;
}
