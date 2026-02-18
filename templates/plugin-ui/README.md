# {{PLUGIN_NAME}}

A UI plugin for youtube-music-cli that demonstrates custom views and keyboard shortcuts.

## Installation

```bash
youtube-music-cli plugins install <path-to-plugin>
```

## Features

- Registers a custom keyboard shortcut (Ctrl+Shift+P)
- Adds a custom view to the application
- Logs view navigation events

## Permissions Required

- `ui` - Required to register views and keyboard shortcuts

## Development

1. Clone this repository
2. Modify the `index.ts` file to customize the view
3. Add React components in the `components/` directory
4. Test with `youtube-music-cli plugins install .`

## License

MIT
