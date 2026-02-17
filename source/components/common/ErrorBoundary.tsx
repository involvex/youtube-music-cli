// Error boundary component for robust error handling
import {Component, type ErrorInfo, type ReactNode} from 'react';
import {Box, Text} from 'ink';

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	public override state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return {hasError: true, error};
	}

	public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('Uncaught error:', error, errorInfo);
	}

	public override render() {
		if (this.state.hasError) {
			return (
				<Box
					flexDirection="column"
					padding={1}
					borderStyle="round"
					borderColor="red"
				>
					<Text color="red" bold>
						Something went wrong!
					</Text>
					<Box marginTop={1}>
						<Text color="white">{this.state.error?.message}</Text>
					</Box>
					<Box marginTop={1}>
						<Text color="dim">Press Ctrl+C to exit and restart the CLI.</Text>
					</Box>
				</Box>
			);
		}

		return this.props.children;
	}
}
