import {Link} from 'react-router';
import {Card} from '@curialy/ui/Card';
import {Heading, Text} from '@curialy/ui/Text';
import {VStack} from '@curialy/ui/Layout';
import {PinPad} from '../components/PinPad';
import {loginWithPin} from '../state/auth';

/** #/teacher before login: one centred card with a 6-digit pad (number keys work too). */
export default function TeacherLogin() {
  return (
    <main className="teacher-login" id="main">
      <Card padding={8}>
        <VStack gap={4} hAlign="center">
          <Heading level={1}>Teacher panel</Heading>
          <Text color="secondary">Enter your 6-digit PIN</Text>
          <PinPad length={6} label="Teacher PIN" onSubmit={pin => loginWithPin('teacher', pin, 'teacher')} />
          <Link className="plain-link" to="/">
            Back to the learner app
          </Link>
        </VStack>
      </Card>
    </main>
  );
}
