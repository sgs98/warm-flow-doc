# 自定义流程状态

流程状态分三个维度，各自落不同的列，互不干扰：

| 维度 | 枚举 | 落库列 | 说明 |
| --- | --- | --- | --- |
| 实例状态 | `FlowStatus` | `flow_instance.flow_status` | 这一单处于什么状态 |
| 任务状态 | `TaskStatus` | `flow_task.flow_status`、`flow_his_task.flow_status` | 这条待办 / 历史的结果 |
| 协作动作 | `CooperateType` | `flow_his_task.cooperate_type` | 转办 / 委派 / 加签 / 减签等行为 |

引擎内部只认语义，落库编码统一由扩展点 `StatusMapper` 解析。宿主用自己的状态枚举（如 `BusinessStatusEnum`）时，实现该接口即可接管编码，**不需要在每个调用点手动传 `flowStatus` / `taskStatus`**。

## 1、默认编码

未注册映射器时使用内置编码，与历史版本完全一致，升级不需要迁移数据。

| 实例 `FlowStatus` | key | | 任务 `TaskStatus` | key |
| --- | --- | --- | --- | --- |
| 待提交 | `0` | | 待办理 | `1` |
| 审批中 | `1` | | 通过 | `2` |
| 终止 | `4` | | 结束 | `8` |
| 作废 | `5` | | 退回 | `9` |
| 撤销 | `6` | | 失效 | `10` |
| 取回 | `7` | | 拿回 | `11` |
| 已完成 | `8` | | | |
| 已退回 | `9` | | | |
| 重启 | `12` | | | |
| 暂存 | `13` | | | |

协作动作 `CooperateType`：`1` 无、`2` 转办、`3` 委派、`4` 会签、`5` 票签、`6` 加签、`7` 减签。它同时决定引擎行为（转给谁、加谁、减谁），**不参与编码映射**；映射器只决定该动作写进历史时的任务状态。

## 2、接管编码

### 2.1 实现 `StatusMapper`

```java
public class BizStatusMapper implements StatusMapper {

    @Override
    public String instanceStatus(FlowStatus semantic) {
        return switch (semantic) {
            case TOBESUBMIT -> BusinessStatusEnum.DRAFT.getStatus();      // draft
            case APPROVAL   -> BusinessStatusEnum.WAITING.getStatus();    // waiting
            case FINISHED   -> BusinessStatusEnum.FINISH.getStatus();     // finish
            case REJECT     -> BusinessStatusEnum.BACK.getStatus();       // back
            case TERMINATE  -> BusinessStatusEnum.TERMINATION.getStatus();
            case CANCEL     -> BusinessStatusEnum.CANCEL.getStatus();
            case NULLIFY    -> BusinessStatusEnum.INVALID.getStatus();
            default         -> semantic.getKey();
        };
    }

    @Override
    public String taskStatus(TaskStatus semantic) {
        return switch (semantic) {
            case WAITING -> TaskStatusEnum.WAITING.getStatus();   // waiting
            case PASS    -> TaskStatusEnum.PASS.getStatus();      // pass
            case REJECT  -> TaskStatusEnum.BACK.getStatus();      // back
            case INVALID -> TaskStatusEnum.INVALID.getStatus();   // invalid
            default      -> semantic.getKey();
        };
    }

    @Override
    public String cooperateStatus(CooperateType type) {
        return switch (type) {
            case TRANSFER            -> TaskStatusEnum.TRANSFER.getStatus();
            case DEPUTE              -> TaskStatusEnum.DEPUTE.getStatus();
            case ADD_SIGNATURE       -> TaskStatusEnum.SIGN.getStatus();
            case REDUCTION_SIGNATURE -> TaskStatusEnum.SIGN_OFF.getStatus();
            default                  -> StatusMapper.super.cooperateStatus(type);
        };
    }

    @Override
    public boolean isTerminal(String code) {
        return Set.of("finish", "termination", "cancel", "invalid").contains(code);
    }

    @Override
    public String label(String code) {
        // 展示文案：可查自己的枚举，未命中时回落内置文案
        return StatusMapper.super.label(code);
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

### 2.3 终态判定

`isTerminal` 只针对**实例状态**：引擎的状态守卫据此拦截已结束实例上的办理、流转与撤回。默认实现只认内置终态（已完成 / 终止 / 作废 / 撤销），自定义编码必须重写，否则已完成的单子仍会被放行。

## 3、个别场景覆盖

映射器只提供默认值，调用方显式传入的状态仍然优先：

```java
CompleteCommand command = new CompleteCommand();
command.setTaskStatus(TaskStatusEnum.PASS.getStatus());   // 覆盖本次任务状态
// command.setFlowStatus(...)                             // 覆盖本次实例状态
FlowEngine.workflow().complete(command);
```

需要区分「自动完成」「抄送」这类引擎不建模的业务动作时，仍由业务传 `taskStatus`。

## 4、升级注意

- `FlowStatus` 已精简为实例状态：`PASS` / `INVALID` / `TASK_BACK` 移除，改用 `TaskStatus` 对应常量；
- 扩展点由 `FlowStatusMapper` 更名为 `StatusMapper`，配置项 `flow-status-mapper-path` 改为 `status-mapper-path`；
- **落库编码未变**，存量数据不需要迁移，只调整代码引用即可。
