<script>
  export let gameStore;
  import { fly } from 'svelte/transition';
$: state = $gameStore; 
</script>
{#if state.showExplanation}
<aside class="ai-sidebar" transition:fly={{ x: 300, duration: 400 }}>
  <div class="sidebar-header">
    <strong>提示解释</strong>
    <button class="close-button" on:click={gameStore.closeExplanation}>✕</button>
  </div>

  <div class="hint-level-box">
    <div class="hint-level-name">{state.hintLevelInfo.name}</div>
    <div class="hint-level-desc">{state.hintLevelInfo.desc}</div>
  </div>

  <div class="explanation-body">
    {#if state.explanation}
      <div class="explanation-position">位置：行 {state.explanation.row}, 列 {state.explanation.col}</div>
      <div class="text-content">{state.explanation.text}</div>
    {:else}
      <div class="empty-text">等待提示...</div>
    {/if}
  </div>
</aside>
{/if}
<style>
  .ai-sidebar {
    position: fixed;
    right: 20px;
    top: 100px;
    width: 280px;
    background: white;
    border: 1px solid #e2e8f0;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    z-index: 50;
    transition: all 0.3s ease;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 8px;
  }

  .hint-level-box {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
  }

  .hint-level-label {
    font-size: 10px;
  }

  .hint-level-name {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
    margin-top: 2px;
  }

  .hint-level-desc {
    font-size: 11px;
    color: #64748b;
  }

  .explanation-body {
    min-height: 100px;
  }

  .explanation-position {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .badge-pos {
    background: #e0e7ff;
    color: #4338ca;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }

  .text-content {
    font-size: 14px;
    line-height: 1.6;
    color: #334155;
    background: #fff;
    padding: 4px;
  }

  .empty-state {
    text-align: center;
    padding: 20px 10px;
    color: #94a3b8;
  }

  .close-button {
    transition: transform 0.2s ease;
  }

  .close-button:hover {
    transform: scale(1.1);
  }
  .pop-up {
    position: fixed;
    right: 20px;
    top: 100px;
    z-index: 100;
    /* 增加阴影使其更有弹窗感 */
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  }
  
</style>