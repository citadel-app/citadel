import { TiptapWrapper } from '../components/editors/TiptapWrapper';
// import { CodeEditor } from '../components/editors/CodeEditor'; // TODO: Wrapper for Monaco

export const EditorRegistry = {
    markdown: TiptapWrapper,
    code: ({ content: _content, onChange: _onChange, readOnly: _readOnly }) => <pre>{_content}</pre>, // Placeholder
    list: ({ content: _content }) => <div>List Helper</div>, // Placeholder
    whiteboard: ({ content: _content }) => <div>Canvas Helper</div> // Placeholder
};
