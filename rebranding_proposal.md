# Proposal: Citadel Themed UI Updates

To ensure the application experience matches the new "Citadel" theme, I propose the following changes to the UI strings and labels.

## 1. Activity Bar (Sidebar)
Update the tooltips and labels for the primary navigation icons:
- **Library/Browser** -> **The Archives**
- **Notebooks/Editors** -> **Scriptorium**
- **Kanban/Boards** -> **War Room**
- **REPL** -> **The Forge**
- **System Status** -> **The Watchtower**
- **Source Control** -> **The Repository** (or **The Bastion**)

## 2. Title Bar & Navigation
- **Workspace Name Display**: Show `Keep: [Name]` instead of just the name.
- **Navigation Buttons**: "Back to Keep" instead of "Back to Home".

## 3. Command & Button Labels
- **Entry Creation**: "New Scroll" instead of "New Entry".
- **Empty States**: "Your Archives are empty" instead of "No entries found".
- **Delete Modals**: "Are you sure you want to burn this Scroll?" (Optional, might be too stylized, can stick to "Delete this Scroll").
- **Workspace Management**: "Switch Keep" or "Open New Keep" instead of "Switch Workspace".

## 4. Onboarding & Tour
- Update the **Highlight Tour** text to introduce users to their **Keep** and explain the **Archives**.
- The **High Counselor** (Oracle) should introduce itself during the tour.

## 5. Feature Descriptions (In-App)
- **Settings**: Rename the "Workspace Settings" tab to "Keep configuration".
- **Git Sync**: Use "Update Chronicle" instead of "Push Changes" (or keep technical terms but add themed tooltips).

---
**Next Step**: Should I proceed with searching the codebase for these specific strings to create an automated replacement plan?
