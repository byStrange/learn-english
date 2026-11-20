import {Route, Routes} from 'react-router';
import {Theme} from '@curialy/ui/theme';
import {teacherTheme} from '../theme/themes';
import {currentDay} from '../lib/clock';
import {useTeacherSession} from '../state/session';
import TeacherShell from './TeacherShell';
import TeacherOverview from './TeacherOverview';
import TeacherLogin from './TeacherLogin';
import {TeacherDataProvider} from './teacherData';
import {TeacherLearner, TeacherResources, TeacherRoadmap} from './TeacherPages';

/** The desktop teacher panel at #/teacher (lazy-loaded). Asks for the 6-digit PIN first. */
export default function TeacherApp() {
  const session = useTeacherSession();
  return (
    <Theme theme={teacherTheme} mode="light">
      {session ? (
        <TeacherDataProvider session={session} today={currentDay()}>
          <Routes>
            <Route element={<TeacherShell />}>
              <Route index element={<TeacherOverview />} />
              <Route path="learner/:id" element={<TeacherLearner />} />
              <Route path="roadmap" element={<TeacherRoadmap />} />
              <Route path="plans" element={<TeacherRoadmap plans />} />
              <Route path="resources" element={<TeacherResources />} />
            </Route>
          </Routes>
        </TeacherDataProvider>
      ) : (
        <TeacherLogin />
      )}
    </Theme>
  );
}
