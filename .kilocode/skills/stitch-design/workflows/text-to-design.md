---
description: Generate new screens from a text prompt using Stitch MCP.
---

# Workflow: Text-to-Design

Transform a text description into a high-fidelity design screen.

## Steps

### 1. Enhance the User Prompt
Before calling the Stitch MCP tool, apply the [Prompt Enhancement Pipeline](../SKILL.md#prompt-enhancement-pipeline). 
- Identify the platform (Web/Mobile) and page type.
- Incorporate any existing project design system from `.stitch/DESIGN.md`.
- Use specific [Design Mappings](../references/design-mappings.md) and [Prompting Keywords](../references/prompt-keywords.md).

### 2. Identify the Project
Use `list_projects` to find the correct `projectId` if it is not already known.

### 3. Generate the Screen
Call the `mcp_StitchMCP_generate_screen_from_text` tool with the enhanced prompt.

```json
{
  "projectId": "...",
  "prompt": "[Your Enhanced Prompt]",
  "deviceType": "DESKTOP" // or MOBILE
}
```

### 4. Present AI Feedback
Always show the text description and suggestions from `outputComponents` to the user.

### 5. Download Design Assets
After generation, download the HTML and screenshot urls from `outputComponents` to the `.stitch/designs` directory.
- **Naming**: Use the screen ID or a descriptive slug for the filename.
- **Tools**: Use `curl -o` via `run_command` or similar.
- **Directory**: Ensure `.stitch/designs` exists.

### 6. Review and Refine
- If the result is not exactly as expected, use the [edit-design](edit-design.md) workflow to make targeted adjustments.
- Do NOT re-generate from scratch unless the fundamental layout is wrong.

## Tips
- **Be structural**: Break the page down into header, hero, features, and footer in your prompt.
- **Specify colors**: Use hex codes for precision.
- **Set the tone**: Explicitly mention if the design should be minimal, professional, or vibrant.
