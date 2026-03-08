<p align="center">
  <img src="../../resources/Citadel Banners/2.png" alt="War Room Banner" width="800" />
</p>

# Visual Tools: The War Room

**TL;DR**: Manage projects and brainstorm ideas visually with integrated Kanban boards and infinite whiteboards—all centralized in **The War Room**.

Sometimes text isn't enough. Citadel provides powerful visual tools to help you brainstorm and manage your projects.

## 1. Infinite Whiteboards (Excalidraw)
The Citadel **Whiteboard** is powered by Excalidraw, giving you a hand-drawn feel with the power of a digital tool.

- **Diagramming**: Easily create flowcharts, wireframes, and architectural diagrams.
- **Embedded in Scrolls**: You can link a Whiteboard to any scroll. The whiteboard state is saved as a sidecar `.json` file in your Keep.
- **Hand-Drawn Aesthetic**: Perfect for brainstorms where you want to focus on ideas, not pixel-perfection.
- **Integrated Library**: Use the built-in Excalidraw libraries to drag in pre-made shapes and icons.

## 2. Kanban Boards
Manage your workflow with the integrated **Kanban Page**.

- **Status Columns**: Visualize your projects by status (e.g., Todo, In Progress, Review, Done).
- **Drag & Drop**: Move entries between columns to update their status instantly.
- **Metadata Integration**: Changing an entry's column on the Kanban board automatically updates the `status` field in its frontmatter.
- **Filtering**: View a Kanban board for a specific `type` or `tag` to focus on a particular project.

## How Visual Tools Save Data
Both Whiteboards and Kanban boards are **local-first**.
- Whiteboards are saved as `.json` files in the `.codex/boards/` directory of your **Keep**.
- Kanban state is derived directly from your scrolls' frontmatter—the board *is* your data.

## War Room Walkthrough

1. **Strategize on the Board**: Open **The War Room** (Kanban) to see your projects organized by status.
   - ![Screenshot Placeholder: The War Room with various task columns]
2. **Brainstorm on the Canvas**: Click **The Canvas** in the sidebar to open an infinite whiteboard.
   - ![Screenshot Placeholder: Whiteboard with architectural diagrams]
3. **Pivoting Data**: In the War Room, use the **Pivot** toggle to reorganize your board by `Type`, `Priority`, or any other frontmatter field.
   - ![Screenshot Placeholder: Kanban board being pivoted to show tasks by Priority]

---
**Next Steps:** [External Knowledge](external-knowledge.md) | **See Also:** [Concepts: Zettelkasten](../concepts/zettelkasten.md)
**Reference:** [Glossary](glossary.md)
