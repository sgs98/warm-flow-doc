# 计划/日志

<div class="wf-timeline">



## 未来发布计划

### vx.x.x

- 流程图合法性检验
- 子流程
- 重启流程
- 动态修改流程
- 并行任务驳回支持多个任务
- 设计器可支持新增额外的文本
- 票签会签功能支持顺序会签
- 自定义节点类型（自动审批）


## 更新日志
### v2.1.1  2026-10-28
- [升级指南](./upgrade_guide.md#v2-1-1)
- feat：新增事件等待记录复活能力 `WorkflowService#reviveEvent(ReviveEventCommand)` / `EventWaitService#revive(Long id)`
- feat：复活只允许 `DEAD → WAITING`，重试计数归零、清空租约、定时类事件按触发器重排期，`last_error` 保留死亡原因
- feat：复活前校验目标仍有效——实例存在且激活、未越过事件节点；边界事件要求附着待办仍存在；`CANCELLED` 与 `TIMER_START` 不支持复活
- update：Demo 定时任务页对 `DEAD` 记录提供「复活」操作，接口 `POST /api/event-waits/{id}/revive`
- 注意：定时任务转 `DEAD` 的口径是「同一条记录失败次数超过 `timer-max-retry-count`（默认 3，即第 4 次失败）」，`RUNNING` 租约过期同样按一次失败计入；重复型事件成功重排期不清零 `retry_count`，属于累计失败，耗尽后可用上述复活接口恢复
- docs：新增「定时任务 `DEAD` 判定与救活」（事件章节 11.2）与常见问题「定时任务显示已死（DEAD）怎么办」
- fix：新建待办的 `flow_task.flow_status` 不再跟随实例状态——定时启动等「实例已进入 `waiting`、同时创建首个待办」的链路，此前会把实例码 `waiting` 直接写进待办行，现只按任务维度推导（普通审批节点为 `pending`）
- fix：审批留痕 `flow_his_task.flow_status` 只记任务维度编码（办理 / 转办 / 委派 / 加签减签 / 会签票签），不再回落实例状态
- fix：事件中断附着任务、终止归档不再把任务状态写进上下文的实例状态字段
- 行为变更：被撤回归档的历史记录由 `cancel` 改为按退回语义推导的 `back`；实例状态仍是 `cancel`
- 注意：终止归档的历史记录仍写实例终态码 `termination`（与 2.1.0 一致），这是任务维度目前唯一会出现实例码的位置，宿主字典需为它保留标签
- update：设计器节点扩展属性长标签改为固定列宽折行显示，不再被面板裁掉左半截；单选 / 多选选项超长省略并悬浮显示全文
- update：Demo 的 `HistoryVo` / `TaskVo` / `InstanceVo` 状态字段收口，任务维度只留 `taskStatus` / `taskStatusName`，实例维度只留 `flowStatusKey` / `flowStatusName`
- 无表结构变更，不需要执行升级脚本

### v2.1.0  2026-10-24
- [升级指南](./upgrade_guide.md#v2-1-0)
- feat：新增服务任务节点（`SERVICE`），支持 `class` / `delegateExpression` / `expression` 三种处理器配置
- feat：新增定义级自动审批（`def_config.autoPass`），自动审批历史记 `auto_pass`
- feat：新增流程事件与内置定时器，覆盖定时启动 / 捕获 / 边界、消息启动 / 捕获 / 抛出 / 结束、错误捕获 / 边界、终止结束
- feat：新增 `flow_event_wait` 等待表、`EventPublisher` 发布器扩展点及等待记录查询 API
- feat：新增节点级抄送 `node_config.copy`，并提供 `TaskService#copy` 与 `WorkflowService#copy(CopyCommand)` 手动追加抄送
- feat：节点默认流程变量统一放在 `node_config.variables`，所有节点可配置；旧 `node_config.event.variables` 兼容读取
- refactor：实例状态、任务状态、协作动作拆为 `FlowStatus` / `TaskStatus` / `CooperateType` 三个维度
- 破坏性变更：三个维度落库编码由数字改为小写英文，存量数据必须迁移，MySQL 升级脚本 `warm-flow_2.1.0.sql` 已包含迁移段
- 破坏性变更：`FlowStatusMapper` 更名为 `StatusMapper`，新增任务状态与协作动作映射；扩展点包路径收口到 `core.spi`
- 行为变更：流程结束或退回一票否决时，未办任务按 `invalid` 归档，不再静默删除
- 行为变更：`TERMINATE_END` 的实例状态改为 `termination`，普通完成与消息结束仍为 `finish`
- 行为变更：撤回后实例状态为 `cancel`，撤销不再属于终态；退回仍为 `back`
- update：设计器支持事件节点、节点默认变量、定义级自动审批、抄送人配置与发起人快捷选择
- update：四套全量 SQL 同步 `def_config`、`node_config`、事件列与 `flow_event_wait` 表

### v2.0.1  2026-10-12
- [升级指南](./upgrade_guide.md#v2-0-1)
- feat：新增 `DefService#copyDefReturnId`，复制流程定义并返回新定义主键，复制产物固定为未发布草稿
- update：发布流程定义前校验持久化流程图，结构非法的定义不允许进入已发布状态
- update：已发布或已失效的流程定义不再允许保存修改，需复制新版本后编辑，与设计器只读规则对齐
- update：设计器保存与发布校验改由服务端从目标节点派生连线节点类型，不再信任客户端回传值，防止绕过中间节点多出口限制
- refactor：流程定义保存与导入合并为共享结构校验核 `FlowConfigUtil#validateGraph`
- fix：`unPublish` 对不存在的流程定义改为报「流程定义不存在」，与 `publish` 行为对齐
- update：`flow_instance.node_code` 由 `varchar(40)` 扩至 `varchar(100)`，MySQL 升级脚本 `warm-flow_2.0.1.sql`

### v2.0.0  2026-10-03
- [升级指南](./upgrade_guide.md#v2-0-0)
- 破坏性变更：JDK 基线升级到 17，移除 springboot2、solon、easy-query 适配
- 破坏性变更：Maven 坐标由 `org.dromara.warm` 迁移为 `io.github.sgs98`，升级需同步修改依赖 groupId
- 破坏性变更：移除 id 生成器配置 `key_type`/`keyType` 与 JPA 配置 `jpa_persistence_provider`
- feat：新增统一流程操作门面 WorkflowService，一个操作对应一个命令对象，统一返回 WorkflowResult
- feat：监听器上下文新增 eventType，可读取本次实际触发的监听器事件类型
- feat：设计器支持经典 ↔ 仿钉钉画布内一键互转（经典转仿钉钉自动重排、仿钉钉转经典保留坐标，并重建折点与标签），双模式视觉美化、拖拽磁吸对齐、属性分组可折叠
- feat：逻辑删除默认开启，新增物理删除模式（`logic-delete: false` 时 starter 自动注册处理器关闭流程表逻辑删除），逻辑删除值默认 1
- refactor：流程操作按步骤链重构（启动、执行、撤回、终止、办理人调整）
- perf：新增流程执行作用域，一次操作内复用流程定义、节点、跳线查询结果
- perf：优化节点图遍历与网关路径解析，ORM 批量保存改用批处理
- feat：新增实例流程历史图
- fix：运行态流程图只展示已办节点办理人，连线标签对齐、节点防重叠；修复设计器双模型互转的撤销错乱、网关标签重叠与折点脱开
- docs：补充流程定义导入导出示例，补充核心单测

</div>
