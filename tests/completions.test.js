import {expect, test} from 'bun:test';
import {
	COMMANDS,
	generateCompletion,
} from '../source/services/completions/completions.service.ts';

const REQUIRED_COMMANDS = ['whoami', 'login', 'logout', 'stats', 'radio'];

test('COMMANDS includes auth, stats, and radio', () => {
	for (const command of REQUIRED_COMMANDS) {
		expect(COMMANDS.includes(command)).toBe(true);
	}
});

test('generated completions include whoami, stats, and radio for every shell', () => {
	for (const shell of ['bash', 'zsh', 'powershell', 'fish']) {
		const script = generateCompletion(shell);
		for (const command of REQUIRED_COMMANDS) {
			expect(script.includes(command)).toBe(true);
		}
	}
});
