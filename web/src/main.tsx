import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/mini.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		void navigator.serviceWorker.register('/sw.js').catch(() => {
			// Installability still works with manifest alone on many browsers
		});
	});
}
