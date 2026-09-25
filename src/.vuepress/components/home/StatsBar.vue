<template>
  <dl class="wf-stats">
    <div v-for="s in stats" :key="s.label">
      <dt>{{ s.value }}</dt>
      <dd>{{ s.label }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
const stats = [
  { value: "7", label: "核心表" },
  { value: "2", label: "设计器模式" },
  { value: "15+", label: "审批动作" },
  { value: "4", label: "ORM 框架" },
  { value: "4", label: "数据库" },
];
</script>
