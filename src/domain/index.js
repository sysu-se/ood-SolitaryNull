/**
 * @fileoverview 数独游戏领域层的统一入口（Facade模式）
 * 暴露所有必要的类和工厂函数供上层适配器（store）使用
 */

// 导出 Model 层
export { Sudoku, cloneGrid, isValidPlacement } from './models/sudoku.js';
export { Game, createSudoku, createGame, createGameFromJSON, createSudokuFromJSON } from './models/game.js';
export { ExploreBranch, ExploreSession } from './models/explore.js';

// 导出 Service 层
export { HintEngine, generateReasonText, HINT_LEVELS } from './services/hint-engine.js';


