import {useEffect} from 'react';
import {Navigate, Outlet, useLocation, useParams} from 'react-router';
import {Theme} from '@curialy/ui/theme';
import {getLearner} from '../content/index';
import {currentDay} from '../lib/clock';
import {kidsTheme, learnTheme} from '../theme/themes';
import {BottomTabs} from '../components/BottomTabs';
import {useLearnerSession} from '../state/session';
import {useProgress} from '../state/ProgressContext';
import type {LearnerCtx} from './learnerContext';

/**
 * Everything under #/learn/:learnerId. Needs this learner's PIN session: a
 * reload or a deep link keeps working while the session is valid; otherwise
 * it goes home and opens that learner's PIN pad.
 *
 * The learner decides the track, the track decides the theme (Group 2 gets the
 * larger kids theme) and data-track, which switches the tile and prompt sizes.
 */
export function LearnerLayout() {
  const {learnerId} = useParams();
  const {pathname} = useLocation();
  const session = useLearnerSession();
  const {pullFromServer} = useProgress();
  const found = getLearner(learnerId);
  const id = found?.learner.id;
  const allowed = Boolean(id && session && session.userId === id);

  // Opening the app (or a reload): bring in anything another phone saved.
  useEffect(() => {
    if (allowed && id) void pullFromServer(id);
  }, [allowed, id, pullFromServer]);

  if (!found) return <Navigate to="/" replace />;
  if (!allowed) return <Navigate to="/" replace state={{pinFor: found.learner.id}} />;
  const {learner, track} = found;
  const today = currentDay();
  const ctx: LearnerCtx = {learner, track, today};
  // The tab bar is hidden while a lesson or a review runs (the player has its own bar).
  const inPlayer = /\/lesson\//.test(pathname);
  return (
    <Theme theme={track.mode === 'kids' ? kidsTheme : learnTheme} mode="light">
      <div className="app-frame" data-track={track.id}>
        <Outlet context={ctx} />
        {inPlayer ? null : <BottomTabs learnerId={learner.id} track={track} today={today} />}
      </div>
    </Theme>
  );
}
