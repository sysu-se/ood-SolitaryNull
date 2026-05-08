/**
 * @fileoverview 游戏管理类，维护历史记录和撤销/重做功能
 */

import { Sudoku, cloneGrid, isValidPlacement } from './sudoku.js';

/**
 * 游戏管理类，维护初始棋盘、移动历史及撤销/重做功能
 */
export class Game {
  /**
   * 创建一个新的游戏实例
   * @param {Sudoku} sudoku - 初始数独对象（将保存其初始棋盘）
   * @param {Function} solveSudoku - 求解函数（从 @sudoku/sudoku 导入）
   */
  constructor(sudoku, solveSudoku) {
    /**
     * 初始棋盘（不可修改的单元格定义）
     * @type {number[][]}
     */
    this.initialGrid = sudoku.getGrid();

    /**
     * 历史移动记录列表
     * @type {Array<Object>}
     */
    this.moves = [];

    /**
     * 当前历史索引（指向已应用的最新移动）
     * @type {number}
     */
    this.historyIndex = 0;

    /**
     * 当前游戏状态（Sudoku 实例）
     * @type {Sudoku}
     */
    this.currentSudoku = new Sudoku(this.initialGrid, sudoku.getNotes());

    /**
     * 求解函数缓存
     * @type {Function}
     * @private
     */
    this._solveSudoku = solveSudoku;

    /**
     * 求解缓存
     * @type {number[][] | null}
     * @private
     */
    this._cachedSolution = null;
  }

  /**
   * 判断某个格子是否为初始固定格子（不可修改）
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean} 是初始格子返回 true
   */
  isInitialCell(row, col) {
    return this.initialGrid[row][col] !== 0;
  }

  /**
   * 获取当前棋盘中指定格子的候选提示
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {Set<number> | null} 候选数集合，若格子被锁定或已填则返回 null
   */
  getHintCandidates(row, col) {
    if (this.isInitialCell(row, col)) {
      throw new Error('Cannot hint on initial cell');
    }
    return this.currentSudoku.getCandidates(row, col);
  }

  /**
   * 获取当前棋盘的下一步提示
   * @returns {Array<{row: number, col: number, value: number}>}
   */
  getHintNextMoves() {
    return this.currentSudoku.getNextMoves();
  }

  /**
   * 在指定格子应用答案提示
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean} 操作是否成功
   */
    applyAnswerHint(row, col) {
        if (this.isInitialCell(row, col)) return false;

        try {
            // 核心修改：始终基于 initialGrid（原始题面）进行求解
            // 这样即使当前棋盘被填乱了，解出来的依然是正确答案
            if (!this._cachedSolution) {
                this._cachedSolution = this._solveSudoku(this.initialGrid); 
            }

            if (!this._cachedSolution) return false;

            const answer = this._cachedSolution[row][col];
            
            // 执行落子逻辑（这会自动覆盖用户之前填错的数字）
            this.guess({ row, col, value: answer }, false);
            return true;
        } catch (e) {
            console.error("L3 Hint Solver Error:", e.message);
            return e.message; // 返回 false 并在适配层处理 UI 提示
        }
    }

  /**
   * 重置缓存 (在撤销/重做时调用)
   * @private
   */
  _invalidateSolutionCache() {
    this._cachedSolution = null;
  }

  /**
   * 获取当前数独状态的副本
   * @returns {Sudoku} 新的 Sudoku 实例
   */
  getSudoku() {
    return this.currentSudoku.clone();
  }

  /**
   * 执行一次猜测（带历史记录）
   * @param {Object} move - 移动信息
   * @param {number} move.row - 行索引
   * @param {number} move.col - 列索引
   * @param {number|null} move.value - 要放置的值（1-9 或 null/0）
   * @param {boolean} [validate=false] - 是否进行规则校验
   * @throws {Error} 如果尝试修改初始格子，或移动本身违反规则（validate=true 时）
   */
  guess(move, validate = false) {
    if (this.isInitialCell(move.row, move.col)) {
      throw new Error('Cannot modify initial cells');
    }

    // 先在当前棋盘尝试，失败会抛出异常，阻止 move 进入历史
    this.currentSudoku.guess(move, validate);

    // 截断后续未使用的历史
    this.moves = this.moves.slice(0, this.historyIndex);
    this.moves.push({ ...move });
    this.historyIndex++;

    // 缓存失效
    this._invalidateSolutionCache();
  }

  /**
   * 撤销上一步操作
   * @param {number} [limitIndex=0] - 撤销的底线（探索模式下用）
   */
  undo(limitIndex = 0) {
    if (this.canUndo(limitIndex)) {
      this.historyIndex--;
      this._rebuild();
      this._invalidateSolutionCache();
    }
  }

  /**
   * 重做下一步操作
   */
  redo() {
    if (this.historyIndex < this.moves.length) {
      this.historyIndex++;
      this._rebuild();
      this._invalidateSolutionCache();
    }
  }

  /**
   * 根据当前历史索引重建当前棋盘状态
   * @private
   */
  _rebuild() {
    // 从零开始重建：初始题面 + 没有任何笔记
    const sudoku = new Sudoku(this.initialGrid, {});
    for (let i = 0; i < this.historyIndex; i++) {
      // 逐一回放 move
      sudoku.guess(this.moves[i], false);
    }
    this.currentSudoku = sudoku;
  }

  /**
   * 检查是否可以撤销
   * @param {number} [limitIndex=0] - 撤销的底线
   * @returns {boolean}
   */
  canUndo(limitIndex = 0) {
    return this.historyIndex > limitIndex;
  }

  /**
   * 检查是否可以重做
   * @returns {boolean}
   */
  canRedo() {
    return this.historyIndex < this.moves.length;
  }

  /**
   * 判断当前游戏是否完成
   * @returns {boolean}
   */
  isComplete() {
    return this.currentSudoku.isComplete();
  }

  /**
   * 序列化为 JSON 兼容对象（可用于持久化）
   * @returns {Object} 游戏状态快照
   */
  toJSON() {
    return {
      initialGrid: cloneGrid(this.initialGrid),
      moves: this.moves.map(m => ({ ...m })),
      historyIndex: this.historyIndex
    };
  }

  /**
   * 获取初始棋盘副本
   * @returns {number[][]}
   */
  getInitialGrid() {
    return cloneGrid(this.initialGrid);
  }

  /**
   * 从快照恢复游戏状态
   * @param {Object} json - 由 toJSON() 生成的快照
   */
  loadSnapshot(json) {
    const restored = createGameFromJSON(json, this._solveSudoku);
    this.initialGrid = restored.initialGrid;
    this.moves = restored.moves;
    this.historyIndex = restored.historyIndex;
    this._rebuild();
  }
}

/**
 * 根据给定棋盘创建 Sudoku 实例
 * @param {number[][]} grid - 9x9 初始棋盘
 * @returns {Sudoku}
 */
export function createSudoku(grid) {
  return new Sudoku(grid);
}

/**
 * 从 JSON 对象还原 Sudoku 实例
 * @param {Object} json - 包含 grid 属性的对象
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  if (!json || !json.grid) throw new Error('Invalid JSON for Sudoku');
  return new Sudoku(json.grid, json.notes || {});
}

/**
 * 创建游戏实例（基于已存在的 Sudoku 对象）
 * @param {Object} options
 * @param {Sudoku} options.sudoku - 初始数独对象
 * @param {Function} [options.solveSudoku] - 求解函数（从 @sudoku/sudoku 导入）
 * @returns {Game}
 */
export function createGame({ sudoku, solveSudoku }) {
  return new Game(sudoku, solveSudoku);
}

/**
 * 从 JSON 对象还原游戏实例（包含历史记录）
 * @param {Object} json - 由 Game.toJSON() 生成的对象
 * @param {Function} solveSudoku - 求解函数
 * @returns {Game}
 * @throws {Error} 如果 JSON 无效
 */
export function createGameFromJSON(json, solveSudoku) {
  if (!json || !json.initialGrid) throw new Error('Invalid JSON');
  const game = new Game(new Sudoku(json.initialGrid), solveSudoku);
  game.moves = (json.moves || []).map(m => ({ ...m }));
  game.historyIndex = json.historyIndex !== undefined ? json.historyIndex : game.moves.length;
  game._rebuild();
  return game;
}
