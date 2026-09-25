# 办理人变更

::: tip
- 审批任务的办理人，通常是在流程设计器中预先设定好办理人，那如果想要在办理过程中修改办理人呢？
:::

## 1、概念模型

<a id="_1、变更的时机"></a>

办理人变更分两维：<span class="wf-em">改下个任务</span> 还是 <span class="wf-em">改当前任务</span>。

**修改下个任务的办理人**

| 方式 | 说明 |
| :--- | :--- |
| 动态指定办理人 | [办理人表达式](./variableStategy.md) 或 [分派监听器](./listener.html#_5-3、分派监听器)，动态修改下个任务的办理人 |
| 角色\|部门 id 转用户 id | [办理人权限处理器](../primary/permission_handler.md) 转换接口，把角色 / 部门 id 转成用户 id |
| 流程操作命令设置 `nextHandlers` | `StartCommand`、`CompleteCommand`、`RejectCommand`、`JumpCommand` 的 `nextHandlers`、`nextHandlerAppend`，指定下个任务的办理人 |

**修改当前任务的办理人**

| 方式 | 说明 |
| :--- | :--- |
| 转办 | 任务转给其他人办理 |
| 委派 | 求助其他人审批，然后参照他的意见决定是否审批通过 |
| 加签 | 办理中途，希望其他人一起参与办理 |
| 减签 | 办理中途，希望某些人不参与办理 |

## 2、修改下个任务的办理人

### 2.1、动态指定办理人

<a id="_2、动态指定办理人"></a>

流程设计时还不确定谁来办，可以先挂办理人表达式，在本节点之前办理时再传入变量。

- 流程设计时，需要动态指定办理人的节点，配置办理人表达式 `${handler1}`
- 本节点前任意节点办理时，在流程变量中传入 `${handler1}` 的值
- 办理完成会生成本节点任务，并且替换 `flow_user` 表中的表达式

<div><img src="https://foruda.gitee.com/images/1745558346409798689/0bc86581_2218307.png" width="500" /></div>

::: code-tabs#handler-variable

@tab:active 指定一人

```java
// 流程变量
Map<String, Object> variable = new HashMap<>();
variable.put("handler1", "100");

CompleteCommand command = new CompleteCommand();
command.setTaskId(taskId);
command.setVariables(variable);
FlowEngine.workflow().complete(command);
```

@tab 指定一群人

把 `"100"` 改成集合即可：

```java
// 流程变量
Map<String, Object> variable = new HashMap<>();
variable.put("handler1", Arrays.asList(4, "5", 100L));

CompleteCommand command = new CompleteCommand();
command.setTaskId(taskId);
command.setVariables(variable);
FlowEngine.workflow().complete(command);
```

@tab SpEL 表达式

设计器配置 `#{@user.evalVar(#handler2)}` 时，`#handler2` 是方法入参，通过流程变量传递，就会执行该表达式，调用 `user.evalVar` 方法。表达式扩展见 [办理人表达式](./variableStategy.md)。

```java
/**
 * 用户类
 */
@Component("user")
public class User {

    /**
     * spel办理人表达式
     * @param handler2 办理人
     * @return String
     */
    public String evalVar(String handler2) {
        return handler2;
    }
}

// 流程变量
Map<String, Object> variable = new HashMap<>();
variable.put("handler2", "101");

CompleteCommand command = new CompleteCommand();
command.setTaskId(taskId);
command.setVariables(variable);
FlowEngine.workflow().complete(command);
```

:::

### 2.2、角色|部门 id 转用户 id

<a id="_3、角色|部门id转用户id"></a>

```java
/**
 * 办理人权限处理器（可通过配置文件注入，也可用@Bean/@Component方式）
 *
 * @author shadow
 */
@Component
public class CustomPermissionHandler implements PermissionHandler {

    /**
     * 转换办理人，比如设计器中预设了能办理的人，如果其中包含角色或者部门id等，可以通过此接口进行转换成用户id
     * permissions：{role:1,dept:1}
     */
    @Override
    public List<String> convertPermissions(List<String> permissions) {
        // 把角色、部门转换成用户
        // permissions：{role:1, dept:1} ---> {1, 2, 100}
        ......
        return Arrays.asList("1", "2", "100");
    }
}
```

完整接口说明见 [办理人权限处理器](../primary/permission_handler.md)。

### 2.3、流程操作命令设置 nextHandlers

<a id="_4、流程操作命令设置nextHandlers"></a>

`StartCommand`、`CompleteCommand`、`RejectCommand`、`JumpCommand` 都有 `nextHandlers`、`nextHandlerAppend`。它只指定**下一个任务的办理人**，不会改变跳转目标。

引擎生成下个任务办理人时的顺序：先替换办理人表达式，再走 `PermissionHandler.convertPermissions`，最后应用 `nextHandlers`。`nextHandlerAppend` 为 `false`（默认）时覆盖前面算出的办理人，为 `true` 时追加。

跳转目标节点用 `JumpCommand.targetNodeCode`（必传），退回目标用 `RejectCommand.targetNodeCode`（按需）。完整字段见 [接口文档](../primary/api.md)。

```java
CompleteCommand command = new CompleteCommand();
command.setTaskId(taskId);
command.setNextHandlers(Arrays.asList("100"));
command.setNextHandlerAppend(false);
FlowEngine.workflow().complete(command);
```

`CompleteCommand` 字段：

| 字段 | 说明 |
| :--- | :--- |
| `operator` | 操作者 `OperatorContext`（`handler` / `ignorePermission` / `ignore`）[按需传输]；办理人权限标识 `permissions` 由 [办理人权限处理器](../primary/permission_handler.md) 提供，实现了它则可不传 |
| `taskId` | 流程任务 id [必传] |
| `message` | 审批意见 [按需传输] |
| `variables` | 流程变量 [按需传输] |
| `flowStatus` | 流程实例状态 [按需传输] |
| `taskStatus` | 历史任务状态 [按需传输] |
| `nextHandlers` | 下个任务的办理人 [按需传输] |
| `nextHandlerAppend` | `true` 追加，`false` 覆盖，默认 `false` |

## 3、修改当前任务的办理人

<a id="_5、转办|委派|加签|减签"></a>

接口描述见 [转办](../primary/api.md#转办)。

::: warning 注意事项
转办和委派会删除当前办理人。如果节点配置的是角色，这种情况删除不了，当前办理人还能办理。要解决这种问题，请把角色全部转成用户 id，见 [转换办理人](../primary/permission_handler.md)。
:::

::: code-tabs#handler-current

@tab:active 转办

```java
public void transfer() {
    TransferCommand command = new TransferCommand();
    command.setOperator(new OperatorContext("1"));
    command.setTaskId(getTaskId());
    // 转办只能指定一个办理人
    command.setTargetHandler("2");
    command.setMessage("转办");
    FlowEngine.workflow().transfer(command);
}
```

@tab 委派

```java
public void delegate() {
    DelegateCommand command = new DelegateCommand();
    command.setOperator(new OperatorContext("1"));
    command.setTaskId(getTaskId());
    // 委派只能指定一个办理人
    command.setTargetHandler("2");
    command.setMessage("委派");
    FlowEngine.workflow().delegate(command);
}
```

@tab 加签

```java
public void addSigner() {
    AddSignerCommand command = new AddSignerCommand();
    command.setOperator(new OperatorContext("1"));
    command.setTaskId(getTaskId());
    command.setTargetHandlers(Arrays.asList("1", "2"));
    command.setMessage("加签");
    FlowEngine.workflow().addSigner(command);
}
```

@tab 减签

```java
public void removeSigner() {
    RemoveSignerCommand command = new RemoveSignerCommand();
    command.setOperator(new OperatorContext("1"));
    command.setTaskId(getTaskId());
    command.setTargetHandlers(Arrays.asList("1", "2"));
    command.setMessage("减签");
    FlowEngine.workflow().removeSigner(command);
}
```

:::
