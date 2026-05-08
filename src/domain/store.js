// src/domain/store.js
/**
 * @fileoverview Svelte 适配器层 (Adapter Pattern)
 * 持有 Game 实例，负责 Svelte 响应式状态同步
 */

import { writable, get } from 'svelte/store';
import { 
    Sudoku, 
    createGame, 
    isValidPlacement, 
    ExploreSession, 
    generateReasonText, 
    HINT_LEVELS 
} from './index.js';
import { generateSudoku, solveSudoku } from '@sudoku/sudoku';
import { decodeSencode } from '@sudoku/sencode';

// 导入需要联动的旧 Store
import { timer } from '@sudoku/stores/timer';
import { cursor } from '@sudoku/stores/cursor';
import { hints } from '@sudoku/stores/hints';
import { candidates } from '@sudoku/stores/candidates';
import { difficulty as legacyDifficultyStore } from '@sudoku/stores/difficulty';
import { gamePaused } from '@sudoku/stores/game';
import { grid as legacyGridStore } from '@sudoku/stores/grid';

/**
 * 创建游戏适配器 Store
 */
function createGameStore() {
    const exploreStatus = writable({ active: false, canExploreUndo: false, canExploreRedo: false });
    const exploreBranches = writable([]);
    
    const state = writable({
        grid: Array(9).fill(0).map(() => Array(9).fill(0)),
        initialGrid: Array(9).fill(0).map(() => Array(9).fill(0)),
        canUndo: false,
        canRedo: false,
        isComplete: false,
        invalidCells: [],
        explanation: null, 
        showExplanation: false,
        showExplore: false,
        hintLevelInfo: { name: '等待指令', desc: '请选择一种提示方式' },
        isExploring: false
    });

    let gameInstance = null;
    let session = null; 

    /**
     * 同步领域层状态到 UI 层
     */
    const sync = (extra = {}) => {
        if (!gameInstance) return;
        const sudoku = gameInstance.getSudoku();
        const currentGrid = sudoku.getGrid();
        
        // 1. 冲突扫描
        const invalidCells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = currentGrid[r][c];
                if (val !== 0 && val !== null) {
                    if (!isValidPlacement(currentGrid, r, c, val)) {
                        invalidCells.push(`${c},${r}`);
                    }
                }
            }
        }
        const hasRuleConflict = invalidCells.length > 0;
        // 2. 探索模式同步
        if (session) {
            // 2. 【核心改进】先检查：这个状态是不是已经存在于“黑名单”里了？
            // 这代表用户是通过其他路径，或者撤销后再尝试，回到了一个已知失败的局面
            const isRevisited = session.checkFailed(gameInstance);

            // 3. 然后记录：如果当前有冲突，把它存入黑名单
            if (hasRuleConflict) {
                session.recordFailure(gameInstance);
            }

            const currentBranch = session.branches.get(session.currentBranchId);
            exploreBranches.set(session.getBranchList());
            
            exploreStatus.set({
                active: true,
                currentBranchId: session.currentBranchId,
                hasConflict: hasRuleConflict, // 表达“当前这一步填错了”
                isRevisited: isRevisited,     // 表达“你回到了一个曾经失败过的老路”
                canExploreUndo: gameInstance.canUndo(currentBranch.branchStartIndex),
                canExploreRedo: gameInstance.canRedo()
            });
        } else {
            exploreStatus.set({ active: false });
            exploreBranches.set([]);
        }

        // 3. 投影到主状态
        state.update(s => ({
            ...s,
            grid: currentGrid,
            initialGrid: gameInstance.getInitialGrid(),
            canUndo: session ? false : gameInstance.canUndo(),
            canRedo: session ? false : gameInstance.canRedo(),
            isComplete: sudoku.isComplete(),
            invalidCells,
            isExploring: !!session,
            ...extra
        }));

        candidates.set(sudoku.getNotes());
        legacyGridStore.set(gameInstance.getInitialGrid());
    };

    const resetSession = () => {
        if (timer && timer.reset) timer.reset();
        if (cursor && cursor.set) cursor.reset({ x: 0, y: 0 });
        if (candidates.set) candidates.set({});
        if (hints) hints.reset(50); 
    };

    return {
        subscribe: state.subscribe,
        exploreStatus,
        exploreBranches,

        // ========== 游戏生命周期 ==========
        startNew(difficultyValue) {
            resetSession();
            const puzzle = generateSudoku(difficultyValue);
            gameInstance = createGame({ sudoku: new Sudoku(puzzle), solveSudoku });
            legacyDifficultyStore.set(difficultyValue);
            gamePaused.set(false);
            sync();
        },

        startCustom(sencode) {
            resetSession();
            const puzzle = decodeSencode(sencode);
            gameInstance = createGame({ sudoku: new Sudoku(puzzle), solveSudoku });
            legacyDifficultyStore.set('custom'); 
            gamePaused.set(false);
            sync();
        },

        // ========== 提示系统 (L1/L2/L3 保持高度一致性) ==========
        
        // L1: 观察级提示 - 仅指出位置
        requestPositionHint() {
            if (!gameInstance) return;
            const nextMoves = gameInstance.getHintNextMoves();
            if (nextMoves.length > 0) {
                const move = nextMoves[0];
                if (cursor && cursor.set) cursor.set(move.col, move.row);
                
                sync({
                    showExplanation: true,
                    hintLevelInfo: HINT_LEVELS.L1,
                    explanation: { 
                        row: move.row + 1, 
                        col: move.col + 1, 
                        text: generateReasonText(move.row, move.col, 'L1') 
                    }
                });
            }
        },

        // L2: 候选级提示 - 填写笔记并解释
        applyCandidateHint(row, col) {
            if (!gameInstance) return;
            const hintSet = gameInstance.getHintCandidates(row, col);
            if (hintSet && hintSet.size > 0) {
                const cList = Array.from(hintSet);
                gameInstance.guess({ row, col, value: cList, type: 'note-set' }, false);
                
                // 探索模式写穿透
                if (session) session.updateCurrentSnapshot(gameInstance);
                
                sync({
                    showExplanation: true,
                    hintLevelInfo: HINT_LEVELS.L2,
                    explanation: { 
                        row: row + 1, 
                        col: col + 1, 
                        text: generateReasonText(row, col, 'L2', cList) 
                    }
                });
            }
        },

        // L3: 决策级提示 - 直接填入正确数字
        applyAnswerHint(row, col) {
            if (!gameInstance) return false;
            const success = gameInstance.applyAnswerHint(row, col);
            if (success) {
                if (hints && hints.useHint) hints.useHint();
                if (candidates && candidates.clear) candidates.clear({ x: col, y: row });
                
                // 探索模式写穿透
                if (session) session.updateCurrentSnapshot(gameInstance);
                
                sync({
                    showExplanation: true,
                    hintLevelInfo: HINT_LEVELS.L3,
                    explanation: { 
                        row: row + 1, 
                        col: col + 1, 
                        text: generateReasonText(row, col, 'L3') 
                    }
                });
                return true;
            } else {
                // 【新增反馈】如果求解失败（通常发生在非唯一解或无效题面上）
                sync({
                    showExplanation: true,
                    hintLevelInfo: HINT_LEVELS.L3,
                    explanation: { 
                        row: row + 1, 
                        col: col + 1, 
                        text: "【决策失败】抱歉，我无法为该格子提供确定的答案。这可能是因为题面本身存在逻辑缺陷，或者正在尝试修改原始题面。" 
                    }
                });
                return false;
            }
            return false;
        },

        // ========== 基础操作 ==========
        guess(row, col, value) {
            if (!gameInstance) return;
            try {
                gameInstance.guess({ row, col, value }, false);
                if (candidates && candidates.clear) candidates.clear({ x: col, y: row });
                if (session) session.updateCurrentSnapshot(gameInstance);
                sync();
            } catch (e) { console.warn(e.message); }
        },

        toggleNote(row, col, value) {
            if (!gameInstance) return;
            gameInstance.guess({ row, col, value, type: 'note-toggle' }, false);
            if (session) session.updateCurrentSnapshot(gameInstance);
            sync();
        },

        clearNote(row, col) {
            if (!gameInstance) return;
            gameInstance.guess({ row, col, type: 'note-clear' }, false);
            if (session) session.updateCurrentSnapshot(gameInstance);
            sync();
        },

        undo() { if (gameInstance) { gameInstance.undo(); sync(); } },
        redo() { if (gameInstance) { gameInstance.redo(); sync(); } },
        pause() { gamePaused.set(true); if (timer) timer.stop(); },
        resume() { gamePaused.set(false); if (timer) timer.start(); },

        // ========== 探索管理 ==========
        startExplore() {
            if (!gameInstance) return;
            session = new ExploreSession(gameInstance);
            sync({ showExplore: true });
        },

        createExploreBranch(label) {
            if (!session) return;
            session.updateCurrentSnapshot(gameInstance);
            const id = session.createBranch(label, gameInstance);
            sync();
            return id;
        },

        switchExploreBranch(id) {
            if (!session || id === session.currentBranchId) return;
            session.updateCurrentSnapshot(gameInstance);
            const target = session.branches.get(id);
            gameInstance.loadSnapshot(target.snapshot);
            session.currentBranchId = id;
            sync();
        },

        backtrackExplore() {
            if (!session) return;
            gameInstance.loadSnapshot(session.rootSnapshot);
            session.currentBranchId = 0;
            sync();
            console.log("探索回溯：已回到最初的宇宙起点");
        },

        commitExplore() {
            session = null;
            sync({ showExplore: false }); 
        },

        cancelExplore() {
            if (session) {
                gameInstance.loadSnapshot(session.rootSnapshot);
                session = null;
            }
            sync({ showExplore: false });
        },

        exploreUndo() {
            if (!session) return;
            const currentBranch = session.branches.get(session.currentBranchId);
            gameInstance.undo(currentBranch.branchStartIndex);
            sync();
        },

        exploreRedo() { if (gameInstance) { gameInstance.redo(); sync(); } },

        // ========== UI 辅助 ==========
        closeExplanation() {
            state.update(s => ({ ...s, explanation: null, showExplanation: false }));
        },

        toggleExploreUI() {
            state.update(s => ({ ...s, showExplore: !s.showExplore }));
        },

        getNextMovesHintData() { return gameInstance ? gameInstance.getHintNextMoves() : []; },
        getCandidatesHintData(r, c) { return gameInstance ? gameInstance.getHintCandidates(r, c) : null; }
    };
}

export const gameStore = createGameStore();