# 配置yml和定义json

## yml配置文件

```yml
# warm-flow工作流配置
warm-flow:
  # 是否开启工作流，默认true
  enabled: true
  # 是否显示banner图，默认是
  banner: true
  # 是否开启设计器ui，默认true
  ui: true
  # 填充器（可选），内部有默认实现；推荐注册为容器 Bean，配类路径会优先于 Bean，见下方说明
  data-fill-handler-path: com.ruoyi.system.handle.CustomDataFillHandler
  # 全局租户处理器（可选），有多租户需要可自定义（仅 MyBatis 扩展包读取，MyBatis-Plus 走自身 TenantLineHandler）
  tenant-handler-path: com.ruoyi.system.handle.CustomTenantHandler
  # 办理人权限处理器类路径（可选，推荐注册为容器 Bean）
  permission-handler-path: com.warm.flow.handle.CustomPermissionHandler
  # 全局监听器：实现 GlobalListener 并注册为容器 Bean，不再支持类路径配置
  # 状态映射器类路径（可选，推荐注册为容器 Bean）：实例 / 任务 / 协作三维语义 → 宿主自己的编码，不配置则用内置编码，详见[自定义流程状态](../enhance/customstatus.md)
  status-mapper-path: com.warm.flow.status.CustomStatusMapper
  # 当所用 ORM 扩展包自身不提供逻辑删除时（如 MyBatis 扩展包），可通过此方式开启；MyBatis-Plus 走自身 @TableLogic，不读取该配置
  logic-delete: true
  # 逻辑删除字段值（开启后默认为1）
  logic-delete-value: 1
  # 逻辑未删除字段（开启后默认为0）
  logic-not-delete-value: 0
  ## 如果需要工作流共享业务系统权限，默认Authorization，如果有多个token，用逗号分隔
  token-name: Authorization
  # 是否显示流程图顶部文字，默认为true：显示
  top-text-show: true
  # 内部已实现自动获取，失效时使用此配置（在使用mybatis扩展包时, 由于各数据库sql语句存在差异, 通过此配置兼容，默认为mysql）
  data-source-type: mysql
  # 流程图状态对应的三原色（公共模型 / 经典模式 / 仿钉钉模式），不配置则用引擎默认配色，详见[流程图管理](./chart_manage.md)
  chart-status-color: []
  chart-status-color-classics: []
  chart-status-color-mimic: []
  # 事件能力总开关（定时 / 消息 / 错误事件），默认 false，需先建 flow_event_wait 表，详见[流程事件与内置定时器](../advanced/event.md)
  timer-enabled: false
  # 定时 / 消息触发时的系统操作人（实例、历史 createBy 的兜底身份），默认 system
  system-handler: system
  # 定时器执行线程池大小，默认 2
  timer-pool-size: 2
  # 定时器执行线程池队列容量（抢占后等待执行的最大积压条数），默认 1000
  timer-queue-capacity: 1000
  # 定时器扫描间隔（毫秒），默认 5000
  timer-scan-interval: 5000
  # 单轮扫描目标条数，默认 100
  timer-batch-size: 100
  # 单轮每个状态最多扫描页数，默认 10
  timer-max-scan-pages: 10
  # 抢占租约时长（秒），默认 60
  timer-lease-seconds: 60
  # 最大重试次数，默认 3（即第 4 次失败转 DEAD），详见流程事件的「DEAD 判定与救活」
  timer-max-retry-count: 3
  # 执行器租约续期间隔（毫秒），默认 20000
  timer-lease-renew-interval: 20000
```

::: tip 处理器「类路径」与「容器 Bean」的优先级（重要）
`data-fill-handler-path` / `tenant-handler-path` / `permission-handler-path` / `status-mapper-path` 四个配置项都是**可选**的，引擎初始化时按下面的顺序取实现：

1. **配了类路径** → 反射 `new` 该类的无参实例，**不经过容器、拿不到 Spring 依赖注入**；
2. 没配类路径（或实例化失败）→ 从容器取同类型 Bean；
3. 仍没有 → 回落内置默认实现（`DataFillHandler` 空实现、`DefaultStatusMapper`；租户 / 权限处理器回落为「不启用」）。

因此：实现类要用到 Spring Bean（查配置、查库、注入 Mapper）时**不要配类路径**，把它注册成 `@Component` 即可。配了类路径反而会让引擎用反射造一个没有依赖的裸实例，典型表现是空指针或「配置了但不生效」。全局监听器 `GlobalListener` 已彻底移除类路径配置，只能走 Bean。
:::

## 流程定义json

```yaml
{
  "flowCode": "leaveFlow-serial3",                  -- 流程编码       
  "flowName": "串行-驳回互斥",						-- 流程名称
  "category": "请假",								-- 流程类别  
  "formCustom": "N",                                -- 审批表单是否自定义（Y是 N否）
  "formPath": "system/leave/approve",               -- 审批表单路径
  "listenerPath": "x.x@@x.x@@x.x",                  -- 流程监听器路径，全限定名
  "listenerType": "start,assignment,finish",        -- 流程监听器类型
  "version": "1",                                   -- 流程版本
  "ext": "xxx",                                     -- 扩展字段，预留给业务系统使用
  "nodeList": [                                     -- 流程节点集合
    {                                               
      "coordinate": "380,200|380,200",              -- 流程节点坐标
      "nodeCode": "2",                              -- 节点编码，definitionId+nodeCode唯一
      "nodeName": "组长审批",                        -- 节点名称
      "nodeRatio": 0.000,                           -- 流程签署比例值, 0:或签，0-100：票签，100：会签
      "nodeType": 1,                                -- 节点类型（0开始节点 1中间节点 2结束节点 3互斥网关 4并行网关 5包容网关 6服务任务）
      "permissionFlag": "1@@role:1",                 -- 权限标识（权限类型:权限标识，可以多个，用@@隔开)
	  "anyNodeSkip": "1",                           -- 任意结点跳转，目标节点编码
      "listenerPath": "x.x@@x.x@@x.x",              -- 节点监听器路径，全限定名
      "listenerType": "start,assignment,finish",    -- 节点监听器类型
	  "formCustom": "N",                            -- 审批表单是否自定义（Y是 N否），不同节点可设置不同审批页面
      "formPath": "system/leave/approve",           -- 审批表单路径
	  "ext": "xxx",                                 -- 节点扩展属性
      "eventType": "TIMER_CATCH",                   -- 事件类型，事件节点专用，详见[流程事件与内置定时器](../advanced/event.md)
      "eventName": "resume",                        -- 消息名称（消息事件）/ 错误码（错误事件，可空表示通配）
      "attachedToNodeCode": "2",                    -- 边界事件附着的任务节点编码
      "interrupting": true,                         -- 边界事件是否中断型
      "nodeConfig": "{\"variables\":{\"veto\":0},\"event\":{\"timerType\":\"AFTER\",\"timerValue\":\"PT30M\"}}",  -- 节点配置：variables 是节点默认流程变量（任何节点都可配），event 段放定时参数，详见[流程事件与内置定时器](../advanced/event.md)
      "skipList": [                                 -- 跳转线集合
        {                                          
          "coordinate": "430,200;550,200",          -- 流程跳转坐标
          "nowNodeCode": "2",                       -- 当前流程节点的编码
          "nextNodeCode": "3",                      -- 下一个流程节点的编码
          "skipName": "xx",                         -- 跳转名称
          "skipType": "PASS",                       -- 跳转类型（PASS审批通过 REJECT退回）
          "skipCondition": "gt@@flag|4",            -- 跳转条件
        }
      ]
    },
  ]
}
```
