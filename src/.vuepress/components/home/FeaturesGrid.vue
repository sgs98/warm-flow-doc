<template>
  <section class="wf-sec">
    <div class="wf-inner">
      <div class="wf-sh"><span class="no">01 /</span><h2>为什么是 Warm-Flow</h2></div>
      <div class="wf-feat-grid">
        <a v-for="f in features" :key="f.title" class="wf-feat" :href="`${base}${f.link}`">
          <span class="ic">{{ f.icon }}</span>
          <h3>{{ f.title }}</h3>
          <p>{{ f.details }}</p>
          <span class="more">{{ f.linkText }} →</span>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const base = import.meta.env.BASE_URL;
const features = [
  { icon: "[]", title: "7 张表起步", details: "表结构一目了然，代码量少，可快速上手与集成，不背历史包袱。", link: "master/primary/table.html", linkText: "表结构" },
  { icon: "↦", title: "15+ 审批动作", details: "通过、退回、撤销、拿回、任意跳转、终止、转办、票签、委派、加减签、并行互斥。", link: "master/primary/started.html", linkText: "快速入门" },
  { icon: "◇", title: "双模式设计器", details: "jar 包形式快速集成，原生支持经典与仿钉钉两种模式，节点属性可扩展。", link: "master/primary/designerIntroduced.html", linkText: "设计器介绍" },
  { icon: "${}", title: "表达式体系", details: "内置 ${handler} 办理人表达式与常见 SpEL 条件表达式，可自定义扩展。", link: "master/advanced/variableStategy.html", linkText: "办理人表达式" },
  { icon: "◉", title: "监听器体系", details: "四种监听器、不同颗粒度作用范围，支持参数传递与动态权限。", link: "master/advanced/listener.html", linkText: "监听器" },
  { icon: "▤", title: "多租户与软删除", details: "引擎自身维护多租户与软删除，也可直接沿用对应 ORM 框架的实现方式。", link: "master/advanced/tenant.html", linkText: "进阶篇" },
];
</script>
