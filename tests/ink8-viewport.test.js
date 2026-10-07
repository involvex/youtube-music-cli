import React from 'react';
import {Box, Text} from 'ink';
import {render} from 'ink-testing-library';
import {describe, test, expect} from 'bun:test';

describe('ink8 viewport', () => {
	test('contentOffsetY clips top rows', () => {
		const {lastFrame} = render(
			<Box
				flexDirection="column"
				height={3}
				overflow="hidden"
				contentOffsetY={2}
			>
				{['row0', 'row1', 'row2', 'row3', 'row4'].map(r => (
					<Box key={r} flexShrink={0}>
						<Text>{r}</Text>
					</Box>
				))}
			</Box>,
		);
		const frame = lastFrame() ?? '';
		expect(frame.includes('row0')).toBe(false);
		expect(frame.includes('row1')).toBe(false);
		expect(frame.includes('row2')).toBe(true);
		expect(frame.includes('row3')).toBe(true);
		expect(frame.includes('row4')).toBe(true);
	});
});
