import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'
import {solveSudoku } from '../../src/node_modules/@sudoku/sudoku.js';
describe('HW 1.2 Hint Logic', () => {
  it('Sudoku.getCandidates() returns correct set of numbers for a blank cell', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    
    // 考察 [0, 2] 格子：
    // 行 0 已有: 5, 3, 7
    // 列 2 已有: 8
    // 宫 0 已有: 5, 3, 6, 9, 8
    // 合法候选数应排除: 3, 5, 6, 7, 8, 9 -> 剩下 {1, 2, 4}
    const candidates = sudoku.getCandidates(0, 2)
    
    expect(candidates.has(1)).toBe(true)
    expect(candidates.has(2)).toBe(true)
    expect(candidates.has(4)).toBe(true)
    expect(candidates.has(5)).toBe(false) // 冲突
    expect(candidates.size).toBe(3)
  })

  it('Sudoku.getNextMoves() finds "Naked Singles"', async () => {
    const { createSudoku } = await loadDomainApi()
    // 构造一个几乎填满，只剩一个逻辑空格的简单场景或使用 makePuzzle 中的唯余项
    const sudoku = createSudoku(makePuzzle())
    const nextMoves = sudoku.getNextMoves()

    expect(Array.isArray(nextMoves)).toBe(true)
    // 验证返回的每个 move 确实只有一个候选数
    nextMoves.forEach(move => {
      const c = sudoku.getCandidates(move.row, move.col)
      expect(c.size).toBe(1)
      expect(Array.from(c)[0]).toBe(move.value)
    })
  })

  it('Game.applyAnswerHint() fills correct value based on initial grid', async () => {
    const api = await loadDomainApi()
    const { createGame, createSudoku } = api
 
    const puzzle = makePuzzle()
    const sudoku = createSudoku(puzzle)
    
    // 3. 注入解题函数
    const game = createGame({ sudoku, solveSudoku })

    // 在 [0, 2] 填入一个故意错误的值 9
    game.guess({ row: 0, col: 2, value: 9 })
    expect(game.getSudoku().getGrid()[0][2]).toBe(9)

    // 4. 执行提示
    const success = game.applyAnswerHint(0, 2)
    expect(success).toBe(true)

    // 5. 验证是否回到了正确答案
    // 根据 Wikipedia 题面，[0, 2] 位置的正确答案是 4
    const currentGrid = game.getSudoku().getGrid()
    expect(currentGrid[0][2]).toBe(4) 
  })
})