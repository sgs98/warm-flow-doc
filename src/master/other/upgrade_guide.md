# 升级指南

<div class="wf-timeline">


### 注意事项
::: warning
- 更新脚本在项目里面的 [Sql](https://github.com/sgs98/warm-flow/tree/main/sql/mysql/v1-upgrade)文件下，对应数据库类型，对应版本号
- 当前仓库提供 MySQL、Oracle、PostgreSQL、SQL Server 四种数据库的全量脚本；升级脚本以 MySQL 为主，其他数据库请根据对应方言转换
- 如果二开设计器，请自行手动同步
- 未提到的版本号升级，就只需要改动jar包版本号，如v1.7.6 --> v1.7.7

:::
### v2.1.0
::: warning 本次存在破坏性变更，升级前请先阅读本节
- **新增能力**：节点默认流程变量 `node_config.variables`，**任何节点**都可配置，走到该节点时只补缺失的变量，不覆盖办理时传入的同名变量；原先写在 `node_config.event.variables` 的旧 JSON 读不到新位置时会自动回落，**存量定义无需迁移**。用法见[流程事件与内置定时器](../advanced/event.md)。
- **状态枚举拆分**：`FlowStatus` 只保留实例状态，`PASS` / `INVALID` / `TASK_BACK` 已移除，任务维度改用新增的 `TaskStatus`（`1` 待办理、`2` 通过、`8` 结束、`9` 退回、`10` 失效、`11` 拿回）；`AUTO_PASS` 也已移除，自动审批与服务任务历史统一记「通过」。
- **扩展点更名**：`FlowStatusMapper` 改为 `StatusMapper`（新增 `taskStatus` / `cooperateStatus` 两个维度），注册方法 `FlowEngine.setFlowStatusMapper` 改为 `setStatusMapper`，配置项 `flow-status-mapper-path` 改为 `status-mapper-path`；使用文档见[自定义流程状态](../enhance/customstatus.md)。
- **数据无需迁移**：落库编码未变（`0` / `1` / `2` / `4` ~ `13`），存量 `flow_status` 可继续读取，只需调整代码里的枚举引用。
- **行为变更**：实例状态不再复制落点待办的状态码，改由语义推导（结束→已完成、退回→已退回、其余→审批中），自定义映射后实例与任务两套编码不会互相串列。
- **行为变更**：流程结束时未办待办由「静默删除」改为按「失效」归档进 `flow_his_task`（历史列表会多出失效记录）；结束事件（终止结束 / 消息结束）另写一条 `task_id=0` 的留痕记录。
- **行为变更**：终止结束事件（`TERMINATE_END`）的实例状态由「已完成」改为**「终止」**（内置码 `4`），消息结束与普通完成仍为「已完成」；自定义映射下分别取 `StatusMapper.instanceStatus(FlowStatus.TERMINATE)` 与 `instanceStatus(FlowStatus.FINISHED)`；若统计「完成量」需要包含终止单，请把「终止」显式计入。
- **行为变更**：普通完成现在会取消本实例的事件等待记录，完成后不再残留僵尸等待。
- **数据库**：2.1.0 新增 `flow_event_wait` 表与 `flow_node` 的事件列，MySQL 升级脚本见 [warm-flow_2.1.0.sql](https://github.com/sgs98/warm-flow/blob/main/sql/mysql/v1-upgrade/warm-flow_2.1.0.sql)。
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
