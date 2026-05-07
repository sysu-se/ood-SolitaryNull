// src/domain/store.js
import { writable, get } from 'svelte/store';
import { createSudoku, createGame, isValidPlacement } from './index.js';
import { generateSudoku, solveSudoku } from '@sudoku/sudoku';
import { decodeSencode } from '@sudoku/sencode';

// 导入所有需要重置的旧 Store (解决问题 5: 生命周期重置)
import { timer } from '@sudoku/stores/timer';
import { cursor } from '@sudoku/stores/cursor';
import { hints } from '@sudoku/stores/hints';
import { candidates } from '@sudoku/stores/candidates';
import { difficulty as legacyDifficultyStore } from '@sudoku/stores/difficulty';
import { gamePaused } from '@sudoku/stores/game';
import { grid as legacyGridStore } from '@sudoku/stores/grid';

function createGameStore() {
    const { subscribe, set } = writable({
        grid: Array(9).fill(0).map(() => Array(9).fill(0)),
        initialGrid: Array(9).fill(0).map(() => Array(9).fill(0)),
        canUndo: false,
        canRedo: false,
        isComplete: false,
        invalidCells: []
    });

    let gameInstance = null;

    // 解决问题 6: 封装边界，不直接读取内部字段
    const sync = () => {
        if (!gameInstance) return;
        const sudoku = gameInstance.getSudoku();
        const currentGrid = sudoku.getGrid();
        candidates.set(sudoku.getNotes());
        const invalidCells = []; // 逻辑同前...
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const val = currentGrid[r][c];
				if (val !== 0 && val !== null) {
					// 核心逻辑：
					// 如果当前棋盘在 (r,c) 位置的值 val，
					// 与棋盘中其他位置的值冲突，则判定为 invalid
					if (!isValidPlacement(currentGrid, r, c, val)) {
						// 格式必须与 Board.svelte 中的 $candidates[x + ',' + y] 对应
						// 即 "列索引,行索引"
						invalidCells.push(`${c},${r}`);
					}
				}
			}
		}
        set({
            grid: currentGrid,
            initialGrid: gameInstance.getInitialGrid(), // 改为调用显式接口
            canUndo: gameInstance.canUndo(),
            canRedo: gameInstance.canRedo(),
            isComplete: gameInstance.isComplete(),
            invalidCells
        });
		console.log(invalidCells);
        // 解决问题 1: legacyGridStore 仅作为“投影”存在，不作为逻辑源
        legacyGridStore.set(gameInstance.getInitialGrid());
    };

    // 解决问题 5: 统筹重置一局游戏的会话状态
    const resetSession = () => {
    // 1. 重置计时器
    if (timer && timer.reset) timer.reset();

    // 2. 重置光标位置到左上角 (解决评审意见 5)
    if (cursor && cursor.set) {
        cursor.reset({ x: 0, y: 0 });
    }

    // 3. 清空所有笔记 (解决评审意见 5)
    // 检查 candidates 是否有 set 方法 (通常 writable 都有，除非被封装了)
    if (candidates.set) {
        candidates.set({}); 
    } else {
        // 如果是严格封装的自定义 Store，循环调用其暴露的 clear 方法
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                candidates.clear({ x, y });
            }
        }
    }

    // 4. 重置提示次数 (如果业务要求新局重置)
    if (hints) hints.reset(50); 
};

    return {
        subscribe,
        
        startNew(difficultyValue) {
            resetSession();
            const puzzle = generateSudoku(difficultyValue);
            gameInstance = createGame({ sudoku: createSudoku(puzzle) });
            
            legacyDifficultyStore.set(difficultyValue);
            gamePaused.set(false);
            sync();
        },

        startCustom(sencode) {
            resetSession();
            const puzzle = decodeSencode(sencode);
            gameInstance = createGame({ sudoku: createSudoku(puzzle) });
            
            // 解决问题 4: 自定义题目元数据切换
            legacyDifficultyStore.set('custom'); 
            gamePaused.set(false);
            sync();
        },

        // 解决问题 2: 提示流程收编进入领域模型
        applyHint() {
            if (!gameInstance) return;
            
            // 1. 从 cursor store 获取当前选中的坐标
            const { x, y } = get(cursor); // 需要 import { get } from 'svelte/store'
            if (x === null || y === null) return;

            // // 2. 获取当前格子的正确答案
            // const solution = solveSudoku(gameInstance.getInitialGrid());
            // const correctValue = solution[y][x];

            // // 3. 执行领域层的 guess 操作 (validate 设为 false，因为答案肯定是合法的)
            // this.guess(y, x, correctValue);
            
            // // 4. 消耗一个提示次数
            // hints.useHint(); 
            // 使用新的提示系统
            this.applyAnswerHint(y, x);
        },
        /**
         * 获取下一步提示
         * @returns {Array<{row: number, col: number, value: number}>}
         */
        getNextMovesHint() {
            if (!gameInstance) return [];
            return gameInstance.getHintNextMoves();
        },

        /**
         * 应用答案提示 (改进版)
         * @param {number} row - 行索引
         * @param {number} col - 列索引
         * @returns {boolean} 操作是否成功
         */
        applyAnswerHint(row, col) {
            if (!gameInstance) return false;

            const success = gameInstance.applyAnswerHint(row, col);
            if (success) {
                // 消耗一个提示次数
                if (hints && hints.useHint) {
                    hints.useHint();
                }
                
                // 清除该格的笔记
                if (candidates && candidates.clear) {
                    candidates.clear({ x: col, y: row });
                }
                
                // 同步状态到 Store
                sync();
                return true;
            }
            return false;
        },
        /**
         * 获取指定格子的候选数提示
         * @param {number} row - 行索引 (0-8)
         * @param {number} col - 列索引 (0-8)
         * @returns {Set<number> | null}
         */
        getCandidatesHint(row, col) {
            if (!gameInstance) return null;
            try {
                return gameInstance.getHintCandidates(row, col);
            } catch (e) {
                console.warn('getCandidatesHint error:', e.message);
                return null;
            }
        },
        applyCandidateHint(row, col) {
            if (!gameInstance) return;
            const hintSet = gameInstance.getHintCandidates(row, col);
            if (hintSet && hintSet.size > 0) {
                // 使用新定义的 note-set 类型，确保进入 Undo 历史
                gameInstance.guess({ 
                    row, 
                    col, 
                    value: Array.from(hintSet), 
                    type: 'note-set' 
                }, false);
                sync();
            }
        },

        /**
         * 改进：下一步提示改为直接填入一个确定的数字
         */
        applyNextMoveHint() {
            if (!gameInstance) return;
            
            // 检查次数
            const currentHints = get(hints);
            if (currentHints <= 0) {
                alert('No hints available!');
                return;
            }

            const nextMoves = gameInstance.getHintNextMoves();
            if (nextMoves.length > 0) {
                const move = nextMoves[0];
                this.guess(move.row, move.col, move.value);
                hints.useHint();
            } else {
                alert('No obvious moves available');
            }
        },
        toggleNote(row, col, value) {
            if (!gameInstance) return;
            // 调用统一的 guess，确保笔记操作可撤销
            gameInstance.guess({ row, col, value, type: 'note-toggle' }, false);
            sync();
        },
        clearNote(row, col) {
            if (!gameInstance) return;
            // 记录为一个 note-clear 类型的 move
            gameInstance.guess({ row, col, type: 'note-clear' }, false);
            sync();
        },
        guess(row, col, value) {
            if (!gameInstance) return;
            try {
                gameInstance.guess({ row, col, value }, false);
                sync();
            } catch (e) {
                console.warn(e.message);
            }
        },

        undo() { if (gameInstance) { gameInstance.undo(); sync(); } },
        redo() { if (gameInstance) { gameInstance.redo(); sync(); } },
        pause() { gamePaused.set(true); timer.stop(); },
        resume() { gamePaused.set(false); timer.start(); }
    };
}

export const gameStore = createGameStore();