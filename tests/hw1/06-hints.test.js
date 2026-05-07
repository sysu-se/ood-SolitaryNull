import { describe, it, expect, beforeEach } from 'vitest';
import { Sudoku, Game, createSudoku, createGame } from '@sudoku/domain/index.js';

describe('Sudoku Hint Methods', () => {
  let sudoku;

  beforeEach(() => {
    const grid = [
      [5,3,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9]
    ];
    sudoku = createSudoku(grid);
  });

  it('getCandidates 返回 Set 实例', () => {
    const candidates = sudoku.getCandidates(0, 2);
    expect(candidates instanceof Set).toBe(true);
  });

  it('getCandidates 对已填格返回空集', () => {
    const candidates = sudoku.getCandidates(0, 0);
    expect(candidates.size).toBe(0);
  });

  it('getCandidates 只包含 1-9', () => {
    const candidates = sudoku.getCandidates(0, 2);
    for (const num of candidates) {
      expect(num >= 1 && num <= 9).toBe(true);
    }
  });

  it('getNextMoves 返回数组', () => {
    const nextMoves = sudoku.getNextMoves();
    expect(Array.isArray(nextMoves)).toBe(true);
  });

  it('getNextMoves 中每个元素都有 row, col, value', () => {
    const nextMoves = sudoku.getNextMoves();
    for (const move of nextMoves) {
      expect(move).toHaveProperty('row');
      expect(move).toHaveProperty('col');
      expect(move).toHaveProperty('value');
      expect(move.value >= 1 && move.value <= 9).toBe(true);
    }
  });

  it('solve 返回完整解或 null', () => {
    const solution = sudoku.solve();
    if (solution) {
      expect(solution.length).toBe(9);
      expect(solution[0].length).toBe(9);
    }
  });
});

describe('Game Hint Methods', () => {
  let game;

  beforeEach(() => {
    const grid = [
      [5,3,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9]
    ];
    const sudoku = createSudoku(grid);
    game = createGame({ sudoku });
  });

  it('getHintCandidates 拒绝初始格', () => {
    expect(() => game.getHintCandidates(0, 0)).toThrow();
  });

  it('getHintCandidates 对空格返回候选数', () => {
    const candidates = game.getHintCandidates(0, 2);
    expect(candidates instanceof Set).toBe(true);
  });

  it('applyAnswerHint 拒绝初始格', () => {
    const success = game.applyAnswerHint(0, 0);
    expect(success).toBe(false);
  });

  it('applyAnswerHint 成功填入答案后可以撤销', () => {
    const initialState = game.canUndo();
    game.applyAnswerHint(0, 2);
    expect(game.canUndo()).toBe(true);
  });
});