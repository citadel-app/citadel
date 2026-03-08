<p align="center">
  <img src="../../resources/Citadel Banners/2.png" alt="Developer Suite Banner" width="800" />
</p>

# The Developer Suite: Bastion, Forge, and TTS

**TL;DR**: Harness industrial-grade version control (**The Bastion**) and isolated code execution (**The Forge**) directly within your Keep.

## 1. Integrated Source Control (The Bastion)
Every Keep in Citadel is a Git repository. 

- **Auto-Commit**: By default, Citadel can automatically commit changes as you save. You can toggle this in Settings.
- **Manual Control**: Use the **Bastion** page to stage specific files, write commit messages, and push to your remote.
- **Diff View**: Review changes before you commit with an integrated, syntax-highlighted diff viewer.
- **Sync History**: Track your brain's growth over time with standard version history.

## 2. The Forge (Docker REPL)
Execute code in a secure, isolated environment without leaving your Keep.

- **Sandbox Safety**: Every session runs inside a transient Docker container. Changes do not persist, keeping your host system clean.
- **Multi-Language**: Native support for **Python**, **Node.js**, **Rust**, **Go**, **Ruby**, and **Lua**.
- **Instant Cleanup**: Containers are automatically removed when the session ends or if the app is closed.
- **Watchtower Integration**: Monitor and stop all Citadel-managed containers via the **Watchtower** dashboard.

> [!IMPORTANT]
> Forge sessions are isolated for security. They do not have native access to your Keep files unless explicitly shared (available in a future update).

## 3. Text-to-Speech (TTS)
Listen to your research while you code.

- **Developer TTS**: Optimized for reading technical content, including code blocks and Markdown structures.
- **Integrated Controls**: Play, pause, and skip between entries from the status bar.
- **Python-Powered**: The TTS engine runs as a lightweight Python server, ensuring high-quality voice synthesis without slowing down the UI.

- **The Workshop**: Right-click any entry or folder to open your system terminal at that location.
- **Citadel CLI**: Use the command line to create entries or search your Keep from outside the app.

## 4. The Scribe (Professional LaTeX)
For high-stakes mathematical and academic writing, Citadel provides **The Scribe**.

- **Bimodal Editing**: Switch between a lightning-fast Markdown preview (**Quick Mode**) and a full LaTeX compilation environment (**Pro Mode**).
- **Project Structure**: Manage multi-file LaTeX projects with dedicated folders for images, bib files, and style sheets.
- **Cloud-Grade Build**: The Scribe leverages your local `pdflatex` and `bibtex` engines to generate pixel-perfect PDFs directly in your Keep.
- **Error Intelligence**: Automated log parsing identifies missing packages and syntax errors, providing one-click "Jump to Line" capabilities.

## Developer Suite Walkthrough

1. **Secure the Bastion**: Open the source control panel to see all uncommitted scrolls in your Keep.
   - ![Screenshot Placeholder: The Bastion interface showing a diff of a changed note]
2. **Ignite The Forge**: Click the terminal icon on a code scroll to launch an isolated Docker environment and run your script.
   - ![Screenshot Placeholder: The Forge terminal running a Python script]
3. **Consult The Scribe**: Open the LaTeX editor to craft beautiful mathematical scrolls or academic papers.
   - ![Screenshot Placeholder: The Scribe interface with a side-by-side PDF preview]
4. **Guard the Watchtower**: Monitor the system health and all active containers from the central dashboard.
   - ![Screenshot Placeholder: The Watchtower showing active services and Forge containers]

---
**Next Steps:** [Productivity](productivity.md) | **See Also:** [Concepts: Everything is an Entity](../concepts/entity-logic.md)
**Reference:** [Glossary](glossary.md)
