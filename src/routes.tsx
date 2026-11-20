import {lazy, Suspense} from 'react';
import {createHashRouter, Navigate, type RouteObject} from 'react-router';
import {Spinner} from '@curialy/ui/Spinner';
import {Home} from './screens/Home';
import {LearnerLayout} from './screens/LearnerLayout';
import {LearnerHome} from './screens/LearnerHome';
import {LessonPlayer} from './screens/LessonPlayer';
import {ReviewSession} from './screens/ReviewSession';
import {Words} from './screens/Words';
import {Tenses} from './screens/Tenses';
import {Me} from './screens/Me';

// The teacher panel (and its charts) loads only when it is opened, so the
// learners' phones never download it.
const TeacherApp = lazy(() => import('./teacher/TeacherApp'));

function TeacherFallback() {
  return (
    <main className="screen center-screen">
      <Spinner size="lg" label="Opening the teacher panel" />
    </main>
  );
}

/** The route table, exported so tests can mount it in a memory router. */
export const routes: RouteObject[] = [
  {path: '/', element: <Home />},
  {
    path: '/learn/:learnerId',
    element: <LearnerLayout />,
    children: [
      {index: true, element: <LearnerHome />},
      {path: 'lesson/:lessonId', element: <LessonPlayer />},
      {path: 'review', element: <ReviewSession />},
      {path: 'tenses', element: <Tenses />},
      {path: 'words', element: <Words />},
      {path: 'me', element: <Me />},
    ],
  },
  {
    path: '/teacher/*',
    element: (
      <Suspense fallback={<TeacherFallback />}>
        <TeacherApp />
      </Suspense>
    ),
  },
  {path: '*', element: <Navigate to="/" replace />},
];

export const router = createHashRouter(routes);
