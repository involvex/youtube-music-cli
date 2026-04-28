import {createContext, useContext, useMemo, type ReactNode} from 'react';
import {useHistory} from './history.store.tsx';
import {computeStats} from '../services/stats/stats.service.ts';
import type {ListeningStats} from '../types/stats.types.ts';

const emptyStats: ListeningStats = {
	totalPlays: 0,
	totalListeningMinutes: 0,
	uniqueTracks: 0,
	uniqueArtists: 0,
	topTracks: [],
	topArtists: [],
	listeningByDay: [],
	currentStreak: 0,
	longestStreak: 0,
	firstPlayDate: null,
	averageDailyMinutes: 0,
};

type StatsContextValue = {
	stats: ListeningStats;
};

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({children}: {children: ReactNode}) {
	const {history} = useHistory();

	const stats = useMemo(() => computeStats(history), [history]);

	const value = useMemo(() => ({stats}), [stats]);

	return (
		<StatsContext.Provider value={value}>{children}</StatsContext.Provider>
	);
}

export function useStats(): StatsContextValue {
	const context = useContext(StatsContext);

	if (!context) {
		throw new Error('useStats must be used within StatsProvider');
	}

	return context;
}

export {emptyStats};
