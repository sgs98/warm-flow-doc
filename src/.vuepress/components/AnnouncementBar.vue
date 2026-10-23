<template>
  <div v-if="visible" class="wf-announce">
    <span class="pill">v2.1.0</span>
    <strong>Warm-Flow 2.1.0 升级说明</strong>
    <span class="txt">状态编码与扩展点存在破坏性变更，升级前请阅读升级指南</span>
    <a :href="`${base}master/other/upgrade_guide.html`">升级指南 →</a>
    <a href="https://gitee.com/sgs98/warm-flow/stargazers" target="_blank" rel="noreferrer">★ Star</a>
    <button class="x" type="button" aria-label="关闭公告" @click="dismiss">✕</button>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vuepress/client";
import { computed, onMounted, ref } from "vue";

const VERSION = "2.1.0";
const KEY = "wf-announce-dismissed";
const base = import.meta.env.BASE_URL;
const route = useRoute();
// 默认 true：SSR 阶段不渲染，避免水合不一致，onMounted 后再决定
const dismissed = ref(true);

// route.path 含部署 base，先剥掉再判断，否则子路径部署时公告永不出现
const visible = computed(() => {
  const relative = route.path.slice(base.length - 1);
  return relative.startsWith("/master") && !dismissed.value;
});

onMounted(() => {
  dismissed.value = localStorage.getItem(KEY) === VERSION;
});

const dismiss = () => {
  localStorage.setItem(KEY, VERSION);
  dismissed.value = true;
};
</script>
