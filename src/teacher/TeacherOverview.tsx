// Scaffolded from the Curialy UI template "dashboard-progress" (v0.7.16, MIT): replace its content, keep its layout and spacing.
// Copyright (c) Meta Platforms, Inc. and affiliates.

import {Link} from 'react-router';
import {Layout, LayoutContent, LayoutHeader, VStack, HStack} from '@curialy/ui/Layout';
import {Text, Heading} from '@curialy/ui/Text';
import {Card} from '@curialy/ui/Card';
import {Grid} from '@curialy/ui/Grid';
import {Section} from '@curialy/ui/Section';
import {Button} from '@curialy/ui/Button';
import {ProgressBar} from '@curialy/ui/ProgressBar';
import {Banner} from '@curialy/ui/Banner';
import {Table, proportional} from '@curialy/ui/Table';
import type {TableColumn} from '@curialy/ui/Table';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {getItem} from '../content/index';
import {roadmaps} from '../content/teacher/roadmap';
import {formatDay, formatDayLong, relativeDay} from '../lib/dates';
import {currentDay} from '../lib/clock';
import {comfortableCount, dueCount, goalProgress, lastActive, lessonsDone, minutesPerDay, recentAccuracy, streakNow} from '../state/selectors';
import {currentWeek, useTeacherLearners, useTeacherState, type TeacherLearner} from './teacherData';

// Chart colours from the theme's data tokens (one categorical slot per learner).
const CHART_GRID = 'var(--color-border, rgba(5, 54, 89, 0.1))';
const AXIS_TICK = {fill: 'var(--color-text-secondary, #475069)', fontSize: 12};
const SERIES = ['var(--color-data-categorical-1, #1D5FD1)', 'var(--color-data-categorical-2, #1E8C4E)', 'var(--color-data-categorical-3, #D93A2B)', 'var(--color-data-categorical-4, #C98F00)'];

function CardHeading({children}: {children: string}) {
  return <Heading level={3}>{children}</Heading>;
}

function SectionHeading({children}: {children: string}) {
  return <Heading level={2}>{children}</Heading>;
}

type Row = TeacherLearner & Record<string, unknown>;

export default function TeacherOverview() {
  const today = currentDay();
  const {learners, refresh, loading, error, refreshedAt} = useTeacherLearners();
  const {state} = useTeacherState(today);
  const week = currentWeek(state.courseStart, today);
  const updated = refreshedAt ? new Date(refreshedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : null;

  const columns: TableColumn<Row>[] = [
    {key: 'name', header: 'Learner', width: proportional(1, {minWidth: 150}), renderCell: r => <Link className="plain-link" to={`/teacher/learner/${r.learner.id}`}>{r.learner.name}</Link>},
    {key: 'track', header: 'Track', renderCell: r => r.track.shortName},
    {key: 'streak', header: 'Streak', renderCell: r => `${streakNow(r.progress, today)} days`},
    {key: 'last', header: 'Last active', renderCell: r => relativeDay(lastActive(r.progress), today)},
    {
      key: 'lessons',
      header: 'Lessons',
      width: proportional(1, {minWidth: 160}),
      renderCell: r => {
        const l = lessonsDone(r.track, r.progress);
        return <ProgressBar label={`${r.learner.name}: lessons`} isLabelHidden value={l.done} max={l.total} hasValueLabel formatValueLabel={(v, m) => `${v} of ${m}`} />;
      },
    },
    {key: 'acc', header: 'Accuracy, 7 days', renderCell: r => {
      const a = recentAccuracy(r.progress, today);
      return a === null ? '—' : `${Math.round(a * 100)}%`;
    }},
    {key: 'due', header: 'Due', renderCell: r => String(dueCount(r.progress, today))},
    {key: 'comfortable', header: 'Comfortable', renderCell: r => String(comfortableCount(r.progress))},
    {key: 'source', header: 'Server', renderCell: r => r.source},
  ];

  // Minutes per day, one series per learner.
  const series = learners.map(l => minutesPerDay(l.progress, today));
  const chartData = series[0].map((d, i) => {
    const row: Record<string, string | number> = {day: formatDay(d.day)};
    learners.forEach((l, li) => (row[l.learner.name] = series[li][i].minutes));
    return row;
  });

  // Most-missed items across everyone.
  const misses = new Map<string, {count: number; names: Set<string>}>();
  for (const l of learners) {
    for (const h of l.progress.history) {
      for (const id of h.mistakes) {
        const m = misses.get(id) ?? {count: 0, names: new Set<string>()};
        m.count += 1;
        m.names.add(l.learner.name);
        misses.set(id, m);
      }
    }
  }
  const attention = [...misses.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  const kids = learners.filter(l => l.track.mode === 'kids');

  return (
    <Layout
      header={
        <LayoutHeader hasDivider padding={6}>
          <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
            <VStack gap={1}>
              <Heading level={1}>How the boys are doing</Heading>
              <Text color="secondary">{formatDayLong(today)} · course week {Math.max(1, week)}</Text>
            </VStack>
            <HStack gap={3} vAlign="center">
              <Text color="secondary">{loading ? 'Loading from the server…' : updated ? `Updated ${updated}` : ''}</Text>
              <Button label="Refresh" variant="secondary" onClick={refresh} />
            </HStack>
          </HStack>
          {error ? <Banner status="error" title="Server not reached" description={error} endContent={<Button label="Retry" variant="secondary" onClick={refresh} />} /> : null}
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          <Section padding={6} dividers={['bottom']}>
            <VStack gap={4}>
              <SectionHeading>Learners</SectionHeading>
              <Card padding={6}>
                <Table<Row> aria-label="Learner progress" data={learners as Row[]} columns={columns} idKey={r => r.learner.id} />
              </Card>
            </VStack>
          </Section>
          <Section padding={6} dividers={['bottom']}>
            <Grid columns={{minWidth: 320}} gap={6}>
              <Card padding={6}>
                <VStack gap={3}>
                  <CardHeading>Minutes per day</CardHeading>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{top: 8, right: 4, left: 0, bottom: 4}}>
                      <CartesianGrid horizontal vertical={false} stroke={CHART_GRID} />
                      <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={2} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                      <Tooltip />
                      {learners.map((l, i) => (
                        <Bar key={l.learner.id} dataKey={l.learner.name} stackId="m" fill={SERIES[i % SERIES.length]} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <Text type="supporting" color="secondary">Last 14 days, all four learners stacked.</Text>
                </VStack>
              </Card>
              <Card padding={6}>
                <VStack gap={3}>
                  <CardHeading>Needs attention</CardHeading>
                  {attention.length === 0 ? (
                    <Text color="secondary">No mistakes recorded yet. Words missed in lessons will show here.</Text>
                  ) : (
                    <ol className="attention-list">
                      {attention.map(([id, m]) => (
                        <li key={id}>
                          <strong>{getItem(id)?.text ?? id}</strong> · missed {m.count}× · {[...m.names].join(', ')}
                        </li>
                      ))}
                    </ol>
                  )}
                </VStack>
              </Card>
              <Card padding={6}>
                <VStack gap={3}>
                  <CardHeading>Goal · Group 2</CardHeading>
                  {kids.map(k => {
                    const g = goalProgress(k.track, k.progress);
                    return (
                      <VStack gap={2} key={k.learner.id}>
                        <ProgressBar label={`${k.learner.name}: words`} value={g.words} max={g.wordsTarget} hasValueLabel formatValueLabel={(v, m) => `${v} of ${m}`} />
                        <ProgressBar label={`${k.learner.name}: sentences`} value={g.sentences} max={g.sentencesTarget} hasValueLabel formatValueLabel={(v, m) => `${v} of ${m}`} />
                      </VStack>
                    );
                  })}
                </VStack>
              </Card>
            </Grid>
          </Section>
          <Section padding={6}>
            <VStack gap={4}>
              <SectionHeading>Roadmap</SectionHeading>
              <Grid columns={{minWidth: 320}} gap={6}>
                {roadmaps.map(r => (
                  <Card padding={6} key={r.trackId}>
                    <VStack gap={3}>
                      <CardHeading>{r.trackId === 'g1' ? 'Group 1' : 'Group 2 · Kids'}</CardHeading>
                      <ol className="roadmap-list">
                        {r.weeks.map(wk => {
                          const done = state.weeks[`${r.trackId}-${wk.week}`]?.taught;
                          const now = wk.week === week;
                          return (
                            <li key={wk.week} className={`roadmap-week${done ? ' is-done' : ''}${now ? ' is-now' : ''}`} aria-current={now ? 'step' : undefined}>
                              <span className="roadmap-num">Week {wk.week}</span> {wk.title}
                              {wk.taughtBefore ? <span className="roadmap-tag"> · review</span> : null}
                              {done ? <span className="roadmap-tag"> · taught</span> : null}
                              {now ? <span className="roadmap-tag"> · this week</span> : null}
                            </li>
                          );
                        })}
                      </ol>
                    </VStack>
                  </Card>
                ))}
              </Grid>
            </VStack>
          </Section>
        </LayoutContent>
      }
    />
  );
}
