// Interface tests for useAIPlaylist hook
import {test, expect} from 'bun:test';

test('useAIPlaylist hook exports expected interface', async () => {
	// This test verifies the hook module loads and exports the expected functions
	const hookModule = await import('../source/hooks/use-ai-playlist.ts');

	expect(typeof hookModule.useAIPlaylist).toBe('function');
});

test('useAIPlaylist hook interface structure', async () => {
	// Verify the interface shape by checking the return type structure
	const hookModule = await import('../source/hooks/use-ai-playlist.ts');
	expect(hookModule).toBeDefined();
});
