import { useParams } from 'react-router-dom';
import { EntryDetailView } from '../components/EntryDetailView';

export const GenericEntryView = () => {
    const { id } = useParams<{ id: string }>();

    if (!id) return <div className="p-8">No ID provided</div>;

    return <EntryDetailView id={id} />;
};
