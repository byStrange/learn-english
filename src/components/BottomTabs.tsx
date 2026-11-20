import {NavLink, useLocation} from 'react-router';
import {ArrowPathIcon, BookOpenIcon, ClockIcon, MapIcon, UserCircleIcon} from '@heroicons/react/24/outline';
import type {Track} from '../content/types';
import {useProgress} from '../state/ProgressContext';
import {dueCount} from '../state/selectors';

const TABS = [
  {to: '', label: 'Learn', Icon: MapIcon},
  {to: 'review', label: 'Review', Icon: ArrowPathIcon},
  {to: 'tenses', label: 'Tenses', Icon: ClockIcon},
  {to: 'words', label: 'Words', Icon: BookOpenIcon},
  {to: 'me', label: 'Me', Icon: UserCircleIcon},
] as const;

function activeIndex(pathname: string, base: string): number {
  const rest = pathname.slice(base.length).replace(/^\//, '');
  const i = TABS.findIndex(t => t.to !== '' && rest.startsWith(t.to));
  return i === -1 ? 0 : i;
}

/** Learn · Review · Tenses · Words · Me, with a highlight that slides to the open tab. */
export function BottomTabs({learnerId, today}: {learnerId: string; track: Track; today: string}) {
  const {get} = useProgress();
  const {pathname} = useLocation();
  const base = `/learn/${learnerId}`;
  const due = dueCount(get(learnerId), today);
  const index = activeIndex(pathname, base);
  return (
    <nav className="tabbar" aria-label="Learner">
      <div className="tabbar-inner">
        <span className="tab-indicator" aria-hidden="true" style={{'--tab-index': index} as React.CSSProperties} />
        {TABS.map(({to, label, Icon}) => (
          <NavLink key={label} to={to ? `${base}/${to}` : base} end={to === ''} className="tab">
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {label === 'Review' && due > 0 ? (
              <span className="tab-badge">
                {due}
                <span className="visually-hidden"> due</span>
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
