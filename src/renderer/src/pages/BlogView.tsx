import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { SectionsPanel } from '../components/sections';
import { useEntryContent } from '../hooks';

export const BlogView = () => {
    const { id } = useParams<{ id: string }>();

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

    if (!entry && !id) return <div className="p-8">No ID provided</div>;
    if (!entry) return <div className="p-8 animate-pulse">Loading blog...</div>;

    return (
        <div className="h-full">
            <SectionsPanel
                entry={entry}
                sections={sections}
                onSectionSave={handleSaveSection}
                onSectionDelete={handleDeleteSection}
                onSectionAdd={handleAddSection}
            />
        </div>
    );
};
