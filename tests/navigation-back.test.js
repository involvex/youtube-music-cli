import {expect, test} from 'bun:test';
import {
	navigationReducer,
	initialState,
} from '../source/stores/navigation.store.tsx';
import {VIEW} from '../source/utils/constants.ts';

test('NAVIGATE to the current view is a no-op (no history spam)', () => {
	const state = {
		...initialState,
		currentView: VIEW.EXPLORE,
		history: [VIEW.HOME],
	};
	const next = navigationReducer(state, {
		category: 'NAVIGATE',
		view: VIEW.EXPLORE,
	});
	expect(next).toEqual(state);
	expect(next.history).toEqual([VIEW.HOME]);
});

test('NAVIGATE to a new view pushes history', () => {
	const next = navigationReducer(initialState, {
		category: 'NAVIGATE',
		view: VIEW.SEARCH,
	});
	expect(next.currentView).toBe(VIEW.SEARCH);
	expect(next.history).toEqual([VIEW.HOME]);
});

test('GO_BACK pops history', () => {
	const state = {
		...initialState,
		currentView: VIEW.SEARCH,
		previousView: VIEW.HOME,
		history: [VIEW.HOME],
	};
	const next = navigationReducer(state, {category: 'GO_BACK'});
	expect(next.currentView).toBe(VIEW.HOME);
	expect(next.history).toEqual([]);
});

test('GO_BACK with empty history falls back to home', () => {
	const state = {...initialState, currentView: VIEW.SEARCH, history: []};
	const next = navigationReducer(state, {category: 'GO_BACK'});
	expect(next.currentView).toBe(VIEW.HOME);
});

test('GO_BACK with empty history on home is a no-op', () => {
	const next = navigationReducer(initialState, {category: 'GO_BACK'});
	expect(next).toEqual(initialState);
});
