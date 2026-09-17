import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { loadMessages } from './i18n/format';
import { SettingsProvider, storedUiLanguage } from './settings/SettingsProvider';
import './styles/fonts.css';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root is missing from index.html');

// Fetch the reader's interface language before the first paint (no flash of English).
await loadMessages(storedUiLanguage()).catch(() => undefined);

createRoot(root).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
