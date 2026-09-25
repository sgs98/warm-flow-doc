import {sidebar} from "vuepress-theme-hope";

export default sidebar({
    "/master/": [
        {
            text: "开始",
            collapsible: true,
            expanded: true,
            children: [
                "introduction/introduction.md",
                "introduction/license.md",
                "introduction/getinvolved.md",
            ],
        },
        {
            text: "初级篇",
            collapsible: true,
            expanded: true,
            children: [
                "primary/started.md",
                'primary/processterm.md',
                'primary/table.md',
                'primary/config.md',
                'primary/api.md',
                'primary/designerIntroduced.md',
                'primary/chart_manage.md',
                'primary/permission_handler.md',
                'primary/datafillhandler.md',
                'primary/idGen.md',
                'primary/variable.md',
                'primary/gateway.md',
                'primary/condition.md',
                'primary/collaboration.md',
            ],
        },
        {
            text: "进阶篇",
            collapsible: true,
            expanded: true,
            children: [
                'enhance/customstatus.md',
                'advanced/variableStategy.md',
                'advanced/change_of_handler.md',
                'advanced/listener.md',
                'advanced/node_ext.md',
                'advanced/ormusagetips.md',
                'advanced/logicdelete.md',
                'advanced/tenant.md',
            ],
        },
        {
            text: "提高篇",
            collapsible: true,
            expanded: true,
            children: [
                'enhance/listenerAndNode.md',
                'enhance/designer_two_open.md',
                'enhance/condition_two_open',
                'enhance/variableStatey_two_open',
                'enhance/listener_two_open',
            ],
        },
        {
            text: "其他",
            collapsible: true,
            expanded: true,
            children: [
                'other/team.md',
                'other/troubleshooting',
                'other/update',
                'other/upgrade_guide',
            ],
        }
    ],
});
