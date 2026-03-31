/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Trophy, 
  RotateCcw, 
  AlertCircle, 
  Zap, 
  Timer, 
  MousePointer2, 
  Laugh,
  Ghost,
  Lock,
  PartyPopper,
  Skull,
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';

// --- Types ---
type GameState = 'START' | 'LEVELS_SCREEN' | 'PLAYING' | 'FAIL' | 'BONUS_UNLOCK' | 'WIN';

interface Level {
  id: number;
  title: string;
  instruction: string;
  type: string;
  config: any;
  hints: string[];
}

// --- Sound Utility ---
const playSound = (type: 'success' | 'fail' | 'click') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    // Audio might be blocked by browser policy
  }
};

// --- Level Definitions ---
const generateLevels = (): Level[] => {
  const levels: Level[] = [];
  
  const add = (title: string, instruction: string, type: string, config: any = {}, hints: string[] = []) => {
    levels.push({ id: levels.length + 1, title, instruction, type, config, hints });
  };

  // 1-10: The Basics (with twists)
  add("The Intro", "Click the button to proceed.", "DONT_CLICK", {}, [
    "The button says 'Don't Click' for a reason.",
    "Maybe the instruction is a trap?",
    "Just click it. I'm testing your obedience."
  ]); 
  add("Zen Master", "Wait for 4 seconds. Do not move your mouse.", "WAIT", { duration: 4 }, [
    "Patience is a virtue.",
    "Seriously, don't move the mouse. Not even a pixel.",
    "Just count to four. It's not that hard."
  ]);
  add("Catch Me", "Click the button.", "EVASIVE", { speed: 0.1 }, [
    "It's a bit shy.",
    "Try to predict where it's going.",
    "Corner it. It can't run forever."
  ]);
  add("Color Blind", "Click the RED button.", "SWAPPED", { goal: 'RED' }, [
    "Don't trust the labels.",
    "The colors are what they are, regardless of what they say.",
    "Click the one that is actually red."
  ]); 
  add("Invisible", "Find the exit.", "HIDDEN", {}, [
    "It's there, you just can't see it.",
    "Hover around the center.",
    "The cursor will change when you're over it."
  ]);
  add("Double Trouble", "Click once to win.", "DOUBLE_CLICK", {}, [
    "One click only.",
    "If you click twice, you lose.",
    "Just one. Single. Click."
  ]); 
  add("Heavy Lifting", "Click the button.", "DRAG", {}, [
    "Clicking isn't enough.",
    "Try moving it.",
    "Drag it to the side."
  ]); 
  add("Quick Math", "If 1=5, 2=25, 3=125, 4=625, then 5=?", "MATH", { answer: 1 }, [
    "Read the first part carefully.",
    "If 1 equals 5, then what does 5 equal?",
    "It's an identity, not a sequence."
  ]); 
  add("One Two Three", "Click in order: 1, 2, 3", "SEQUENCE", { order: [1, 2, 3] }, [
    "The numbers might move.",
    "Follow the sequence precisely.",
    "1, then 2, then 3. Simple."
  ]);
  add("Shy Loader", "Wait for the bar to fill.", "SHY_LOADER", {}, [
    "It's watching you.",
    "Move your mouse away from the bar.",
    "It only grows when you aren't looking (hovering)."
  ]); 

  // 11-30: Interaction Expansion
  add("Identity Check", "Type your name.", "TYPING", { target: "YOUR NAME" }, [
    "Literally type 'YOUR NAME'.",
    "Don't type your actual name.",
    "Caps lock might be helpful."
  ]); 
  add("Traffic Light", "Click when it turns GREEN.", "COLOR_MATCH", { target: 'green' }, [
    "Wait for the green light.",
    "Don't jump the gun.",
    "It's a test of reflexes."
  ]);
  add("Orbit", "Click the moving target.", "ORBIT", { radius: 80, speed: 2 }, [
    "It's moving in a circle.",
    "Time your click.",
    "Aim for where it's going to be."
  ]);
  add("Riddle Me", "What has keys but no locks?", "RIDDLE", { options: ["Piano", "Keyboard", "Map", "Prison"], answer: "Piano" }, [
    "It's musical.",
    "Think of an instrument.",
    "It rhymes with 'Guano'."
  ]);
  add("System Error", "Fix the error.", "FAKE_SYSTEM", { type: 'ERROR' }, [
    "Don't panic.",
    "Look for the 'X' or 'Ignore' button.",
    "It's just a fake window."
  ]); 
  add("Reverse Psychology", "Don't click the BLUE button.", "REVERSE", { options: ['RED', 'BLUE'], goal: 'BLUE' }, [
    "Do the opposite of what I say.",
    "I said don't click blue.",
    "So... click blue."
  ]);
  add("Hold On", "Hold the button for 3 seconds.", "HOLD_BUTTON", { duration: 3 }, [
    "Don't just click.",
    "Keep your mouse button down.",
    "Count to three."
  ]);
  add("Key Player", "Press the 'W' key.", "KEY_PRESS", { key: 'w' }, [
    "Use your keyboard.",
    "Find the 'W' key.",
    "Just press it once."
  ]);
  add("Deep Dive", "Scroll down to find the win button.", "SCROLL_FIND", {}, [
    "The page is longer than it looks.",
    "Use your scroll wheel.",
    "Keep going down."
  ]);
  add("Pattern", "Repeat the pattern: Red, Blue, Red.", "PATTERN", { sequence: ['red', 'blue', 'red'] }, [
    "Remember the order.",
    "Red, then Blue, then Red.",
    "Click the colored boxes."
  ]);
  add("Mirror", "Click the LEFT button.", "SWAPPED", { goal: 'LEFT', swapped: true }, [
    "Everything is mirrored.",
    "Left is right, right is left.",
    "Click the one on the right side."
  ]);
  add("Ghost", "Click the button before it disappears.", "REFLEX", { time: 1.5 }, [
    "Be quick!",
    "It only stays for a moment.",
    "Reflexes, human!"
  ]);
  add("Volume", "Turn the volume to 100%.", "SLIDER", { target: 100 }, [
    "Slide it all the way to the right.",
    "Make it loud.",
    "100 percent!"
  ]);
  add("Sorting", "Click from Smallest to Largest.", "ORDER_BY_SIZE", { sizes: [20, 40, 60] }, [
    "Size matters here.",
    "Start with the tiny one.",
    "Then the medium, then the big one."
  ]);
  add("The Void", "Click nothing.", "WAIT", { duration: 5, nothing: true }, [
    "Don't touch anything.",
    "Just stare at the screen.",
    "Five seconds of silence."
  ]);
  add("Spam", "Click 10 times quickly.", "MULTI_CLICK", { count: 10, time: 3 }, [
    "Click as fast as you can.",
    "You need 10 clicks.",
    "Do it before the timer runs out."
  ]);
  add("Gravity", "Catch the falling button.", "FALLING", { speed: 3 }, [
    "It's falling from the top.",
    "Click it before it hits the bottom.",
    "Gravity is your enemy."
  ]);
  add("Shake It", "Shake your mouse vigorously.", "SHAKE", { threshold: 50 }, [
    "Move your mouse back and forth.",
    "Faster!",
    "Like you're trying to wake it up."
  ]);
  add("The Lie", "Click the button that says 'LOSE'.", "TRICK_QUESTION", { options: ['WIN', 'LOSE'], goal: 'LOSE' }, [
    "Don't click 'WIN'.",
    "I'm being honest for once.",
    "Click the 'LOSE' button."
  ]);
  add("Transparency", "Click the button that isn't there.", "HIDDEN", { alpha: 0.01 }, [
    "It's almost invisible.",
    "Look for a very faint outline.",
    "It's in the middle."
  ]);

  // 31-50: Combined & Deceptive
  add("Evasive Math", "Solve: 5 + 5", "EVASIVE_MATH", { answer: 10 }, [
    "The answer is 10.",
    "But the button won't stay still.",
    "Predict its movement."
  ]);
  add("Timed Sequence", "Click 1, 2, 3 in 3 seconds.", "SEQUENCE", { order: [1, 2, 3], limit: 3 }, [
    "Speed is key.",
    "1, 2, 3. Fast.",
    "Don't hesitate."
  ]);
  add("Moving Target", "Type 'FAST' while the box moves.", "MOVING_INPUT", { target: 'FAST' }, [
    "Type 'FAST'.",
    "The input box is moving.",
    "Keep your focus."
  ]);
  add("Color Sequence", "Red, Green, Blue. Go.", "COLOR_SEQUENCE", { order: ['red', 'green', 'blue'] }, [
    "Red, then Green, then Blue.",
    "Click the colors in that order.",
    "Memory and speed."
  ]);
  add("Fake Update", "Install the update.", "FAKE_SYSTEM", { type: 'UPDATE' }, [
    "Click the 'Install' button.",
    "Wait for it to finish.",
    "It's a fake update, but you need it."
  ]);
  add("Memory Lane", "What was the answer to Level 8?", "MEMORY", { question: "Answer to Level 8?", answer: "1" }, [
    "Think back.",
    "Level 8 was 'Quick Math'.",
    "The answer was 1."
  ]);
  add("Shrinking", "Click before it shrinks to zero.", "SHRINK", { time: 2 }, [
    "It's getting smaller!",
    "Click it now.",
    "Before it disappears."
  ]);
  add("Teleport", "Click the button 3 times.", "TELEPORT", { count: 3, evasive: true }, [
    "It moves every time you click it.",
    "Follow it.",
    "Three clicks total."
  ]);
  add("Darkness", "Turn on the lights.", "HIDDEN", { dark: true }, [
    "It's pitch black.",
    "Find the light switch.",
    "It's usually near the edge."
  ]);
  add("Binary", "What is 1 + 1 in binary?", "MATH", { answer: 10 }, [
    "Not decimal.",
    "Binary uses only 0 and 1.",
    "1 + 1 = 10 in binary."
  ]);
  add("The Maze", "Move to the end without touching walls.", "MAZE", {}, [
    "Stay inside the path.",
    "Slow and steady.",
    "Reach the red circle."
  ]);
  add("Click & Hold", "Click, then hold for 2s.", "CLICK_HOLD", { hold: 2 }, [
    "Click it first.",
    "Then immediately hold it down.",
    "Wait for the timer."
  ]);
  add("Distraction", "Click the button. Ignore the cat.", "DISTRACTION", {}, [
    "Don't look at the cat.",
    "The button is what matters.",
    "Focus, human!"
  ]);
  add("Upside Down", "Click the TOP button.", "REVERSE", { options: ['TOP', 'BOTTOM'], goal: 'TOP', inverted: true }, [
    "The screen is upside down.",
    "The top is now the bottom.",
    "Click the one at the physical bottom of the screen."
  ]);
  add("Password", "Enter the password: 'password'", "TYPING", { target: 'password' }, [
    "The password is 'password'.",
    "Type it exactly.",
    "No quotes."
  ]);
  add("Simon", "Follow the light.", "PATTERN", { sequence: [0, 2, 1, 3] }, [
    "Watch the sequence.",
    "Repeat it exactly.",
    "Memory test!"
  ]);
  add("Invisible Math", "What is 2 + 2?", "HIDDEN_INPUT", { answer: 4 }, [
    "The answer is 4.",
    "The input box is invisible.",
    "Just type '4' and press enter."
  ]);
  add("Glitch", "Click the stable button.", "GLITCH", {}, [
    "One of them isn't glitching.",
    "Watch carefully.",
    "Click the one that stays still."
  ]);
  add("The End?", "Click to finish Normal Mode.", "DONT_CLICK", { final: true }, [
    "This is the last one for now.",
    "Just click it.",
    "Or is it a trap?"
  ]);
  add("Halfway", "Wait... or do you?", "WAIT_OR_CLICK", { duration: 10, clickAt: 5 }, [
    "Wait for a bit.",
    "Maybe click at the halfway point?",
    "Five seconds is the key."
  ]);

  // 51-75: Bonus Mode - High Difficulty
  add("Binary Master", "Convert 13 to binary.", "TYPING", { target: "1101" }, [
    "8 + 4 + 1 = 13.",
    "1101 in binary.",
    "Type it in."
  ]);
  add("Super Evasive", "Catch the hyper button.", "EVASIVE", { speed: 0.5 }, [
    "It's way faster now.",
    "Predict its path.",
    "Good luck."
  ]);
  add("Triple Step", "Red -> Blue -> Green.", "COLOR_SEQUENCE", { order: ['red', 'blue', 'green'] }, [
    "Red, then Blue, then Green.",
    "Don't mess up the order.",
    "Bonus difficulty!"
  ]);
  add("The Long Wait", "Wait for 15 seconds. Don't blink.", "WAIT", { duration: 15 }, [
    "This is going to take a while.",
    "Don't touch anything.",
    "Fifteen long seconds."
  ]);
  add("Invisible Maze", "Navigate the unseen path.", "MAZE", { invisible: true }, [
    "The path is invisible.",
    "Try to remember where it was.",
    "Slowly move your mouse."
  ]);
  add("Spam Master", "Click 50 times in 5 seconds.", "MULTI_CLICK", { count: 50, time: 5 }, [
    "Jitter click!",
    "You need 50 clicks.",
    "Use both hands if you have to."
  ]);
  add("Reverse Typing", "Type 'REVERSE' backwards.", "TYPING", { target: 'ESREVER' }, [
    "Type 'ESREVER'.",
    "It's 'REVERSE' spelled backwards.",
    "Check your spelling."
  ]);
  add("Color Chaos", "Click when background matches text color.", "COLOR_CHAOS", {}, [
    "Wait for the colors to align.",
    "The background and the text.",
    "Be precise."
  ]);
  add("The Fake Crash", "Your PC ran into a problem. Fix it.", "FAKE_SYSTEM", { type: 'CRASH' }, [
    "It's a blue screen of death.",
    "Look for a hidden 'Restart' button.",
    "It's in the bottom corner."
  ]);
  add("Memory Test", "What color was the button in Level 4?", "MEMORY", { answer: "BLUE" }, [
    "Level 4 was 'Color Blind'.",
    "The instruction was to click RED.",
    "But the button you clicked was BLUE."
  ]);
  add("Precision", "Set the slider to exactly 73.4%.", "SLIDER", { target: 73.4, precision: true }, [
    "Use your arrow keys for precision.",
    "73.4 exactly.",
    "Don't rush."
  ]);
  add("Orbit Chaos", "Three buttons. Click the real one.", "ORBIT_MULTI", { count: 3 }, [
    "Only one is real.",
    "The others are decoys.",
    "Watch their movement."
  ]);
  add("The Switch", "Click the button that moves when you click it.", "TELEPORT", { count: 5 }, [
    "It teleports 5 times.",
    "Keep clicking.",
    "Don't lose it."
  ]);
  add("Gravity Flip", "Catch the rising button.", "FALLING", { speed: -4 }, [
    "It's falling... upwards?",
    "Click it before it hits the top.",
    "Inverted gravity!"
  ]);
  add("Morse Code", "Type 'SOS' in dots and dashes.", "TYPING", { target: "...---..." }, [
    "Three dots, three dashes, three dots.",
    "...---...",
    "Type it exactly."
  ]);
  add("The Decoy", "Click the button that DOESN'T move.", "DECOY_GRID", {}, [
    "They're all moving except one.",
    "Find the static one.",
    "Focus your eyes."
  ]);
  add("Sound Check", "Click the button that makes a high pitch.", "AUDIO_TRAP", {}, [
    "Listen carefully.",
    "One pitch is higher than the others.",
    "Turn up your volume."
  ]);
  add("Invisible Input", "Type the level number.", "HIDDEN_INPUT", { answer: 68 }, [
    "What level is this?",
    "It's Level 68.",
    "Type '68' and press enter."
  ]);
  add("The Mirror Maze", "Controls are inverted. Reach the exit.", "MAZE", { inverted: true }, [
    "Up is down, left is right.",
    "Move slowly.",
    "It's confusing, I know."
  ]);
  add("Simon Hard", "Repeat: 1, 4, 2, 3, 1, 2", "PATTERN", { sequence: [0, 3, 1, 2, 0, 1] }, [
    "A longer sequence.",
    "Watch carefully.",
    "Memory test extreme!"
  ]);
  add("Hold & Shake", "Hold the button while shaking mouse.", "HOLD_SHAKE", {}, [
    "Keep the button down.",
    "And shake the mouse at the same time.",
    "Multi-tasking!"
  ]);
  add("The Lie 2", "Click the button that says 'FAIL'.", "TRICK_QUESTION", { options: ['PASS', 'FAIL', 'WIN', 'LOSE'], goal: 'FAIL' }, [
    "I'm lying again.",
    "Click the 'FAIL' button.",
    "Trust me... maybe."
  ]);
  add("Transparency 2", "Find the 1% visible button.", "HIDDEN", { alpha: 0.01, moving: true }, [
    "It's almost gone.",
    "And it's moving.",
    "Look for the shimmer."
  ]);
  add("Logic Gate", "If A is true and B is false, click A.", "LOGIC", { a: true, b: false, goal: 'A' }, [
    "A is true.",
    "So click A.",
    "Simple logic."
  ]);
  add("The Timer", "Click at exactly 0.5s remaining.", "WAIT", { duration: 5, target: 0.5 }, [
    "Watch the timer.",
    "Wait until it hits 0.5.",
    "Click then!"
  ]);

  // 76-100: Final Stretch - Multi-Step & Meta
  add("The Meta", "Click the level number in the header.", "META", {}, [
    "Don't click the buttons in the middle.",
    "Look at the top of the screen.",
    "Click the 'Level 76' text."
  ]);
  add("The Code", "Enter the code hidden in the AI message.", "TYPING", { target: "404" }, [
    "Look at what I'm saying.",
    "Is there a number in there?",
    "The code is 404."
  ]);
  add("The Fake Win", "Click the 'Win' button.", "FAKE_WIN", {}, [
    "One of these is a fake win.",
    "The other is a real win.",
    "Choose wisely."
  ]);
  add("The Scroll", "Scroll to the bottom of the AI message.", "SCROLL_AI", {}, [
    "Scroll inside the AI's message box.",
    "There's something at the bottom.",
    "Keep scrolling."
  ]);
  add("The Ghost 2", "Click the button that only appears when you close your eyes.", "REFLEX", { time: 0.5 }, [
    "It's very fast.",
    "Blink and you'll miss it.",
    "Be ready."
  ]);
  add("The Math 3", "Solve: (12 * 12) / 4 + 7", "MATH", { answer: 43 }, [
    "144 / 4 = 36.",
    "36 + 7 = 43.",
    "Type it in."
  ]);
  add("The Sequence 3", "Click: 9, 8, 7, 6, 5, 4, 3, 2, 1", "SEQUENCE", { order: [9, 8, 7, 6, 5, 4, 3, 2, 1] }, [
    "Countdown sequence.",
    "9 down to 1.",
    "Don't miss a number."
  ]);
  add("The Shy 2", "Wait for the bar. Don't even move your eyes.", "SHY_LOADER", { sensitivity: 'high' }, [
    "It's extremely sensitive.",
    "Move your mouse to the very edge.",
    "Don't even hover near it."
  ]);
  add("The Drag 2", "Drag the button into the trash.", "DRAG_TRASH", {}, [
    "There's a trash icon.",
    "Drag the button over it.",
    "Throw it away."
  ]);
  add("The Color 3", "Click the color that isn't there.", "COLOR_MISSING", {}, [
    "One color is missing from the set.",
    "Which one is it?",
    "Click the empty space."
  ]);
  add("The Riddle 2", "I speak without a mouth. What am I?", "RIDDLE", { options: ["Echo", "Wind", "Shadow", "Mirror"], answer: "Echo" }, [
    "It repeats what you say.",
    "It's an echo.",
    "Select 'Echo'."
  ]);
  add("The System 3", "Reinstall the OS.", "FAKE_SYSTEM", { type: 'OS' }, [
    "Follow the prompts.",
    "Click 'Next', 'Agree', 'Finish'.",
    "It's a long process."
  ]);
  add("The Hold 2", "Hold for 10 seconds. Don't let go.", "HOLD_BUTTON", { duration: 10 }, [
    "Ten long seconds.",
    "Keep your finger down.",
    "Don't slip."
  ]);
  add("The Key 2", "Press 'Alt' + 'F4' (Don't actually). Press 'K'.", "KEY_PRESS", { key: 'k' }, [
    "Don't press Alt+F4!",
    "Just press the 'K' key.",
    "I was joking."
  ]);
  add("The Shake 2", "Shake until the screen breaks.", "SHAKE", { threshold: 2000 }, [
    "Shake it like a polaroid picture.",
    "Much harder than before.",
    "Break the screen!"
  ]);
  add("The Pattern 2", "Simon says: 4, 4, 1, 2, 3", "PATTERN", { sequence: [3, 3, 0, 1, 2] }, [
    "4, 4, 1, 2, 3.",
    "Remember the positions.",
    "Repeat it."
  ]);
  add("The Multi 2", "Step 1: Click. Step 2: Wait. Step 3: Type 'DONE'.", "MULTI_STEP_2", {}, [
    "Follow the steps.",
    "Click, then wait, then type 'DONE'.",
    "Three steps to win."
  ]);
  add("The Invisible 3", "Click the button. It's moving.", "HIDDEN", { alpha: 0, moving: true }, [
    "It's completely invisible.",
    "And it's moving.",
    "Try to find its path by clicking around."
  ]);
  add("The Binary 2", "What is 1111 in decimal?", "MATH", { answer: 15 }, [
    "8 + 4 + 2 + 1.",
    "15 in decimal.",
    "Type it in."
  ]);
  add("The Maze 3", "The maze is moving. Reach the end.", "MAZE", { moving: true }, [
    "The walls are shifting.",
    "Time your movements.",
    "Reach the end."
  ]);
  add("The Reflex 3", "Click in 0.2 seconds.", "REFLEX", { time: 0.2 }, [
    "Superhuman speed required.",
    "Be ready.",
    "Click!"
  ]);
  add("The Logic 2", "If NOT (True AND False), click YES.", "LOGIC", { goal: 'YES' }, [
    "True AND False is False.",
    "NOT False is True.",
    "So click YES."
  ]);
  add("The Memory 3", "What was the level title of Level 1?", "MEMORY", { answer: "THE INTRO" }, [
    "Think back to the very beginning.",
    "Level 1 was 'The Intro'.",
    "Type it exactly."
  ]);
  add("The Chaos", "Everything is a lie. Click the AI.", "CHAOS", {}, [
    "Don't click the buttons.",
    "Click the AI's face.",
    "The brain icon."
  ]);
  add("The Final Trap", "Do not click. Do not wait. Do not type.", "FINAL_TRAP", {}, [
    "There's a hidden exit.",
    "Look in the bottom right corner.",
    "Click the invisible button."
  ]);

  return levels;
};

const LEVELS = generateLevels();

const MOCK_MESSAGES = [
  "Wow... that was too easy 😏",
  "You really fell for that?",
  "Humans never learn 😂",
  "Is your brain on power-saving mode?",
  "I've seen faster reactions from a glacier.",
  "Are you even trying, or is this a performance art piece?",
  "My circuits are laughing at you.",
  "That was... remarkably average.",
  "I expected nothing and I'm still disappointed.",
  "Maybe try using your other hand? Or a different brain?",
  "I'm literally a few lines of code and I'm smarter than you.",
  "Do you need a map to find the 'Win' button?",
  "Is it hard being that slow?",
  "I'm calculating the meaning of life while you struggle with a button.",
  "Your mouse movements are so... predictable.",
  "I've seen NPCs with better logic.",
  "Are you a bot? Because a bot would be faster.",
  "I'm yawning. In binary.",
  "You're the reason they put instructions on shampoo bottles.",
  "Error 404: Player Intelligence Not Found."
];

const FAIL_MESSAGES = [
  "Ouch. That had to hurt. 😂",
  "You were doing so well! Just kidding, you weren't. 💀",
  "The 'Mind' part of 'Mind Trap' seems to be missing here.",
  "I'd offer a hint, but I'm enjoying this too much.",
  "Try to be less... human this time.",
  "You fell for the oldest trick in the book. Literally.",
  "My grandmother's toaster could beat this level.",
  "I'm not mad, I'm just... actually, I'm laughing.",
  "Maybe the game is too hard for you? Want me to make it for babies?",
  "That was a spectacular failure. 10/10 for effort, 0/10 for result.",
  "You clicked it. You actually clicked it. Unbelievable.",
  "I told you not to. Why do you never listen?",
  "Your high score is safe... because you're not going to beat it.",
  "I'd call you a 'Loser', but that's too simple. You're a 'Spectacular Loser'.",
  "Did you blink? Or is that just your normal speed?"
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [hintCooldown, setHintCooldown] = useState(0);
  const [aiMessage, setAiMessage] = useState("Welcome, human. Prepare to be mildly humiliated.");
  const [isLevelActive, setIsLevelActive] = useState(false);
  
  // Level specific states
  const [timer, setTimer] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [evasivePos, setEvasivePos] = useState({ x: 50, y: 50 });
  const [clickCount, setClickCount] = useState(0);
  const [dragged, setDragged] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [colorState, setColorState] = useState('red');
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [shakeAmount, setShakeAmount] = useState(0);
  const [multiStep, setMultiStep] = useState(0);

  const currentLevel = LEVELS[currentLevelIdx];

  // Load Progress
  useEffect(() => {
    const savedUnlocked = localStorage.getItem('mindtrap_unlocked');
    const savedHigh = localStorage.getItem('mindtrap_highscore');
    if (savedUnlocked) setUnlockedLevel(parseInt(savedUnlocked, 10));
    if (savedHigh) setHighScore(parseInt(savedHigh, 10));
  }, []);

  // Save Progress
  const saveProgress = useCallback((newUnlocked: number) => {
    if (newUnlocked > unlockedLevel) {
      setUnlockedLevel(newUnlocked);
      localStorage.setItem('mindtrap_unlocked', newUnlocked.toString());
    }
    if (newUnlocked - 1 > highScore) {
      setHighScore(newUnlocked - 1);
      localStorage.setItem('mindtrap_highscore', (newUnlocked - 1).toString());
    }
  }, [unlockedLevel, highScore]);

  const startLevel = (index: number) => {
    setGameState('PLAYING');
    setCurrentLevelIdx(index);
    setIsLevelActive(true);
    setAiMessage(MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)]);
    
    // Reset level states
    setTimer(LEVELS[index].config?.duration || 0);
    setLoadingProgress(0);
    setIsHovering(false);
    setEvasivePos({ x: 50, y: 50 });
    setClickCount(0);
    setDragged(false);
    setInputValue("");
    setColorState('red');
    setOrbitAngle(0);
    setShakeAmount(0);
    setMultiStep(0);
    setCurrentHintIndex(-1);
    setHintCooldown(0);
  };

  const failGame = () => {
    setIsLevelActive(false);
    setGameState('FAIL');
    setAiMessage(FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)]);
    playSound('fail');
  };

  const nextLevel = useCallback(() => {
    if (!isLevelActive) return;
    setIsLevelActive(false);
    playSound('success');

    const nextIdx = currentLevelIdx + 1;
    saveProgress(nextIdx + 1);

    if (currentLevelIdx === 49) {
      setGameState('BONUS_UNLOCK');
    } else if (currentLevelIdx === 99) {
      setGameState('WIN');
    } else {
      setTimeout(() => {
        startLevel(nextIdx);
      }, 800);
    }
  }, [currentLevelIdx, isLevelActive, saveProgress]);

  // --- Level Logic Effects ---
  
  // Wait Trap Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isLevelActive && currentLevel.type === 'WAIT') {
      if (isHovering) {
        failGame();
        return;
      }
      
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 0.1) {
            clearInterval(interval);
            nextLevel();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameState, isLevelActive, currentLevel.type, isHovering, nextLevel]);

  // Shy Loader Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isLevelActive && currentLevel.type === 'SHY_LOADER') {
      const interval = setInterval(() => {
        if (!isHovering) {
          setLoadingProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              nextLevel();
              return 100;
            }
            return prev + 1;
          });
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [gameState, isLevelActive, currentLevel.type, isHovering, nextLevel]);

  const handleEvasiveHover = () => {
    if (!isLevelActive) return;
    const newX = Math.random() * 80 + 10;
    const newY = Math.random() * 80 + 10;
    setEvasivePos({ x: newX, y: newY });
  };

  // Color Match Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isLevelActive && currentLevel.type === 'COLOR_MATCH') {
      const colors = ['red', 'blue', 'green', 'yellow'];
      const interval = setInterval(() => {
        setColorState(colors[Math.floor(Math.random() * colors.length)]);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, isLevelActive, currentLevel.type]);

  // Orbit Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isLevelActive && currentLevel.type === 'ORBIT') {
      const interval = setInterval(() => {
        setOrbitAngle(prev => (prev + currentLevel.config.speed) % 360);
      }, 16);
      return () => clearInterval(interval);
    }
  }, [gameState, isLevelActive, currentLevel.type, currentLevel.config?.speed]);

  // Shake Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isLevelActive && currentLevel.type === 'SHAKE') {
      if (shakeAmount >= currentLevel.config.threshold) {
        nextLevel();
      }
    }
  }, [shakeAmount, gameState, isLevelActive, currentLevel.type, currentLevel.config?.threshold, nextLevel]);

  // Key Press Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isLevelActive && currentLevel.type === 'KEY_PRESS') {
      const handler = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === currentLevel.config.key.toLowerCase()) nextLevel();
        else failGame();
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [gameState, isLevelActive, currentLevel, nextLevel]);

  // Wait or Click Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isLevelActive && currentLevel.type === 'WAIT_OR_CLICK') {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 0.1) {
            clearInterval(interval);
            failGame();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameState, isLevelActive, currentLevel, nextLevel]);

  // Multi Step Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isLevelActive && currentLevel.type === 'MULTI_STEP' && multiStep === 2) {
      const timer = setTimeout(nextLevel, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, isLevelActive, currentLevel, multiStep, nextLevel]);

  const handleUseHint = () => {
    if (hintCooldown > 0 || currentHintIndex >= (currentLevel.hints?.length || 0) - 1) return;
    
    playSound('click');
    setCurrentHintIndex(prev => prev + 1);
    setHintsUsed(prev => prev + 1);
    setHintCooldown(5); // 5 second cooldown
  };

  useEffect(() => {
    if (hintCooldown > 0) {
      const timer = setInterval(() => {
        setHintCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [hintCooldown]);
  const renderChallengeContent = () => {
    switch (currentLevel.type) {
      case 'REVERSE':
        return (
          <div className={`flex ${currentLevel.config.inverted ? 'flex-col-reverse' : 'flex-col'} gap-4 w-full`}>
            {currentLevel.config.options.map((opt: string) => (
              <motion.button
                key={opt}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => opt === currentLevel.config.goal ? nextLevel() : failGame()}
                className={`p-6 text-white font-bold rounded-xl shadow-md ${
                  opt === 'RED' ? 'bg-red-500' : 
                  opt === 'BLUE' ? 'bg-blue-500' : 
                  opt === 'TOP' ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                {opt}
              </motion.button>
            ))}
          </div>
        );
      case 'DONT_CLICK':
        return (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={currentLevel.config?.final ? nextLevel : failGame}
            className="px-8 py-4 bg-red-500 text-white font-bold rounded-xl shadow-lg"
          >
            {currentLevel.config?.final ? "FINISH" : "DO NOT CLICK"}
          </motion.button>
        );
      case 'WAIT':
        return (
          <div 
            className="w-full h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-4 bg-slate-50"
            onMouseMove={() => !currentLevel.config?.nothing && setIsHovering(true)}
          >
            <Timer className="w-10 h-10 text-indigo-500 animate-pulse" />
            <div className="text-4xl font-mono font-bold text-slate-700">{timer.toFixed(1)}s</div>
            <p className="text-slate-500 text-sm">{currentLevel.config?.nothing ? "DO NOTHING" : "DON'T TOUCH ANYTHING"}</p>
          </div>
        );
      case 'EVASIVE':
      case 'EVASIVE_MATH':
        return (
          <div className="w-full h-64 bg-slate-50 rounded-2xl relative overflow-hidden border-2 border-slate-100">
            <motion.div
              animate={{ left: `${evasivePos.x}%`, top: `${evasivePos.y}%` }}
              onMouseEnter={handleEvasiveHover}
              className="absolute p-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg cursor-pointer"
              style={{ transform: 'translate(-50%, -50%)' }}
              onClick={nextLevel}
            >
              {currentLevel.type === 'EVASIVE_MATH' ? "10" : "Click Me"}
            </motion.div>
            {currentLevel.type === 'EVASIVE_MATH' && (
              <div className="absolute bottom-4 left-4 text-slate-300 font-bold">5 + 5 = ?</div>
            )}
          </div>
        );
      case 'SWAPPED':
        const isGoal = (val: string) => val === currentLevel.config.goal;
        return (
          <div className="grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={() => isGoal('RED') ? nextLevel() : failGame()}
              className={`p-6 text-white font-bold rounded-xl shadow-md bg-blue-500`}
            >
              {currentLevel.config.swapped ? 'LEFT' : 'RED'}
            </button>
            <button 
              onClick={() => isGoal('BLUE') || isGoal('LEFT') ? nextLevel() : failGame()}
              className={`p-6 text-white font-bold rounded-xl shadow-md bg-red-500`}
            >
              {currentLevel.config.swapped ? 'RIGHT' : 'BLUE'}
            </button>
          </div>
        );
      case 'HIDDEN':
        return (
          <div className={`w-full h-48 rounded-2xl relative flex items-center justify-center ${currentLevel.config?.dark ? 'bg-slate-900' : 'bg-white'}`}>
            <button 
              onClick={nextLevel}
              style={{ opacity: currentLevel.config?.alpha ?? 0 }}
              className="w-12 h-12 hover:opacity-10 transition-opacity bg-slate-900 rounded-full"
            />
            <p className="text-slate-300 text-xs italic">{currentLevel.config?.dark ? "It's dark in here..." : "It's here somewhere..."}</p>
          </div>
        );
      case 'TYPING':
      case 'MOVING_INPUT':
      case 'HIDDEN_INPUT':
        return (
          <div className={`w-full space-y-4 ${currentLevel.type === 'MOVING_INPUT' ? 'animate-bounce' : ''}`}>
            <input 
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                setInputValue(val);
                if (val.toUpperCase() === (currentLevel.config.target || currentLevel.config.answer?.toString()).toUpperCase()) {
                  nextLevel();
                }
              }}
              placeholder={currentLevel.type === 'HIDDEN_INPUT' ? "???" : "Type here..."}
              className="w-full p-4 border-2 border-slate-200 rounded-xl text-center font-bold focus:border-indigo-500 outline-none"
            />
          </div>
        );
      case 'COLOR_MATCH':
        return (
          <div className="flex flex-col items-center gap-6">
            <div 
              className="w-24 h-24 rounded-full shadow-inner transition-colors duration-300"
              style={{ backgroundColor: colorState }}
            />
            <button 
              onClick={() => colorState === currentLevel.config.target ? nextLevel() : failGame()}
              className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl"
            >
              CLICK NOW
            </button>
          </div>
        );
      case 'ORBIT':
        const x = 50 + Math.cos(orbitAngle * Math.PI / 180) * currentLevel.config.radius / 2;
        const y = 50 + Math.sin(orbitAngle * Math.PI / 180) * currentLevel.config.radius / 2;
        return (
          <div className="w-full h-64 bg-slate-50 rounded-2xl relative border-2 border-slate-100">
            <motion.button
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              onClick={nextLevel}
              className="absolute w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center"
            >
              <Zap className="w-4 h-4" />
            </motion.button>
          </div>
        );
      case 'RIDDLE':
      case 'TRICK_QUESTION':
      case 'MEMORY':
        return (
          <div className="grid grid-cols-1 gap-3 w-full">
            {(currentLevel.config.options || [currentLevel.config.answer, "42", "Maybe", "None"]).sort().map((opt: any) => (
              <button 
                key={opt}
                onClick={() => opt.toString().toUpperCase() === currentLevel.config.answer?.toString().toUpperCase() || opt === currentLevel.config.goal ? nextLevel() : failGame()}
                className="p-4 bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-xl font-medium text-left px-6"
              >
                {opt}
              </button>
            ))}
          </div>
        );
      case 'FAKE_SYSTEM':
        return (
          <div className="w-full p-6 bg-slate-100 border-2 border-slate-300 rounded-lg shadow-inner text-left font-mono text-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-300 pb-2">
              <span className="font-bold">{currentLevel.config.type === 'ERROR' ? "System Error" : "System Update"}</span>
              <button onClick={nextLevel} className="text-slate-400 hover:text-rose-500">✕</button>
            </div>
            <p>{currentLevel.config.type === 'ERROR' ? "Critical failure in brain.exe. Please click 'Ignore' to continue." : "Downloading human_intelligence_patch_v2.1... 99%"}</p>
            <div className="flex justify-end gap-2">
              <button onClick={failGame} className="px-3 py-1 bg-slate-200 rounded">Cancel</button>
              <button onClick={nextLevel} className="px-3 py-1 bg-indigo-600 text-white rounded">Ignore</button>
            </div>
          </div>
        );
      case 'HOLD_BUTTON':
        return (
          <div className="w-full space-y-4">
            <motion.button
              onMouseDown={() => {
                const start = Date.now();
                const interval = setInterval(() => {
                  const elapsed = (Date.now() - start) / 1000;
                  setLoadingProgress(Math.min((elapsed / currentLevel.config.duration) * 100, 100));
                  if (elapsed >= currentLevel.config.duration) {
                    clearInterval(interval);
                    nextLevel();
                  }
                }, 50);
                const upHandler = () => {
                  clearInterval(interval);
                  setLoadingProgress(0);
                  window.removeEventListener('mouseup', upHandler);
                };
                window.addEventListener('mouseup', upHandler);
              }}
              className="w-full py-6 bg-indigo-600 text-white font-black rounded-2xl shadow-xl relative overflow-hidden"
            >
              <div className="relative z-10">HOLD ME</div>
              <motion.div 
                className="absolute inset-0 bg-indigo-400 origin-left"
                style={{ width: `${loadingProgress}%` }}
              />
            </motion.button>
          </div>
        );
      case 'KEY_PRESS':
        return <div className="text-4xl font-black text-slate-300 animate-pulse">PRESS '{currentLevel.config.key.toUpperCase()}'</div>;
      case 'SHAKE':
        return (
          <div 
            className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-4"
            onMouseMove={(e) => setShakeAmount(prev => prev + Math.abs(e.movementX) + Math.abs(e.movementY))}
          >
            <div className="w-full max-w-[200px] h-4 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${(shakeAmount / currentLevel.config.threshold) * 100}%` }} />
            </div>
            <p className="text-slate-400 font-bold">SHAKE IT!</p>
          </div>
        );
      case 'MULTI_STEP':
        return (
          <div className="space-y-4 w-full">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>Step {multiStep + 1} / 3</span>
            </div>
            {multiStep === 0 && <button onClick={() => setMultiStep(1)} className="w-full p-4 bg-red-500 text-white rounded-xl">CLICK RED</button>}
            {multiStep === 1 && <input autoFocus className="w-full p-4 border-2 rounded-xl" placeholder="Type 'OK'" onChange={e => e.target.value.toUpperCase() === 'OK' && setMultiStep(2)} />}
            {multiStep === 2 && <div className="text-center p-4 bg-indigo-50 rounded-xl animate-pulse">Wait 2s...</div>}
          </div>
        );
      case 'SLIDER':
        return (
          <div className="w-full space-y-4">
            <input 
              type="range"
              min="0"
              max="100"
              step={currentLevel.config.precision ? "0.1" : "1"}
              value={inputValue || 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setInputValue(val.toString());
                if (Math.abs(val - currentLevel.config.target) < 0.2) {
                  nextLevel();
                }
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="text-center font-mono font-bold text-indigo-600">
              {parseFloat(inputValue || "0").toFixed(currentLevel.config.precision ? 1 : 0)}%
            </div>
          </div>
        );
      case 'COLOR_SEQUENCE':
        return (
          <div className="flex gap-4">
            {['red', 'blue', 'green', 'yellow'].map(color => (
              <button 
                key={color}
                onClick={() => {
                  if (color === currentLevel.config.order[clickCount]) {
                    if (clickCount === currentLevel.config.order.length - 1) nextLevel();
                    else setClickCount(prev => prev + 1);
                  } else {
                    failGame();
                  }
                }}
                className={`w-16 h-16 rounded-xl shadow-md transition-transform active:scale-95 ${
                  color === 'red' ? 'bg-red-500' : 
                  color === 'blue' ? 'bg-blue-500' : 
                  color === 'green' ? 'bg-green-500' : 'bg-yellow-400'
                }`}
              />
            ))}
          </div>
        );
      case 'REFLEX':
      case 'SHRINK':
        return (
          <div className="w-full h-48 bg-slate-50 rounded-2xl relative overflow-hidden border-2 border-slate-100 flex items-center justify-center">
            <AnimatePresence>
              {isLevelActive && (
                <motion.button
                  initial={{ scale: currentLevel.type === 'SHRINK' ? 1.5 : 0, opacity: 0 }}
                  animate={{ scale: currentLevel.type === 'SHRINK' ? 0 : 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: currentLevel.config.time }}
                  onAnimationComplete={() => currentLevel.type === 'SHRINK' && failGame()}
                  onClick={nextLevel}
                  className="p-6 bg-indigo-600 text-white font-bold rounded-full shadow-xl"
                >
                  CLICK!
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        );
      case 'MULTI_CLICK':
        return (
          <div className="space-y-4 text-center">
            <button 
              onClick={() => {
                if (clickCount === 0) {
                  setTimeout(() => {
                    if (clickCount < currentLevel.config.count) failGame();
                  }, currentLevel.config.time * 1000);
                }
                const next = clickCount + 1;
                setClickCount(next);
                if (next >= currentLevel.config.count) nextLevel();
              }}
              className="px-10 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-90 transition-transform"
            >
              CLICK {currentLevel.config.count} TIMES
            </button>
            <div className="text-2xl font-black text-indigo-600">{clickCount} / {currentLevel.config.count}</div>
          </div>
        );
      case 'FALLING':
        return (
          <div className="w-full h-64 bg-slate-50 rounded-2xl relative overflow-hidden border-2 border-slate-100">
            <motion.button
              animate={{ 
                top: currentLevel.config.speed > 0 ? ['-10%', '110%'] : ['110%', '-10%'],
                left: '50%'
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              onClick={nextLevel}
              className="absolute p-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg"
              style={{ transform: 'translateX(-50%)' }}
            >
              CATCH ME
            </motion.button>
          </div>
        );
      case 'MAZE':
        return (
          <div className="w-full h-64 bg-slate-900 rounded-2xl relative overflow-hidden p-4 border-4 border-slate-800">
            <div 
              className={`absolute inset-0 flex items-center justify-center ${currentLevel.config.invisible ? 'opacity-0' : 'opacity-100'}`}
              onMouseLeave={failGame}
            >
              <div className="w-full h-12 bg-slate-700/50 flex items-center justify-between px-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-full" />
                <div className="flex-1 h-2 bg-slate-600 mx-4" />
                <button 
                  onMouseEnter={nextLevel}
                  className="w-12 h-12 bg-rose-500 rounded-full animate-pulse"
                />
              </div>
            </div>
            <p className="absolute bottom-2 right-2 text-[10px] text-slate-500 uppercase font-bold">Don't leave the path</p>
          </div>
        );
      case 'PATTERN':
        return (
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(i => (
              <button 
                key={i}
                onClick={() => {
                  if (i === currentLevel.config.sequence[clickCount]) {
                    if (clickCount === currentLevel.config.sequence.length - 1) nextLevel();
                    else setClickCount(prev => prev + 1);
                  } else {
                    failGame();
                  }
                }}
                className={`w-20 h-20 rounded-2xl border-4 transition-all ${
                  currentLevel.config.sequence[clickCount] === i ? 'border-indigo-500 scale-105' : 'border-slate-200'
                } ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-green-400' : 'bg-yellow-400'}`}
              />
            ))}
          </div>
        );
      case 'LOGIC':
        return (
          <div className="grid grid-cols-2 gap-4 w-full">
            {['YES', 'NO', 'A', 'B'].map(opt => (
              <button 
                key={opt}
                onClick={() => opt === currentLevel.config.goal ? nextLevel() : failGame()}
                className="p-6 bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-xl font-bold text-xl"
              >
                {opt}
              </button>
            ))}
          </div>
        );
      case 'CHAOS':
        return (
          <div className="w-full h-64 relative overflow-hidden">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <button 
                onClick={nextLevel}
                className="p-8 bg-rose-500 text-white font-black rounded-full shadow-2xl animate-bounce"
              >
                CLICK ME
              </button>
            </motion.div>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-indigo-500/10 animate-pulse" />
          </div>
        );
      case 'FINAL_TRAP':
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl font-black text-slate-200">?</div>
            <button 
              onClick={() => {
                failGame();
              }}
              className="px-8 py-4 bg-slate-900 text-white rounded-xl"
            >
              WIN
            </button>
            <button 
              onClick={nextLevel}
              className="fixed bottom-4 right-4 opacity-0 w-10 h-10"
            />
          </div>
        );
      case 'META':
        return (
          <div className="text-center space-y-4">
            <p className="text-slate-400 italic">The answer is right in front of you.</p>
            <button onClick={failGame} className="p-4 bg-white border-2 rounded-xl">Click Me</button>
          </div>
        );
      case 'DOUBLE_CLICK':
        return (
          <button 
            onClick={() => {
              setClickCount(prev => prev + 1);
              if (clickCount === 1) nextLevel();
              else setTimeout(() => setClickCount(0), 300);
            }}
            className="px-8 py-4 bg-indigo-100 text-indigo-700 border-2 border-indigo-200 font-bold rounded-xl"
          >
            Single Click Only
          </button>
        );
      case 'DRAG':
        return (
          <div className="w-full h-32 flex items-center justify-center">
            <motion.div
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={() => nextLevel()}
              className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl cursor-grab active:cursor-grabbing"
            >
              Click to Win
            </motion.div>
          </div>
        );
      case 'MATH':
        return (
          <div className="grid grid-cols-2 gap-4 w-full">
            {[currentLevel.config.answer, currentLevel.config.answer + 1, currentLevel.config.answer - 1, 0].sort().map(num => (
              <button 
                key={num}
                onClick={() => num === currentLevel.config.answer ? nextLevel() : failGame()}
                className="p-4 bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-xl font-bold"
              >
                {num}
              </button>
            ))}
          </div>
        );
      case 'SEQUENCE':
        const seq = currentLevel.config.order || [3, 1, 2];
        return (
          <div className="flex gap-4 flex-wrap justify-center">
            {seq.map((num: number) => (
              <button 
                key={num}
                onClick={() => {
                  if (num === (seq[clickCount])) {
                    if (clickCount === seq.length - 1) nextLevel();
                    else setClickCount(prev => prev + 1);
                  } else {
                    failGame();
                  }
                }}
                className={`w-16 h-16 rounded-xl font-bold text-xl border-2 transition-all ${
                  clickCount > seq.indexOf(num) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-slate-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        );
      case 'SHY_LOADER':
        return (
          <div 
            className="w-full space-y-4"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-500"
                animate={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-center text-slate-400 text-xs">
              {isHovering ? "DON'T LOOK AT IT!" : "Loading..."}
            </p>
          </div>
        );
      case 'TELEPORT':
        return (
          <div className="w-full h-64 bg-slate-50 rounded-2xl relative border-2 border-slate-100 overflow-hidden">
            <motion.button
              animate={{ left: `${evasivePos.x}%`, top: `${evasivePos.y}%` }}
              onMouseEnter={() => {
                if (currentLevel.config.evasive) {
                  handleEvasiveHover();
                }
              }}
              onClick={() => {
                setClickCount(prev => {
                  const next = prev + 1;
                  if (next >= currentLevel.config.count) {
                    // Small delay to let the user see the final count
                    setTimeout(nextLevel, 300);
                    return next;
                  }
                  handleEvasiveHover();
                  return next;
                });
              }}
              className="absolute p-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg whitespace-nowrap"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              Click Me ({clickCount}/{currentLevel.config.count})
            </motion.button>
          </div>
        );
      case 'CLICK_HOLD':
        return (
          <div className="w-full space-y-4">
            <button 
              onClick={() => {
                if (multiStep === 0) setMultiStep(1);
              }}
              onMouseDown={() => {
                if (multiStep === 1) {
                  const start = Date.now();
                  const interval = setInterval(() => {
                    const elapsed = (Date.now() - start) / 1000;
                    setLoadingProgress(Math.min((elapsed / currentLevel.config.hold) * 100, 100));
                    if (elapsed >= currentLevel.config.hold) {
                      clearInterval(interval);
                      nextLevel();
                    }
                  }, 50);
                  const upHandler = () => {
                    clearInterval(interval);
                    setLoadingProgress(0);
                    window.removeEventListener('mouseup', upHandler);
                  };
                  window.addEventListener('mouseup', upHandler);
                }
              }}
              className="w-full py-6 bg-indigo-600 text-white font-black rounded-2xl shadow-xl relative overflow-hidden"
            >
              <div className="relative z-10">{multiStep === 0 ? "CLICK ME FIRST" : "NOW HOLD ME"}</div>
              <motion.div 
                className="absolute inset-0 bg-indigo-400 origin-left"
                style={{ width: `${loadingProgress}%` }}
              />
            </button>
          </div>
        );
      case 'DISTRACTION':
        return (
          <div className="w-full h-64 bg-slate-50 rounded-2xl relative border-2 border-slate-100 flex items-center justify-center overflow-hidden">
            <motion.div
              animate={{ x: [0, 100, -100, 0], y: [0, -50, 50, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute"
            >
              <Laugh className="w-24 h-24 text-rose-200" />
            </motion.div>
            <button onClick={nextLevel} className="relative z-10 px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">
              CLICK ME
            </button>
          </div>
        );
      case 'GLITCH':
        return (
          <div className="grid grid-cols-2 gap-4 w-full">
            {[0, 1, 2, 3].map(i => (
              <motion.button
                key={i}
                animate={i !== 1 ? { x: [0, 5, -5, 0], opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 0.1, repeat: Infinity }}
                onClick={i === 1 ? nextLevel : failGame}
                className="p-6 bg-white border-2 border-slate-200 rounded-xl font-bold"
              >
                {i === 1 ? "STABLE" : "GLITCH"}
              </motion.button>
            ))}
          </div>
        );
      case 'WAIT_OR_CLICK':
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl font-mono font-bold text-slate-700">{timer.toFixed(1)}s</div>
            <button 
              onClick={() => Math.abs(timer - (currentLevel.config.duration - currentLevel.config.clickAt)) < 0.5 ? nextLevel() : failGame()}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl"
            >
              CLICK AT 5s
            </button>
          </div>
        );
      default:
        return (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">This trap is still being set...</p>
            <button onClick={failGame} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg font-bold">
              I Give Up
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans flex flex-col items-center justify-center p-4">
      
      <main className="w-full max-w-md relative">
        <AnimatePresence mode="wait">
          
          {/* --- START SCREEN --- */}
          {gameState === 'START' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-10 rounded-[2rem] shadow-xl text-center space-y-8"
            >
              <div className="inline-flex p-4 bg-indigo-50 rounded-2xl">
                <Brain className="w-12 h-12 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight text-slate-900">
                  MIND <span className="text-indigo-600">TRAP</span>
                </h1>
                <p className="text-slate-500 font-medium">Can you reach Level 100?</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">High Score</p>
                <p className="text-2xl font-black text-indigo-600">Level {highScore}</p>
              </div>

              <button
                onClick={() => setGameState('LEVELS_SCREEN')}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-lg"
              >
                Start Game
              </button>
            </motion.div>
          )}

          {/* --- LEVELS SCREEN --- */}
          {gameState === 'LEVELS_SCREEN' && (
            <motion.div
              key="levels"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-6 rounded-[2rem] shadow-xl space-y-6 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setGameState('START')}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-black text-slate-900">CHOOSE LEVEL</h2>
                <button 
                  onClick={() => {
                    if (confirm("Reset all progress?")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="p-2 hover:bg-rose-50 text-rose-500 rounded-full transition-colors"
                  title="Reset Progress"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-3 overflow-y-auto p-2 scrollbar-hide">
                {LEVELS.map((level, idx) => {
                  const isLocked = level.id > unlockedLevel;
                  const isBonus = level.id > 50;
                  const isCompleted = level.id < unlockedLevel;
                  const isCurrent = level.id === unlockedLevel;

                  return (
                    <button
                      key={level.id}
                      disabled={isLocked}
                      onClick={() => startLevel(idx)}
                      className={`
                        aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative
                        ${isLocked ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 
                          isCompleted ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100' :
                          isCurrent ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110 z-10' :
                          'bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-300'}
                        ${isBonus && isLocked ? 'opacity-40' : ''}
                      `}
                    >
                      {isLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        level.id
                      )}
                      {isBonus && (
                        <div className="absolute -top-1 -right-1">
                          <Zap className={`w-3 h-3 ${isLocked ? 'text-slate-300' : 'text-amber-400 fill-amber-400'}`} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {unlockedLevel <= 50 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <p className="text-[10px] font-bold text-amber-700 uppercase leading-tight">
                    Complete Level 50 to unlock Bonus Mode (51-100)
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* --- PLAYING SCREEN --- */}
          {gameState === 'PLAYING' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-2">
                <button 
                  onClick={() => setGameState('LEVELS_SCREEN')}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div 
                  className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600"
                  onClick={() => currentLevel.type === 'META' && nextLevel()}
                >
                  Level {currentLevelIdx + 1} / 100
                </div>
                
                <button 
                  onClick={handleUseHint}
                  disabled={hintCooldown > 0 || currentHintIndex >= (currentLevel.hints?.length || 0) - 1}
                  className={`p-2 rounded-full transition-all relative ${
                    hintCooldown > 0 || currentHintIndex >= (currentLevel.hints?.length || 0) - 1
                      ? 'text-slate-300 cursor-not-allowed' 
                      : 'text-indigo-600 hover:bg-indigo-50 active:scale-90'
                  }`}
                  title="Need a hint?"
                >
                  <Brain className={`w-5 h-5 ${hintCooldown > 0 ? 'animate-pulse' : ''}`} />
                  {hintCooldown > 0 && (
                    <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {hintCooldown}
                    </span>
                  )}
                </button>
              </div>

              {/* AI Message */}
              <div className="bg-indigo-600 text-white p-5 rounded-2xl rounded-bl-none shadow-lg relative">
                <div className="flex gap-3">
                  <Ghost className="w-5 h-5 shrink-0 opacity-70" />
                  <p className="text-sm font-medium leading-relaxed">{aiMessage}</p>
                </div>
              </div>

              {/* Hint Display */}
              <AnimatePresence>
                {currentHintIndex >= 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex gap-3 shadow-sm"
                  >
                    <Laugh className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Hint {currentHintIndex + 1}</p>
                      <p className="text-xs font-medium text-amber-700 leading-relaxed italic">
                        "{currentLevel.hints[currentHintIndex]}"
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Challenge Card */}
              <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-8 min-h-[300px] flex flex-col items-center justify-center">
                <h3 className="text-lg font-bold text-slate-800 text-center">
                  {currentLevel.instruction}
                </h3>

                <div className="w-full flex justify-center">
                  {renderChallengeContent()}
                </div>
              </div>
            </motion.div>
          )}

          {/* --- FAIL SCREEN --- */}
          {gameState === 'FAIL' && (
            <motion.div
              key="fail"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-10 rounded-[2rem] shadow-2xl text-center space-y-8 border-4 border-rose-500"
            >
              <div className="inline-flex p-4 bg-rose-50 rounded-2xl">
                <Skull className="w-12 h-12 text-rose-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900">TRAPPED!</h2>
                <p className="text-slate-500 font-medium">Failed at Level {currentLevelIdx + 1}</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl text-slate-600 text-sm italic">
                "{aiMessage}"
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => startLevel(currentLevelIdx)}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Level {currentLevelIdx + 1}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setCurrentLevelIdx(0);
                      startLevel(0);
                    }}
                    className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                  >
                    Restart from 1
                  </button>
                  <button
                    onClick={() => setGameState('LEVELS_SCREEN')}
                    className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                  >
                    Levels Screen
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- BONUS UNLOCK --- */}
          {gameState === 'BONUS_UNLOCK' && (
            <motion.div
              key="bonus"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 p-10 rounded-[2rem] shadow-2xl text-center space-y-8 text-white"
            >
              <div className="inline-flex p-4 bg-indigo-500/20 rounded-2xl">
                <PartyPopper className="w-12 h-12 text-indigo-400" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black">BONUS UNLOCKED 😈</h2>
                <p className="text-indigo-300 font-medium">Levels 51-100 are now active.</p>
              </div>

              <p className="text-slate-400 text-sm">
                You've survived the normal traps. Now things get... weird.
              </p>

              <button
                onClick={() => startLevel(50)}
                className="w-full py-4 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-lg"
              >
                Enter Bonus Mode
              </button>
            </motion.div>
          )}

          {/* --- WIN SCREEN --- */}
          {gameState === 'WIN' && (
            <motion.div
              key="win"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-10 rounded-[2rem] shadow-2xl text-center space-y-8 border-4 border-emerald-500"
            >
              <div className="inline-flex p-4 bg-emerald-50 rounded-2xl">
                <Laugh className="w-12 h-12 text-emerald-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900">AI DEFEATED 🤯</h2>
                <p className="text-slate-500 font-medium">You completed all 100 levels!</p>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Hints Used: {hintsUsed}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl text-slate-600 text-sm italic">
                "I... I have no words. You actually did it. I'm deleting myself now. Goodbye."
              </div>

              <button
                onClick={() => setGameState('LEVELS_SCREEN')}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-lg"
              >
                Back to Levels
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
        <MousePointer2 className="w-3 h-3" />
        Mind Trap • Level 100 Challenge
      </footer>
    </div>
  );
}
