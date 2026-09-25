<script setup lang="ts">
import { usePageFrontmatter } from "vuepress/client";
import { Layout as HopeLayout } from "vuepress-theme-hope/client";
import type { ThemeBasePageFrontmatter } from "vuepress-theme-hope";

import Home from "../components/home/Home.vue";
import AnnouncementBar from "../components/AnnouncementBar.vue";
import DynamicEditLink from "../components/DynamicEditLink.vue";

const frontmatter = usePageFrontmatter<ThemeBasePageFrontmatter>();
</script>

<template>
  <!-- theme-hope 的 HomePage 槽位只有 heroBefore/heroAfter/content，撑不住自定义首屏，
       所以首页整体换成自有组件树 -->
  <Home v-if="frontmatter.home" />
  <HopeLayout v-else>
    <template #pageTop>
      <AnnouncementBar />
    </template>
    <template #contentAfter>
      <DynamicEditLink />
    </template>
  </HopeLayout>
</template>

<style lang="scss">
.vp-toc-wrapper {
  height: auto;
  max-height: 50vh;
}
</style>
