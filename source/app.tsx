// Root application component
import React from 'react';
import {useApp} from 'ink';
import Main from './main.tsx';
import type {Flags} from './types/cli.types.ts';

// Handle unmounting
let unmount: (() => void) | null = null;

export default function App({flags: _flags}: {flags?: Flags}) {
	const {exit} = useApp();

	// Store unmount function globally
	if (!unmount) {
		unmount = exit;
	}

	return <Main />;
}
