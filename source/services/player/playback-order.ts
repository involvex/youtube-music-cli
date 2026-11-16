/** Pure shuffle-order helpers shared by Ink TUI and immersive Win32. */

export type PlaybackAdvanceInput = {
	queueLength: number;
	queueIndex: number;
	playbackOrder: number[] | null;
	shuffle: boolean;
	shouldLoop: boolean;
};

export type PlaybackAdvanceResult = {
	queueIndex: number;
	playbackOrder: number[] | null;
	advanced: boolean;
};

function fisherYatesShuffle(length: number): number[] {
	const order = Array.from({length}, (_, index) => index);
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j]!, order[i]!];
	}
	return order;
}

/** Shuffled queue indices with `startAt` rotated to the front of playback order. */
export function buildShuffledOrder(length: number, startAt = 0): number[] {
	if (length <= 1) {
		return length === 1 ? [0] : [];
	}

	const order = fisherYatesShuffle(length);
	const startPos = order.indexOf(startAt);
	if (startPos <= 0) {
		return order;
	}

	return [...order.slice(startPos), ...order.slice(0, startPos)];
}

export function resolvePlaybackOrder(
	shuffle: boolean,
	queueLength: number,
	startAt: number,
): number[] | null {
	if (!shuffle || queueLength <= 1) {
		return null;
	}
	return buildShuffledOrder(queueLength, startAt);
}

/** Append a newly queued index to an existing shuffle order (autoplay / add). */
export function appendIndexToPlaybackOrder(
	playbackOrder: number[] | null,
	newIndex: number,
	shuffle: boolean,
	queueLength: number,
	startAt: number,
): number[] | null {
	if (!shuffle || queueLength <= 1) {
		return null;
	}
	if (playbackOrder && playbackOrder.length > 0) {
		return [...playbackOrder, newIndex];
	}
	return buildShuffledOrder(queueLength, startAt);
}

/**
 * Remap playback order after a queue index is removed.
 * Indices above `removedIndex` are decremented; `removedIndex` is dropped.
 */
export function removeIndexFromPlaybackOrder(
	playbackOrder: number[] | null,
	removedIndex: number,
): number[] | null {
	if (!playbackOrder) {
		return null;
	}
	const next = playbackOrder
		.filter(index => index !== removedIndex)
		.map(index => (index > removedIndex ? index - 1 : index));
	return next.length > 1 ? next : null;
}

export function hasNextInPlaybackOrder(input: PlaybackAdvanceInput): boolean {
	const {queueLength, queueIndex, playbackOrder, shuffle, shouldLoop} = input;
	if (queueLength <= 0) {
		return false;
	}
	if (shouldLoop && queueLength > 0) {
		return true;
	}
	if (shuffle && queueLength > 1) {
		const order =
			playbackOrder && playbackOrder.length > 1
				? playbackOrder
				: buildShuffledOrder(queueLength, queueIndex);
		const orderPos = order.indexOf(queueIndex);
		if (orderPos === -1) {
			return order.length > 1;
		}
		return orderPos + 1 < order.length;
	}
	return queueIndex < queueLength - 1;
}

export function advanceInPlaybackOrder(
	input: PlaybackAdvanceInput,
): PlaybackAdvanceResult {
	const {queueLength, queueIndex, shuffle, shouldLoop} = input;
	let {playbackOrder} = input;

	if (queueLength <= 0) {
		return {queueIndex, playbackOrder, advanced: false};
	}

	if (shuffle && queueLength > 1) {
		if (!playbackOrder || playbackOrder.length <= 1) {
			playbackOrder = buildShuffledOrder(queueLength, queueIndex);
		}

		let orderPos = playbackOrder.indexOf(queueIndex);
		if (orderPos === -1) {
			playbackOrder = buildShuffledOrder(queueLength, queueIndex);
			orderPos = 0;
		}

		let nextOrderPos = orderPos + 1;
		if (nextOrderPos >= playbackOrder.length) {
			if (!shouldLoop) {
				return {queueIndex, playbackOrder, advanced: false};
			}
			nextOrderPos = 0;
		}

		const nextIndex = playbackOrder[nextOrderPos];
		if (nextIndex === undefined) {
			return {queueIndex, playbackOrder, advanced: false};
		}

		return {
			queueIndex: nextIndex,
			playbackOrder,
			advanced: true,
		};
	}

	const nextIndex = queueIndex + 1;
	if (nextIndex >= queueLength) {
		if (!shouldLoop) {
			return {queueIndex, playbackOrder: null, advanced: false};
		}
		return {queueIndex: 0, playbackOrder: null, advanced: true};
	}

	return {
		queueIndex: nextIndex,
		playbackOrder: null,
		advanced: true,
	};
}

export function previousInPlaybackOrder(input: {
	queueLength: number;
	queueIndex: number;
	playbackOrder: number[] | null;
	shuffle: boolean;
}): PlaybackAdvanceResult {
	const {queueLength, queueIndex, shuffle} = input;
	const {playbackOrder} = input;

	if (queueLength <= 0) {
		return {queueIndex, playbackOrder, advanced: false};
	}

	if (shuffle && playbackOrder && playbackOrder.length > 1) {
		const orderPos = playbackOrder.indexOf(queueIndex);
		const prevOrderPos = orderPos <= 0 ? 0 : orderPos - 1;
		const prevIndex = playbackOrder[prevOrderPos] ?? 0;
		return {
			queueIndex: prevIndex,
			playbackOrder,
			advanced: prevIndex !== queueIndex || orderPos > 0,
		};
	}

	const prevIndex = Math.max(0, queueIndex - 1);
	return {
		queueIndex: prevIndex,
		playbackOrder: shuffle ? playbackOrder : null,
		advanced: prevIndex !== queueIndex,
	};
}
