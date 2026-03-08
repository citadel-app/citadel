<p align="center">
  <img src="../../resources/Citadel Banners/3.png" alt="Entity Logic Banner" width="800" />
</p>

# Concept: Everything is a Scroll

Citadel operates on a **File-as-Entity** model. This is the secret to how a simple folder of text files becomes a powerful knowledge database.

## Markdown + YAML = Object
When you create a file in Citadel, it isn't just a document. It is a structured object.
- **The Body**: Standard Markdown for your thoughts, tables, and code.
- **The Identity**: A YAML block (Frontmatter) that gives the file a unique `id` and `type`.

This combination allows Citadel to treat your scrolls like rows in a database while maintaining the readability of a text file.

## Schema & Types
Every scroll has a `type` (e.g., `paper`, `project`, `note`). 
- **Strict schemas**: Certain types require specific fields (like a `doi` for papers).
- **Flexible Data**: You can add any custom metadata fields to the frontmatter, and Citadel will index them for search.

## The Indexing Engine
In the background, Citadel constantly watches your **Keep**. When you edit a file, the indexing engine:
1. Parses the YAML metadata.
2. Updates the local search index.
3. Maps connections for the **Graph View**.
4. Vectorizes the content for **The Oracle**.

---
**Next Steps:** Master the [Zettelkasten Method](zettelkasten.md) | **Reference:** [Glossary](../user/glossary.md)
