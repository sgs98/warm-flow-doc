import { hopeTheme } from "vuepress-theme-hope";
import navbar from "./navbar.js";
import sidebar from "./sidebar.js";
import { base } from "./base.js";

export default hopeTheme(
    {
        hostname: "https://sgs98.github.io/warm-flow-doc",
        author: {
            name: "Warm-Flow",
            url: "https://github.com/sgs98/warm-flow-doc",
        },
        logo: "/logo.svg",
        logoDark: "/logo-dark.svg",
        docsDir: "src",
        print: false,
        pageInfo: false,
        // 面包屑只能显示 Master / Primary 这类英文目录名（页面 H1 + 侧栏 + TOC 已覆盖导航），
        // 显示出来反而拉低观感，直接关闭
        breadcrumb: false,
        locales: {
            "/": {
                navbar,
                sidebar,
                displayFooter: false,
                metaLocales: {
                    editLink: "前往 GitHub 编辑此页",
                    prev: "上一篇",
                    next: "下一篇",
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
