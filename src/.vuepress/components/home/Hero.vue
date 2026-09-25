<template>
  <header class="wf-hero">
    <p class="wf-eyebrow">Dromara · 国产自研工作流引擎 · v2.0.0</p>

    <h1 class="wf-h1">
      <em>7 张表</em>，一个依赖，<br />跑通整条审批流
    </h1>

    <p class="wf-sub">
      简洁轻量、五脏俱全、灵活可扩展。<br />
      原生支持经典与仿钉钉双模式设计器，退回 / 撤销 / 任意跳转 / 转办 / 委派 / 加减签开箱即用。
    </p>

    <p class="wf-cta">
      <a class="wf-btn primary" :href="`${base}master/primary/started.html`">快速开始 →</a>
      <a class="wf-btn ghost" href="https://gitee.com/sgs98/warm-flow" target="_blank" rel="noreferrer">
        <span class="star">★</span> Star on Gitee
      </a>
    </p>

    <p class="wf-badges">
      <img src="https://gitee.com/sgs98/warm-flow/badge/star.svg?theme=dark" alt="Gitee stars" />
      <img src="https://gitee.com/sgs98/warm-flow/badge/fork.svg?theme=dark" alt="Gitee forks" />
      <img src="https://img.shields.io/github/license/sgs98/warm-flow" alt="License" />
    </p>
  </header>
</template>

<script setup lang="ts">
const base = import.meta.env.BASE_URL;
</script>
