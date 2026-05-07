<script>
  import Switch from '../Utils/Switch.svelte';
  export let gameStore;
  import { fly } from 'svelte/transition';
  // 这里的订阅逻辑与你提供的 UI 一致
  $: exploreStatus = gameStore.exploreStatus;
  $: branches = gameStore.exploreBranches;
  $: gameState = $gameStore; 
  $: isGameActive = gameState.initialGrid && gameState.initialGrid.some(row => row.some(cell => cell !== 0));
  let branchLabel = '';

  function handleCreate() {
    gameStore.createExploreBranch(branchLabel);
    branchLabel = '';
  }
</script>
{#if gameState.showExplore}
  <aside class="explore-sidebar" transition:fly={{ x: -340, duration: 400 }}>
  <div class="sidebar-header">
      <h2>探索模式</h2>
      
      <Switch 
        id="explore-mode"
        checked={$exploreStatus.active}
        disabled={!isGameActive} 
        on:change={(e) => e.detail ? gameStore.startExplore() : gameStore.cancelExplore()}
      />
      <button class="close-btn" on:click={gameStore.toggleExploreUI}>✕</button>
  </div>
  {#if $exploreStatus.active}
    <!-- 状态卡片 -->
    <div class="status-card" class:status-conflict={$exploreStatus.hasConflict || $exploreStatus.isRevisited}>
        {#if $exploreStatus.isRevisited}
            ⚠️ 已重访失败路径！
        {:else if $exploreStatus.hasConflict}
            ❌ 发现逻辑冲突！
        {:else}
            ✨ 正在探索分支 #{$exploreStatus.currentBranchId}
        {/if}
    </div>

    <!-- 分支列表渲染 (保持你提供的树形 class 逻辑) -->
    <div class="branch-list">
      {#each $branches as branch}
        <button 
          class="branch-row branch-depth-{branch.depth}" 
          class:branch-current={branch.current}
          on:click={() => gameStore.switchExploreBranch(branch.id)}
        >
          {branch.label}
        </button>
      {/each}
    </div>

    <!-- 底部操作 -->
    <div class="finish-actions">
        <button class="finish-button" on:click={() => gameStore.commitExplore()}>提交</button>
        <button class="finish-button danger" on:click={() => gameStore.cancelExplore()}>放弃</button>
    </div>
  {/if}
</aside>
{/if}


<style>
  .explore-sidebar {
    position: fixed;
    left: 12px;
    top: 80px;
    width: 340px;
    max-height: 72vh;
    overflow: auto;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid #d8dde6;
    padding: 14px;
    border-radius: 8px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
    z-index: 55;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #111827;
  }

  .status-card {
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #1e3a8a;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 10px;
  }

  .status-conflict {
    border-color: #fecaca;
    background: #fff1f2;
    color: #991b1b;
  }

  .status-title {
    font-size: 13px;
    font-weight: 700;
  }

  .status-text,
  .empty-state {
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.45;
    color: #475569;
  }

  .toolbar,
  .branch-create,
  .finish-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .branch-create {
    align-items: center;
  }

  .branch-input {
    min-width: 0;
    flex: 1;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 7px 9px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
  }

  .mini-button,
  .finish-button {
    border: 1px solid #cbd5e1;
    background: #fff;
    color: #0f172a;
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }

  .mini-button:disabled,
  .finish-button:disabled,
  .branch-row:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .primary {
    border-color: #2563eb;
    background: #2563eb;
    color: #fff;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 6px 0;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
  }

  .branch-list {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-bottom: 12px;
  }

  .branch-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 9px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    padding: 9px;
    text-align: left;
    color: #0f172a;
  }

  .branch-depth-1 {
    margin-left: 16px;
    width: calc(100% - 16px);
  }

  .branch-depth-2 {
    margin-left: 32px;
    width: calc(100% - 32px);
  }

  .branch-depth-3 {
    margin-left: 48px;
    width: calc(100% - 48px);
  }

  .branch-connector {
    width: 12px;
    height: 1px;
    background: #94a3b8;
    flex: 0 0 auto;
  }

  .branch-current {
    border-color: #2563eb;
    background: #eff6ff;
  }

  .branch-marker {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: #94a3b8;
    flex: 0 0 auto;
  }

  .branch-current .branch-marker {
    background: #2563eb;
  }

  .branch-main {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .branch-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 700;
  }

  .branch-meta {
    font-size: 11px;
    color: #64748b;
  }

  .current-pill {
    border-radius: 999px;
    padding: 3px 7px;
    background: #2563eb;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }

  .finish-actions {
    margin-bottom: 0;
  }

  .finish-button {
    flex: 1;
  }

  .danger {
    border-color: #fecaca;
    color: #991b1b;
  }

  .empty-state {
    margin-top: 0;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    padding: 10px;
    background: #f8fafc;
  }

  @media (max-width: 1100px) {
    .explore-sidebar {
      position: static;
      width: auto;
      max-height: none;
      margin: 10px 12px;
    }
  }
  .pop-up-left {
    position: fixed;
    left: 20px;
    top: 100px;
    z-index: 90;
    box-shadow: 10px 10px 30px rgba(0,0,0,0.2);
  }
</style>