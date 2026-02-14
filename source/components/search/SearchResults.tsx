// Search results component
import React from 'react';
import {Box, Text} from 'ink';
import type {SearchResult} from '../../types/youtube-music.types.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {truncate} from '../../utils/format.ts';

type Props = {
	results: SearchResult[];
	selectedIndex: number;
};

export default function SearchResults({results, selectedIndex}: Props) {
	const {theme} = useTheme();

	if (results.length === 0) {
		return null;
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Text color={theme.colors.dim} bold>
				Results ({results.length})
			</Text>

			{results.map((result, index) => {
				const isSelected = index === selectedIndex;
				const data = result.data;

				return (
					<Box
						key={index}
						paddingX={1}
						borderStyle={isSelected ? 'double' : undefined}
						borderColor={isSelected ? theme.colors.primary : undefined}
					>
						<Text
							color={isSelected ? theme.colors.primary : theme.colors.text}
							bold={isSelected}
						>
							[{result.type.toUpperCase()}]{' '}
						</Text>

						{'title' in data ? (
							<Text
								color={isSelected ? theme.colors.primary : theme.colors.text}
							>
								{truncate(data.title, 50)}
							</Text>
						) : 'name' in data ? (
							<Text
								color={isSelected ? theme.colors.primary : theme.colors.text}
							>
								{truncate(data.name, 50)}
							</Text>
						) : (
							<Text color={theme.colors.dim}>Unknown</Text>
						)}
					</Box>
				);
			})}
		</Box>
	);
}
