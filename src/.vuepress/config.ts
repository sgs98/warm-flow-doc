import {defineUserConfig} from "vuepress";

import {viteBundler} from '@vuepress/bundler-vite'

import theme from "./theme.js";

import {base} from "./base.js";

export default defineUserConfig({
    base,
    port: 8081,
    locales: {
        "/": {
            lang: "zh-CN",
            title: "Warm-Flow官网",
        },
    },
    theme,
    shouldPrefetch: false,
    bundler: viteBundler({
        viteOptions: {
            css: {
                preprocessorOptions: {
                    scss: {
                        // theme-hope / sass-palette 内部仍在使用废弃的 sass if() 语法，
                        // 这里屏蔽依赖方告警，避免构建日志被弃用警告刷屏
                        quietDeps: true,
                        silenceDeprecations: ["if-function"],
                    },
                },
            },
        },
        vuePluginOptions: {},
    }),
    dest: "./src/.vuepress/warm-flow-docs",
    head: [
        ['script', {}, `       
            var _hmt = _hmt || [];
            (function() {
              var hm = document.createElement("script");
              hm.src = "https://hm.baidu.com/hm.js?6ef49c07f07e726a81e746e27e746dfd";
              var s = document.getElementsByTagName("script")[0]; 
              s.parentNode.insertBefore(hm, s);
            })();
        `],
        ['script', { type: 'text/javascript', charset: 'UTF-8'
            , src: 'https://cdn.wwads.cn/js/makemoney.js', async: '' }, ''
        ],
    ],
});
