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

    // Fetch metadata for all packages

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
