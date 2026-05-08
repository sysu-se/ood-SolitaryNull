/**
 * @fileoverview 提示生成引擎
 * 负责L1/L2/L3提示的文本生成和策略
 */

/**
 * 根据提示等级和内容生成解释文本
 * @param {number} row - 行索引（0-8）
 * @param {number} col - 列索引（0-8）
 * @param {string} type - 提示类型：'L1'（观察）、'L2'（候选+推理）、'L3'（决策）
 * @param {number[]} [candidates=[]] - 候选数列表（L2时使用）
 * @returns {string} 生成的解释文本
 */
export function generateReasonText(row, col, type, candidates = []) {
  const r = row + 1;
  const c = col + 1;

  if (type === 'L1') {
    return `【逻辑扫描】在第 ${r} 行第 ${c} 列发现突破口。根据排除法，该位置目前只有一个合法的数字可以填入，建议优先观察此处。`;
  }

  if (type === 'L2') {
    return `【候选分析】已对第 ${r} 行第 ${c} 列进行了深度扫描。排除了同行、同列及同宫的干扰项，剩下的可能性（${candidates.join(', ')}）已为你标记。`;
  }

  if (type === 'L3') {
    return `【决策辅助】经过全局唯一解计算，确定第 ${r} 行第 ${c} 列的最终答案。该步骤已录入历史记录，你可以随时撤销。`;
  }

  return '';
}

/**
 * 提示引擎类，管理不同等级的提示逻辑
 */
export class HintEngine {
  /**
   * 创建提示引擎实例
   * @param {Game} gameInstance - 游戏实例
   * @param {Object} stores - Svelte store 集合 { cursor, candidates, notes, hints }
   */
  constructor(gameInstance, stores) {
    this.gameInstance = gameInstance;
    this.stores = stores;
  }

  /**
   * L1 观察级：显示值得关注的格子
   * @param {Function} onResult - 回调函数 ({ row, col, text, explanation }) => void
   */
  requestL1Hint(onResult) {
    if (!this.gameInstance) return;

    const nextMoves = this.gameInstance.getHintNextMoves();
    if (nextMoves.length > 0) {
      const move = nextMoves[0];
      const { cursor } = this.stores;
      if (cursor) cursor.set(move.col, move.row);

      const text = generateReasonText(move.row, move.col, 'L1');
      onResult({
        row: move.row + 1,
        col: move.col + 1,
        text,
        type: 'L1'
      });
    }
  }

  /**
   * L2 候选+推理级：显示候选并填入笔记
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {Function} onResult - 回调函数 ({ row, col, text, candidates, explanation }) => void
   */
  requestL2Hint(row, col, onResult) {
    if (!this.gameInstance) return;

    const hintSet = this.gameInstance.getHintCandidates(row, col);
    if (hintSet && hintSet.size > 0) {
      const candidateList = Array.from(hintSet);
      
      // 填入笔记
      const { candidates, notes } = this.stores;
      if (notes) notes.set(true);
      if (candidates) candidates.set({ x: col, y: row }, hintSet);

      const text = generateReasonText(row, col, 'L2', candidateList);
      onResult({
        row: row + 1,
        col: col + 1,
        text,
        candidates: candidateList,
        type: 'L2'
      });
    }
  }

  /**
   * L3 决策级：直接给出答案
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {Function} onResult - 回调函数 ({ row, col, text, answer, explanation }) => void
   * @param {Function} onConsume - 消耗提示次数的回调 () => void
   */
  requestL3Hint(row, col, onResult, onConsume) {
    if (!this.gameInstance) return;

    const success = this.gameInstance.applyAnswerHint(row, col);
    if (success) {
      const { hints } = this.stores;
      if (hints && hints.useHint) hints.useHint();

      const text = generateReasonText(row, col, 'L3');
      onResult({
        row: row + 1,
        col: col + 1,
        text,
        type: 'L3'
      });

      if (onConsume) onConsume();
    }
  }
}

/**
 * 提示级别元数据
 */
export const HINT_LEVELS = {
  L1: {
    name: '观察级',
    desc: '只提示值得看的格子',
    label: 'L1 观察级：只提示值得看的格子'
  },
  L2: {
    name: '候选+推理级',
    desc: '显示候选并解释排除依据',
    label: 'L2 候选+推理级：显示候选并解释排除依据'
  },
  L3: {
    name: '决策级',
    desc: '可确定时给出可填数字',
    label: 'L3 决策级：可确定时给出可填数字'
  }
};
