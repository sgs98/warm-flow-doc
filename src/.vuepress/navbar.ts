import {navbar} from 'vuepress-theme-hope';

export default navbar([
    {
        text: '首页',
        link: '/',
    },
    {
        text: '文档',
        link: '/master/introduction/introduction.md',
        children: [
            {
                text: '升级指南',
                children: [
                    { text: '升级注意事项', link: '/master/other/upgrade_guide.html#注意事项' },
                ]
            },
        ]
    },
    {
        text: '团队',
        link: '/master/other/team.md',
    },
    {
        text: '常见问题',
        link: '/master/other/troubleshooting.md'
    },
    {
        text: '计划/日志',
        link: '/master/other/update.md'
    },
]);
