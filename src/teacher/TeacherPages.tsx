import {Link, Navigate, useParams} from 'react-router';
import {Layout, LayoutContent, LayoutHeader, VStack} from '@curialy/ui/Layout';
import {Text, Heading} from '@curialy/ui/Text';
import {Card} from '@curialy/ui/Card';
import {Grid} from '@curialy/ui/Grid';
import {Section} from '@curialy/ui/Section';
import {ProgressBar} from '@curialy/ui/ProgressBar';
import {CheckboxInput} from '@curialy/ui/CheckboxInput';
import {TextArea} from '@curialy/ui/TextArea';
import {HStack} from '@curialy/ui/Layout';
import {PlayButton} from '../components/PlayButton';
import {ChangePinDialog} from './ChangePinDialog';
import {getItem, getLearner, getLesson, getTrack} from '../content/index';
import {roadmaps, type Roadmap} from '../content/teacher/roadmap';
import {formatDay, relativeDay} from '../lib/dates';
import {currentDay} from '../lib/clock';
import {boxLabel} from '../lib/srs';
import {comfortableCount, dueCount, lessonsDone, streakNow, unitProgress, weakItems} from '../state/selectors';
import {emptyWeek, useTeacherLearners, useTeacherState, weekKey} from './teacherData';

const TENSE_LABEL = {'present-simple': 'Present simple', 'past-simple': 'Past simple'} as const;

function Page({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <Layout
      header={
        <LayoutHeader hasDivider padding={6}>
          <Heading level={1}>{title}</Heading>
        </LayoutHeader>
      }
      content={<LayoutContent padding={6}>{children}</LayoutContent>}
    />
  );
}

export function TeacherLearner() {
  const {id} = useParams();
  const today = currentDay();
  const {learners, setPin} = useTeacherLearners();
  const found = getLearner(id);
  const row = learners.find(l => l.learner.id === id);
  if (!found || !row) return <Navigate to="/teacher" replace />;
  const {progress: p, track} = row;
  const l = lessonsDone(track, p);
  const sentences = [...p.sentences].reverse();
  return (
    <Page title={`${row.learner.name} · ${track.shortName}`}>
      <VStack gap={6}>
        <HStack gap={4} vAlign="center" wrap="wrap">
          <Text color="secondary">
            Streak {streakNow(p, today)} days (longest {p.streak.longest}) · {l.done} of {l.total} lessons · {comfortableCount(p)} comfortable · {dueCount(p, today)} due · {row.source}
          </Text>
          <ChangePinDialog userId={row.learner.id} name={row.learner.nickname ?? row.learner.name} setPin={setPin} />
        </HStack>
        <Section padding={0}>
          <VStack gap={3}>
            <Heading level={2}>Units</Heading>
            {unitProgress(track, p).map(u => (
              <ProgressBar key={u.unit.id} label={u.unit.title} value={u.done} max={Math.max(1, u.total)} hasValueLabel formatValueLabel={(v, m) => `${v} of ${m}`} />
            ))}
          </VStack>
        </Section>
        <Grid columns={{minWidth: 320}} gap={6}>
          <Card padding={6}>
            <VStack gap={3}>
              <Heading level={2}>Weak words</Heading>
              <table className="plain-table">
                <caption className="visually-hidden">Words this learner gets wrong most</caption>
                <thead>
                  <tr><th scope="col">Word</th><th scope="col">Level</th><th scope="col">Wrong</th><th scope="col">Last seen</th></tr>
                </thead>
                <tbody>
                  {weakItems(p).map(s => (
                    <tr key={s.id}><td>{getItem(s.id)?.text ?? s.id}</td><td>{boxLabel(s.box)}</td><td>{s.wrong}</td><td>{relativeDay(s.lastSeen, today)}</td></tr>
                  ))}
                </tbody>
              </table>
            </VStack>
          </Card>
          <Card padding={6}>
            <VStack gap={3}>
              <Heading level={2}>Recent sessions</Heading>
              <table className="plain-table">
                <caption className="visually-hidden">The last 20 sessions</caption>
                <thead>
                  <tr><th scope="col">Day</th><th scope="col">What</th><th scope="col">Right</th><th scope="col">Wrong</th></tr>
                </thead>
                <tbody>
                  {p.history.slice(-20).reverse().map((h, i) => (
                    <tr key={h.id ?? i}>
                      <td>{formatDay(h.date)}</td>
                      <td>{h.kind === 'lab' ? 'Tenses: 3 sentences' : h.lessonId ? (getLesson(track, h.lessonId)?.title ?? h.lessonId) : 'Review'}</td>
                      <td>{h.correct}</td>
                      <td>{h.wrong}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </VStack>
          </Card>
        </Grid>
        <Card padding={6}>
          <VStack gap={3}>
            <Heading level={2}>Sentences they made</Heading>
            {sentences.length === 0 ? (
              <Text color="secondary">No sentences yet. They appear here when {row.learner.name} saves one on the Tenses screen.</Text>
            ) : (
              <table className="plain-table">
                <caption className="visually-hidden">Sentences made on the Tenses screen, newest first</caption>
                <thead>
                  <tr><th scope="col">Day</th><th scope="col">Tense</th><th scope="col">Sentence</th></tr>
                </thead>
                <tbody>
                  {sentences.map(x => (
                    <tr key={x.id}>
                      <td>{formatDay(x.date)}</td>
                      <td>{TENSE_LABEL[x.tense]}, {x.form}</td>
                      <td className="lab-sentence-cell">{x.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </VStack>
        </Card>
      </VStack>
    </Page>
  );
}

function WeekCards({roadmap, plans}: {roadmap: Roadmap; plans: boolean}) {
  const today = currentDay();
  const {state, updateWeek} = useTeacherState(today);
  const track = getTrack(roadmap.trackId);
  return (
    <Grid columns={{minWidth: 320}} gap={6}>
      {roadmap.weeks.map(wk => {
        const key = weekKey(roadmap.trackId, wk.week);
        const ws = state.weeks[key] ?? emptyWeek();
        return (
          <Card padding={6} key={key}>
            <VStack gap={3}>
              <Heading level={3}>
                Week {wk.week}: {wk.title}
              </Heading>
              <Text color="secondary">
                {wk.grammar} · words: {wk.vocabTheme}
                {wk.taughtBefore ? ' · review week (taught before)' : ''}
              </Text>
              {plans ? (
                <ul className="plain-list">
                  {wk.inClass.map(s => <li key={s}>{s}</li>)}
                </ul>
              ) : null}
              {wk.homeworkLessonIds.length > 0 ? (
                <Text>Homework in the app: {wk.homeworkLessonIds.map(id => `“${getLesson(track, id)?.title ?? id}”`).join(', ')}</Text>
              ) : null}
              <CheckboxInput label="Taught in class" value={ws.taught} onChange={checked => updateWeek(key, {taught: checked})} />
              {wk.canDo.map(c => (
                <CheckboxInput key={c} label={`Can do: ${c}`} value={Boolean(ws.canDo[c])} onChange={checked => updateWeek(key, {canDo: {...ws.canDo, [c]: checked}})} />
              ))}
              <TextArea label={`Notes for week ${wk.week}`} rows={3} value={ws.notes} onChange={v => updateWeek(key, {notes: v})} />
            </VStack>
          </Card>
        );
      })}
    </Grid>
  );
}

export function TeacherRoadmap({plans = false}: {plans?: boolean}) {
  const today = currentDay();
  const {state, setCourseStart} = useTeacherState(today);
  return (
    <Page title={plans ? 'Lesson plans' : 'Roadmap'}>
      <VStack gap={6}>
        <label className="field-label" htmlFor="course-start">
          Course start (week 1 begins on this day)
          <input id="course-start" className="field-input" type="date" value={state.courseStart} onChange={e => e.target.value && setCourseStart(e.target.value)} />
        </label>
        {roadmaps.map(r => (
          <Section padding={0} key={r.trackId}>
            <VStack gap={4}>
              <Heading level={2}>{r.trackId === 'g1' ? 'Group 1' : 'Group 2 · Kids'}</Heading>
              <WeekCards roadmap={r} plans={plans} />
            </VStack>
          </Section>
        ))}
      </VStack>
    </Page>
  );
}

const SAMPLE = 'Yesterday I played football with my brother.';
const CURRENT_VOICE = 'af_heart';
const VOICES = [
  {id: 'af_heart', name: 'Heart', accent: 'American, female'},
  {id: 'af_bella', name: 'Bella', accent: 'American, female'},
  {id: 'bf_emma', name: 'Emma', accent: 'British, female'},
  {id: 'bm_george', name: 'George', accent: 'British, male'},
  {id: 'am_michael', name: 'Michael', accent: 'American, male'},
] as const;

export function TeacherResources() {
  const groups = roadmaps.map(r => {
    const seen = new Map<string, {title: string; url: string}>();
    r.weeks.forEach(w => w.resources.forEach(res => seen.set(res.url, res)));
    return {trackId: r.trackId, list: [...seen.values()]};
  });
  const shared = [{title: "Oxford Learner's Dictionaries (hear any word)", url: 'https://www.oxfordlearnersdictionaries.com/'}];
  const linkList = (list: {title: string; url: string}[]) => (
    <ul className="plain-list">
      {list.map(res => (
        <li key={res.url}>
          <a className="plain-link" href={res.url} target="_blank" rel="noopener noreferrer">
            {res.title}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <Page title="Resources">
      <Grid columns={{minWidth: 320}} gap={6}>
        {groups.map(g => (
          <Card padding={6} key={g.trackId}>
            <VStack gap={3}>
              <Heading level={2}>{g.trackId === 'g1' ? 'Group 1' : 'Group 2 · Kids'}</Heading>
              {linkList(g.list)}
            </VStack>
          </Card>
        ))}
          <Card padding={6}>
            <VStack gap={3}>
              <Heading level={2}>App voice</Heading>
              <Text color="secondary">Every word and sentence in the app is recorded with one natural voice (Kokoro). Listen to each and tell me which you like:</Text>
              <ul className="voice-list">
                {VOICES.map(v => (
                  <li key={v.id} className="voice-row">
                    <PlayButton text={SAMPLE} audio={`/audio/samples/${v.id}.mp3`} rate={1} size="sm" label={`Play ${v.name}`} />
                    <span>
                      <strong>{v.name}</strong> · {v.accent}
                      {v.id === CURRENT_VOICE ? ' · used now' : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <Text type="supporting" color="secondary">
                To change it, put the voice id (e.g. bf_emma) in tools/tts/config.json and run npm run audio -- --force.
              </Text>
            </VStack>
          </Card>
          <Card padding={6}>
            <VStack gap={3}>
              <Heading level={2}>For both groups</Heading>
            {linkList(shared)}
            <Text type="supporting" color="secondary">
              <Link className="plain-link" to="/teacher/roadmap">Back to the roadmap</Link>
            </Text>
          </VStack>
        </Card>
      </Grid>
    </Page>
  );
}
