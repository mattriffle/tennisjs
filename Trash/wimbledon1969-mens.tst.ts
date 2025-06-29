const set1 = [
  // Game 1 (Laver holds)
  'Laver','Laver','Newcombe','Laver','Laver', // 1-0

  // Game 2 (Newcombe holds)
  'Newcombe','Newcombe','Newcombe','Newcombe', // 1-1

  // Game 3 (Laver holds)
  'Laver','Laver','Laver','Laver', // 2-1

  // Game 4 (Newcombe holds)
  'Newcombe','Newcombe','Newcombe','Newcombe', // 2-2

  // Game 5 (Laver holds)
  'Laver','Newcombe','Laver','Laver','Laver', // 3-2

  // Game 6 (Laver breaks Newcombe)
  'Laver','Laver','Newcombe','Laver','Laver', // 4-2 ✔ FIXED

  // Game 7 (Newcombe breaks Laver)
  'Newcombe','Newcombe','Laver','Newcombe','Newcombe', // 4-3

  // Game 8 (Newcombe holds)
  'Newcombe','Newcombe','Newcombe','Newcombe', // 4-4

  // Game 9 (Laver holds)
  'Laver','Laver','Laver','Laver', // 5-4

  // Game 10 (Laver breaks Newcombe to win set)
  'Laver','Newcombe','Laver','Newcombe','Laver','Laver' // 6-4
];

const set2 = [
  'Laver','Laver','Laver','Laver', // 1-0
  'Newcombe','Newcombe','Newcombe','Newcombe', // 1-1
  'Newcombe','Newcombe','Laver','Newcombe','Newcombe', // 2-1 Newcombe (break)
  'Newcombe','Newcombe','Newcombe','Newcombe', // 3-1
  'Laver','Laver','Laver','Laver', // 3-2
  'Newcombe','Newcombe','Newcombe','Newcombe', // 4-2
  'Laver','Laver','Laver','Laver', // 4-3
  'Laver','Laver','Newcombe','Laver','Laver', // 4-4 (Laver breaks back)
  'Newcombe','Newcombe','Newcombe','Newcombe', // 5-4 Newcombe
  'Laver','Laver','Laver','Laver', // 5-5
  'Newcombe','Newcombe','Laver','Newcombe','Newcombe', // 6-5 Newcombe
  'Newcombe','Newcombe','Newcombe','Newcombe' // 7-5
];

const set3 = [
  'Newcombe','Newcombe','Newcombe','Newcombe', // 0-1
  'Laver','Laver','Laver','Laver', // 1-1
  'Laver','Laver','Laver','Laver', // 2-1
  'Newcombe','Newcombe','Newcombe','Newcombe', // 2-2
  'Laver','Laver','Laver','Laver', // 3-2
  'Newcombe','Newcombe','Newcombe','Newcombe', // 3-3
  'Laver','Laver','Laver','Laver', // 4-3
  'Laver','Newcombe','Laver','Laver','Laver', // 5-3 (break)
  'Newcombe','Newcombe','Newcombe','Newcombe', // 5-4
  'Laver','Laver','Laver','Laver' // 6-4
];

const set4 = [
  'Laver','Laver','Laver','Laver', // 1-0
  'Newcombe','Newcombe','Newcombe','Newcombe', // 1-1
  'Laver','Laver','Laver','Laver', // 2-1
  'Newcombe','Newcombe','Newcombe','Newcombe', // 2-2
  'Laver','Laver','Laver','Laver', // 3-2
  'Newcombe','Newcombe','Newcombe','Newcombe', // 3-3
  'Laver','Laver','Laver','Laver', // 4-3
  'Newcombe','Newcombe','Newcombe','Newcombe', // 4-4
  'Laver','Laver','Laver','Laver', // 5-4
  'Laver','Laver','Newcombe','Laver','Laver' // 6-4 → MATCH ✔
];

const laverVsNewcombe1969 = [...set1, ...set2, ...set3, ...set4];

import { TennisMatch } from '../src/index';

/*
describe('1969 Wimbledon Final - Rod Laver vs John Newcombe (Corrected)', () => {
  it('should process the full match and end with 3 sets to 1 for Laver', () => {
    const match = new TennisMatch('Laver', 'Newcombe');

    laverVsNewcombe1969.forEach(player => match.scorePoint(player));

    expect(match.player1.sets).toBe(3);
    expect(match.player2.sets).toBe(1);
  });
});
*/
