import { TldrawWrapper } from '../components/editors/TldrawWrapper';

export const TldrawPage = () => {
    return (
        <div className="h-full w-full bg-background flex flex-col">
            <TldrawWrapper
                persistenceKey='whiteboard'
                className="w-full h-full"
            />
        </div>
    );
};
