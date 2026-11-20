import type {GrammarRole, Word} from './types';

/**
 * The shared word bank. Ids are "w-" + the English text with spaces as dashes.
 *
 * Hints are in Uzbek (Latin). TEACHER: please check them — they were written
 * for this first version and may need corrections.
 *
 * `picture` is content (an emoji, or "swatch:#hex" for a colour square, or a
 * file path like "/images/apple.webp"). It is never used as a UI icon.
 */
function w(en: string, uz: string, picture?: string, role?: GrammarRole, example?: string): Word {
  return {id: 'w-' + en.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, '-'), en, hint: {uz}, picture, role, example};
}

export const words: Word[] = [
  // Tenses lab: a second sport, so "play" has enough objects to choose from.
  w('basketball', 'basketbol', '🏀', 'object', 'I play basketball after school.'),
  w('cartoons', 'multfilmlar', '📺', 'object', 'We watch cartoons on Friday.'),
  w('story', 'hikoya', '📚', 'object', 'My grandma reads a story.'),
  w('letter', 'xat', '✉️', 'object', 'I read a letter from my uncle.'),
  w('dishes', 'idish-tovoq', '🍽️', 'object', 'I do the dishes after dinner.'),
  w('exercises', 'mashqlar', '🏋️', 'object', 'I do my exercises in the morning.'),
  w('hair', 'soch', '💇', 'object', 'I brush my hair.'),
  w('horse', 'ot', '🐎', 'object', 'My cousin rides a horse.'),
  // People and pronouns (subject)
  w('I', 'men', '🙋', 'subject', 'I am ten years old.'),
  w('you', 'sen / siz', '👉', 'subject', 'You are my friend.'),
  w('he', "u (o'g'il bola, erkak)", '👦', 'subject', 'He plays football.'),
  w('she', 'u (qiz bola, ayol)', '👧', 'subject', 'She likes cats.'),
  w('it', 'u (narsa yoki hayvon)', '📦', 'subject', 'It is a big ball.'),
  w('we', 'biz', '👫', 'subject', 'We go to school.'),
  w('they', 'ular', '👥', 'subject', 'They watch TV.'),
  w('my', 'mening', undefined, 'subject', 'This is my mum.'),
  w('boy', "o'g'il bola", '🧒', 'object', 'I am a boy.'),
  w('mother', 'ona', '👩', 'subject', 'My mother cooks dinner.'),
  w('father', 'ota', '👨', 'subject', 'My father works every day.'),
  w('mum', 'oyi, ona', '👩', 'object', 'This is my mum.'),
  w('dad', 'dadam, ota', '👨', 'object', 'This is my dad.'),
  w('brother', 'aka / uka', '🧑', 'subject', 'My brother goes to school.'),
  w('sister', 'opa / singil', '👱‍♀️', 'subject', 'My sister reads books.'),
  w('grandma', 'buvi', '👵', 'object', 'I love my grandma.'),
  w('grandpa', 'bobo', '👴', 'object', 'My grandpa has a garden.'),
  w('family', 'oila', '👪', 'object', 'I love my family.'),
  w('uncle', "amaki / tog'a", undefined, 'object', 'I called my uncle.'),
  w('cousin', 'amakivachcha / xolavachcha', undefined, 'object', 'We visited our cousins.'),
  w('teacher', "o'qituvchi", undefined, 'subject', 'My teacher is kind.'),
  w('friend', "do'st", '🤝', 'object', 'Umar is my friend.'),

  // to be (verb)
  w('am', '(men) …man', undefined, 'verb', 'I am happy.'),
  w('is', '(u) …dir', undefined, 'verb', 'She is my sister.'),
  w('are', '(biz, siz, ular) …miz / …siz / …lar', undefined, 'verb', 'We are friends.'),
  w('do', "so'roq: …mi? (I, you, we, they)", undefined, 'verb', 'Do you like rice?'),
  w('does', "so'roq: …mi? (he, she, it)", undefined, 'verb', 'Does he play football?'),
  w("don't", 'emas (I, you, we, they)', undefined, 'verb', "I don't watch TV at night."),
  w("doesn't", 'emas (he, she, it)', undefined, 'verb', "He doesn't drink milk."),

  // Feelings
  w('happy', 'xursand', '😀', 'object', 'I am happy.'),
  w('tired', 'charchagan', '🥱', 'object', 'He is tired now.'),
  w('hungry', 'och (qorni och)', '😋', 'object', 'We are hungry.'),

  // Colours (picture = colour square)
  w('red', 'qizil', 'swatch:#D93A2B', 'object', 'My bag is red.'),
  w('blue', "ko'k", 'swatch:#1A73C9', 'object', 'The sky is blue.'),
  w('green', 'yashil', 'swatch:#1E8C4E', 'object', 'The tree is green.'),
  w('yellow', 'sariq', 'swatch:#FFC83D', 'object', 'The sun is yellow.'),
  w('black', 'qora', 'swatch:#172033', 'object', 'My cat is black.'),
  w('white', 'oq', 'swatch:#FFFFFF', 'object', 'Milk is white.'),

  // Numbers
  w('one', 'bir', '1️⃣', 'object'),
  w('two', 'ikki', '2️⃣', 'object'),
  w('three', 'uch', '3️⃣', 'object'),
  w('four', "to'rt", '4️⃣', 'object'),
  w('five', 'besh', '5️⃣', 'object'),
  w('six', 'olti', '6️⃣', 'object'),
  w('seven', 'yetti', '7️⃣', 'object'),
  w('eight', 'sakkiz', '8️⃣', 'object', 'I am eight.'),
  w('nine', "to'qqiz", '9️⃣', 'object'),
  w('ten', "o'n", '🔟', 'object', 'I am ten.'),

  // Food and drink (object)
  w('breakfast', 'nonushta', '🍳', 'object', 'I eat breakfast every day.'),
  w('lunch', 'tushlik', '🥪', 'object', 'We eat lunch at school.'),
  w('dinner', 'kechki ovqat', '🍲', 'object', 'My mother cooks dinner.'),
  w('bread', 'non', '🍞', 'object', 'I eat bread for breakfast.'),
  w('egg', 'tuxum', '🥚', 'object', 'He eats an egg.'),
  w('milk', 'sut', '🥛', 'object', 'I drink milk.'),
  w('tea', 'choy', '🍵', 'object', 'My dad drinks tea.'),
  w('juice', 'sharbat', '🧃', 'object', 'I drink juice every day.'),
  w('water', 'suv', '💧', 'object', 'She drinks water.'),
  w('rice', 'guruch / palov', '🍚', 'object', 'Do you like rice?'),
  w('apple', 'olma', '🍎', 'object', 'She eats an apple.'),
  w('banana', 'banan', '🍌', 'object', 'He likes bananas.'),

  // Things and places (object)
  w('school', 'maktab', '🏫', 'object', 'I go to school.'),
  w('book', 'kitob', '📖', 'object', 'I read a book.'),
  w('bag', 'sumka', '🎒', 'object', 'My bag is red.'),
  w('pen', 'ruchka', '🖊️', 'object', 'I have a pen.'),
  w('homework', 'uy vazifasi', '📝', 'object', 'I do my homework.'),
  w('football', 'futbol', '⚽', 'object', 'We play football.'),
  w('ball', "to'p", '🏐', 'object', 'They want a new ball.'),
  w('TV', 'televizor', '📺', 'object', 'We watch TV.'),
  w('phone', 'telefon', '📱', 'object', 'My dad has a phone.'),
  w('bike', 'velosiped', '🚲', 'object', 'He rides his bike.'),
  w('car', 'mashina', '🚗', 'object', 'We washed the car.'),
  w('house', 'uy (bino)', '🏠', 'object', 'We live in a big house.'),
  w('home', 'uy (oila joyi)', '🏡', 'object', 'I am at home.'),
  w('room', 'xona', '🛋️', 'object', 'I cleaned my room.'),
  w('bed', 'karavot', '🛏️', 'object', 'I go to bed at night.'),
  w('park', 'park, bog', '🏞️', 'object', 'We walked to the park.'),
  w('shop', "do'kon", '🏪', 'object', 'My father went to the shop.'),
  w('teeth', 'tishlar', '🦷', 'object', 'I brush my teeth.'),
  w('face', 'yuz', '😊', 'object', 'I wash my face.'),
  w('cat', 'mushuk', '🐱', 'object', 'She likes cats.'),
  w('dog', 'it', '🐶', 'object', 'He plays with the dog.'),

  // Time words (time)
  w('today', 'bugun', '📅', 'time', 'Today I play football.'),
  w('yesterday', 'kecha', '⏪', 'time', 'Yesterday I played football.'),
  w('tomorrow', 'ertaga', '⏩', 'time'),
  w('now', 'hozir', '⏱️', 'time', 'I am tired now.'),
  w('every day', 'har kuni', '🔁', 'time', 'I eat breakfast every day.'),
  w('in the morning', 'ertalab', '🌅', 'time', 'I get up in the morning.'),
  w('at night', 'kechasi', '🌙', 'time', 'I sleep at night.'),
  w('after school', 'maktabdan keyin', '🎒', 'time', 'We play football after school.'),
  w('usually', 'odatda', undefined, 'time', 'I usually drink tea.'),
  w('always', 'doim', undefined, 'time', 'I always eat breakfast.'),
  w('sometimes', "ba'zan", undefined, 'time', 'We sometimes play football.'),
  w('often', 'tez-tez', undefined, 'time', 'He often reads books.'),
  w('never', 'hech qachon', undefined, 'time', 'He never watches TV at night.'),
  w('last night', 'kecha kechqurun', '🌃', 'time', 'She watched TV last night.'),
  w('last week', "o'tgan hafta", '🗓️', 'time', 'We visited our cousins last week.'),
  w('ago', 'oldin', undefined, 'time', 'two hours ago'),
  w('two hours ago', 'ikki soat oldin', '🕑', 'time', 'I called my uncle two hours ago.'),
];
