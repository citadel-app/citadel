<p align="center">
  <img src="../../resources/Citadel Banners/1.png" alt="Scriptorium Banner" width="800" />
</p>

# Writing and Editing

**TL;DR**: Citadel features a triple-editor system (**The Scriptorium**) optimized for Scrolls, Code, and Mathematical notation.
Every scroll in Citadel can be opened in the most appropriate editor for its content.

## 1. Scriptorium (Rich Text)
The **Scriptorium** rich text editor is powered by Tiptap and is designed for long-form writing, thought-dumping, and structured documentation.

- **Slash Commands**: Type `/` to bring up a menu of blocks (headers, lists, tables).
- **Bubble Menu**: Highlight text to see formatting options (bold, italic, links).
- **Markdown Support**: The Scriptorium is "Markdown-transparent." It reads and writes `.md` files, so your rich text is always saved as clean Markdown.
- **Embedded Media**: Drag and drop images directly into the Scriptorium. They are automatically saved to your Keep's `assets/` folder.

## 2. Code Snippets (Monaco)
For technical documentation and code storage, Citadel uses the **Monaco Editor** (the engine behind VS Code).

- **Syntax Highlighting**: Support for hundreds of languages out of the box.
- **IntelliSense**: Basic code completion and suggestions.
- **Run Snippets**: If the scroll type supports it, you can run snippets directly in **The Forge**.
- **Vim Mode**: Toggle Vim shortcuts in the settings for that classic developer feel.

## 3. Mathematical Notes (LaTeX)
For researchers and engineers, Citadel provides a first-class **LaTeX Editor**.

- **Side-by-Side Preview**: Type your LaTeX on the left and see professional KaTeX rendering on the right in real-time.
- **Math Blocks**: Use standard `$$` delimiters for equations.
- **Exporting**: Quickly copy the rendered view or export it to PDF (coming soon).

## 4. The Journals (Quick Notes)
Sometimes you just need to jot something down. Use the **Journals** utility (`Shift+Alt+N`) to open a scratchpad. These are saved to a dedicated `notes/` folder in your **Keep**.

## 5. Media & Attachments
- **Image Management**: Images are stored locally in `./assets/`.
- **Scroll Linking**: You can link to any scroll in your Keep using the standard Markdown syntax `[link text](file-path.md)`.
- **Drag & Drop**: Effortlessly move external files into Citadel to attach them to scrolls.

## Scriptorium Walkthrough

1. **Create a Scroll**: Click the **Plus** icon in the activity bar or use `Ctrl+Tab` to open the entry selector.
   - ![Screenshot Placeholder: New Scroll Dialog]
2. **Slash Your Way**: In the Scriptorium, type `/` to quickly insert a code block or a mermaid diagram.
   - ![Screenshot Placeholder: Slash Command Menu in Action]
3. **Toggle Math**: If you're working on physics or algorithms, switch to the **Scribe** (LaTeX) editor for real-time rendering.
   - ![Screenshot Placeholder: LaTeX Editor side-by-side view]

---
**Next Steps:** [Organization](organization.md) | **See Also:** [Concepts: Everything is an Entity](../concepts/entity-logic.md)
**Reference:** [Glossary](glossary.md)
