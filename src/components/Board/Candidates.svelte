<script>
	import { CANDIDATE_COORDS } from '@sudoku/constants';

	export let candidates = [];
</script>

<div class="candidate-grid">
	<!-- 
		数独笔记固定是 1-9 的顺序。
		直接遍历 1-9，根据 candidates 数组判断是否显示。
	-->
	{#each Array(9) as _, i}
		<div class="candidate"
		     class:invisible={!candidates.includes(i + 1)}>
			{i + 1}
		</div>
	{/each}
</div>

<style>
	.candidate-grid {
		/* 显式定义 3x3 网格，解决 9x1 堆叠问题 */
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		
		@apply h-full w-full p-0.5 text-primary;
		line-height: 1; /* 解决超界问题 */
	}

	.candidate {
		/* 居中对齐 */
		display: flex;
		align-items: center;
		justify-content: center;
		
		/* 响应式字体大小，确保在 Cell 内部不溢出 */
		font-size: 0.5rem; 
		@apply leading-none;
	}

	@media (min-width: 400px) {
		.candidate {
			font-size: 0.65rem;
		}
	}

	@media (min-width: 600px) {
		.candidate {
			font-size: 0.8rem;
		}
	}

	.invisible {
		visibility: hidden;
	}
</style>