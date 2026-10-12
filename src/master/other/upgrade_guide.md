# 升级指南

<div class="wf-timeline">


### 注意事项
::: warning
- 更新脚本在项目里面的 [Sql](https://github.com/sgs98/warm-flow/tree/main/sql/mysql/v1-upgrade)文件下，对应数据库类型，对应版本号
- 当前仓库提供 MySQL、Oracle、PostgreSQL、SQL Server 四种数据库的全量脚本；升级脚本以 MySQL 为主，其他数据库请根据对应方言转换
- 如果二开设计器，请自行手动同步
- 未提到的版本号升级，就只需要改动jar包版本号，如v1.7.6 --> v1.7.7

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
