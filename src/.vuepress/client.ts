// @ts-ignore
import { defineClientConfig } from "vuepress/client";
import Layout from "./layouts/Layout.vue";

import DynamicEditLink from "./components/DynamicEditLink.vue"

export default defineClientConfig({
  // 你可以在这里添加或覆盖布局
  layouts: {
    // 例如，在这里我们将 vuepress-theme-hope 的默认布局更改为 layouts/Layout.vue
    Layout,
  },
  enhance({ app, router, siteData }) {
    app.component("DynamicEditLink", DynamicEditLink);
    router.beforeEach((to, from, next) => {
      //触发百度的pv统计
      // @ts-ignore
      if (typeof _hmt != "undefined") {
        if (to.path) {
          // @ts-ignore
          _hmt.push(["_trackPageview", to.fullPath]);
        }
      }

      // continue
      next();
    });
  },
});
