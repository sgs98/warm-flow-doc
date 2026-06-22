<script setup lang="ts">
import { Layout } from "vuepress-theme-hope/client";
import {usePageData, usePageFrontmatter} from "vuepress/client";
import {ref, watch} from "vue";
import Between from "../components/Between.vue";

import type { ThemeBasePageFrontmatter } from "vuepress-theme-hope";
import DynamicEditLink from "../components/DynamicEditLink.vue";

const frontmatter = usePageFrontmatter<ThemeBasePageFrontmatter>();

const page = usePageData();

const sidebarTopArrayLift = [
  `<a href="https://www.maxkey.top" target="_blank">
    <img className="no-zoom" height="60px" width="200px" src="/ggw/MaxKey.png" class="9999">
  </a>`,
  `<a href="https://ccflow.org/index.html?frm=warmflow" target="_blank">
    <img className="no-zoom" height="60px" width="200px" src="/ggw/ccflow.png" class="2028-03-03">
  </a>`,
  `<a href="https://el.frsimple.com" target="_blank">
    <img className="no-zoom" height="60px" width="200px" src="/ggw/frsimple.png" class="2027-03-03">
  </a>`,
  `<a href="https://easysearch.cn" target="_blank">
    <img className="no-zoom" height="60px" width="200px" src="/ggw/easysearch.webp" class="2027-03-15">
  </a>`,
];

const sidebarContentLift = ref("");
const tocContentRight = ref("");

function renderSponsorAds(containerClass: string) {
  return `\
      <div class="${containerClass}">
          <div class="warm-flow-ads-title">
            <span>广告采用随机轮播方式显示</span>
            <span class="warm-flow-ads-sponsor">❤️<a href="/master/other/paidservice.html#赞助商广告">成为赞助商</a></span>
          </div>
          <div class="warm-flow-ads-list">
            ${sidebarTopArrayLift.slice(0, sidebarTopArrayLift.length).join("\n  ")}
          </div>
      </div>
    `;
}

function shuffle(arr) {
  var l = arr.length;
  var index, temp;
  while (l > 0) {
    index = Math.floor(Math.random() * l);
    temp = arr[l - 1];
    arr[l - 1] = arr[index];
    arr[index] = temp;
    l--;
  }
  return arr;
}

watch(
    () => page.value.path,
    () => {
      if (page.value.path.startsWith("/en/")) {
        sidebarContentLift.value = "";
        tocContentRight.value = "";
        return;
      }
      shuffle(sidebarTopArrayLift);

      sidebarContentLift.value = renderSponsorAds("warm-flow-sidebar-ads");
      tocContentRight.value = renderSponsorAds("warm-flow-right-ads");
    },
    { immediate: true },
);
</script>

<template>
  <Layout>
    <template v-if="!frontmatter.home" #sidebarTop>
      <div v-html="sidebarContentLift" />
    </template>
<!--    <template v-if="!frontmatter.home" #tocBefore>-->
<!--      <div v-html="tocContentRight" />-->
<!--    </template>-->
    <template v-if="!frontmatter.home" #tocAfter>
      <div class="wwads-cn wwads-horizontal fixed-banner" data-id="349"></div>
    </template>
    <template v-if="!frontmatter.home" #contentBefore>
      <Between/>
    </template>
    <template v-if="!frontmatter.home" #contentAfter>
      <DynamicEditLink/>
    </template>
  </Layout>
</template>

<style lang="scss">
.warm-flow-ads-title {
  margin: 12px 0 6px;
  color: gray;
  font-size: smaller;
  line-height: 1.4;
}

.warm-flow-ads-sponsor {
  float: right;
  color: #E01E5A;
  font-weight: bolder;
}

.warm-flow-ads-list {
  width: 230px;
  margin: 5px auto;
}

.warm-flow-right-ads {
  margin-bottom: 1rem;
}

.warm-flow-right-ads .warm-flow-ads-title {
  margin-top: 0;
}

.warm-flow-right-ads .warm-flow-ads-list {
  margin-inline: 0;
}

.vp-toc-wrapper {
  height: auto;
  max-height: 50vh;
}

@media (max-width: 1439px) {
  .warm-flow-right-ads {
    display: none;
  }
}
</style>
