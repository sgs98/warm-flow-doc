# 升级指南

<div class="wf-timeline">


### 注意事项
::: warning
- 更新脚本在项目里面的 [Sql](https://github.com/sgs98/warm-flow/tree/main/sql/mysql/v1-upgrade)文件下，对应数据库类型，对应版本号
- 当前仓库提供 MySQL、Oracle、PostgreSQL、SQL Server 四种数据库的全量脚本；升级脚本以 MySQL 为主，其他数据库请根据对应方言转换
- 如果二开设计器，请自行手动同步
- 未提到的版本号升级，就只需要改动jar包版本号，如v1.7.6 --> v1.7.7

:::
### v2.0.0
::: warning 本次为大版本升级，存在破坏性变更，升级前请先阅读本节
- **JDK 基线升级**：从 Java8 升级到 **JDK 17**，兼容 Java17、Java21，请先确认业务系统已升级到 JDK 17 及以上
- **移除 springboot2 适配**：`warm-flow-mybatis-sb-starter`、`warm-flow-mybatis-plus-sb-starter` 已删除，springboot3 请改用 `warm-flow-mybatis-sb3-starter`、`warm-flow-mybatis-plus-sb3-starter`，springboot4 用对应的 sb4 starter
- **移除 solon 适配**：solon 相关的 starter、表达式实现和设计器插件包均已移除
- **移除 easy-query 扩展包**：如需使用，请由社区自行扩展
- **流程操作接口重构**：新增统一门面 `FlowEngine.workflow()`（`WorkflowService`）+ 各操作命令（`StartCommand`、`CompleteCommand`、`RejectCommand`、`JumpCommand`、`RevokeCommand`、`TerminateCommand`、`TransferCommand`、`DelegateCommand`、`AddSignerCommand`、`RemoveSignerCommand`），统一返回 `WorkflowResult`；原 `FlowParams` 参数对象已删除，请参考[接口文档](../primary/api.md)迁移
- **移除 id 生成器配置**：`key_type`/`keyType` 配置已删除，主键生成策略由所用 orm 扩展包决定（见[id生成器](../primary/idGen.md)）
- **移除 JPA 配置**：`jpa_persistence_provider` 配置已删除
- 如果二开设计器，请自行手动同步，就不一一列举，参考工作流引擎源码中`warm-flow/warm-flow-ui`文件夹的提交记录
:::

</div>
