import { hopeTheme } from "vuepress-theme-hope";
import navbar from "./navbar.js";
import sidebar from "./sidebar.js";
import { base } from "./base.js";

export default hopeTheme(
    {
        hostname: "https://gitee.com/warm_4/warm-flow-doc",
        author: {
            name: "Dromara Warm-Flow工作流",
            url: "https://gitee.com/warm_4/warm-flow-doc",
        },
        logo: "/logo.svg",
        logoDark: "/logo-dark.svg",
        docsDir: "src",
        print: false,
        pageInfo: false,
        locales: {
            "/": {
                navbar,
                sidebar,
                displayFooter: false,
                metaLocales: {
                    editLink: "前往 Gitee 编辑此页",
                },
            },
        },
        editLink: false,

        markdown: {
            codeTabs: true,
            attrs: true,
            include: true,
            imgLazyload: true,
        },
        plugins: {
            slimsearch: {
              indexContent: true,
            },
            components: {
                // 你想使用的组件
                components: [
                    "BiliBili",
                    "VPCard",
                    "SiteInfo",
                ],
            },
            icon: {
                assets: "https://at.alicdn.com/t/c/font_4043253_v7nldr3uv7.css",
                prefix: "iconfont icon-",
            },
        }
    },
    { custom: true }
);
