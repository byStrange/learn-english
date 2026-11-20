import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RouterProvider, createMemoryRouter} from 'react-router';
import {Theme} from '@curialy/ui/theme';
import {LinkProvider} from '@curialy/ui/Link';
import {routes} from '../routes';
import {ProgressProvider} from '../state/ProgressContext';
import {_resetStorageForTests} from '../state/storage';
import {learnTheme} from '../theme/themes';
import {RouterLink} from '../components/RouterLink';
import {_resetSessionsForTests, setLearnerSession} from '../state/session';
import {_setBackendForTests} from '../server/index';
import {createFakeBackend} from '../server/fakeBackend';

/** Log a learner in directly (the PIN pad itself is tested on the home screen). */
function signIn(userId: string, trackId: 'g1' | 'g2') {
  setLearnerSession({token: 'test', userId, role: 'learner', trackId, expiresAt: new Date(Date.now() + 86_400_000).toISOString()});
}

function show(path: string) {
  const router = createMemoryRouter(routes, {initialEntries: [path]});
  render(
    <Theme theme={learnTheme} mode="light">
      <LinkProvider component={RouterLink}>
        <ProgressProvider>
          <RouterProvider router={router} />
        </ProgressProvider>
      </LinkProvider>
    </Theme>,
  );
  return router;
}

let backend = createFakeBackend();

/** A real login on the fake server (PIN 1234), so syncing in the background keeps the session. */
async function logIn(userId: string) {
  const r = await backend.login(userId, '1234');
  if (!r.ok) throw new Error(`fake login failed: ${r.reason}`);
  setLearnerSession({token: r.token, userId: r.userId, role: r.role, trackId: r.trackId, expiresAt: r.expiresAt});
}

beforeEach(() => {
  localStorage.clear();
  _resetStorageForTests();
  _resetSessionsForTests();
  backend = createFakeBackend();
  _setBackendForTests(backend);
});

describe('screens', () => {
  it('home lists both tracks, and a learner gets in with the PIN on the number pad', async () => {
    const router = show('/');
    expect(screen.getByRole('heading', {level: 1, name: "Who's learning today?"})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: /Group 1/})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: /Group 2/})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Abdulloh/})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: /Said Ali/}));
    expect(document.querySelector('input')).toBeNull(); // no text field, so no phone keyboard
    for (const d of ['1', '2', '3', '4']) await userEvent.click(await screen.findByRole('button', {name: d}));
    await waitFor(() => expect(router.state.location.pathname).toBe('/learn/said-ali'));
    expect(await screen.findByRole('heading', {level: 1, name: /Ali/})).toBeInTheDocument();
  });

  it('a deep link without a session goes home to the PIN', () => {
    const router = show('/learn/said-amir');
    expect(router.state.location.pathname).toBe('/');
  });

  it('Group 2 home shows the goal', () => {
    signIn('said-ali', 'g2');
    show('/learn/said-ali');
    expect(screen.getAllByText(/Tell about my day/).length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar', {name: /Words I know/})).toBeInTheDocument();
  });

  it('Group 1 home shows a streak counter and no kids goal', () => {
    signIn('abdulloh', 'g1');
    show('/learn/abdulloh');
    expect(screen.getByRole('heading', {level: 1, name: /Abdulloh/})).toBeInTheDocument();
    expect(screen.getAllByText(/day streak/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Tell about my day/)).toBeNull();
  });

  it('has a Tenses tab where Abdulloh builds a sentence with live help', async () => {
    signIn('abdulloh', 'g1');
    show('/learn/abdulloh/tenses');
    expect(screen.getByRole('link', {name: /Tenses/})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 1, name: 'Make sentences'})).toBeInTheDocument();
    // Nothing learned yet: the tenses are locked until a lesson of their unit is done.
    expect(screen.getByText(/finish ".*" first/i)).toBeInTheDocument();
  });

  it('a wrong verb form gets a hint and the right one goes in the formula', async () => {
    localStorage.setItem(
      'le:v1:learner:abdulloh',
      JSON.stringify({
        version: 1,
        learnerId: 'abdulloh',
        trackId: 'g1',
        xp: 0,
        updatedAt: '2026-05-01T00:00:00.000Z',
        streak: {current: 0, longest: 0, lastActive: null, activeDays: []},
        completed: {'g1-ps-1': {firstCompleted: '2026-05-01', lastCompleted: '2026-05-01', times: 1, bestAccuracy: 1}},
        items: {},
        history: [],
        sentences: [],
        settings: {hint: 'uz'},
      }),
    );
    _resetStorageForTests();
    await logIn('abdulloh');
    show('/learn/abdulloh/tenses');
    // Tiles show a picture before the word ("🤾play"), so match on the word itself.
    const tile = (word: string) => {
      const found = screen.getAllByRole('button').filter(b => !b.className.includes('slot') && (b.textContent ?? '').replace(/^[^A-Za-z']+/, '').trim() === word);
      expect(found.length, `a "${word}" tile`).toBeGreaterThan(0);
      return found[found.length - 1];
    };
    await userEvent.click(tile('he'));
    await userEvent.click(tile('play'));
    if (!screen.queryByText(/add -s: play → plays/)) await userEvent.click(tile('play'));
    expect(await screen.findByText(/add -s: play → plays/)).toBeInTheDocument();
    await userEvent.click(tile('plays'));
    expect(screen.getByRole('button', {name: /^does what\?: plays/})).toBeInTheDocument();
  });

  it('an unknown learner goes back home', () => {
    const router = show('/learn/nobody');
    expect(router.state.location.pathname).toBe('/');
  });
});
