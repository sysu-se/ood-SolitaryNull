/**
 * @fileoverview 平行宇宙探索功能
 * 支持创建分支、记忆失败路径等
 */

/**
 * 单个探索分支的数据结构
 */
export class ExploreBranch {
  /**
   * 创建一个新分支
   * @param {number} id - 分支唯一ID
   * @param {number | null} parentId - 父分支ID
   * @param {string} label - 分支标签/名称
   * @param {Object} gameSnapshot - Game 的 toJSON 快照
   * @param {number} branchStartIndex - 该分支的撤销底线（Game 的 historyIndex）
   */
  constructor(id, parentId, label, gameSnapshot, branchStartIndex) {
    this.id = id;
    this.parentId = parentId;
    this.label = label || `宇宙 #${id}`;
    this.snapshot = gameSnapshot;
    this.branchStartIndex = branchStartIndex;
  }
}

/**
 * 探索会话：管理所有的平行宇宙和失败记忆
 */
export class ExploreSession {
  /**
   * 创建探索会话
   * @param {Game} rootGame - 进入探索时的游戏实例
   */
  constructor(rootGame) {
    this.rootSnapshot = rootGame.toJSON();
    this.startIndex = rootGame.historyIndex;
    this.branches = new Map();
    this.failedFingerprints = new Set();
    this.nextBranchId = 1;
    this.currentBranchId = 0;

    // 初始化根分支（主线）
    this.branches.set(0, new ExploreBranch(
      0,
      null,
      '主线起点',
      this.rootSnapshot,
      this.startIndex
    ));
  }

  /**
   * 创建分支：从当前所在位置切分出去
   * @param {string} label - 分支标签
   * @param {Game} currentGame - 当前游戏实例
   * @returns {number} 新分支的ID
   */
  createBranch(label, currentGame) {
    const id = this.nextBranchId++;
    const newBranch = new ExploreBranch(
      id,
      this.currentBranchId,
      label || `探索分支 #${id}`,
      currentGame.toJSON(),
      currentGame.historyIndex
    );
    this.branches.set(id, newBranch);
    this.currentBranchId = id; // 创建后自动切换到该分支
    return id;
  }

  /**
   * 保存当前分支的最新状态快照
   * @param {Game} currentGame - 当前游戏实例
   */
  updateCurrentSnapshot(currentGame) {
    const branch = this.branches.get(this.currentBranchId);
    if (branch) {
      branch.snapshot = currentGame.toJSON();
    }
  }

  /**
   * 记录失败路径（冲突发生时调用）
   * @param {Game} game - 游戏实例
   */
  recordFailure(game) {
    const fingerprint = game.getSudoku().getFingerprint();
    this.failedFingerprints.add(fingerprint);
  }

  /**
   * 检查当前棋盘状态是否为已知失败
   * @param {Game} game - 游戏实例
   * @returns {boolean} 是否为失败路径
   */
  checkFailed(game) {
    return this.failedFingerprints.has(game.getSudoku().getFingerprint());
  }

  /**
   * 获取树状结构的分支列表
   * @returns {Array<Object>} 包含深度和当前标记的分支列表
   */
  getBranchList() {
    const list = Array.from(this.branches.values());

    const calculateDepth = (id) => {
      let depth = 0;
      let curr = this.branches.get(id);
      while (curr && curr.parentId !== null) {
        curr = this.branches.get(curr.parentId);
        depth++;
      }
      return depth;
    };

    return list.map(b => ({
      ...b,
      depth: calculateDepth(b.id),
      current: b.id === this.currentBranchId
    }));
  }
}
