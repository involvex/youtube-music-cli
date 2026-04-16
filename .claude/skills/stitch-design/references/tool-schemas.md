# Stitch MCP Tool Schemas

Use these examples to format your tool calls to the Stitch MCP server correctly.

---

## 🏗️ Project Management

### `list_projects`
Lists all Stitch projects accessible to you.
```json
// No parameters needed
{}
```

### `get_project`
Retrieves details of a specific project.
```json
{
  "name": "projects/4044680601076201931"
}
```

### `create_project`
Creates a new Stitch project.
```json
{
  "title": "My New App"
}
```

---

## 🎨 Design Generation

### `generate_screen_from_text`
Generates a new screen from a text description.
```json
{
  "projectId": "4044680601076201931",
  "prompt": "A modern landing page for a coffee shop with a hero section, menu, and contact form. Use warm brown tones (#4b2c20) and a clean sans-serif font.",
  "deviceType": "DESKTOP" // Options: MOBILE, DESKTOP, TABLET
}
```

### `edit_screens`
Edits existing screens with a text prompt.
```json
{
  "projectId": "4044680601076201931",
  "selectedScreenIds": ["98b50e2ddc9943efb387052637738f61"],
  "prompt": "Change the background color to white (#ffffff) and make the call-to-action button larger."
}
```

---

## 🖼️ Screen Management

### `list_screens`
Lists all screens within a project.
```json
{
  "projectId": "4044680601076201931"
}
```

### `get_screen`
Retrieves details of a specific screen.
```json
{
  "projectId": "4044680601076201931",
  "screenId": "98b50e2ddc9943efb387052637738f61",
  "name": "projects/4044680601076201931/screens/98b50e2ddc9943efb387052637738f61"
}
```