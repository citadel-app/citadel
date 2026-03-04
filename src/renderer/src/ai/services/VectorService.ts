export interface QdrantPoint {
    id: string;
    vector: number[];
    payload: Record<string, any>;
}

export class VectorService {
    private baseUrl: string = 'http://127.0.0.1:6333';
    private collectionName: string = 'codex_entries';

    /**
     * Check if Qdrant is reachable.
     */
    async checkConnection(): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections`);
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * Ensure the collection exists.
     */
    async ensureCollection(vectorSize: number = 768): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}`);
            if (response.ok) return true;

            // Create if not exists
            const createResponse = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vectors: {
                        size: vectorSize,
                        distance: 'Cosine'
                    }
                })
            });
            return createResponse.ok;
        } catch (e) {
            console.error('[VectorService] Setup failed:', e);
            return false;
        }
    }

    /**
     * Upsert points into Qdrant.
     */
    async upsert(points: QdrantPoint[]): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points })
            });
            return response.ok;
        } catch (e) {
            console.error('[VectorService] Upsert failed:', e);
            return false;
        }
    }

    /**
     * Search for similar points.
     */
    async search(vector: number[], limit: number = 10, filter?: any): Promise<any[]> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vector,
                    limit,
                    filter,
                    with_payload: true
                })
            });

            if (!response.ok) return [];
            const data = JSON.parse(response.text);
            return data.result || [];
        } catch (e) {
            console.error('[VectorService] Search failed:', e);
            return [];
        }
    }

    /**
     * Delete points by filter (e.g., entryId).
     */
    async deleteByFilter(filter: any): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filter })
            });
            return response.ok;
        } catch (e) {
            console.error('[VectorService] Delete failed:', e);
            return false;
        }
    }

    /**
     * Clear all points in the collection.
     */
    async clearAll(): Promise<boolean> {
        try {
            // Re-create the collection to wipe it
            await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}`, { method: 'DELETE' });
            return await this.ensureCollection();
        } catch (e) {
            return false;
        }
    }
    /**
     * Get system info (e.g. version).
     */
    async deleteEntryIndex(entryId: string): Promise<boolean> {
        return this.deleteByFilter({
            must: [{ key: 'entryId', match: { value: entryId } }]
        });
    }

    /**
     * Get points using a payload filter (scroll API)
     */
    async getPointsByFilter(filter: any, limit: number = 10): Promise<any[]> {
        try {
            const response = await window.api.net.fetch(
                `${this.baseUrl}/collections/${this.collectionName}/points/scroll`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filter,
                        limit,
                        with_payload: true,
                        with_vector: false
                    })
                }
            );

            if (!response.ok) return [];
            const data = JSON.parse(response.text);
            return (data.result?.points || []).map((r: any) => ({
                id: r.id,
                score: 1.0,
                payload: r.payload
            }));
        } catch (e) {
            console.error('[VectorService] Scroll failed:', e);
            return [];
        }
    }

    /**
     * Delete the entire collection
     */
    async deleteCollection(): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(
                `${this.baseUrl}/collections/${this.collectionName}`,
                { method: 'DELETE' }
            );
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get count of vectors for an entry
     */
    async getEntryVectorCount(entryId: string): Promise<number> {
        try {
            const response = await window.api.net.fetch(
                `${this.baseUrl}/collections/${this.collectionName}/points/count`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filter: {
                            must: [{ key: 'entryId', match: { value: entryId } }]
                        },
                        exact: true
                    })
                }
            );
            if (!response.ok) return 0;
            const data = JSON.parse(response.text);
            return data.result?.count || 0;
        } catch (e) {
            return 0;
        }
    }

    async getInfo(): Promise<any> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/`);
            if (response.ok) {
                const data = JSON.parse(response.text);
                return data; // Qdrant returns basic info at root
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get list of all collections.
     */
    async getCollections(): Promise<string[]> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections`);
            if (response.ok) {
                const data = JSON.parse(response.text);
                return data.result.collections.map((c: any) => c.name);
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Get detailed info for a specific collection.
     */
    async getCollectionInfo(name: string): Promise<any> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${name}`);
            if (response.ok) {
                const data = JSON.parse(response.text).result;
                return {
                    name,
                    pointsCount: data.points_count,
                    vectorsCount: data.vectors_count,
                    segmentsCount: data.segments_count,
                    status: data.status
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    }
}

export const vectorService = new VectorService();
