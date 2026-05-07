import { solveSudoku } from '@sudoku/sudoku'; 
/**
 * @fileoverview 数独游戏核心领域模块，提供数独棋盘的基本操作、游戏状态管理及历史记录功能。
 */

/**
 * 深度克隆一个二维数组（9x9 棋盘）
 * @param {number[][]} grid - 原始二维数组
 * @returns {number[][]} 新的独立副本
 */
const cloneGrid = (grid) => grid.map(row => [...row]);

/**
 * 校验在指定位置放置数值是否符合数独规则
 * @param {number[][]} grid - 当前棋盘（9x9）
 * @param {number} row - 行索引（0-8）
 * @param {number} col - 列索引（0-8）
 * @param {number} value - 要放置的值（1-9，0 或 null 表示空白）
 * @returns {boolean} 如果放置合法返回 true，否则 false
 */
export const isValidPlacement = (grid, row, col, value) => {
  // 确保输入是数字或 null
  const val = value === null ? 0 : Number(value);
  if (val === 0) return true;

  // 行校验
  for (let i = 0; i < 9; i++) {
    // 强制转换为数字进行比较
    if (i !== col && Number(grid[row][i]) === val) return false;
  }
  // 列校验
  for (let i = 0; i < 9; i++) {
    if (i !== row && Number(grid[i][col]) === val) return false;
  }
  // 九宫格校验
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = startRow + i;
      const c = startCol + j;
      if ((r !== row || c !== col) && Number(grid[r][c]) === val) return false;
    }
  }
  return true;
};

/**
 * 数独核心类，封装棋盘数据及基础操作（无历史记录）
 */
class Sudoku {
  /**
   * 创建一个新的 Sudoku 实例
   * @param {number[][]} grid - 9x9 初始棋盘，用 0 或 null 表示空格
   * @throws {Error} 如果 grid 不是 9x9 的数组结构
   */
  constructor(grid, notes = {}) {
    this._validateStructure(grid);
    // 统一内部表示：null 或 undefined 转为 0
    this.grid = grid.map(row => row.map(cell => (cell === null || cell === undefined) ? 0 : cell));
    this.notes = JSON.parse(JSON.stringify(notes));
  }

  /**
   * 校验棋盘结构是否为 9x9
   * @param {*} grid - 待校验的输入
   * @throws {Error} 结构不符合要求时抛出异常
   * @private
   */
  _validateStructure(grid) {
    if (!Array.isArray(grid) || grid.length !== 9) throw new Error('Grid must be 9x9');
    for (const row of grid) {
      if (!Array.isArray(row) || row.length !== 9) throw new Error('Grid must be 9x9');
    }
  }

  /**
   * 获取当前棋盘的深拷贝
   * @returns {number[][]} 棋盘副本
   */
  getGrid() {
    return cloneGrid(this.grid);
  }

  /**
   * 执行一次猜测（放置一个数字或清除）
   * @param {Object} move - 移动信息
   * @param {number} move.row - 行索引（0-8）
   * @param {number} move.col - 列索引（0-8）
   * @param {number|null} move.value - 要放置的值（1-9 或 null/0 表示清除）
   * @param {boolean} [validate=false] - 是否进行规则校验
   * @throws {Error} 坐标越界、数值无效或违反数独规则（validate=true 时）
   */
  guess(move, validate = false) {
    const { row, col, value, type = 'digit' } = move;
    const key = `${col},${row}`;

    // 处理笔记逻辑
    if (type === 'note-toggle') {
      const current = this.notes[key] || [];
      if (current.includes(value)) {
        this.notes[key] = current.filter(v => v !== value);
      } else {
        this.notes[key] = [...current, value].sort((a, b) => a - b);
      }
      return;
    }
    if (type === 'note-set') {
      this.notes[key] = Array.isArray(value) ? [...value].sort((a, b) => a - b) : [];
      return;
    }
    // 填入数字逻辑
    const numValue = (value === null || value === undefined) ? 0 : Number(value);
    if (row < 0 || row > 8 || col < 0 || col > 8) throw new Error('Out of bounds');
    if (value < 0 || value > 9) throw new Error('Invalid value');

    if (validate && numValue !== 0) {
      if (!isValidPlacement(this.grid, row, col, numValue)) {
        throw new Error(`Invalid move at [${row}, ${col}]`);
      }
    }

    this.grid[row][col] = numValue;
    // 填入数字后，自动清除该格笔记
    delete this.notes[key]; 
  }
  getNotes() {
    return JSON.parse(JSON.stringify(this.notes));
  }
  /**
   * 克隆当前 Sudoku 实例
   * @returns {Sudoku} 新的 Sudoku 对象，包含棋盘副本
   */
    clone() {
    return new Sudoku(this.getGrid(), this.getNotes());
  }
  
  /**
   * 判断数独是否已完成（填满且无冲突）
   * @returns {boolean} 完成返回 true，否则 false
   */
  isComplete() {
    // 1. 检查是否填满
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.grid[r][c] === 0) return false;
      }
    }

    // 2. 检查是否存在任何冲突
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!isValidPlacement(this.grid, r, c, this.grid[r][c])) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * 获取指定格子的候选数集合
   * @param {number} row - 行索引 (0-8)
   * @param {number} col - 列索引 (0-8)
   * @returns {Set<number>} 合法候选数集合 (1-9)，若格子已填则返回空集
   */
  getCandidates(row, col) {
    const candidates = new Set();
    
    // 如果格子已有值，返回空集
    if (this.grid[row][col] !== 0) {
      return candidates;
    }

    // 遍历 1-9，检查每个数是否合法
    for (let num = 1; num <= 9; num++) {
      if (isValidPlacement(this.grid, row, col, num)) {
        candidates.add(num);
      }
    }
    
    return candidates;
  }
   /**
   * 获取当前棋盘所有有唯一解的格子（下一步提示）
   * @returns {Array<{row: number, col: number, value: number}>}
   *          所有候选数只有1个的空格
   */
  getNextMoves() {
    const nextMoves = [];
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const candidates = this.getCandidates(r, c);
        
        // 只有唯一候选数的空格才加入
        if (candidates.size === 1) {
          const value = Array.from(candidates)[0];
          nextMoves.push({ row: r, col: c, value });
        }
      }
    }
        
    return nextMoves;
  }
    /**
   * 获取全棋盘候选数（性能优化版本）
   * @returns {Map<string, Set<number>>} key: "row,col"，value: 候选数集合
   */
  getAllCandidates() {
    const allCandidates = new Map();
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const candidates = this.getCandidates(r, c);
        
        if (candidates.size > 0) {
          allCandidates.set(`${r},${c}`, candidates);
        }
      }
    }
    
    return allCandidates;
  }
    /**
   * 求解当前棋盘（用于答案提示）
   * @returns {number[][] | null} 求解结果，无解返回 null
   */
  solve() {
    return solveSudoku(this.getGrid()) || null;
  }

  /**
   * 获取指定格子的答案（基于求解结果）
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {number[][] | null} solution - 预先求解的完整解 (可选，提高性能)
   * @returns {number | null} 答案，若无解或不需要填则返回 null
   */
  getAnswer(row, col, solution = null) {
    // 如果格子已填，返回 null
    if (this.grid[row][col] !== 0) {
      return null;
    }
    
    // 使用提供的解或重新求解
    const solved = solution || this.solve();
    if (!solved) {
      return null;
    }
    
    return solved[row][col];
  }
  /**
   * 转换为 JSON 兼容的纯对象
   * @returns {{grid: number[][]}} 包含棋盘数据的对象
   */
  toJSON() {
    return { grid: this.getGrid() };
  }

  /**
   * 格式化输出棋盘字符串（用于调试）
   * @returns {string} 带分隔线的棋盘文本
   */
  toString() {
    let str = '';
    for (let row = 0; row < 9; row++) {
      if (row % 3 === 0 && row !== 0) str += '------+-------+------\n';
      for (let col = 0; col < 9; col++) {
        if (col % 3 === 0 && col !== 0) str += '| ';
        const val = this.grid[row][col];
        str += (val === 0 ? '.' : val) + ' ';
      }
      str += '\n';
    }
    return str;
  }
}

/**
 * 游戏管理类，维护初始棋盘、移动历史及撤销/重做功能
 */
class Game {
  /**
   * 创建一个新的游戏实例
   * @param {Sudoku} sudoku - 初始数独对象（将保存其初始棋盘）
   */
  constructor(sudoku) {
    /**
     * 初始棋盘（不可修改的单元格定义）
     * @type {number[][]}
     */
    this.initialGrid = sudoku.getGrid();
    /**
     * 历史移动记录列表
     * @type {Array<{row: number, col: number, value: number}>}
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
    // 新增：求解缓存
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
    if (this.isInitialCell(row, col)) {
      console.warn('Cannot hint on initial cell');
      return false;
    }

    // 如果当前棋盘未求解过，求解一次并缓存
    if (!this._cachedSolution) {
      this._cachedSolution = this.currentSudoku.solve();
      if (!this._cachedSolution) {
        console.warn('Puzzle has no solution');
        return false;
      }
    }

    const answer = this.currentSudoku.getAnswer(row, col, this._cachedSolution);
    if (answer === null) {
      console.warn('Cell already filled or no answer available');
      return false;
    }

    try {
      this.guess({ row, col, value: answer }, false);
      return true;
    } catch (e) {
      console.warn('Failed to apply hint:', e.message);
      return false;
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
  }

  /**
   * 撤销上一步操作
   */
  undo() {
    if (this.historyIndex > 0) {
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
  toggleNote(row, col, value) {
    this.guess({ row, col, value, type: 'note-toggle' }, false);
  }
  /**
   * 根据当前历史索引重建当前棋盘状态
   * @private
   */
  _rebuild() {
    // 从零开始重建：初始题面 + 没有任何笔记
    const sudoku = new Sudoku(this.initialGrid, {}); 
    for (let i = 0; i < this.historyIndex; i++) {
      // 逐一回放 move。如果 move[i] 是 note-toggle，它会自动还原笔记。
      sudoku.guess(this.moves[i], false); 
    }
    this.currentSudoku = sudoku;
  }

  /**
   * 检查是否可以撤销
   * @returns {boolean}
   */
  canUndo() {
    return this.historyIndex > 0;
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
   * @returns {{initialGrid: number[][], moves: Array<{row: number, col: number, value: number}>, historyIndex: number}}
   */
  toJSON() {
    return {
      initialGrid: cloneGrid(this.initialGrid),
      moves: this.moves.map(m => ({ ...m })),
      historyIndex: this.historyIndex
    };
  }
  getInitialGrid() {
        return cloneGrid(this.initialGrid);
    }
}

// --- 工厂函数 ---

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
 * @param {number[][]} json.grid - 9x9 棋盘
 * @returns {Sudoku}
 * @throws {Error} 如果 JSON 无效
 */
export function createSudokuFromJSON(json) {
  if (!json || !json.grid) throw new Error('Invalid JSON');
  return new Sudoku(json.grid);
}

/**
 * 创建游戏实例（基于已存在的 Sudoku 对象）
 * @param {Object} options
 * @param {Sudoku} options.sudoku - 初始数独对象
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  return new Game(sudoku);
}

/**
 * 从 JSON 对象还原游戏实例（包含历史记录）
 * @param {Object} json - 由 Game.toJSON() 生成的对象
 * @param {number[][]} json.initialGrid - 初始棋盘
 * @param {Array<{row: number, col: number, value: number}>} [json.moves] - 历史移动列表
 * @param {number} [json.historyIndex] - 历史索引
 * @returns {Game}
 * @throws {Error} 如果 JSON 无效
 */
export function createGameFromJSON(json) {
  if (!json || !json.initialGrid) throw new Error('Invalid JSON');
  const game = new Game(new Sudoku(json.initialGrid));
  game.moves = (json.moves || []).map(m => ({ ...m }));
  game.historyIndex = json.historyIndex !== undefined ? json.historyIndex : game.moves.length;
  game._rebuild();
  return game;
}