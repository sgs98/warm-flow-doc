<script setup lang="ts">
</script>
<template>
  <div class="between-wrapper">
    <div class="between-header">
      <div class="wwads-cn wwads-horizontal fixed-banner" data-id="349"></div>
    </div>
    <div style="position: relative; display: flex;">
      <div class="between-left"  style="display: flex; align-items: center; justify-content: flex-end;">
        <a class="removeAfter" href="https://gitee.com/dromara/warm-flow">
          <img src="/ggw/bewteent1.png" alt="warm-flow Logo">
        </a>
      </div>
      <div class="between-right" style="display: flex; align-items: center; justify-content: flex-end;">
        <a class="removeAfter" href="https://shaiwz.com/home">
          <img src="/ggw/bewteent2.png" alt="2027-06-20">
        </a>
      </div>
    </div>
  </div>
</template>
<style lang="scss">
/* 固定显示在顶部的容器 */
.between-wrapper {
  position: sticky;
  max-height: 185px;
  overflow-y: auto;
  scrollbar-width: thin;
  top: 0;
  z-index: 100;
  background: var(--bg-color, #fff);
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color, #e2e2e2);
  margin-bottom: 10px;
}

/* 定义样式 */
.between-header {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.between-header img {
  height: 40px;
  border-radius: 4px;
}

.between-left img, .between-right img {
  height: 40px;
  margin-right: 5px;
  border-radius: 4px;
}

.between-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.wwads-horizontal {
  max-width: 793px;
  padding: 0 !important;
  min-height: 0 !important;
  align-items: center;
  .wwads-content {
    .wwads-text {
      min-height: 50px;
      display: block;
      padding: 5px;
    }
  }
  .wwads-logo {
    width: 0 !important;
  }
  .wwads-img {
    margin: 0px !important;
    height: 70px;
    img {
      width: 90px !important;
    }
  }
  .wwads-poweredby {
    width: 40px;
    position: absolute;
    right: 25px;
    bottom: 3px;
  }
  .wwads-logo-text {
      font-size: 12px !important;
  }
}

.removeAfter::after {
  content: none !important;
}

.warm-edit {
  display: inline-flex;
  align-items: center;
  color: #1E90FF;
  text-decoration: none;
  padding: 5px 10px;
  margin-left: 10px;
  border-radius: 4px;
  transition: background-color 0.3s, color 0.3s;
  margin-top: 0;
}

.warm-edit:hover {
  color: indianred;
}

.warm-edit img {
  margin-right: 5px;
  width: 16px;
  height: 16px;
}

.removeAfter::after {
  content: none !important;
}
</style>
