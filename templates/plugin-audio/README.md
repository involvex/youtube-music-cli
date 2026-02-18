# {{PLUGIN_NAME}}

An audio processing plugin for youtube-music-cli that demonstrates stream interception.

## Installation

```bash
youtube-music-cli plugins install <path-to-plugin>
```

## Features

- Intercepts audio stream requests
- Can transform, redirect, or block audio URLs
- Logs stream start/end events
- Handles stream errors

## Permissions Required

- `player` - Required to intercept and modify audio streams

## Use Cases

- Ad blocking by filtering known ad URLs
- Quality adjustment by modifying stream parameters
- Analytics and logging
- Custom audio routing

## Development

1. Clone this repository
2. Modify the `index.ts` file
3. Implement your audio processing logic in the `onStreamRequest` handler
4. Test with `youtube-music-cli plugins install .`

## License

MIT
