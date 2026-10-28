# 自定义流程状态

流程状态分三个维度，各自落不同的列，互不干扰：

| 维度 | 枚举 | 落库列 | 说明 |
| --- | --- | --- | --- |
| 实例状态 | `FlowStatus` | `flow_instance.flow_status` | 这一单处于什么状态 |
| 任务状态 | `TaskStatus` | `flow_task.flow_status`、`flow_his_task.flow_status` | 这条待办 / 历史的结果 |
| 协作动作 | `CooperateType` | `flow_his_task.cooperate_type` | 转办 / 委派 / 加签 / 减签等行为 |

引擎内部只认语义，落库编码统一由扩展点 `StatusMapper` 解析。宿主用自己的状态枚举时，实现该接口即可接管编码，**不需要在每个调用点手动传 `flowStatus` / `taskStatus`**。

## 1、默认编码

2.1.0 起，三个维度都使用小写英文编码。未注册映射器时，默认实现直接使用枚举 key；从 2.0.1 及更早版本升级的存量数据需要按 [升级指南](../other/upgrade_guide.md#v2-1-0) 迁移。

| 实例 `FlowStatus` | key | | 任务 `TaskStatus` | key |
| --- | --- | --- | --- | --- |
| 待提交 | `draft` | | 待审批 | `pending` |
| 审批中 | `waiting` | | 通过 | `pass` |
| 终止 | `termination` | | 自动审批 | `auto_pass` |
| 作废 | `invalid` | | 退回 | `back` |
| 撤销 | `cancel` | | 失效 | `invalid` |
| 已完成 | `finish` | | 拿回 | `take_back` |
| 已退回 | `back` | | 抄送 | `copy` |
| 重启 | `restart` | | | |

协作动作 `CooperateType`：`none` 无、`transfer` 转办、`delegate` 委派、`add_signer` 加签、`remove_signer` 减签。会签 / 票签是节点的多人审批模式（由 `node_ratio` 决定），不是协作动作；抄送结果记在任务状态 `copy`，也不落 `cooperate_type`。

`FlowStatus` 的终态只有 `finish` / `termination` / `invalid`。`cancel`（撤销）和 `back`（已退回）都不是终态，实例仍可修改后继续办理；不要把撤销误判为终态。

::: tip 两个维度不共用取值（2.1.1 起）
`waiting`（审批中）**只出现在** `flow_instance.flow_status`；`flow_task.flow_status` 与 `flow_his_task.flow_status` 只记任务维度编码，新建待办是 `pending`。2.1.0 及更早版本里，定时启动等链路会把实例码 `waiting` 写进待办与历史行，2.1.1 已修正，别再按 `waiting` 查待办。

任务维度目前的唯一例外是**终止归档**：流程被终止时，在途待办归档进 `flow_his_task` 会写实例终态码 `termination`，宿主字典需为它留一行标签。撤回归档从 2.1.1 起是 `back`（不再是 `cancel`）。
:::

## 2、接管编码

### 2.1 实现 `StatusMapper`

```java
public class BizStatusMapper implements StatusMapper {

    @Override
    public String instanceStatus(FlowStatus semantic) {
        return switch (semantic) {
            case DRAFT       -> BusinessStatusEnum.DRAFT.getStatus();
            case WAITING     -> BusinessStatusEnum.WAITING.getStatus();
            case TERMINATE   -> BusinessStatusEnum.TERMINATION.getStatus();
            case INVALID     -> BusinessStatusEnum.INVALID.getStatus();
            case CANCEL      -> BusinessStatusEnum.CANCEL.getStatus();
            case FINISHED    -> BusinessStatusEnum.FINISH.getStatus();
            case BACK        -> BusinessStatusEnum.BACK.getStatus();
            case RESTART     -> BusinessStatusEnum.RESTART.getStatus();
        };
    }

    @Override
    public String taskStatus(TaskStatus semantic) {
        return switch (semantic) {
            case PENDING   -> TaskStatusEnum.PENDING.getStatus();
            case PASS      -> TaskStatusEnum.PASS.getStatus();
            case BACK      -> TaskStatusEnum.BACK.getStatus();
            case INVALID   -> TaskStatusEnum.INVALID.getStatus();
            case TAKE_BACK -> TaskStatusEnum.TAKE_BACK.getStatus();
            case AUTO_PASS -> TaskStatusEnum.AUTO_PASS.getStatus();
            case COPY      -> TaskStatusEnum.COPY.getStatus();
        };
    }

    @Override
    public String cooperateStatus(CooperateType type) {
        return switch (type) {
            case NONE          -> TaskStatusEnum.PENDING.getStatus();
            case TRANSFER      -> TaskStatusEnum.TRANSFER.getStatus();
            case DELEGATE      -> TaskStatusEnum.DELEGATE.getStatus();
            case ADD_SIGNER    -> TaskStatusEnum.ADD_SIGNER.getStatus();
            case REMOVE_SIGNER -> TaskStatusEnum.REMOVE_SIGNER.getStatus();
        };
    }

    @Override
    public boolean isTerminal(String code) {
        return Set.of("finish", "termination", "invalid").contains(code);
    }

    @Override
    public String label(String code) {
        // 实例维度展示文案；任务维度请重写 taskLabel
        return StatusMapper.super.label(code);
    }

    @Override
    public String taskLabel(String code) {
        // 任务维度展示文案
        return StatusMapper.super.taskLabel(code);
    }
}
```

### 2.2 注册

```java
// 方式一：代码注册（Spring 环境下也可声明为 Bean，引擎初始化时会从容器获取）
FlowEngine.setStatusMapper(new BizStatusMapper());
```

```yaml
# 方式二：配置类路径
warm-flow:
  status-mapper-path: com.example.flow.BizStatusMapper
```

注册后，发起 / 办理 / 退回 / 终止 / 撤回 / 自动审批 / 服务任务 / 协作动作的默认状态**直接写你的编码**。

### 2.3 终态判定与展示

`isTerminal` 只针对**实例状态**：引擎的状态守卫据此拦截已结束实例上的办理、流转与撤回。默认只认 `finish` / `termination` / `invalid`；宿主改用自定义编码后必须同步重写，否则已终结的实例会被放行。

展示文案也按维度解析：

- `label(String)` 只按实例状态解析；
- `taskLabel(String)` 按任务状态解析；
- `label(String, boolean)` 按入参选择实例或任务维度。

实例表的 `finish` 和任务表的 `pass` 含义不同，不要用同一个方法混查两套编码。

## 3、个别场景覆盖

映射器只提供默认值，调用方显式传入的状态仍然优先：

```java
CompleteCommand command = new CompleteCommand();
command.setTaskStatus(TaskStatusEnum.PASS.getStatus());   // 覆盖本次任务状态
// command.setFlowStatus(...)                             // 覆盖本次实例状态
FlowEngine.workflow().complete(command);
```

抄送历史固定使用 `StatusMapper.taskStatus(TaskStatus.COPY)`，不会被调用方传入的 `taskStatus` 覆盖；如需修改抄送编码，只覆写 `taskStatus` 中 `COPY` 分支即可。

## 4、升级注意

- `FlowStatus` 只保留实例状态；`TaskStatus` 独立表达任务结果，`CooperateType` 只表达协作动作；
- 扩展点由 `FlowStatusMapper` 更名为 `StatusMapper`，配置项 `flow-status-mapper-path` 改为 `status-mapper-path`；
- 落库编码由数字改为小写英文，存量数据必须迁移。MySQL 直接按顺序执行 [`warm-flow_2.1.0.sql`](https://github.com/sgs98/warm-flow/blob/main/sql/mysql/v1-upgrade/warm-flow_2.1.0.sql)，其他数据库按对应方言转换；迁移映射见[升级指南](../other/upgrade_guide.md#v2-1-0)；
- 2.1.1 起任务状态不再被实例状态污染：待办固定按任务维度落码，撤回归档由 `cancel` 改为 `back`；只改 jar 版本号即可，无表结构变更，详见[升级指南](../other/upgrade_guide.md#v2-1-1)；
- 宿主按旧数字码写的查询、统计与报表 SQL 需同步调整。
