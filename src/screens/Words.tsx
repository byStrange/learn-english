import {startTransition, useRef, useState} from 'react';
import {Button} from '@curialy/ui/Button';
import {SegmentedControl, SegmentedControlItem} from '@curialy/ui/SegmentedControl';
import {BottomSheet} from '@curialy/ui/BottomSheet';
import {getItem, hintText} from '../content/index';
import {boxLabel, COMFORTABLE_BOX, isComfortable, isDue, type ItemState} from '../lib/srs';
import {useProgress} from '../state/ProgressContext';
import {learnedItemIds, nextLesson} from '../state/selectors';
import {PlayButton} from '../components/PlayButton';
import {FlashcardView} from '../exercises/CardTasks';
import {useLearner} from './learnerContext';

type Filter = 'all' | 'practise' | 'comfortable';
const DECK_SIZE = 10;

function BoxMarks({state}: {state: ItemState}) {
  const filled = Math.min(state.box, COMFORTABLE_BOX);
  return (
    <span className="word-level">
      <span className="box-marks" aria-hidden="true">
        {Array.from({length: COMFORTABLE_BOX}, (_, i) => (
          <i key={i} className={i < filled ? 'is-on' : undefined} />
        ))}
      </span>
      <span>{boxLabel(state.box)}</span>
    </span>
  );
}

/** Due first, then the least known. */
function deckFor(ids: string[], items: Record<string, ItemState>, today: string): string[] {
  return [...ids]
    .sort((a, b) => {
      const sa = items[a];
      const sb = items[b];
      const da = isDue(sa, today) ? 0 : 1;
      const db = isDue(sb, today) ? 0 : 1;
      return da - db || sa.box - sb.box || sa.due.localeCompare(sb.due) || a.localeCompare(b);
    })
    .slice(0, DECK_SIZE);
}

/** #/learn/:id/words — the word bank that grows with every lesson. */
export function Words() {
  const {learner, track, today} = useLearner();
  const {get, gradeFlashcard} = useProgress();
  const p = get(learner.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [deck, setDeck] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knew, setKnew] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const base = `/learn/${learner.id}`;

  const ids = learnedItemIds(track, p);
  const comfortable = ids.filter(id => isComfortable(p.items[id])).length;
  const shown = ids.filter(id => {
    if (filter === 'all') return true;
    const c = isComfortable(p.items[id]);
    return filter === 'comfortable' ? c : !c;
  });
  const hint = p.settings.hint;
  const {lesson: next} = nextLesson(track, p);

  const openDeck = () => {
    setDeck(deckFor(ids, p.items, today));
    setPos(0);
    setKnew(0);
    setFlipped(false);
  };
  const grade = (ok: boolean) => {
    if (!deck) return;
    gradeFlashcard(learner.id, deck[pos], ok, today);
    if (ok) setKnew(k => k + 1);
    setFlipped(false);
    setPos(i => i + 1);
  };
  const deckDone = deck !== null && pos >= deck.length;

  return (
    <main className="screen tab-screen" id="main">
      <header className="screen-head">
        <h1 className="screen-title">My words</h1>
        <span className="muted">
          {ids.length} words · {comfortable} comfortable
        </span>
      </header>

      {ids.length === 0 ? (
        <div className="empty-state">
          <h2 className="section-title">No words yet</h2>
          <p>Finish your first lesson and its words will appear here.</p>
          <Button label={`Start: ${next.title}`} variant="primary" size="lg" width="100%" href={`${base}/lesson/${next.id}`} />
        </div>
      ) : (
        <>
          <Button ref={triggerRef} label={`Practise ${Math.min(DECK_SIZE, ids.length)} words`} variant="primary" size="lg" width="100%" onClick={openDeck} />
          <SegmentedControl label="Show" value={filter} onChange={v => startTransition(() => setFilter(v as Filter))} layout="fill" size="lg">
            <SegmentedControlItem value="all" label="All" />
            <SegmentedControlItem value="practise" label="Practise" />
            <SegmentedControlItem value="comfortable" label="Comfortable" />
          </SegmentedControl>
          {shown.length === 0 ? (
            <p className="muted">{filter === 'comfortable' ? 'No comfortable words yet. Words become comfortable after 4 good reviews on different days.' : 'Every word is comfortable. Great work!'}</p>
          ) : (
            <ul className="word-list" aria-label="Words">
              {shown.map(id => {
                const item = getItem(id);
                if (!item) return null;
                return (
                  <li key={id} className="word-row">
                    <PlayButton text={item.verb ? item.verb.v1 : item.text} audio={item.audio} rate={track.speechRate} size="sm" label={`Play "${item.verb ? item.verb.v1 : item.text}"`} />
                    <span className="word-main">
                      <span className={`word-en${item.verb ? ' verb-forms' : ''}`}>{item.verb ? `${item.verb.v1} · ${item.verb.v2} · ${item.verb.v3}` : item.text}</span>
                      {hintText(item, hint) ? <span className="word-hint">{hintText(item, hint)}</span> : null}
                    </span>
                    <BoxMarks state={p.items[id]} />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <BottomSheet
        label="Practise words"
        isOpen={deck !== null}
        onOpenChange={open => {
          if (!open) setDeck(null);
        }}
        finalFocusRef={triggerRef}
        height="tall"
      >
        {deck ? (
          <div className="deck">
            {deckDone ? (
              <div className="sheet-body">
                <h2 className="sheet-title">Deck done!</h2>
                <p>
                  You knew {knew} of {deck.length} words. Words you didn't know come back sooner.
                </p>
                <div className="sheet-actions">
                  <Button label="Finish" variant="primary" size="lg" width="100%" onClick={() => setDeck(null)} />
                </div>
              </div>
            ) : (
              <>
                <h2 className="sheet-title">Practise words</h2>
                <p className="deck-count" aria-live="polite">
                  Card {pos + 1} of {deck.length}
                </p>
                <div className="deck-stack">
                  <FlashcardView key={deck[pos]} itemId={deck[pos]} rate={track.speechRate} hintLang={hint} flipped={flipped} onFlip={() => setFlipped(f => !f)} onGrade={grade} />
                </div>
                <Button label="Finish" variant="ghost" width="100%" onClick={() => setDeck(null)} />
              </>
            )}
          </div>
        ) : null}
      </BottomSheet>
    </main>
  );
}
