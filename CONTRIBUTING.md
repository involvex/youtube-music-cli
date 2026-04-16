# Contributing to YouTube Music CLI

Thank you for your interest in contributing to YouTube Music CLI! This document
provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js >= 16
- Bun (package manager and runtime)
- mpv media player (for audio playback)
- TypeScript knowledge

### Installation

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/your-username/youtube-music-cli.git
   cd youtube-music-cli
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Build the project:

   ```bash
   bun run build
   ```

4. Run in development mode:

   ```bash
   bun run dev
   ```

## Code Quality

This project uses automated code quality tools. The `prebuild` script runs these
checks automatically before building:

### Formatting

```bash
bun run format       # Format code with Prettier
bun run format:check # Check formatting without modifying
```

### Linting

```bash
bun run lint     # Lint code with ESLint
bun run lint:fix # Fix linting issues automatically
```

### Type Checking

```bash
bun run typecheck # Type check without emitting
```

### Testing

```bash
bun run test # Run prettier check + XO + AVA
```

## Project Structure

```
youtube-music-cli/
├── source/
│   ├── cli.tsx              # CLI entry point
│   ├── app.tsx              # React app root
│   ├── components/          # React components
│   │   ├── layouts/         # Main layout containers
│   │   ├── player/          # Player-specific components
│   │   ├── search/          # Search components
│   │   ├── playlist/        # Playlist management
│   │   ├── settings/        # Settings UI
│   │   └── common/          # Shared components
│   ├── services/            # Business logic services
│   │   ├── player/          # Audio playback
│   │   ├── youtube-music/   # API wrapper
│   │   ├── config/          # Configuration persistence
│   │   └── ...
│   ├── stores/              # State management (Context + useReducer)
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── tests/                   # Test files
└── package.json
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/your-feature-name`
- `bugfix/issue-description`
- `refactor/code-section`

### Commit Messages

Follow conventional commits format:

- `feat: add new feature`
- `fix: bug description`
- `docs: update documentation`
- `refactor: code restructuring`
- `test: add tests`

### Code Style

- Use ES modules with `.ts`/`.tsx` extensions in imports
- Follow the existing code patterns
- Add comments for non-obvious logic
- Update types when adding new data structures

## Adding Features

1. **Discuss first**: Open an issue to discuss major features before implementing
2. **Follow patterns**: Use existing service/component patterns
3. **Add types**: Define TypeScript types for new data structures
4. **Test thoroughly**: Test edge cases and error conditions
5. **Update docs**: Update relevant documentation

## Plugin Development

YouTube Music CLI supports plugins for extending functionality. See the
plugin documentation for details on creating your own plugins.

## Reporting Issues

When reporting bugs, please include:

- Your OS and version
- Node.js version (`node --version`)
- CLI version (`youtube-music-cli --version` if applicable)
- mpv version (`mpv --version`)
- Steps to reproduce the issue
- Expected vs actual behavior
- Error messages or logs

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes following the guidelines above
4. Ensure all tests pass (`bun run test`)
5. Commit your changes with clear messages
6. Push to your fork
7. Open a pull request with a clear description

Your PR should:

- Pass all automated checks
- Include tests for new functionality
- Update documentation if needed
- Follow the existing code style

## Questions?

Feel free to open an issue for questions or discussion about potential
contributions. We welcome all contributions!

Thank you for contributing to YouTube Music CLI!
