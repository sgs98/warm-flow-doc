<template>
  <section class="wf-sec soft">
    <div class="wf-inner">
      <div class="wf-sh"><span class="no">02 /</span><h2>你要去哪</h2></div>
      <div class="wf-qn-grid">
        <a v-for="q in quickNavs" :key="q.title" class="wf-qn" :href="`${base}${q.link}`">
          <span class="t">{{ q.tag }}</span>
          <h3>{{ q.title }}</h3>
          <p>{{ q.details }}</p>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const base = import.meta.env.BASE_URL;
const quickNavs = [
  { tag: "START", title: "5 分钟集成", details: "初级篇 · 快速入门，从依赖到发起第一个流程实例。", link: "master/primary/started.html" },
  { tag: "DESIGN", title: "流程设计器", details: "经典 / 仿钉钉双模式，节点属性扩展与流程图查看。", link: "master/primary/designerIntroduced.html" },
  { tag: "REFERENCE", title: "API 速查", details: "定义、执行、查询三类服务接口与常用参数。", link: "master/primary/api.html" },
  { tag: "MIGRATE", title: "2.0 升级指南", details: "破坏性变更、注意事项与迁移步骤。", link: "master/other/upgrade_guide.html" },
];
</script>
