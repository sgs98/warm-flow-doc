# 快速开始

::: tip
**在开始之前，我们假定您已经:**  

- 熟悉 Java 环境配置及其开发  

- 熟悉 关系型 数据库，比如 MySQL  

- 熟悉 Spring Boot 及相关框架  

- 熟悉 Java 构建工具，比如 Maven  
:::

## **1、导入sql，按需求执行**

- 开始学习前，请先了解<span class="big-font">[表结构](./table.md)</span>，不迷路
- 首次导入，先创建数据库，找到对应数据库的全量脚本<span class="big-font">[warm-flow-all.sql](https://github.com/sgs98/warm-flow/tree/main/sql/mysql)</span>，执行  
- 如果版本更新，找到对应数据库的更新版本，比如xx-upgrade，<span class="big-font">[warm-flow_x.x.x.sql](https://github.com/sgs98/warm-flow/tree/main/sql/mysql/v1-upgrade)</span>，执行

<table>
    <tbody>
        <tr>
            <td><img src="https://foruda.gitee.com/images/1724349579810152906/15af22df_2218307.png" height="180px"/></td>
            <td><img src="https://foruda.gitee.com/images/1724349629546024487/f32625d9_2218307.png" height="180px"/></td>
        </tr>
    </tbody>
</table>

<style scoped>
td {
  width: 50%;
}
</style>

## **2、maven依赖**
- <span class="big-font">springboot 支持3、4版本（v2.0.0起已移除 springboot2 与 solon 适配）</span>


### **2.1、mybatis**

::: code-tabs#shell

@tab:active springboot3

```xml
<dependency>
    <groupId>org.dromara.warm</groupId>
    <artifactId>warm-flow-mybatis-sb3-starter</artifactId>
    <version>最新版本</version>
</dependency>
```

@tab springboot4

```xml
<dependency>
    <groupId>org.dromara.warm</groupId>
    <artifactId>warm-flow-mybatis-sb4-starter</artifactId>
    <version>最新版本</version>
</dependency>
```

:::


### **2.2、mybatis-plus**

::: code-tabs#shell

@tab:active springboot3

```xml
<dependency>
    <groupId>org.dromara.warm</groupId>
    <artifactId>warm-flow-mybatis-plus-sb3-starter</artifactId>
    <version>最新版本</version>
</dependency>
```

@tab springboot4

```xml
<dependency>
    <groupId>org.dromara.warm</groupId>
    <artifactId>warm-flow-mybatis-plus-sb4-starter</artifactId>
    <version>最新版本</version>
</dependency>
```

:::

### **2.3、jpa**

<span class="big-font">[https://gitee.com/vanlin/warm-flow-jpa.git](https://gitee.com/vanlin/warm-flow-jpa.git)</span>


### **2.4、BeetlSql**

<span class="big-font">[https://gitee.com/smartcity/warm-flow-beetlsql-solon.git](https://gitee.com/smartcity/warm-flow-beetlsql-solon.git)</span>


> **有想扩展其他orm框架和数据库的可加qq群联系群主**

## **3、代码示例**


<br>

**以下为简短案例：**

::: code-tabs#shell

@tab:active 部署流程

```java
public void deployFlow() throws Exception {
    String path = "/Users/minliuhua/Desktop/mdata/file/IdeaProjects/min/hh-vue/hh-admin/src/main/resources/leaveFlow-serial.xml";
    System.out.println("已部署流程的id：" + defService.importIs(new FileInputStream(path)).getId());
}
```

@tab 发布流程

```java
public void publish() throws Exception {
    FlowEngine.defService().publish(1212437969554771968L);
}
```

@tab 开启流程

```java
public void startFlow() {
    StartCommand command = new StartCommand();
    // 操作者：办理人唯一标识 + 权限标识（实现 PermissionHandler 后可不传）
    command.setOperator(new OperatorContext("1", Arrays.asList("role:1", "role:2")));
    // 业务id
    command.setBusinessId("1");
    // 流程编码
    command.setFlowCode("leaveFlow-serial");
    // 流程变量，按需传输
    command.setVariables(variable);
    WorkflowResult result = FlowEngine.workflow().start(command);
    System.out.println("已开启的流程实例id：" + result.getInstanceId());
}
```

@tab 流程流转

```java
public void completeFlow() throws Exception {
    // 审批通过：完成待办并推动流程继续执行
    CompleteCommand command = new CompleteCommand();
    command.setOperator(new OperatorContext("1", Arrays.asList("role:1", "role:2")));
    command.setTaskId(1219286332141080576L);
    command.setMessage("同意");
    WorkflowResult result = FlowEngine.workflow().complete(command);
    System.out.println("流转后流程实例：" + result.getInstanceId());
}

public void rejectFlow() throws Exception {
    // 驳回：退回到指定的前置节点
    RejectCommand command = new RejectCommand();
    command.setOperator(new OperatorContext("1", Arrays.asList("role:1", "role:2")));
    command.setTaskId(1219286332141080576L);
    command.setTargetNodeCode("2");
    command.setMessage("驳回");
    FlowEngine.workflow().reject(command);
}

public void jumpAnyNode() throws Exception {
    // 任意跳转：跳转到指定节点
    JumpCommand command = new JumpCommand();
    command.setOperator(new OperatorContext("1", Arrays.asList("role:1", "role:2")));
    command.setTaskId(1219286332145274880L);
    command.setTargetNodeCode("4");
    command.setMessage("跳转");
    FlowEngine.workflow().jump(command);
}
```

:::

## **4、设计器引入**
> <span class="big-font">通过jar包引入：[文档地址](./designerIntroduced.md)</span>
