<script>
	import { createEventDispatcher } from 'svelte';

	export let id = 'switch-' + Math.random().toString(36).substr(2, 9); // 提供默认唯一ID
	export let text = '';
	export let checked = false;
	export let disabled = false;

	const dispatch = createEventDispatcher();

	// 监听 input 的原生 change 事件并派发自定义事件
	function handleChange(event) {
		const isChecked = event.target.checked;
		// 派发事件，这样父组件就能通过 e.detail 拿到值
		dispatch('change', isChecked);
	}
</script>

<label for="{id}" class="inline-flex items-center cursor-pointer">
	{#if text}
		<span class="flex-grow mr-3 text-lg">{text}</span>
	{/if}

	<span class="switch-container">
		<!-- 绑定 checked，同时监听原生 change 事件 -->
		<input 
			{id} 
			name="{id}" 
			type="checkbox" 
			class="sr-only" 
			{disabled} 
			bind:checked 
			on:change={handleChange} 
		/>
		<span class="track"></span>
		<span class="thumb"></span>
	</span>
</label>

<style>
	.switch-container {
		/* 确保宽度是固定的，方便计算位移 */
		@apply inline-block relative align-middle select-none bg-transparent w-12 h-6;
	}

	.track {
		@apply block w-full h-full bg-gray-400 rounded-full shadow-inner transition-colors duration-300;
	}

	.thumb {
		/* 核心修改：明确指定 transition 作用于 transform */
		@apply block absolute top-0 left-0 w-6 h-6 bg-white border-2 border-gray-400 rounded-full;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s;
		will-change: transform; /* 告诉浏览器这个元素会发生位移，优化动画 */
		transform: translateX(0); /* 初始位置 */
	}

	/* 当 Checkbox 选中时 */
	input[type='checkbox']:checked ~ .thumb {
		/* 使用百分比位移，或者具体数值 */
		transform: translateX(100%); /* 移动 100% 也就是 24px */
		@apply border-primary;
	}

	input[type='checkbox']:checked ~ .track {
		@apply bg-primary;
	}

	/* 禁用状态 */
	input[type='checkbox']:disabled ~ .track {
		@apply bg-gray-200;
	}
    
    /* 增加一个简单的悬停效果 */
    .switch-container:hover .thumb {
        @apply shadow-md;
    }
</style>