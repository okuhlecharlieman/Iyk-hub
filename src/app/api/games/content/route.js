/**
 * GET /api/games/content?type=quiz|hangman
 *
 * Returns game content (quiz questions or hangman words) from Firestore.
 * Falls back to built-in defaults if the collection is empty.
 * No authentication required — content is public.
 *
 * Firestore collection: gameContent/{type}/items
 * Each document has { content: object, createdAt: Timestamp }
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
export const dynamic = 'force-dynamic';

// Fallback quiz questions if DB is empty
const DEFAULT_QUIZ_QUESTIONS = [
  { question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondrion', 'Ribosome', 'Chloroplast'], answer: 'Mitochondrion', category: 'Science' },
  { question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Venus'], answer: 'Mars', category: 'Science' },
  { question: 'What is the largest mammal in the world?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Great White Shark'], answer: 'Blue Whale', category: 'Science' },
  { question: "Who wrote the play 'Romeo and Juliet'?", options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], answer: 'William Shakespeare', category: 'Literature' },
  { question: 'What is the chemical symbol for Gold?', options: ['Au', 'Ag', 'Go', 'Gd'], answer: 'Au', category: 'Science' },
  { question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: '7', category: 'Geography' },
  { question: 'What is the capital of Japan?', options: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], answer: 'Tokyo', category: 'Geography' },
  { question: 'Which is the only vowel not on the top keyboard row?', options: ['A', 'E', 'I', 'O'], answer: 'A', category: 'General' },
  { question: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 'Diamond', category: 'Science' },
  { question: 'How many hearts does an octopus have?', options: ['1', '2', '3', '4'], answer: '3', category: 'Science' },
  { question: 'What is the currency of South Africa?', options: ['Dollar', 'Rand', 'Pound', 'Euro'], answer: 'Rand', category: 'Geography' },
  { question: 'Who painted the Mona Lisa?', options: ['Picasso', 'Da Vinci', 'Van Gogh', 'Michelangelo'], answer: 'Da Vinci', category: 'Art' },
  { question: 'What is the longest river in Africa?', options: ['Congo', 'Nile', 'Zambezi', 'Niger'], answer: 'Nile', category: 'Geography' },
  { question: 'How many bones are in the adult human body?', options: ['106', '206', '306', '406'], answer: '206', category: 'Science' },
  { question: 'Which gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], answer: 'Carbon Dioxide', category: 'Science' },
  { question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], answer: '1945', category: 'History' },
  { question: 'What is the speed of light in km/s (approx)?', options: ['100,000', '200,000', '300,000', '400,000'], answer: '300,000', category: 'Science' },
  { question: 'Which element has the atomic number 1?', options: ['Helium', 'Hydrogen', 'Lithium', 'Carbon'], answer: 'Hydrogen', category: 'Science' },
  { question: 'What is the tallest mountain in the world?', options: ['K2', 'Kilimanjaro', 'Everest', 'Denali'], answer: 'Everest', category: 'Geography' },
  { question: 'How many players are on a soccer team?', options: ['9', '10', '11', '12'], answer: '11', category: 'Sports' },
  { question: 'What country has the most people?', options: ['USA', 'India', 'China', 'Indonesia'], answer: 'India', category: 'Geography' },
  { question: 'What is the largest organ in the human body?', options: ['Liver', 'Brain', 'Skin', 'Heart'], answer: 'Skin', category: 'Science' },
  { question: 'Which planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 'Saturn', category: 'Science' },
  { question: 'Who discovered penicillin?', options: ['Pasteur', 'Fleming', 'Darwin', 'Einstein'], answer: 'Fleming', category: 'History' },
  { question: 'What is the boiling point of water in Celsius?', options: ['90', '100', '110', '120'], answer: '100', category: 'Science' },
  { question: 'What language has the most native speakers?', options: ['English', 'Spanish', 'Mandarin', 'Hindi'], answer: 'Mandarin', category: 'General' },
  { question: 'Which animal is known as the "King of the Jungle"?', options: ['Tiger', 'Lion', 'Elephant', 'Bear'], answer: 'Lion', category: 'General' },
  { question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], answer: 'Vatican City', category: 'Geography' },
  { question: 'How many teeth does an adult human have?', options: ['28', '30', '32', '34'], answer: '32', category: 'Science' },
  { question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 'Canberra', category: 'Geography' },
];

// Fallback hangman words if DB is empty
const DEFAULT_HANGMAN_WORDS = [
  { word: 'react', category: 'Technology', hint: 'A JavaScript UI library' },
  { word: 'nextjs', category: 'Technology', hint: 'React framework for production' },
  { word: 'firebase', category: 'Technology', hint: 'Google cloud platform for apps' },
  { word: 'tailwind', category: 'Technology', hint: 'Utility-first CSS framework' },
  { word: 'javascript', category: 'Technology', hint: 'The language of the web' },
  { word: 'python', category: 'Technology', hint: 'Named after a comedy group' },
  { word: 'algorithm', category: 'Technology', hint: 'Step-by-step problem solving' },
  { word: 'database', category: 'Technology', hint: 'Where data is stored' },
  { word: 'elephant', category: 'Animals', hint: 'Largest land animal' },
  { word: 'giraffe', category: 'Animals', hint: 'Tallest living animal' },
  { word: 'penguin', category: 'Animals', hint: 'A bird that cannot fly' },
  { word: 'dolphin', category: 'Animals', hint: 'Smart marine mammal' },
  { word: 'guitar', category: 'Music', hint: 'Six-stringed instrument' },
  { word: 'piano', category: 'Music', hint: '88 keys instrument' },
  { word: 'astronomy', category: 'Science', hint: 'Study of celestial objects' },
  { word: 'molecule', category: 'Science', hint: 'Group of bonded atoms' },
  { word: 'continent', category: 'Geography', hint: 'Large landmass' },
  { word: 'volcano', category: 'Geography', hint: 'Mountain that erupts' },
  { word: 'orchestra', category: 'Music', hint: 'Large group of musicians' },
  { word: 'painting', category: 'Art', hint: 'Canvas artwork' },
  { word: 'sculpture', category: 'Art', hint: '3D artwork' },
  { word: 'marathon', category: 'Sports', hint: '42.195 km race' },
  { word: 'basketball', category: 'Sports', hint: 'Shoot through the hoop' },
  { word: 'chocolate', category: 'Food', hint: 'Made from cacao beans' },
  { word: 'avocado', category: 'Food', hint: 'Green fruit for toast' },
  { word: 'umbrella', category: 'Objects', hint: 'Protection from rain' },
  { word: 'telescope', category: 'Science', hint: 'See distant objects' },
  { word: 'butterfly', category: 'Animals', hint: 'Insect with colorful wings' },
  { word: 'dinosaur', category: 'History', hint: 'Extinct giant reptile' },
  { word: 'satellite', category: 'Technology', hint: 'Orbits the Earth' },
];

/** Handles GET requests to /api/games/content. */
export async function GET(request) {
  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !['quiz', 'hangman'].includes(type)) {
      return NextResponse.json({ error: 'type must be "quiz" or "hangman"' }, { status: 400 });
    }

    const snap = await db.collection('gameContent').doc(type).collection('items').get();

    if (snap.empty) {
      // Return defaults
      const items = type === 'quiz' ? DEFAULT_QUIZ_QUESTIONS : DEFAULT_HANGMAN_WORDS;
      return NextResponse.json({ items, source: 'default' });
    }

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ items, source: 'database' });
  } catch (err) {
    console.error('Game content API error:', err);
    return NextResponse.json({ error: 'Failed to fetch game content' }, { status: 500 });
  }
}
