---
description: Analyze a Stitch project and synthesize its design system into a .stitch/DESIGN.md file.
---

# Workflow: Generate .stitch/DESIGN.md

Create a "source of truth" for your project's design language to ensure consistency across all future screens.

## 📥 Retrieval

To analyze a Stitch project, you must retrieve metadata and assets using the Stitch MCP tools:

1.  **Project lookup**: Use `list_projects` to find the target `projectId`.
2.  **Screen lookup**: Use `list_screens` for that `projectId` to find representative screens (e.g., "Home", "Main Dashboard").
3.  **Metadata fetch**: Call `get_screen` for the target screen to get `screenshot.downloadUrl` and `htmlCode.downloadUrl`.
4.  **Asset download**: Use `read_url_content` to fetch the HTML code.

## 🧠 Analysis & Synthesis

### 1. Identify Identity
- Capture Project Title and Project ID.

### 2. Define Atmosphere
- Analyze the HTML and screenshot to capture the "vibe" (e.g., "Airy," "Professional," "Vibrant").

### 3. Map Color Palette
- Extract exact hex codes and assign functional roles (e.g., "Primary Action: #2563eb").

### 4. Translate Geometry
- Convert Tailwind/CSS values into descriptive language (e.g., `rounded-full` → "Pill-shaped").

### 5. Document Depth
- Describe shadow styles and layering (e.g., "Soft, diffused elevation").

## 📝 Output Structure

Create a `.stitch/DESIGN.md` file in the project directory with this structure:

```markdown
# Design System: [Project Title]
**Project ID:** [Insert Project ID Here]

## 1. Visual Theme & Atmosphere
(Description of mood and aesthetic philosophy)

## 2. Color Palette & Roles
(Descriptive Name + Hex Code + Role)

## 3. Typography Rules
(Font families, weights, and usage)

## 4. Component Stylings
* **Buttons:** Shape, color, behavior
* **Containers:** Roundness, elevation

## 5. Layout Principles
(Whitespace strategy and grid alignment)
```

## 💡 Best Practices
- **Be Precise**: Always include hex codes in parentheses.
- **Be Descriptive**: Use natural language like "Deep Ocean Blue" instead of just "Blue".
- **Be Functional**: Explain *why* an element is used.
