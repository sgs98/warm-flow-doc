# 办理人变更

::: tip
- 审批任务的办理人，通常是在流程设计器中预先设定好办理人，那如果想要在办理过程中修改办理人呢？

:::

## 1、变更的时机
- 1、修改下个任务的办理人
  - <span class="red-no-bg">动态指定办理人：</span> 办理人表达式(或[分派监听器](./listener.html#_5-3、分派监听器))，动态修改下个任务的办理人
  - <span class="red-no-bg">角色|部门id转用户id：</span> 办理人权限处理器转换接口，角色/部门id转成用户id
  - <span class="red-no-bg">流程操作命令设置nextHandlers：</span> 比如CompleteCommand、RejectCommand、JumpCommand的nextHandlers、nextHandlerAppend设置值，直接指定下个任务的办理人
- 2、修改当前任务的办理人
  - <span class="red-no-bg">转办：</span> 任务转给其他人办理
  - <span class="red-no-bg">委派：</span> 求助其他人审批，然后参照他的意见决定是否审批通过
  - <span class="red-no-bg">加签：</span> 办理中途，希望其他人一起参与办理
  - <span class="red-no-bg">减签：</span> 办理中途，希望某些人不参与办理

    
## 2、动态指定办理人

**背景**

审批任务的办理人，通常是在流程设计器中预先设定好办理人，那如果想要在办理过程中指定办理人呢？

**解决思路**

- 1、流程设计时，需要动态指定办理人的节点，配置办理人表达式`${handler1}`
- 2、本节点前任意节点办理时设置，在流程变量的变量中传入`${handler1}`的值
- 3、办理完成会生成本节点任务，并且替换`flow_user`表中的表达式



<div><img src="https://foruda.gitee.com/images/1745558346409798689/0bc86581_2218307.png" width="500" /></div>

后端代码设置变量

```java
// 流程变量
Map<String, Object> variable = new HashMap<>();
variable.put("handler1", "100");

CompleteCommand command = new CompleteCommand();
command.setTaskId(taskId);
command.setVariables(variable);
FlowEngine.workflow().complete(command);
```



**高级玩法**

- 支持动态指定一群人
- 支持spel表达式
- 支持表达式扩展



把如上代码`"100"`改成`Arrays.asList(4, "5", 100L)`，就可以动态指定一群人

```java
// 流程变量
Map<String, Object> variable = new HashMap<>();
variable.put("handler1", Arrays.asList(4, "5", 100L));

CompleteCommand command = new CompleteCommand();
command.setTaskId(taskId);
command.setVariables(variable);
FlowEngine.workflow().complete(command);
```
<br>

比如设计器配置了`#{@user.evalVar(#handler2)}`spel表达式，`#handler2`是方法入参，通过流程变量传递，就会表达式，执行`user.evalVar`方法

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

## 3、角色|部门id转用户id

```java

@Component
/**
 * 办理人权限处理器（可通过配置文件注入，也可用@Bean/@Component方式）
 *
 * @author shadow
 */
public class CustomPermissionHandler implements PermissionHandler {

    /**
     * 转换办理人，比如设计器中预设了能办理的人，如果其中包含角色或者部门id等，可以通过此接口进行转换成用户id
     * permissions：{role:1,dept:1}
     */
    @Override
    public List<String> convertPermissions(List<String> permissions) {
        // 把角色部门转换成用户
        // permissions：{role:1,dept:1} ---> {1,2,100}
        ......
        return "{1,2,100}";
    }
}

```

## 4、流程操作命令设置nextHandlers
在[接口文档中](../primary/api.html)，CompleteCommand、RejectCommand、JumpCommand这些命令中都有(nextHandlers, nextHandlerAppend)，设置了nextHandlers，会跳转到指定节点，
并把nextHandlers的值作为下一个任务的办理人。同理只要接口中有nextHandlers，就可以设置。

`WorkflowResult complete(CompleteCommand command)`：完成当前待办并推动流程继续执行。command包含如下字段：
- operator: 操作者（handler办理人唯一标识 + permissions办理人权限标识）[按需传输]；满足任一情况可以不传：流程设计时未设置办理人、ignore为true、实现了[办理人权限处理器](../primary/permission_handler.md)
- taskId: 流程任务id [必传]
- targetNodeCode: 目标节点编码，[任意跳转](./api.html)时使用 [按需传输]
- message: 审批意见 [按需传输]
- variables: 流程变量 [按需传输]
- instanceStatus: 流程实例状态，自定义流程状态 [按需传输]
- historyTaskStatus: 历史任务状态，自定义流程状态 [按需传输]
- nextHandlers: 执行的下个任务的办理人 [按需传输]
- nextHandlerAppend: 下个任务处理人配置类型（true-追加，false-覆盖，默认false）[按需传输]

## 5、转办|委派|加签|减签
[接口描述地址](../primary/api.html#转办)
> **注意事项**：转办和委派会删除当前办理人，如果节点配置的是角色，这种情况删除不了，当前办理人还能办理，要解决这种问题，请把角色全部转成用户id-[转换办理人](../primary/permission_handler.html)

</br>

::: code-tabs#shell

@tab:active 转办

```java
public void transfer() {
    TransferCommand command = new TransferCommand();
    command.setOperator(new OperatorContext("1", Arrays.asList("role:1", "role:2", "user:1")));
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
    command.setOperator(new OperatorContext("1", Arrays.asList("role:1", "role:2", "user:1")));
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
    command.setOperator(new OperatorContext("1", Arrays.asList("role:1", "role:2", "user:1")));
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
    command.setOperator(new OperatorContext("1", Arrays.asList("role:1", "role:2", "user:1")));
    command.setTaskId(getTaskId());
    command.setTargetHandlers(Arrays.asList("1", "2"));
    command.setMessage("减签");
    FlowEngine.workflow().removeSigner(command);
}
```

:::
