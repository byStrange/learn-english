import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router';
import {Theme} from '@curialy/ui/theme';
import {LinkProvider} from '@curialy/ui/Link';
import './index.css';
import {learnTheme} from './theme/themes';
import {RouterLink} from './components/RouterLink';
import {router} from './routes';
import {ProgressProvider} from './state/ProgressContext';
import {loadManifest} from './lib/speech';

// The list of natural voice clips: small, fetched once at start.
void loadManifest();

async function start() {
  // Demo build only: sample data and `?as=<learner>` (the real build drops this branch).
  if (import.meta.env.MODE === 'demo') {
    try {
      await (await import('./dev/demo')).startDemo();
    } catch (e) {
      console.warn('Demo data could not be loaded', e);
    }
  }
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={learnTheme} mode="light">
      <LinkProvider component={RouterLink}>
        <ProgressProvider>
          <RouterProvider router={router} />
        </ProgressProvider>
      </LinkProvider>
    </Theme>
  </StrictMode>,
  );
}

void start();
