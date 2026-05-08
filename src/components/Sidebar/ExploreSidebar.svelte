<script>
  import Switch from '../Utils/Switch.svelte';
  import { fly } from 'svelte/transition';

  export let gameStore;

  // 正确引用 Store 对象本身
  const statusStore = gameStore.exploreStatus;
  const branchesStore = gameStore.exploreBranches;

  $: gameState = $gameStore; 
  let branchLabel = '';

  function handleCreate() {
    gameStore.createExploreBranch(branchLabel);
    branchLabel = '';
  }
</script>

{#if $gameStore.showExplore}
<aside class="explore-sidebar" transition:fly={{ x: -340, duration: 400 }}>
  <div class="sidebar-header">
    <h2>探索模式</h2>
    <!-- 使用 $ 符号直接订阅 statusStore -->
    <Switch 
      checked={$statusStore.active} 
      on:change={(e) => e.detail ? gameStore.startExplore() : gameStore.cancelExplore()} 
    />
  </div>

  {#if $statusStore.active}
    <div class="status-card" class:status-conflict={$statusStore.hasConflict || $statusStore.isRevisited}>
        <div class="status-title">
          {#if $statusStore.isRevisited} ⚠️ 重访失败路径 {:else if $statusStore.hasConflict} ❌ 发现冲突 {:else} ✨ 正在探索 {/if}
        </div>
    </div>

    <div class="toolbar">
      <button class="mini-button" disabled={!$statusStore.canExploreUndo} on:click={() => gameStore.exploreUndo()}>撤销</button>
      <button class="mini-button" disabled={!$statusStore.canExploreRedo} on:click={() => gameStore.exploreRedo()}>重做</button>
      <button class="mini-button primary" on:click={() => gameStore.backtrackExplore()}>回起点</button>
    </div>

    <div class="branch-create">
      <input class="branch-input" placeholder="新分支名称" bind:value={branchLabel} />
      <button class="mini-button primary" on:click={handleCreate}>新建</button>
    </div>

    <div class="section-title">分支列表 ({$branchesStore.length})</div>
    <div class="branch-list">
  {#each $branchesStore as branch}
    <div class="flex items-center">
      <!-- 视觉缩进：即便 depth 很大也通过 ID 标识父级 -->
      <button 
        class="branch-row branch-depth-{Math.min(branch.depth, 3)}" 
        class:branch-current={branch.current}
        class:border-red-400={branch.isFailed}
        on:click={() => gameStore.switchExploreBranch(branch.id)}
      >
        <div class="branch-main">
          <div class="flex justify-between items-center">
            <span class="branch-name">{branch.label}</span>
            <span class="text-[10px] bg-gray-200 px-1 rounded">ID: #{branch.id}</span>
          </div>
          <span class="branch-meta">
            {#if branch.parentId !== null}
              继承自分支 #{branch.parentId}
            {:else}
              🌱 初始分支
            {/if}
          </span>
        </div>
        {#if branch.current}
          <span class="current-pill">当前</span>
        {/if}
      </button>
    </div>
  {/each}
</div>
<!-- 状态卡片增加记忆反馈 -->
{#if $statusStore.active}
  <div class="status-card" class:status-conflict={$statusStore.hasConflict || $statusStore.isRevisited}>
    <div class="status-title">
      {#if $statusStore.isRevisited}
        🚫 此路径已知失败（记忆命中）
      {:else if $statusStore.hasConflict}
        ❌ 当前发现冲突
      {:else}
        ✨ 正在探索...
      {/if}
    </div>
    <div class="text-[11px] mt-1 opacity-80">
      探索模式下，主界面的撤销已禁用，请使用上方局部控制。
    </div>
  </div>
{/if}

    <div class="finish-actions mt-4">
      <button class="finish-button" on:click={() => gameStore.commitExplore()}>提交探索</button>
      <button class="finish-button danger" on:click={() => gameStore.cancelExplore()}>放弃探索</button>
    </div>
  {:else}
    <div class="empty-state text-sm text-gray-500">
      开启探索模式后，您可以在不同的平行分支之间切换。
    </div>
  {/if}
</aside>
{/if}


<style>
  .branch-depth-1 { margin-left: 15px; width: calc(100% - 15px); }
  .branch-depth-2 { margin-left: 30px; width: calc(100% - 30px); }
  .branch-depth-3 { margin-left: 45px; width: calc(100% - 45px); }

  .branch-connector {
    width: 10px; height: 1px; @apply bg-gray-400 mr-2;
  }
  .toolbar, .branch-create { @apply flex gap-2 mb-4; }
  .branch-input { @apply flex-grow border p-1 rounded text-sm; }
  .mini-button { @apply px-3 py-1 bg-gray-100 rounded text-xs font-bold; }
  .primary { @apply bg-blue-600 text-white; }
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