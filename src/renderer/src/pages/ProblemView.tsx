import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useState, useCallback, useEffect } from 'react';
import { SplitPaneLayout } from '../components/layout';
import { SectionsPanel, CodeSolutionSection, RelatedLinksSection } from '../components/sections';
import { Solution, ExecutionResult } from '../components/sections/CodeSolutionSection';
import { useEntryContent } from '../hooks';
import { dataManager } from '../lib/data-manager';
import { useAppSettings } from '../context/AppSettingsContext';

export const ProblemView = () => {
    const { id } = useParams<{ id: string }>();
    const { settings } = useAppSettings();

    const entry = useLiveQuery(
        () => db.entries.get(id || ''),
        [id]
    );

    const {
        sections,
        handleSaveSection,
        handleDeleteSection,
        handleAddSection
    } = useEntryContent({ entry });

    // Solutions state (full content)
    const [solutions, setSolutions] = useState<Solution[]>([]);
    const [relatedLinks, setRelatedLinks] = useState<any[]>([]);

    // Load solutions from frontmatter/files
    useEffect(() => {
        const loadSolutions = async () => {
            if (!entry) return;

            let loadedSolutions: Solution[] = [];

            if (entry.frontmatter?.solutions) {
                // Load each solution
                loadedSolutions = await Promise.all(entry.frontmatter.solutions.map(async (s: any) => {
                    // Start with what's in frontmatter
                    const solution: Solution = {
                        id: s.id,
                        language: s.language,
                        code: s.code || '' // Fallback if still in frontmatter
                    };

                    // If path exists, try reading from file
                    if (s.path && !solution.code) {
                        try {
                            solution.code = await dataManager.readEntryFile(entry.id, s.path);
                        } catch (e) {
                            console.error(`Failed to read solution file ${s.path}:`, e);
                            solution.code = '// Error loading solution file';
                        }
                    }
                    return solution;
                }));
            } else if (entry.frontmatter?.solution) {
                // Migration: convert old single solution
                loadedSolutions = [{
                    id: 'sol-1',
                    language: entry.frontmatter.language || 'typescript',
                    code: entry.frontmatter.solution
                }];
            }

            setSolutions(loadedSolutions);

            if (entry.frontmatter?.relatedLinks) {
                setRelatedLinks(entry.frontmatter.relatedLinks);
            }
        };

        loadSolutions();
    }, [entry?.id, entry?.frontmatter?.solutions, entry?.frontmatter?.solution, entry?.frontmatter?.relatedLinks]);
    // Note: We depend on specific frontmatter fields to avoid loops if other fields change, 
    // but ideally we should only run this when the *identity* of the solutions changes, not the content if we are the ones updating it.
    // However, since we update frontmatter with Metadata (path) and not Code, the `entry.frontmatter` will change after save.
    // We need to be careful not to overwrite local state with file state if we just saved it.
    // The `useLiveQuery` updates `entry`.
    // Actually, distinct check might reflect that logic.
    // For now, let's assume `entry` update triggers this. If we just saved, the file content should match local state.

    const handleSolutionsChange = useCallback(async (newSolutions: Solution[]) => {
        if (!entry) return;

        // Update local state immediately for UI responsiveness
        setSolutions(newSolutions);

        // Prepare metadata for frontmatter
        const solutionsMetadata = await Promise.all(newSolutions.map(async (sol) => {
            const env = settings.executionEnvironments?.[sol.language];
            const ext = env?.extension || 'txt';
            const relativePath = `solutions/${sol.id}.${ext}`;

            // Write content to file
            await dataManager.writeEntryFile(entry.id, relativePath, sol.code);

            // Return metadata (excluding code to save DB space)
            return {
                id: sol.id,
                language: sol.language,
                path: relativePath
                // no 'code' field
            };
        }));

        // Update frontmatter with metadata
        await dataManager.updateEntry(entry.id, {
            frontmatter: { ...entry.frontmatter, solutions: solutionsMetadata }
        });
    }, [entry, settings.executionEnvironments]);

    const handleRunSolution = useCallback(async (solution: Solution): Promise<ExecutionResult> => {
        if (!solution.code.trim()) {
            throw new Error("No code to execute");
        }

        // 1. Get Environment Config
        const env = settings.executionEnvironments?.[solution.language];
        if (!env) {
            throw new Error(`No execution environment configured for ${solution.language}. Please check Settings.`);
        }

        // 2. Call Execution Server
        try {
            const baseUrl = settings.executionUrl || 'http://127.0.0.1:5051';
            const url = baseUrl.replace('localhost', '127.0.0.1');

            const response = await fetch(`${url}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: solution.code,
                    language: solution.language,
                    image: env.image,
                    command: env.command,
                    extension: env.extension
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error("Execution failed:", error);
            throw error;
        }
    }, [settings.executionEnvironments, settings.ttsUrl]);

    const handleAddLink = useCallback(async (link: Omit<any, 'id'>) => {
        if (!entry) return;
        const newLink = { ...link, id: `link-${Date.now()}` };
        const updated = [...relatedLinks, newLink];
        setRelatedLinks(updated);
        await dataManager.updateEntry(entry.id, {
            frontmatter: { ...entry.frontmatter, relatedLinks: updated }
        });
    }, [entry, relatedLinks]);

    const handleRemoveLink = useCallback(async (linkId: string) => {
        if (!entry) return;
        const updated = relatedLinks.filter(l => l.id !== linkId);
        setRelatedLinks(updated);
        await dataManager.updateEntry(entry.id, {
            frontmatter: { ...entry.frontmatter, relatedLinks: updated }
        });
    }, [entry, relatedLinks]);

    if (!entry && !id) return <div className="p-8">No ID provided</div>;
    if (!entry) return <div className="p-8 animate-pulse">Loading problem...</div>;

    const problemPanel = (
        <div className="h-full overflow-auto">
            <SectionsPanel
                entry={entry}
                sections={sections}
                onSectionSave={handleSaveSection}
                onSectionDelete={handleDeleteSection}
                onSectionAdd={handleAddSection}
            />

            {/* Related Links at bottom of problem panel */}
            <div className="px-8 pb-8 -mt-16">
                <div className="max-w-3xl mx-auto">
                    <RelatedLinksSection
                        links={relatedLinks}
                        onAddLink={handleAddLink}
                        onRemoveLink={handleRemoveLink}
                    />
                </div>
            </div>
        </div>
    );

    const codePanel = (
        <div className="h-full border-l border-border">
            <CodeSolutionSection
                solutions={solutions}
                onSolutionsChange={handleSolutionsChange}
                onRunSolution={handleRunSolution}
            />
        </div>
    );

    return (
        <SplitPaneLayout
            leftPanel={problemPanel}
            rightPanel={codePanel}
            defaultLeftSize={45}
            controlsPosition="top-left"
        />
    );
};
