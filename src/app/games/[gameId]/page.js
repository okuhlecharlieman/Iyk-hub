'use client';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import XOGame from '../../../components/games/XOGame';
import { awardGamePoints, logGameSession } from '../../../lib/firebaseHelpers';

export default function GamePage() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const [score, setScore] = useState(0);

  useEffect(() => {
    // reset score when game changes
    setScore(0);
  }, [gameId]);

  async function finishGame(finalScore = 1, duration = 0) {
    if (!user) return;
    await awardGamePoints(user.uid, gameId, finalScore);
    await logGameSession(user.uid, gameId, finalScore, duration);
    alert(`Nice! You earned points for playing ${gameId}.`);
  }

  const Game = useMemo(() => {
    switch (gameId) {
      case 'tictactoe':
        return <XOGame onEnd={(res)=>finishGame(res?.score || 5)} />;
      case 'rps':
        return <RPS onEnd={(s)=>finishGame(s)} />;
      case 'memory':
        return <Memory onEnd={(s)=>finishGame(s)} />;
      case 'hangman':
        return <Hangman onEnd={(s)=>finishGame(s)} />;
      case 'quiz':
        return <Quiz onEnd={(s)=>finishGame(s)} />;
      default:
        return <p>Game not found.</p>;
    }
  }, [gameId]);

  return (
    <ProtectedRoute>
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-xl font-semibold mb-3 capitalize">{gameId}</h1>
        {Game}
      </div>
    </ProtectedRoute>
  );
}

// Simple inline games

function RPS({ onEnd }) {
  const options = ['rock', 'paper', 'scissors'];
  const [result, setResult] = useState('');
  function play(choice) {
    const cpu = options[Math.floor(Math.random() * 3)];
    let res = 'Draw';
    if (
      (choice === 'rock' && cpu === 'scissors') ||
      (choice === 'paper' && cpu === 'rock') ||
      (choice === 'scissors' && cpu === 'paper')
    ) res = 'You win';
    else if (choice !== cpu) res = 'You lose';
    setResult(`You: ${choice} | CPU: ${cpu} → ${res}`);
    onEnd(res === 'You win' ? 10 : res === 'Draw' ? 5 : 2);
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {options.map((o)=>(
          <button key={o} onClick={()=>play(o)} className="border px-3 py-2 rounded">{o}</button>
        ))}
      </div>
      <p>{result}</p>
    </div>
  );
}

function Memory({ onEnd }) {
  const base = ['🍎','🍌','🍇','🍒','🍓','🍍'];
  const [cards, setCards] = useState([]);
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState({});

  useEffect(()=>{
    const arr = [...base, ...base].sort(()=>Math.random()-0.5).map((v, i)=>({ id:i, v, open:false }));
    setCards(arr);
  },[]);

  useEffect(()=>{
    if (Object.keys(matched).length === base.length) {
      onEnd(10);
    }
  },[matched]);

  function flip(idx) {
    if (open.length === 2 || cards[idx].open) return;
    const next = cards.slice();
    next[idx].open = true;
    setCards(next);
    const opened = [...open, idx];
    setOpen(opened);
    if (opened.length === 2) {
      const [a,b] = opened;
      if (next[a].v === next[b].v) {
        setMatched({...matched, [next[a].v]: true});
        setOpen([]);
      } else {
        setTimeout(()=>{
          const n2 = next.slice();
          n2[a].open = false; n2[b].open = false;
          setCards(n2);
          setOpen([]);
        }, 600);
      }
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map((c, i)=>(
        <button key={c.id} onClick={()=>flip(i)} className="h-16 bg-neutral-100 rounded text-2xl flex items-center justify-center">
          {c.open ? c.v : '❓'}
        </button>
      ))}
    </div>
  );
}

function Hangman({ onEnd }) {
  const words = ['kasi', 'ubuntu', 'creativity', 'coding', 'music'];
  const [word] = useState(words[Math.floor(Math.random()*words.length)]);
  const [guessed, setGuessed] = useState([]);
  const [tries, setTries] = useState(6);

  const masked = word.split('').map(ch=> guessed.includes(ch) ? ch : '_').join(' ');
  const won = !masked.includes('_');
  const lost = tries <= 0;

  useEffect(()=>{
    if (won) onEnd(10);
    if (lost) onEnd(1);
  },[won, lost]);

  function guess(ch) {
    if (guessed.includes(ch) || won || lost) return;
    if (!word.includes(ch)) setTries(tries-1);
    setGuessed([...guessed, ch]);
  }

  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  return (
    <div>
      <p className="mb-2 tracking-widest text-lg">{masked}</p>
      <p className="mb-2 text-sm text-neutral-600">Tries: {tries}</p>
      <div className="grid grid-cols-8 gap-1">
        {alphabet.map((ch)=>(
          <button key={ch} onClick={()=>guess(ch)} disabled={guessed.includes(ch) || won || lost}
            className="border rounded px-2 py-1 text-sm disabled:opacity-40">{ch}</button>
        ))}
      </div>
    </div>
  );
}

function Quiz({ onEnd }) {
  const questions = [
    { q: 'What does CSS stand for?', a: ['Cascading Style Sheets', 'Computer Style System', 'Cool Styling Set'], c: 0 },
    { q: 'Firebase is a…', a: ['Relational DB', 'Backend-as-a-Service', 'UI library'], c: 1 },
  ];
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);

  function answer(idx) {
    if (idx === questions[i].c) setScore(score+1);
    if (i+1 < questions.length) setI(i+1);
    else onEnd(5 + score*2);
  }

  return (
    <div>
      <p className="font-medium mb-2">{questions[i].q}</p>
      <div className="space-y-2">
        {questions[i].a.map((ans, idx)=>(
          <button key={idx} onClick={()=>answer(idx)} className="w-full border rounded p-2 text-left hover:bg-neutral-50">
            {ans}
          </button>
        ))}
      </div>
    </div>
  );
}