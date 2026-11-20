import type {Unit} from '../types';
import {build, card, form, formula, gap, hear, listen, pick} from '../helpers';

/**
 * Group 2 · Kids (Said Ali / Alixon, Said Amir / Amirxon).
 * Short lessons: at most 6 tasks, 3–4 minutes, a picture on every word.
 * Goal: "Tell about my day — and about yesterday" (see tracks.ts).
 */

export const helloMe: Unit = {
  id: 'g2-u1',
  title: 'Hello & me',
  role: 'subject',
  description: 'I am…, colours, numbers and my family.',
  lessons: [
    {
      id: 'g2-hm-1',
      title: 'I am… and colours',
      minutes: 3,
      newItems: ['w-i', 'w-am', 'w-boy', 'w-happy', 'w-red', 'w-blue', 'w-green', 'w-yellow'],
      formula: formula('I + am', 'I:s am:v a_boy:o', ['I am Ali.', 'I am a boy.', 'I am happy.']),
      exercises: [
        pick('w-red'),
        listen('w-blue'),
        pick('w-green'),
        listen('w-yellow'),
        build('I:s am:v happy:o'),
        hear('I am a boy.', 'What did you hear?', 'I am a boy.', ['I am a boy.', 'I am happy.', 'I am Ali.']),
      ],
    },
    {
      id: 'g2-hm-2',
      title: 'Numbers 1 to 10',
      minutes: 3,
      newItems: ['w-one', 'w-two', 'w-three', 'w-four', 'w-five', 'w-six', 'w-seven', 'w-eight', 'w-nine', 'w-ten'],
      exercises: [
        pick('w-three'),
        listen('w-five'),
        pick('w-seven'),
        listen('w-ten'),
        listen('w-two'),
        hear('I am eight.', 'How old?', 'eight', ['eight', 'ten', 'two']),
      ],
    },
    {
      id: 'g2-hm-3',
      title: 'My family',
      minutes: 3,
      newItems: ['w-mum', 'w-dad', 'w-brother', 'w-sister', 'w-grandma', 'w-grandpa', 'w-family', 'w-my'],
      formula: formula('my + family', 'This_is:v my:s mum:o', ['This is my mum.', 'This is my brother.', 'I love my family.'], {
        joiner: ' ',
      }),
      exercises: [
        pick('w-mum'),
        listen('w-dad'),
        pick('w-grandma'),
        listen('w-sister'),
        card('w-family'),
        hear('This is my brother.', 'Who is it?', 'brother', ['brother', 'sister', 'dad']),
      ],
    },
  ],
};

export const myDay: Unit = {
  id: 'g2-u2',
  title: 'My day',
  role: 'verb',
  description: 'I get up, I eat breakfast, I go to school.',
  lessons: [
    {
      id: 'g2-day-1',
      title: 'I get up',
      minutes: 4,
      sentenceGoal: 'present',
      newItems: ['v-get-up', 'v-brush', 'v-wash', 'w-teeth', 'w-face', 'w-in-the-morning', 'w-every-day'],
      formula: formula('My morning', 'I:s get_up:v in_the_morning:t', ['I get up in the morning.', 'I brush my teeth.', 'I wash my face.']),
      exercises: [
        pick('w-teeth'),
        listen('v-brush'),
        build('I:s brush:v my_teeth:o'),
        build('I:s wash:v my_face:o'),
        hear('I get up in the morning.', 'When?', 'in the morning', ['in the morning', 'at night', 'yesterday']),
        listen('v-get-up'),
      ],
    },
    {
      id: 'g2-day-2',
      title: 'I eat breakfast',
      minutes: 4,
      sentenceGoal: 'present',
      newItems: ['v-eat', 'v-drink', 'w-breakfast', 'w-milk', 'w-bread', 'w-egg', 'w-juice', 'w-tea'],
      formula: formula('Breakfast', 'I:s eat:v breakfast:o every_day:t', ['I eat bread.', 'I drink milk.', 'I eat an egg every day.']),
      exercises: [
        pick('w-milk'),
        listen('w-bread'),
        pick('w-egg'),
        build('I:s drink:v milk:o'),
        build('I:s eat:v bread:o every_day:t'),
        hear('I drink juice every day.', 'What do I drink?', 'juice', ['juice', 'milk', 'tea']),
      ],
    },
    {
      id: 'g2-day-3',
      title: 'I go to school',
      minutes: 4,
      sentenceGoal: 'present',
      newItems: ['v-go', 'v-play', 'v-read', 'v-sleep', 'w-you', 'w-we', 'w-school', 'w-ball', 'w-book', 'w-bed', 'w-after-school', 'w-at-night'],
      formula: formula('I / you / we + verb', 'I_/_you_/_we:s go:v to_school:o', ['I go to school.', 'We play after school.', 'I sleep at night.']),
      exercises: [
        pick('w-ball'),
        listen('w-book'),
        build('We:s play:v football:o after_school:t'),
        build('I:s go:v to_school:o'),
        hear('I sleep at night.', 'When?', 'at night', ['in the morning', 'at night', 'after school']),
        listen('v-sleep'),
      ],
    },
  ],
};

export const heShe: Unit = {
  id: 'g2-u3',
  title: 'He and she + s',
  role: 'object',
  description: 'He plays, she eats, my brother goes.',
  lessons: [
    {
      id: 'g2-hs-1',
      title: 'He plays, she plays',
      minutes: 4,
      sentenceGoal: 'present',
      newItems: ['w-he', 'w-she', 'v-play', 'v-like', 'w-cat', 'w-dog', 'w-football'],
      formula: formula('he / she + s', 'I_/_you_/_we:s play:v', ['He plays football.', 'She likes cats.'], {
        rows: ['he_/_she:s plays:v'],
      }),
      exercises: [
        pick('w-he'),
        pick('w-she'),
        gap('He ___ football.', 'plays', ['play', 'plays', 'sleep']),
        listen('w-cat'),
        build('She:s likes:v cats:o'),
        hear('He plays with the dog.', 'Who plays?', 'he', ['he', 'she', 'we']),
      ],
    },
    {
      id: 'g2-hs-2',
      title: 'She eats, he drinks',
      minutes: 4,
      sentenceGoal: 'present',
      newItems: ['v-eat', 'v-drink', 'v-watch', 'w-tv', 'w-apple', 'w-banana', 'w-water'],
      formula: formula('he / she + s', 'he_/_she:s eats:v an_apple:o', ['She eats an apple.', 'He drinks water.', 'He watches TV.'], {
        rows: ['he_/_she:s watches:v TV:o'],
        note: 'watch → watches',
      }),
      exercises: [
        gap('She ___ an apple.', 'eats', ['eat', 'eats', 'sleep']),
        pick('w-banana'),
        listen('w-apple'),
        build('He:s watches:v TV:o', {extra: 'watch:v'}),
        hear('She drinks water every day.', 'What does she drink?', 'water', ['water', 'milk', 'juice']),
        listen('v-watch'),
      ],
    },
    {
      id: 'g2-hs-3',
      title: 'My brother goes to school',
      minutes: 4,
      sentenceGoal: 'present',
      newItems: ['v-go', 'v-ride', 'v-help', 'w-bike', 'w-park', 'w-home'],
      formula: formula('go → goes', 'he_/_she:s goes:v to_school:o', ['My brother goes to school.', 'He rides his bike.', 'She helps Mum at home.']),
      exercises: [
        gap('My brother ___ to school.', 'goes', ['go', 'goes', 'sleep']),
        pick('w-bike'),
        listen('w-park'),
        build('He:s rides:v his_bike:o'),
        build('She:s helps:v Mum:o at_home:o'),
        hear('Amir goes to the park after school.', 'Where does he go?', 'park', ['park', 'school', 'home']),
      ],
    },
  ],
};

export const yesterdayEd: Unit = {
  id: 'g2-u4',
  title: 'Yesterday: -ed',
  role: 'time',
  description: 'Yesterday I played, watched, helped.',
  lessons: [
    {
      id: 'g2-y-1',
      title: 'Yesterday I played',
      minutes: 4,
      sentenceGoal: 'past',
      newItems: ['v-play', 'v-watch', 'v-help', 'w-yesterday', 'w-today'],
      formula: formula('Today → yesterday', 'Today:t I:s play:v', ['Yesterday I played.', 'Yesterday I watched TV.', 'Yesterday I helped my mum.'], {
        rows: ['Yesterday:t I:s played:v'],
        note: 'Yesterday? Add -ed.',
      }),
      exercises: [
        form('v-play', 'v2'),
        gap('Yesterday I ___ football.', 'played', ['play', 'played', 'plays']),
        listen('w-yesterday'),
        build('Yesterday:t I:s watched:v TV:o'),
        hear('Yesterday I helped my mum.', 'When?', 'yesterday', ['today', 'yesterday', 'every day']),
        pick('w-today'),
      ],
    },
    {
      id: 'g2-y-2',
      title: 'Yesterday we walked',
      minutes: 4,
      sentenceGoal: 'past',
      newItems: ['v-walk', 'v-clean', 'v-brush', 'v-wash', 'w-room'],
      formula: formula('Yesterday + ed', 'We:s walked:v to_the_park:o yesterday:t', ['We walked to the park yesterday.', 'I cleaned my room.', 'I washed my face.']),
      exercises: [
        form('v-walk', 'v2'),
        form('v-clean', 'v2'),
        build('I:s cleaned:v my_room:o yesterday:t'),
        listen('w-room'),
        hear('We walked to the park yesterday.', 'When?', 'yesterday', ['every day', 'yesterday', 'at night']),
        gap('Yesterday I ___ my face.', 'washed', ['wash', 'washed', 'washes']),
      ],
    },
  ],
};

export const g2ComingSoon: Unit[] = [
  {id: 'g2-u5', title: 'Yesterday: was / were', role: 'time', lessons: [], status: 'coming-soon'},
  {id: 'g2-u6', title: 'Yesterday: went, ate, saw', role: 'verb', lessons: [], status: 'coming-soon'},
  {id: 'g2-u7', title: 'My week: days of the week', role: 'time', lessons: [], status: 'coming-soon'},
  {id: 'g2-u8', title: 'Questions: Do you…? Did you…?', role: 'subject', lessons: [], status: 'coming-soon'},
];

export const g2Units: Unit[] = [helloMe, myDay, heShe, yesterdayEd, ...g2ComingSoon];
