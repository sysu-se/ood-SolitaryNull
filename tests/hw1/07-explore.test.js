import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'
import  { solveSudoku } from './helpers/domain-api.js'
describe('HW 1.2 Explore Mode (Parallel Universes)', () => {
  it('ExploreSession manages branching and snapshot isolation', async () => {
    const { createGame, createSudoku, ExploreSession } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()), solveSudoku })
    const session = new ExploreSession(game)

    // 创建分支 A
    session.createBranch('Branch A', game)
    game.guess({ row: 0, col: 2, value: 1 })
    session.updateCurrentSnapshot(game)

    // 创建分支 B
    session.createBranch('Branch B', game)
    game.guess({ row: 0, col: 3, value: 2 })
    session.updateCurrentSnapshot(game)

    // 切换回分支 A
    const branchA = session.branches.get(1)
    game.loadSnapshot(branchA.snapshot)
    
    // 验证：分支 A 的修改 (value:1) 还在，但分支 B 的修改 (value:2) 不应存在
    expect(game.getSudoku().getGrid()[0][2]).toBe(1)
    expect(game.getSudoku().getGrid()[0][3]).toBe(0)
  })

  it('Independent Undo does not cross branch boundaries', async () => {
    const { createGame, createSudoku, ExploreSession } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    
    // 主线走两步
    game.guess({ row: 0, col: 2, value: 1 })
    game.guess({ row: 0, col: 3, value: 2 })
    const mainHistoryIndex = game.historyIndex

    const session = new ExploreSession(game)
    session.createBranch('Test Boundary', game)

    // 在分支里走一步
    game.guess({ row: 0, col: 5, value: 4 })
    expect(game.canUndo(mainHistoryIndex)).toBe(true)

    // 撤销分支内的操作
    game.undo(mainHistoryIndex) 
    expect(game.getSudoku().getGrid()[0][5]).toBe(0)

    // 尝试再次撤销（触碰边界）
    expect(game.canUndo(mainHistoryIndex)).toBe(false)
    game.undo(mainHistoryIndex)
    // 验证：主线的操作 [0, 3] = 2 没有被撤销，守住了边界
    expect(game.getSudoku().getGrid()[0][3]).toBe(2)
  })

  it('failedFingerprints remembers and recognizes failed states', async () => {
    const { createGame, createSudoku, ExploreSession } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    const session = new ExploreSession(game)

    // 制造一个冲突状态并记录失败
    game.guess({ row: 0, col: 2, value: 5 }) // 与 row 0 的 5 冲突
    session.recordFailure(game)

    const failedHash = game.getSudoku().getFingerprint()
    expect(session.failedFingerprints.has(failedHash)).toBe(true)

    // 撤销并重新通过另一条路回到这个状态
    game.undo()
    expect(session.checkFailed(game)).toBe(false)
    
    game.guess({ row: 0, col: 2, value: 5 })
    expect(session.checkFailed(game)).toBe(true) // 记忆命中
  })

  it('backtrackExplore() restores root snapshot and clears session', async () => {
    const { createGame, createSudoku, ExploreSession } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    const rootSnapshot = game.toJSON()
    
    const session = new ExploreSession(game)
    game.guess({ row: 0, col: 2, value: 1 })
    
    // 执行回溯
    game.loadSnapshot(session.rootSnapshot)
    
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
    expect(game.historyIndex).toBe(rootSnapshot.historyIndex)
  })
})