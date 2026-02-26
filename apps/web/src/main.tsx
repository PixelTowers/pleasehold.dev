// ABOUTME: Application entry point for the pleasehold web dashboard.
// ABOUTME: Renders the root React component into the DOM.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
