<template>
  <a :href="dynamicHref" target="_blank" rel="noreferrer" class="warm-edit">
    <img src="/icons/gitee_home.svg" alt="" aria-hidden="true" />
    <span>编辑此页</span>
  </a>
</template>

<script setup>
import { computed } from 'vue';

// 获取当前页面路径并替换 .html => .md
const currentPageUrl = computed(() => {
  if (typeof window === 'undefined') return '';
  const url = window.location.href;
  const baseUrl = url.split('#')[0]; // 去掉锚点
  const path = new URL(baseUrl, location.origin).pathname; // 获取路径部分
  return path.replace(/\.html$/, '.md'); // 替换 .html => .md
});

// 构建最终链接
const dynamicHref = computed(() => {
  const baseHref = 'https://gitee.com/warm_4/warm-flow-doc/edit/main/src';
  if (!currentPageUrl.value) return baseHref;
  return baseHref + currentPageUrl.value;
});
</script>

<style scoped>
.warm-edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  padding: 6px 12px;
  border: 1px solid var(--wv-line);
  border-radius: 8px;
  color: var(--wv-brand);
  font-size: 13.5px;
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.warm-edit:hover {
  border-color: var(--wv-brand);
  background: var(--wv-bg-hero);
}

.warm-edit img {
  width: 16px;
  height: 16px;
}
</style>
