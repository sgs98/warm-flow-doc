import { hopeTheme } from "vuepress-theme-hope";
import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme(
    {
        hostname: "https://gitee.com/warm_4/warm-flow-doc",
        author: {
            name: "Dromara Warm-Flow工作流",
            url: "https://gitee.com/warm_4/warm-flow-doc",
        },
        logo: "/logo.png",
        docsDir: "src",
        print: false,
        locales: {
            "/": {
                navbar,
                sidebar,
                displayFooter: true,
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
            comment: {
                provider: "Giscus",
                repo: "dromara/warm-flow",
                repoId: "R_kgDOK_2R_w",
                category: "Announcements",
                categoryId: "DIC_kwDOK_2R_84ClNey",
            },
            notice: [
                // {
                //     path: "/",
                //     title: "🙏  请给我支持 🙏 ",
                //     content: "我正在参加 【Gitee 2025 最受欢迎的开源软件】投票活动，快来给我【投票】吧！",
                //     actions: [
                //         {
                //             text: "👉 投票 👈",
                //             link: "https://gitee.com/activity/2025opensource?ident=IWLJ3F",
                //             type: "primary",
                //         },
                //     ],
                //     showOnce: true,
                //     fullscreen: true,
                //     confirm: true
                // },
                {
                    path: "/master",
                    title: "公告: 教学视频5月1号开始恢复原价：480",
                    content:
                        `
                         <table>
                           <tbody>
                             <tr>
                               <td>
                                 <a href="/master/other/videos.html">👍教学视频</a>
                               </td>
                               <td>
                                 <a href="/master/other/videos.html">手把手带着从零集成，打造自己的工作流</a>
                               </td>
                             </tr>
                             <tr>
                               <td>
                                 <a href="/master/other/jionqun.html#_2、vip群-付费加群-提供问题解答、技术支持、技术分享">🍍新增vip群</a>
                               </td>
                               <td>
                                 <a href="/master/other/jionqun.html#_2、vip群-付费加群-提供问题解答、技术支持、技术分享">付费加群，提供问题解答和技术支持等</a>
                               </td>
                             </tr>
<!--                             <tr>-->
<!--                               <td>-->
<!--                                 <a href="/master/other/news/upgrade/Warm-Flow_1.8.5.html">🚀 1.8.5版本</a>-->
<!--                               </td>-->
<!--                               <td>-->
<!--                                 <a href="/master/other/news/upgrade/Warm-Flow_1.8.5.html">Warm-Flow 1.8.5 超时自动审批、暂存功能来了</a>-->
<!--                               </td>-->
<!--                             </tr>-->
                             <tr>
                               <td>
                                 <a href="https://gitee.com/dromara/warm-flow/stargazers" target="_blank">⭐️ Star</a>
                               </td>
                               <td>
                                 <a href="https://gitee.com/dromara/warm-flow/stargazers" target="_blank">一键三连，你的Star是我持续开发的动力</a>
                               </td>
                             </tr>
                             <tr>
                               <td>
                                 <a href="https://gitee.com/dromara/warm-flow/issues" target="_blank">❓ 疑问</a>
                               </td>
                               <td>
                                 <a href="https://gitee.com/dromara/warm-flow/issues" target="_blank">先看常见问题和issue，然后再是提👉 issue 👈</a>
                               </td>
                             </tr>
                             <tr>
                               <td>
                                 <a href="/master/introduction/introduction.html">📖 使用文档</a>
                               </td>
                               <td>
                                 <a href="/master/introduction/introduction.html">集成前先快速浏览，大概知道有功能和注意事项</a>
                               </td>
                             </tr>
                             <tr>
                               <td>
                                 <a href="/master/other/upgrade_guide.html">🌟 升级指南</a>
                               </td>
                               <td>
                                 <a href="/master/other/upgrade_guide.html">如发布新版本，请查看</a>
                               </td>
                             </tr>
                             <tr>
                               <td>
                                 <a href="https://gitee.com/warm_4/warm-flow-doc" target="_blank">🚀 本地部署文档</a>
                               </td>
                               <td>
                                 <a href="https://gitee.com/warm_4/warm-flow-doc" target="_blank">如部分地方访问不了，可本地部署文档</a>
                               </td>
                             </tr>
                           </tbody>
                         </table>
                        `,
                    actions: [
                        {
                            text: "⭐️star⭐️",
                            link: "https://gitee.com/dromara/warm-flow/stargazers",
                            type: "primary",
                        },
                        { text: "取消" },
                    ],
                    showOnce: false,
                    confirm: true
                },
            ],
        }
    },
    { custom: true }
);
