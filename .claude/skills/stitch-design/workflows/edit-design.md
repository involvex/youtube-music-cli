---
description: Edit an existing design screen using Stitch MCP.
---

# Workflow: Edit-Design

Make targeted changes to an already generated design.

## Steps

### 1. Identify the Screen
Use `list_screens` or `get_screen` to find the correct `projectId` and `screenId`.

### 2. Formulate the Edit Prompt
Be specific about the changes you want to make. Do not just say "fix it". 
- **Location**: "Change the color of the [primary button] in the [hero section]..."
- **Visuals**: "...to a darker blue (#004080) and add a subtle shadow."
- **Structure**: "Add a secondary button next to the primary one with the text 'Learn More'."

### 3. Apply the Edit
Call the `mcp_StitchMCP_edit_screens` tool.

```json
{
  "projectId": "...",
  "selectedScreenIds": ["..."],
  "prompt": "[Your target edit prompt]"
}
```

### 4. Present AI Feedback
Always show the text description and suggestions from `outputComponents` to the user.

### 5. Download Design Assets
After editing, download the updated HTML and screenshot urls from `outputComponents` to the `.stitch/designs` directory, overwriting previous versions to ensure the local files reflect the latest edits.

### 6. Verify and Repeat
- Check the output screen to see if the changes were applied correctly.
- If more polish is needed, repeat the process with a new specific prompt.

## Tips
- **Keep it focused**: One edit at a time is often better than a long list of changes.
- **Reference components**: Use professional terms like "navigation bar", "hero section", "footer", "card grid".
- **Mention colors**: Use hex codes for precise color matching.
