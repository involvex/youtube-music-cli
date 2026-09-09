// Custom keybindings editor — shows all actions and their bound keys
import {Box, Text, useInput} from 'ink';
import {useState, useCallback} from 'react';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding, isEscapeKey} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {useKeyboardBlocker} from '../../hooks/useKeyboardBlocker.tsx';
import {getConfigService} from '../../services/config/config.service.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';

type BindingEntry = {
	action: string;
	label: string;
	keys: string[];
	hasConflict: boolean;
	conflictWith?: string;
};

function buildEntries(): BindingEntry[] {
	const config = getConfigService();
	const entries = Object.entries(KEYBINDINGS).map(([action, defaultKeys]) => {
		const custom = config.getKeybinding(action);
		const keys = custom ?? ([...defaultKeys] as string[]);
		return {
			action,
			label: action
				.toLowerCase()
				.replace(/_/g, ' ')
				.replace(/\b\w/g, c => c.toUpperCase()),
			keys,
			hasConflict: false,
		};
	});

	// Detect conflicts
	const keyToActions = new Map<string, string[]>();
	for (const entry of entries) {
		for (const key of entry.keys) {
			const normalized = key.toLowerCase();
			if (!keyToActions.has(normalized)) {
				keyToActions.set(normalized, []);
			}
			keyToActions.get(normalized)!.push(entry.action);
		}
	}

	// Mark conflicts
	return entries.map(entry => {
		const conflicts: string[] = [];
		for (const key of entry.keys) {
			const normalized = key.toLowerCase();
			const actions = keyToActions.get(normalized) || [];
			if (actions.length > 1) {
				for (const action of actions) {
					if (action !== entry.action) {
						conflicts.push(action);
					}
				}
			}
		}
		return {
			...entry,
			hasConflict: conflicts.length > 0,
			conflictWith: conflicts.length > 0 ? conflicts.join(', ') : undefined,
		};
	});
}

function findConflict(
	newKey: string,
	currentAction: string,
): string | undefined {
	const entries = buildEntries();
	const normalized = newKey.toLowerCase();
	for (const entry of entries) {
		if (entry.action !== currentAction) {
			for (const key of entry.keys) {
				if (key.toLowerCase() === normalized) {
					return entry.action;
				}
			}
		}
	}
	return undefined;
}

export default function KeybindingsLayout() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const [entries, setEntries] = useState<BindingEntry[]>(buildEntries);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isCapturing, setIsCapturing] = useState(false);
	const [statusMessage, setStatusMessage] = useState('');
	const [conflictWarning, setConflictWarning] = useState<string | null>(null);

	// While capturing a new binding, block the global registry so the
	// pressed keys don't trigger app actions (e.g. 'r' resetting AND
	// toggling repeat). The capture handler below uses Ink's isActive gate so
	// it only listens during capture — no double-handling outside it.
	useKeyboardBlocker(isCapturing);

	useInput(
		(input, key) => {
			// Build key string from the pressed key
			const parts: string[] = [];
			if (key.ctrl) parts.push('ctrl');
			if (key.meta) parts.push('meta');
			if (key.shift) parts.push('shift');

			let keyName = input;
			if (key.upArrow) keyName = 'up';
			else if (key.downArrow) keyName = 'down';
			else if (key.leftArrow) keyName = 'left';
			else if (key.rightArrow) keyName = 'right';
			else if (key.return) keyName = 'enter';
			else if (key.tab) keyName = 'tab';
			else if (key.backspace || key.delete) keyName = 'backspace';
			else if (isEscapeKey(input, key)) {
				// Covers terminals that deliver Escape as a raw ESC byte
				// without setting Ink's key.escape flag.
				setIsCapturing(false);
				setStatusMessage('Cancelled');
				setConflictWarning(null);
				return;
			}

			if (!keyName || keyName.length === 0) return;
			parts.push(keyName);
			const newKey = parts.join('+');

			// Check for conflicts
			const entry = entries[selectedIndex];
			if (!entry) return;

			const conflict = findConflict(newKey, entry.action);
			if (conflict) {
				setConflictWarning(
					`⚠ Conflict: "${newKey}" is also bound to ${conflict}. Press Enter again to override, or Esc to cancel.`,
				);
				return;
			}

			// Persist new binding
			getConfigService().setKeybinding(entry.action, [newKey]);
			setEntries(buildEntries());
			setIsCapturing(false);
			setStatusMessage(`Bound ${entry.action} to "${newKey}"`);
			setConflictWarning(null);
		},
		{isActive: isCapturing},
	);

	const navigateUp = useCallback(() => {
		if (isCapturing) return;
		setSelectedIndex(i => Math.max(0, i - 1));
	}, [isCapturing]);

	const navigateDown = useCallback(() => {
		if (isCapturing) return;
		setSelectedIndex(i => Math.min(entries.length - 1, i + 1));
	}, [isCapturing, entries.length]);

	const handleSelect = useCallback(() => {
		if (isCapturing) return;
		if (conflictWarning) {
			// User confirmed override despite conflict
			const entry = entries[selectedIndex];
			if (!entry) return;

			// Extract the key from the warning message
			const match = conflictWarning.match(/"([^"]+)"/);
			if (match?.[1]) {
				const newKey = match[1];
				getConfigService().setKeybinding(entry.action, [newKey]);
				setEntries(buildEntries());
				setIsCapturing(false);
				setStatusMessage(
					`Bound ${entry.action} to "${newKey}" (overrode conflict)`,
				);
				setConflictWarning(null);
			}
		} else {
			setIsCapturing(true);
			setStatusMessage('Press any key to bind...');
			setConflictWarning(null);
		}
	}, [isCapturing, conflictWarning, entries, selectedIndex]);

	const handleReset = useCallback(() => {
		if (isCapturing) return;
		// Reset selected binding to default
		const entry = entries[selectedIndex];
		if (!entry) return;
		const defaultKeys = KEYBINDINGS[entry.action as keyof typeof KEYBINDINGS];
		if (defaultKeys) {
			getConfigService().setKeybinding(entry.action, [
				...defaultKeys,
			] as string[]);
			setEntries(buildEntries());
			setStatusMessage(`Reset ${entry.action} to default`);
			setConflictWarning(null);
		}
	}, [isCapturing, entries, selectedIndex]);

	const goBack = useCallback(() => {
		if (isCapturing) {
			setIsCapturing(false);
			setStatusMessage('Cancelled');
			setConflictWarning(null);
			return;
		}
		dispatch({category: 'GO_BACK'});
	}, [isCapturing, dispatch]);

	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), handleSelect);
	useKeyBinding(['r'], handleReset);
	useKeyBinding(resolveKeybinding('BACK'), goBack, {bypassBlock: true});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.primary} bold>
					Custom Keybindings
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color={theme.colors.dim}>
					↑/↓ Navigate | Enter Edit | r Reset | Esc Back
				</Text>
			</Box>

			{statusMessage ? (
				<Box marginBottom={1}>
					<Text color={theme.colors.secondary}>{statusMessage}</Text>
				</Box>
			) : null}

			{conflictWarning ? (
				<Box
					marginBottom={1}
					borderStyle="single"
					borderColor={theme.colors.warning}
					padding={1}
				>
					<Text color={theme.colors.warning} bold>
						{conflictWarning}
					</Text>
				</Box>
			) : null}

			{entries.map((entry, index) => {
				const isSelected = index === selectedIndex;
				const keyColor = entry.hasConflict
					? theme.colors.warning
					: theme.colors.secondary;
				return (
					<Box key={entry.action} marginBottom={0}>
						<Text
							color={isSelected ? theme.colors.primary : theme.colors.text}
							bold={isSelected}
						>
							{isSelected ? '▶ ' : '  '}
						</Text>
						<Text
							color={isSelected ? theme.colors.primary : theme.colors.text}
							bold={isSelected}
						>
							{entry.label.padEnd(25)}
						</Text>
						<Text color={keyColor}>
							{entry.keys.join(', ')}
							{entry.hasConflict ? ' ⚠' : ''}
						</Text>
						{entry.hasConflict && entry.conflictWith ? (
							<Box marginLeft={2}>
								<Text color={theme.colors.dim}>
									(conflicts with: {entry.conflictWith})
								</Text>
							</Box>
						) : null}
					</Box>
				);
			})}

			{isCapturing ? (
				<Box
					marginTop={1}
					borderStyle="single"
					borderColor={theme.colors.secondary}
					padding={1}
				>
					<Text color={theme.colors.secondary} bold>
						Press any key combination...{' '}
					</Text>
					<Text color={theme.colors.dim}>(Esc to cancel)</Text>
				</Box>
			) : null}
		</Box>
	);
}
