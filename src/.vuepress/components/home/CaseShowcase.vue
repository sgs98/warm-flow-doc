<template>
  <section class="wf-sec">
    <div class="wf-inner">
      <div class="wf-sh"><span class="no">03 /</span><h2>谁在生产环境用它</h2></div>
      <div class="wf-case-grid">
        <a v-for="c in shown" :key="c.title" class="wf-case" :href="c.href" target="_blank" rel="noreferrer">
          <span class="thumb"><img :src="c.src" :alt="c.title" loading="lazy" /></span>
          <span class="bd">
            <strong>{{ c.title }}</strong>
            <span class="by">{{ c.author }}</span>
            <span class="intro">{{ c.intro }}</span>
          </span>
        </a>
      </div>
      <p class="wf-oneline">
        已有 <b>30</b> 家企业与个人公开使用 Warm-Flow，另有 <b>66</b> 个 Dromara 成员项目同源共建
        <a :href="`${base}master/introduction/projectexample.html`">查看集成案例 →</a>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { cases } from "../../data/home.js";

const base = import.meta.env.BASE_URL;
// 精选 3 条：跳过无外链的条目（hh-vue 是官方案例，Ruoyi-Cloud 那条 href 为空）
const shown = cases.filter((c) => c.href).slice(0, 3);
</script>
