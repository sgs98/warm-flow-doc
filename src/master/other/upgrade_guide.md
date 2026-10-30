# 升级指南

<div class="wf-timeline">


### 注意事项
::: warning
- 更新脚本在项目里面的 [Sql](https://github.com/sgs98/warm-flow/tree/main/sql/mysql/v1-upgrade)文件下，对应数据库类型，对应版本号
- 当前仓库提供 MySQL、Oracle、PostgreSQL、SQL Server 四种数据库的全量脚本；升级脚本以 MySQL 为主，其他数据库请根据对应方言转换
- 如果二开设计器，请自行手动同步
- 未提到的版本号升级，就只需要改动jar包版本号，如v1.7.6 --> v1.7.7

:::
### v2.1.1
- **新增能力（事件等待复活）**：`WorkflowService#reviveEvent(ReviveEventCommand)` / `EventWaitService#revive(Long id)` 只把 `DEAD` 置回 `WAITING`——重试计数归零、清空 `retry_at` / 租约，定时类事件按触发器从当前时间重排期，`last_error` 保留死亡原因；`CANCELLED` 与 `TIMER_START` 不支持复活（后者请重新发布或挂起后激活定义）。
- **自定义 ORM 适配需要留意**：`FlowEventWaitDao#revive(id, version, now, nextTriggerAt)` 提供默认实现，未适配的实现在调用复活时抛「未适配事件等待复活」，其余定时 / 消息 / 错误事件功能不受影响；自实现 DAO 请按 `id + version + status = DEAD` 条件补齐。
- **只改 jar 版本号即可**：`2.1.0` → `2.1.1`，无公共 API 签名、实体字段与表结构变更，**不需要执行任何 SQL 脚本**。
- **行为变更（任务状态维度收口）**：新建待办的 `flow_task.flow_status` 不再跟随实例状态。此前定时启动等「实例已进入 `waiting`、同时创建首个待办」的链路会把实例码 `waiting` 直接写进待办行，现只按任务维度推导，普通审批节点的待办固定 `pending`；审批留痕 `flow_his_task.flow_status` 同理，只记任务维度编码，不再回落实例状态。
- **查询口径要改**：按 `flow_status = 'waiting'` 查待办或已办的宿主 SQL，改查 `pending`；实例进展一律读 `flow_instance.flow_status`。
- **行为变更（撤回归档）**：被撤回归档的 `flow_his_task.flow_status` 由 2.1.0 的 `cancel` 改为按退回语义推导的 `back`；实例维度仍是 `cancel`。因此上文 [v2.1.0](#v2-1-0) 迁移表里「撤回归档可能写 `cancel`，是任务维度唯一会出现的实例码」这句从 2.1.1 起不再成立——任务维度目前的例外是**终止归档仍写实例终态码 `termination`**，宿主字典需为它保留标签。
- **存量数据**：2.1.0 上已经落库的被污染数据（`flow_task.flow_status` 落成 `waiting` 等实例码）引擎不会自动修正，需要宿主自行按实例状态回填；新发起的流程不再产生。
- **设计器**：节点扩展属性的长标签改为固定列宽折行显示（原先被面板裁掉左半截），单选 / 多选选项超长省略并悬浮显示全文。二开设计器的话请自行同步。

### v2.1.0
::: warning 本次存在破坏性变更，升级前请先阅读本节
- **新增能力**：节点默认流程变量 `node_config.variables`，**任何节点**都可配置，走到该节点时只补缺失的变量，不覆盖办理时传入的同名变量；原先写在 `node_config.event.variables` 的旧 JSON 读不到新位置时会自动回落，**存量定义无需迁移**。用法见[流程事件与内置定时器](../advanced/event.md)。
- **状态枚举拆分**：`FlowStatus` 只保留实例状态，`PASS` / `INVALID` / `TASK_BACK` 已移除，任务维度改用新增的 `TaskStatus`（`pending` 待审批、`pass` 通过、`auto_pass` 自动审批、`back` 退回、`invalid` 失效、`take_back` 拿回、`copy` 抄送）；`CooperateType` 只保留协作动作（`none` / `transfer` / `delegate` / `add_signer` / `remove_signer`）。
- **扩展点更名**：`FlowStatusMapper` 改为 `StatusMapper`（新增 `taskStatus` / `cooperateStatus` 两个维度），注册方法 `FlowEngine.setFlowStatusMapper` 改为 `setStatusMapper`，配置项 `flow-status-mapper-path` 改为 `status-mapper-path`；使用文档见[自定义流程状态](../enhance/customstatus.md)。
- **落库编码变更（破坏性）**：实例、任务、协作三个维度都改为小写英文编码，不再使用数字。升级前必须执行对应数据库脚本并迁移存量数据；只改 jar 版本会导致引擎按新编码查不到旧数据。
- **行为变更**：实例状态不再复制落点待办的状态码，改由语义推导（结束→已完成、退回→已退回、其余→审批中），自定义映射后实例与任务两套编码不会互相串列。
- **行为变更**：流程结束时未办待办由「静默删除」改为按「失效」归档进 `flow_his_task`（历史列表会多出失效记录）；结束事件（终止结束 / 消息结束）另写一条 `task_id=0` 的留痕记录。
- **行为变更**：终止结束事件（`TERMINATE_END`）的实例状态由「已完成」改为**「终止」**（内置码 `termination`），消息结束与普通完成仍为「已完成」（`finish`）；自定义映射下分别取 `StatusMapper.instanceStatus(FlowStatus.TERMINATE)` 与 `instanceStatus(FlowStatus.FINISHED)`；若统计「完成量」需要包含终止单，请把「终止」显式计入。
- **行为变更**：普通完成现在会取消本实例的事件等待记录，完成后不再残留僵尸等待。
- **行为变更**：`revoke` 后实例状态固定为 `cancel`（撤销不是终态，会回到发起节点并重建待办）；退回仍为 `back`。
- **接口与扩展点**：新增 `WorkflowService#copy(CopyCommand)`、`waitingEvents`、`pageEventWaits` / `listEventWaits` / `countEventWaits` / `getEventWait`，新增 `EventPublisher` 服务扩展点；`core.handler` / `core.listener` 包已收口到 `core.spi`，`core.strategy.DefaultHandlerStrategy`、`core.dto.ValueHolder` 等包路径同步调整，具体以源码为准。
- **数据库**：新增 `flow_event_wait` 表；`flow_node` 新增 `node_config`、`event_type`、`event_name`、`attached_to_node_code`、`interrupting`；`flow_his_task` 新增 `node_config`；`flow_definition` 新增 `def_config`；`flow_user.type` 新增 `4`（抄送人），`associated` 对抄送记录改存 `flow_his_task.id`。

**存量数据迁移（必须执行）**

MySQL 升级脚本已包含列类型调整和末尾的存量数据迁移，请**整篇按顺序执行**，不要只摘取 `UPDATE` 语句：

[`sql/mysql/v1-upgrade/warm-flow_2.1.0.sql`](https://github.com/sgs98/warm-flow/blob/main/sql/mysql/v1-upgrade/warm-flow_2.1.0.sql)

| 维度 | 旧数字码 → 2.1.0 编码 |
| --- | --- |
| 实例 `flow_instance.flow_status` | `0→draft`、`1→waiting`、`4→termination`、`5→invalid`、`6→cancel`、`8→finish`、`9→back`、`12→restart`；已移除的 `7→waiting`（取回归任务维度）、`13→draft`（暂存并入待提交） |
| 任务 `flow_task.flow_status` | `1→pending`、`2→pass`、`8→pass`（结束留痕按通过归档）、`9→back`、`10→invalid`、`11→take_back` |
| 任务 `flow_his_task.flow_status` | 同上；撤回归档记录可能写 `cancel`，这是任务维度唯一会出现的实例码 |
| 协作 `flow_his_task.cooperate_type` | `0/1→none`、`2→transfer`、`3→delegate`、`6→add_signer`、`7→remove_signer`；`4/5→none`（会签 / 票签改由 `node_ratio` 表达，迁移后原信息丢失） |

Oracle、PostgreSQL、SQL Server 当前提供的是全量脚本，没有对应的 2.1.0 增量脚本，请按上表转换为对应方言后迁移；执行前先备份，并在预发环境核对行数与关键状态。宿主中按旧数字码写的查询、统计和报表 SQL 也要一并修改。
:::

### v2.0.1
- **表结构变更**：`flow_instance.node_code` 由 `varchar(40)` 扩至 `varchar(100)`，MySQL 需执行 [warm-flow_2.0.1.sql](https://github.com/sgs98/warm-flow/blob/main/sql/mysql/v1-upgrade/warm-flow_2.0.1.sql)：

  ```sql
  ALTER TABLE `flow_instance` MODIFY COLUMN `node_code` varchar(100) NOT NULL COMMENT '流程节点编码';
  ```

  Oracle 原本即为 `VARCHAR2(100)`，无需处理；PostgreSQL、SQL Server 请按对应方言转换。
- **行为变更**：已发布或已失效的流程定义不可再通过 `saveDef` 就地改图（返回「请复制新版本后编辑」），发布前会校验持久化流程图结构，依赖就地编辑已发布定义的集成方需改为复制新版本。
- **行为变更**：`unPublish` 对不存在的流程定义由静默返回 `false` 改为抛出「流程定义不存在」异常，依赖该返回值的调用方需改为异常处理。

### v2.0.0
::: warning 本次为大版本升级，存在破坏性变更，升级前请先阅读本节
- **Maven 坐标迁移**：groupId 由 `org.dromara.warm` 迁移为 `io.github.sgs98`（如 `io.github.sgs98:warm-flow-mybatis-plus-sb3-starter`），升级时请一并修改依赖 groupId，否则会继续解析到 1.8.9 版本
- **JDK 基线升级**：从 Java8 升级到 **JDK 17**，兼容 Java17、Java21，请先确认业务系统已升级到 JDK 17 及以上
- **移除 springboot2 适配**：`warm-flow-mybatis-sb-starter`、`warm-flow-mybatis-plus-sb-starter` 已删除，springboot3 请改用 `warm-flow-mybatis-sb3-starter`、`warm-flow-mybatis-plus-sb3-starter`，springboot4 用对应的 sb4 starter
- **移除 solon 适配**：solon 相关的 starter、表达式实现和设计器插件包均已移除
- **移除 easy-query 扩展包**：如需使用，请由社区自行扩展
- **流程操作接口重构**：新增统一门面 `FlowEngine.workflow()`（`WorkflowService`）+ 各操作命令（`StartCommand`、`CompleteCommand`、`RejectCommand`、`JumpCommand`、`RevokeCommand`、`TerminateCommand`、`TransferCommand`、`DelegateCommand`、`AddSignerCommand`、`RemoveSignerCommand`），统一返回 `WorkflowResult`；原 `FlowParams` 参数对象已删除，请参考[接口文档](../primary/api.md)迁移
- **移除 id 生成器配置**：`key_type`/`keyType` 配置已删除，主键生成策略由所用 orm 扩展包决定（见[id生成器](../primary/idGen.md)）
- **移除 JPA 配置**：`jpa_persistence_provider` 配置已删除
- **逻辑删除默认值变更**：2.0 起 `warm-flow.logic-delete` 默认由 `false`（物理删除）改为 `true`（逻辑删除），`warm-flow.logic-delete-value` 默认由 `2` 改为 `1`（与 MyBatis-Plus 对齐）。如果 1.8.x 已手工开启逻辑删除且库中已删除数据为 `del_flag='2'`，升级后需先将旧数据迁移为 `del_flag='1'`，否则已删除数据会被查询出来：

  ```sql
  UPDATE flow_definition SET del_flag = '1' WHERE del_flag = '2';
  UPDATE flow_node SET del_flag = '1' WHERE del_flag = '2';
  UPDATE flow_skip SET del_flag = '1' WHERE del_flag = '2';
  UPDATE flow_instance SET del_flag = '1' WHERE del_flag = '2';
  UPDATE flow_task SET del_flag = '1' WHERE del_flag = '2';
  UPDATE flow_his_task SET del_flag = '1' WHERE del_flag = '2';
  UPDATE flow_user SET del_flag = '1' WHERE del_flag = '2';
  ```

  未开启过逻辑删除（或已删除数据为 `del_flag='1'`）的库无需迁移；1.8.x 里关闭逻辑删除走物理删除的库也无影响。
- 如果二开设计器，请自行手动同步，就不一一列举，参考工作流引擎源码中`warm-flow/warm-flow-ui`文件夹的提交记录
:::

</div>
