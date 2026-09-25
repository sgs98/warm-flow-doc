<template>
  <footer class="wf-foot">
    <div class="wf-inner wf-foot-inner">
      <div class="wf-cols">
        <div>
          <span>文档</span>
          <a :href="`${base}master/primary/started.html`">快速开始</a>
          <a :href="`${base}master/primary/table.html`">表结构</a>
          <a :href="`${base}master/primary/api.html`">API 一览</a>
        </div>
        <div>
          <span>社区</span>
          <a href="https://gitee.com/sgs98/warm-flow" target="_blank" rel="noreferrer">Gitee 仓库</a>
          <a href="https://gitee.com/sgs98/warm-flow/issues" target="_blank" rel="noreferrer">Issues</a>
          <a :href="`${base}master/introduction/projectexample.html`">集成案例</a>
        </div>
        <div>
          <span>关于</span>
          <a :href="`${base}master/other/team.html`">团队</a>
          <a :href="`${base}master/introduction/license.html`">License · MIT</a>
          <a :href="`${base}master/other/upgrade_guide.html`">升级指南</a>
        </div>
      </div>
      <p class="wf-cr">
        Dromara Warm-Flow · 国产自研工作流引擎<br />MIT License · Copyright © 2024-2026
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const base = import.meta.env.BASE_URL;
</script>
