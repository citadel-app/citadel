/**
 * QdrantStore — VectorStoreProvider wrapping the existing VectorService logic.
 */
import type { VectorStoreProvider, VectorPoint } from './interfaces';

export class QdrantStore implements VectorStoreProvider {
    readonly name = 'qdrant';
    private baseUrl: string = 'http://127.0.0.1:6333';
    private collectionName: string = 'codex_entries';

    setBaseUrl(url: string) {
        this.baseUrl = url.replace(/\/$/, '');
    }

    setCollectionName(name: string) {
        this.collectionName = name;
    }

    async checkConnection(): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections`);
            return response.ok;
        } catch {
            return false;
        }
    }

    async ensureCollection(vectorSize: number = 768): Promise<boolean> {
        try {
            const checkResp = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}`);
            if (checkResp.ok) return true;

            const createResp = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vectors: { size: vectorSize, distance: 'Cosine' }
                })
            });

            if (!createResp.ok) {
                console.error('[QdrantStore] Failed to create collection:', createResp.text);
                return false;
            }

            // Create payload index for entryId
            await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/index`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    field_name: 'entryId',
                    field_schema: 'keyword'
                })
            });

            return true;
        } catch (e) {
            console.error('[QdrantStore] Failed to ensure collection:', e);
            return false;
        }
    }

    async upsert(points: VectorPoint[]): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points })
            });
            return response.ok;
        } catch (e) {
            console.error('[QdrantStore] Upsert failed:', e);
            return false;
        }
    }

    async search(vector: number[], limit: number = 10, filter?: any): Promise<any[]> {
        try {
            const body: any = { vector, limit, with_payload: true };
            if (filter) {
                // Support string entryId filter (shorthand)
                if (typeof filter === 'string') {
                    body.filter = { must: [{ key: 'entryId', match: { value: filter } }] };
                } else {
                    body.filter = filter;
                }
            }

            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) return [];
            const data = JSON.parse(response.text);
            return data.result || [];
        } catch (e) {
            console.error('[QdrantStore] Search failed:', e);
            return [];
        }
    }

    async deleteByFilter(filter: any): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filter })
            });
            return response.ok;
        } catch (e) {
            console.error('[QdrantStore] Delete failed:', e);
            return false;
        }
    }

    async clearAll(): Promise<boolean> {
        try {
            // Delete and recreate the collection
            await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}`, { method: 'DELETE' });
            return this.ensureCollection();
        } catch (e) {
            console.error('[QdrantStore] Clear failed:', e);
            return false;
        }
    }

    async getPointsByFilter(filter: any, limit: number = 10): Promise<any[]> {
        try {
            const body: any = {
                filter,
                limit,
                with_payload: true,
                with_vector: false
            };

            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) return [];
            const data = JSON.parse(response.text);
            return data.result?.points || [];
        } catch (e) {
            console.error('[QdrantStore] getPointsByFilter failed:', e);
            return [];
        }
    }

    async deleteCollection(): Promise<boolean> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (e) {
            console.error('[QdrantStore] deleteCollection failed:', e);
            return false;
        }
    }

    async getEntryVectorCount(entryId: string): Promise<number> {
        try {
            const body = {
                filter: { must: [{ key: 'entryId', match: { value: entryId } }] },
                limit: 0,
                exact: true
            };

            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${this.collectionName}/points/count`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

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
            if (!response.ok) return null;
            const data = JSON.parse(response.text);
            return data;
        } catch {
            return null;
        }
    }

    async getCollections(): Promise<string[]> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections`);
            if (!response.ok) return [];
            const data = JSON.parse(response.text);
            return (data.result?.collections || []).map((c: any) => c.name);
        } catch {
            return [];
        }
    }

    async getCollectionInfo(name: string): Promise<any> {
        try {
            const response = await window.api.net.fetch(`${this.baseUrl}/collections/${name}`);
            if (!response.ok) return null;
            const data = JSON.parse(response.text);
            const result = data.result;
            return {
                name,
                pointsCount: result?.points_count || 0,
                vectorsCount: result?.vectors_count || 0,
                segmentsCount: result?.segments_count || 0,
                status: result?.status || 'unknown'
            };
        } catch {
            return null;
        }
    }
}
