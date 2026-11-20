import {useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import {BottomSheet} from '@curialy/ui/BottomSheet';
import {Banner} from '@curialy/ui/Banner';
import {Theme} from '@curialy/ui/theme';
import {tracks, getLearner} from '../content/index';
import {currentDay} from '../lib/clock';
import {useProgress} from '../state/ProgressContext';
import {streakNow} from '../state/selectors';
import {loginWithPin} from '../state/auth';
import {serverMode} from '../server/index';
import {StreakChip} from '../components/StreakChip';
import {PinPad, type PinResult} from '../components/PinPad';
import {kidsTheme, learnTheme} from '../theme/themes';

/**
 * #/ — pick who is learning. Tapping a name always asks for that learner's
 * PIN (on a number pad drawn on the page), so on a shared phone nobody can
 * open someone else's lessons.
 */
export function Home() {
  const {get, canSave, pullFromServer} = useProgress();
  const navigate = useNavigate();
  const location = useLocation();
  const today = currentDay();
  // A deep link without a session sends the learner here with {pinFor}.
  const asked = (location.state as {pinFor?: string} | null)?.pinFor;
  const [pinFor, setPinFor] = useState<string | null>(asked && getLearner(asked) ? asked : null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const finalFocus = useRef<HTMLElement | null>(null);
  const chosen = pinFor ? getLearner(pinFor) : undefined;
  const offline = serverMode === 'none';

  const open = (id: string) => {
    finalFocus.current = triggers.current[id];
    setPinFor(id);
  };

  const submit = async (pin: string): Promise<PinResult> => {
    if (!chosen) return {ok: false, reason: 'unknown'};
    const r = await loginWithPin(chosen.learner.id, pin, 'learner');
    if (r.ok) {
      // Merge in what the server has before showing the path (quick; offline it gives up).
      await Promise.race([pullFromServer(chosen.learner.id), new Promise(res => setTimeout(res, 4000))]);
      setPinFor(null);
      navigate(`/learn/${chosen.learner.id}`, {replace: Boolean(asked)});
    }
    return r;
  };

  return (
    <div className="app-frame">
      <div className="screen home">
        <header className="home-header">
          <img className="home-logo" src="./icon.svg" alt="" width={32} height={32} />
          <span>Learn English</span>
        </header>
        <main className="home-main" id="main">
          <div>
            <h1 className="screen-title">Who's learning today?</h1>
            <p className="home-lead">Tap your name, then type your PIN.</p>
          </div>
          {offline ? (
            <Banner status="error" title="Not connected to the server" description="This copy of the app was built without the server settings. Ask your teacher." />
          ) : null}
          {canSave ? null : (
            <p className="save-warning" role="status">
              This browser can't keep a copy (private mode or full storage). Your progress still goes to the server while you are online.
            </p>
          )}
          {tracks.map(track => {
            const kids = track.mode === 'kids';
            return (
              <section key={track.id} className={`home-track${kids ? ' is-kids' : ''}`} aria-labelledby={`track-${track.id}`}>
                <h2 className="section-title" id={`track-${track.id}`}>
                  {track.name}
                </h2>
                <p className="track-desc">{track.description}</p>
                <ul className="learner-list">
                  {track.learners.map(l => {
                    const streak = streakNow(get(l.id), today);
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          className="learner-link"
                          ref={el => {
                            triggers.current[l.id] = el;
                          }}
                          disabled={offline}
                          onClick={() => open(l.id)}
                          aria-haspopup="dialog"
                        >
                          <span className="avatar" aria-hidden="true">
                            {(l.nickname ?? l.name).charAt(0)}
                          </span>
                          <span className="learner-name">
                            {l.name}
                            {l.nickname ? <span className="learner-nick">{l.nickname}</span> : null}
                          </span>
                          <StreakChip count={streak} compact />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </main>
        <footer className="home-footer">
          <Link className="plain-link" to="/teacher">
            Teacher panel
          </Link>
          <span>Progress is saved on the server, so the teacher sees it too.</span>
        </footer>
      </div>

      <BottomSheet
        label={chosen ? `PIN for ${chosen.learner.name}` : 'PIN'}
        isOpen={Boolean(chosen)}
        onOpenChange={o => {
          if (!o) setPinFor(null);
        }}
        height="hug"
        purpose="form"
        finalFocusRef={finalFocus}
      >
        {chosen ? (
          <Theme theme={chosen.track.mode === 'kids' ? kidsTheme : learnTheme} mode="light">
            <div className="pin-sheet" data-track={chosen.track.id}>
              <span className="avatar avatar-lg" aria-hidden="true">
                {(chosen.learner.nickname ?? chosen.learner.name).charAt(0)}
              </span>
              <h2 className="pin-title">Hi {chosen.learner.nickname ?? chosen.learner.name}! Type your PIN</h2>
              <PinPad key={chosen.learner.id} length={4} label={`PIN for ${chosen.learner.name}`} onSubmit={submit} />
            </div>
          </Theme>
        ) : null}
      </BottomSheet>
    </div>
  );
}
