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
import { ExploreSession } from './index.js';
function createGameStore() {
    const exploreStatus = writable({ active: false, hasConflict: false, isRevisited: false });
    const exploreBranches = writable([]);
    const hintLevelInfo = writable({ name: '等待指令', desc: '请选择一种提示方式' });

    const state = writable({
        grid: Array(9).fill(0).map(() => Array(9).fill(0)),
        initialGrid: Array(9).fill(0).map(() => Array(9).fill(0)),
        canUndo: false,
        canRedo: false,
        isComplete: false,
        invalidCells: [],
        explanation: null, 
        showExplanation: false, // 提示解释是否显示
        showExplore: false,     // 探索面板是否显示
        hintLevelInfo: { name: '等待指令', desc: '请选择一种提示方式' },
        isExploring: false
    });

    let gameInstance = null;
    let session = null; // ExploreSession 实例
   const generateReasonText = (row, col, type, candidates = []) => {
        const r = row + 1;
        const c = col + 1;
        if (type === 'L1') return `【逻辑扫描】在第 ${r} 行第 ${c} 列发现突破口。根据排除法，该位置目前只有一个合法的数字可以填入，建议优先观察此处。`;
        if (type === 'L2') return `【候选分析】已对第 ${r} 行第 ${c} 列进行了深度扫描。排除了同行、同列及同宫的干扰项，剩下的可能性（${candidates.join(', ')}）已为你标记。`;
        if (type === 'L3') return `【决策辅助】经过全局唯一解计算，确定第 ${r} 行第 ${c} 列的最终答案。该步骤已录入历史记录，你可以随时撤销。`;
        return "";
    };
    // 解决问题 6: 封装边界，不直接读取内部字段
    const sync = (extraState = {}) => {
        if (!gameInstance) return;
        const sudoku = gameInstance.getSudoku();
        const fingerprint = sudoku.getFingerprint();

        // 同步分支信息
        if (session) {
            exploreBranches.set(session.getBranchList());
            const isConflict = !sudoku.isComplete() && sudoku.getGrid().flat().every(v => v !== 0); 
            // 简单的冲突逻辑：填满了但不正确
            
            // 失败记忆检查
            const isRevisited = session.checkFailed(gameInstance);
            
            exploreStatus.set({
                active: true,
                hasConflict: isConflict,
                isRevisited: isRevisited,
                currentBranchId: session.currentBranchId,
                canExploreUndo: gameInstance.canUndo(), // 复用 Game 的能力
                canExploreRedo: gameInstance.canRedo()
            });

            // 如果当前发现冲突，自动记录到失败记忆
            if (isConflict) session.recordFailure(fingerprint);
        } else {
            exploreStatus.set({ active: false });
            exploreBranches.set([]);
        }
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
        state.update(s => ({
            ...s,
            grid: sudoku.getGrid(),
            initialGrid: gameInstance.getInitialGrid(),
            canUndo: gameInstance.canUndo(),
            canRedo: gameInstance.canRedo(),
            isComplete: gameInstance.isComplete(),
            invalidCells: [], // 冲突计算逻辑同前
            ...extraState
        }));
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
        subscribe: state.subscribe,
        exploreStatus, // 暴露给新 Sidebar
        exploreBranches,
        startExplore() {
            // 核心修复：如果游戏实例不存在，不允许开启探索
            if (!gameInstance) {
                console.warn("无法启动探索：请先开始一局游戏");
                return; 
            }
            
            // 只有存在 gameInstance 时才创建 session
            session = new ExploreSession(gameInstance);
            sync();
        },

        createExploreBranch(label) {
            if (!session) return;
            const id = session.createBranch(label, gameInstance);
            sync();
            return id;
        },

        switchExploreBranch(id) {
            if (!session) return;
            const branch = session.branches.get(id);
            gameInstance.loadSnapshot(branch.snapshot);
            session.currentBranchId = id;
            sync();
        },

        backtrackExplore() {
            if (!session) return;
            // 回到最初起点
            gameInstance.loadSnapshot(session.rootSnapshot);
            session.currentBranchId = 0;
            sync();
        },

        commitExplore() {
            // 提交：保留当前棋盘，销毁会话
            session = null;
            sync();
        },

        cancelExplore() {
            // 如果 session 根本没创建（比如初始化失败），直接返回
            if (!session) {
                sync();
                return;
            }
            
            const rootJSON = session.rootSnapshot;
            gameInstance.loadSnapshot(rootJSON);
            session = null;
            sync();
        },

        // 探索模式下的撤销重做直接复用 Game 的
        exploreUndo() { gameInstance.undo(); sync(); },
        exploreRedo() { gameInstance.redo(); sync(); },
        // L1: 观察级
        requestPositionHint() {
            if (!gameInstance) return;
            const nextMoves = gameInstance.getHintNextMoves();
            if (nextMoves.length > 0) {
                const move = nextMoves[0];
                cursor.set(move.col, move.row); 
                
                // 通过 sync 一次性更新所有状态
                sync({
                    showExplanation: true,
                    hintLevelInfo: { name: 'L1 观察级', desc: '指出值得关注的位置，不给数字。' },
                    explanation: {
                        row: move.row + 1,
                        col: move.col + 1,
                        text: generateReasonText(move.row, move.col, 'L1')
                    }
                });
            }
        },

        // L2: 候选级
        applyCandidateHint(row, col) {
            if (!gameInstance) return;
            const hintSet = gameInstance.getHintCandidates(row, col);
            
            if (hintSet && hintSet.size > 0) {
                const cList = Array.from(hintSet);
                // 执行领域逻辑
                gameInstance.guess({ row, col, value: cList, type: 'note-set' }, false);
                
                // 同步
                sync({
                    showExplanation: true,
                    hintLevelInfo: { name: 'L2 候选级', desc: '显示候选并解释排除依据。' },
                    explanation: {
                        row: row + 1,
                        col: col + 1,
                        text: generateReasonText(row, col, 'L2', cList)
                    }
                });
            }
        },

        // L3: 决策级
        applyAnswerHint(row, col) {
            if (!gameInstance) return;
            const success = gameInstance.applyAnswerHint(row, col);
            if (success) {
                if (hints && hints.useHint) hints.useHint();
                
                sync({
                    showExplanation: true,
                    hintLevelInfo: { name: 'L3 决策级', desc: '直接给出确定数字并填入。' },
                    explanation: {
                        row: row + 1,
                        col: col + 1,
                        text: generateReasonText(row, col, 'L3')
                    }
                });
            }
        },

        closeExplanation() {
            state.update(s => ({ ...s, explanation: null, showExplanation: false }));
        },
        toggleExploreUI() {
            state.update(s => ({ ...s, showExplore: !s.showExplore }));
        },
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