<p align="center">
  <img src="../../resources/Citadel Banners/2.png" alt="Organization Banner" width="800" />
</p>

# Organizing Your Keep

**TL;DR**: Use Metadata, Nested Tags, and the Tag Graph to create a highly queryable and interconnected knowledge base.
Every file in your **Keep** is more than just text—it's a **Scroll** with rich organization capabilities.

## 1. Metadata (The Frontmatter)
Every entry in Citadel contains a **YAML Frontmatter** block at the top of the file. This is the "brain" of the file.

```yaml
---
id: a1b2c3d4
title: Project Alpha Docs
type: project
status: active
tags: [work, architecture]
created: 2024-03-01T10:00:00Z
updated: 2024-03-06T15:00:00Z
---
```

- **Types**: Define what kind of scroll it is (e.g., Paper, Project, Note). Types are customizable in Settings.
- **Global Fields**: Fields like `title`, `tags`, and `created` are used by **The Archives** for searching and filtering.
- **Custom Fields**: You can add *any* field to the frontmatter. Citadel will preserve it and allow you to filter by it in **The Archives**.

## 2. The Archives
The Archives is your primary interface for organization.

- **Instant Search**: Search by title or content across your entire Keep.
- **Filtering**: Use the filter bar to see only certain `types` or `tags`.
- **Sorting**: Order scrolls by date created, last modified, or alphabetically.

## 3. Nested Tags
Citadel supports hierarchical tagging. Use forward slashes in your tags to create sub-categories:
- `work/project-a`
- `work/project-b`
- `life/health`

In **The Lexicon** (Tag Manager), you can collapse and expand these hierarchies to keep your sidebar clean.

## 4. The Graph View
Want to see how your thoughts connect? The **Tag Graph** visualizes the relationships between your entries based on shared tags.

- **Nodes**: Each entry or tag is a node.
- **Connections**: Lines indicate shared metadata or direct links.
- **Clustering**: Watch your projects naturally cluster together as you add more content.

## 5. Keep Structure
Citadel organizes your files into folders based on their **Type**. For example:
- `01_Papers/`
- `02_Projects/`
- `99_Notes/`

These folders are configurable. While you can move files manually on disk, we recommend letting Citadel handle the folder structure to keep your **Keep** consistent.

## Organization Walkthrough

1. **Tagging a Scroll**: Use the frontmatter to add tags. These will instantly appear in **The Lexicon**.
   - ![Screenshot Placeholder: Frontmatter editor highlighting the tags field]
2. **Explore the Graph**: Switch to the **Lexicon Overview** to see your connections.
   - ![Screenshot Placeholder: Graph View showing interconnected clusters]
3. **Filter the Archives**: Use the sidebar to filter your Keep by specific namespaces like `work/` or `personal/`.
   - ![Screenshot Placeholder: The Archives with an active filter]

---
**Next Steps:** [Visual Tools](visual-tools.md) | **See Also:** [Concepts: Zettelkasten](../concepts/zettelkasten.md)
**Reference:** [Glossary](glossary.md)
