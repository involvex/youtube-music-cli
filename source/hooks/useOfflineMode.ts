// Hook for offline mode state management
import {useState, useEffect, useCallback} from 'react';
import {
	getOfflineState,
	initOfflineMode,
	refreshOfflineState,
	type OfflineState,
} from '../services/offline/offline-mode.service.ts';

export function useOfflineMode() {
	const [offlineState, setOfflineStateInternal] =
		useState<OfflineState>(getOfflineState());

	// Subscribe to offline state changes
	useEffect(() => {
		let currentState = getOfflineState();

		const checkForChanges = () => {
			const latestState = getOfflineState();
			if (latestState !== currentState) {
				currentState = latestState;
				setOfflineStateInternal(latestState);
			}
		};

		// Poll for changes every 5 seconds
		const interval = setInterval(checkForChanges, 5000);

		// Initial check
		checkForChanges();

		return () => clearInterval(interval);
	}, []);

	// Initialize offline mode on mount
	useEffect(() => {
		let mounted = true;

		const init = async () => {
			await initOfflineMode();
			if (mounted) {
				const state = getOfflineState();
				setOfflineStateInternal(state);
			}
		};

		init();

		return () => {
			mounted = false;
		};
	}, []);

	const isOffline = offlineState.isOffline;
	const getOfflineStatus = useCallback(() => {
		return isOffline ? '📡 Offline' : '⚠️ Online';
	}, [isOffline]);

	const refreshStatus = useCallback(async () => {
		const newState = await refreshOfflineState();
		setOfflineStateInternal(newState);
		return newState;
	}, []);

	return {
		isOffline,
		state: offlineState,
		getOfflineStatus,
		refreshStatus,
	};
}
