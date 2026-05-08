/**
 * @fileoverview 数独棋盘的核心模型
 * 负责棋盘状态、合法性校验、候选数计算
 */

/**
 * 深度克隆一个二维数组（9x9 棋盘）
 * @param {number[][]} grid - 原始二维数组
 * @returns {number[][]} 新的独立副本
 */
export const cloneGrid = (grid) => grid.map(row => [...row]);

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
export class Sudoku {
  /**
   * 创建一个新的 Sudoku 实例
   * @param {number[][]} grid - 9x9 初始棋盘，用 0 或 null 表示空格
   * @param {Object} [notes={}] - 笔记数据
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
   * 获取笔记数据副本
   * @returns {Object} 笔记副本
   */
  getNotes() {
    return JSON.parse(JSON.stringify(this.notes));
  }

  /**
   * 执行一次猜测（放置一个数字或清除）
   * @param {Object} move - 移动信息
   * @param {number} move.row - 行索引（0-8）
   * @param {number} move.col - 列索引（0-8）
   * @param {number|null} move.value - 要放置的值（1-9 或 null/0 表示清除）
   * @param {string} [move.type='digit'] - 移动类型：'digit'、'note-toggle'、'note-set'、'note-clear'
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

    if (type === 'note-clear') {
      delete this.notes[key];
      return;
    }

    // 填入数字逻辑
    const numValue = (value === null || value === undefined) ? 0 : Number(value);
    if (row < 0 || row > 8 || col < 0 || col > 8) throw new Error('Out of bounds');
    if (numValue < 0 || numValue > 9) throw new Error('Invalid value');

    if (validate && numValue !== 0) {
      if (!isValidPlacement(this.grid, row, col, numValue)) {
        throw new Error(`Invalid move at [${row}, ${col}]`);
      }
    }

    this.grid[row][col] = numValue;
    // 填入数字后，自动清除该格笔记
    delete this.notes[key];
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
   * @param {Function} solveSudoku - 求解函数（从 @sudoku/sudoku 导入）
   * @returns {number[][] | null} 求解结果，无解返回 null
   */
  solve(solveSudoku) {
    return solveSudoku(this.getGrid()) || null;
  }

  /**
   * 获取指定格子的答案（基于求解结果）
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {Function} solveSudoku - 求解函数
   * @returns {number | null} 答案，若无解或不需要填则返回 null
   */
  getAnswer(row, col, solveSudoku) {
    // 如果格子已填，返回 null
    if (this.grid[row][col] !== 0) {
      return null;
    }

    // 求解
    const solved = this.solve(solveSudoku);
    if (!solved) {
      return null;
    }

    return solved[row][col];
  }

  /**
   * 获取棋盘状态的指纹（用于失败记忆）
   * @returns {string} 状态指纹
   */
  getFingerprint() {
    return JSON.stringify(this.grid) + "|" + JSON.stringify(this.notes);
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
