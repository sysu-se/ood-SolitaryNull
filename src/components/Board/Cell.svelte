<script>
	import Candidates from './Candidates.svelte';
	import { fade } from 'svelte/transition';
	import { SUDOKU_SIZE } from '@sudoku/constants';
	import { cursor } from '@sudoku/stores/cursor';

	export let value;
	export let cellX;
	export let cellY;
	export let candidates;

	export let disabled;
	export let conflictingNumber;
	export let userNumber;
	export let selected;
	export let sameArea;
	export let sameNumber;

	const borderRight = (cellX !== SUDOKU_SIZE && cellX % 3 !== 0);
	const borderRightBold = (cellX !== SUDOKU_SIZE && cellX % 3 === 0);
	const borderBottom = (cellY !== SUDOKU_SIZE && cellY % 3 !== 0);
	const borderBottomBold = (cellY !== SUDOKU_SIZE && cellY % 3 === 0);
</script>

<div class="cell row-start-{cellY} col-start-{cellX}"
     class:border-r={borderRight}
     class:border-r-4={borderRightBold}
     class:border-b={borderBottom}
     class:border-b-4={borderBottomBold}>

	{#if !disabled}
		<div class="cell-inner"
		     class:user-number={userNumber}
		     class:selected={selected}
		     class:same-area={sameArea}
		     class:same-number={sameNumber}
		     class:conflicting-number={conflictingNumber}>

			<!-- 修复：on:click 必须是一个匿名函数，否则会在渲染时立即执行 -->
			<button class="cell-btn" on:click={() => cursor.set(cellX - 1, cellY - 1)}>
				{#if value === 0 && candidates && candidates.length > 0}
					<Candidates {candidates} />
				{:else}
					<span class="cell-text">{value || ''}</span>
				{/if}
			</button>
		</div>
	{/if}
</div>


<style>
	.cell {
		@apply h-full w-full row-end-auto col-end-auto;
	}

	.cell-inner {
		@apply relative h-full w-full text-gray-800;
	}

	.cell-btn {
		@apply absolute inset-0 h-full w-full;
	}

	.cell-btn:focus {
		@apply outline-none;
	}

	.cell-text {
		@apply leading-full text-base;
	}

	@media (min-width: 300px) {
		.cell-text {
			@apply text-lg;
		}
	}

	@media (min-width: 350px) {
		.cell-text {
			@apply text-xl;
		}
	}

	@media (min-width: 400px) {
		.cell-text {
			@apply text-2xl;
		}
	}

	@media (min-width: 500px) {
		.cell-text {
			@apply text-3xl;
		}
	}

	@media (min-width: 600px) {
		.cell-text {
			@apply text-4xl;
		}
	}

	.user-number {
		@apply text-primary;
	}

	.same-area {
		@apply bg-primary-lighter;
	}

	/* 2. 定义相同数字高亮（优先级中） */
	.same-number {
		@apply bg-primary-light;
	}

	.selected {
		/* 
		   - 不再使用 text-white，保留原本的文字颜色
		   - 使用 bg-opacity 减淡背景，确保底色不吃掉笔记
		   - 使用 ring 产生一个显眼的内边框 
		*/
		@apply bg-primary bg-opacity-35 ring-2 ring-inset ring-primary !important;
		z-index: 20; /* 确保选中框的边框不会被相邻格子遮挡 */
		position: relative;
	}

	/* 4. 定义冲突状态（红色） */
	.conflicting-number {
		@apply text-red-600 !important;
	}

	/* 如果选中且冲突，通常依然显示选中色，但可以加个红色边框 */
	.selected.conflicting-number {
		@apply ring-2 ring-red-500 ring-inset !important;
	}
</style>