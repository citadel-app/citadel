<p align="center">
  <img src="../../resources/Citadel Banners/3.png" alt="Privacy and Sync Banner" width="800" />
</p>

# Privacy, Security, and Synchronization

**TL;DR**: Citadel is built on the belief that privacy is a feature, not a setting. Your data is yours, stored locally and synced via **The Bastion**.

## 1. Local-First Architecture
- **No Cloud Required**: Your files stay on your hard drive. Citadel can work completely offline, forever.
- **Markdown & YAML**: Your data is stored in human-readable formats. Even if Citadel were to disappear, you could open your notes in any text editor.
- **No Tracking**: We do not collect telemetry, usage stats, or "phone home" with your content.

## 2. Git-Backed Synchronization (The Bastion)
Citadel solves the "sync" problem using **The Bastion** (Git). This gives you full control over where your data is stored.

- **Choice of Provider**: You can use GitHub, GitLab, Bitbucket, or your own private Git server.
- **End-to-End Control**: Your data is encrypted in transit and at rest by your Git provider.
- **Conflict Resolution**: Because it's Git, handling edits from multiple devices is robust and predictable.
- **Version History**: Every change is a commit. You can go back in time to any version of any note.

## 3. Credential Management
- **Secret Storage**: Citadel uses your OS's native secret storage (like Keychain on macOS or Windows Credential Manager) to store your GitHub tokens.
- **Fine-Grained Permissions**: When you authorize the GitHub App, Citadel only requests access to the repositories you specify.

Since Citadel is local-first, you can use your OS's built-in disk encryption (BitLocker, FileVault) to protect your entire **Keep** folder. For added security, you can store your Keep in an encrypted volume or a VeraCrypt container.

## Sync Walkthrough

1. **Initialize the Bastion**: In the Source Control page, click **Construct** to initialize a Git repository in your Keep folder.
   - ![Screenshot Placeholder: Constructing a new repository from a local folder]
2. **Push to Remote**: Securely authenticate with GitHub and push your local Keep to a private repository.
   - ![Screenshot Placeholder: GitHub Authentication success screen]
3. **Multi-Device Sync**: On your second device, use **Replicate** (Clone) to pull your Keep down and start working immediately.
   - ![Screenshot Placeholder: Replicating a Keep on a new machine]

---
**Next Steps:** [Introduction](introduction.md) | **See Also:** [Concepts: The Keep](../concepts/keep-model.md)
**Reference:** [Glossary](glossary.md)
