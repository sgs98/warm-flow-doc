# 监听器

::: tip
- 在办理流程过程中，通过监听器监听办理过程的不同时期，进行业务处理与功能增强
- 支持类包名配置和表达式配置
:::

## 1、概念模型

监听器由两维组成：<span class="wf-em">何时执行</span>（小类）和 <span class="wf-em">作用范围</span>（大类）。常用四个小类在三种大类上都可以挂，`formLoad` 为内置表单专用。

**何时执行（小类）**

| 类型 | 触发时机 | 典型用途 |
| :--- | :--- | :--- |
| `create` | 任务创建时，下一个任务生成前 | 数据初始化、合法性校验 |
| `start` | 任务开始办理时 | 数据初始化、办理人权限设置 |
| `assignment` | 分派办理人时 | 动态修改待办任务信息 |
| `finish` | 当前任务完成后 | 更新业务表、消息通知 |
| `formLoad` | 内置表单数据加载时（1.3.0+） | 表单渲染前的数据准备 |

**作用范围（大类）**

| 类型 | 配置位置 | 作用范围 |
| :--- | :--- | :--- |
| 节点监听器 | 流程节点 | 当前节点 |
| 流程监听器 | 流程定义 | 当前流程定义的所有节点 |
| 全局监听器 | 实现 `GlobalListener` | 系统所有流程 |

同一事件的执行顺序：<span class="wf-em">节点监听器</span> → <span class="wf-em">流程监听器</span> → <span class="wf-em">全局监听器</span>

## 2、生命周期

<a id="_3、监听器生命周期图"></a>

<div><img src="https://foruda.gitee.com/images/1744189606356147579/9904c854_2218307.png" width="800"></div>

::: warning 创建监听器的时机
`create` 在下一个任务生成前执行。例如 A → B，办理 A 时会触发 B 上配置的创建监听器。超时自动审批应挂在创建监听器上，详见 [监听器 + 节点扩展属性的妙用](../enhance/listenerAndNode.md)。
:::

## 3、编写监听器

- 节点 / 流程监听器：实现 `Listener`，通过 `@Component` 或 `@Bean` 注入容器
- 全局监听器：实现 `GlobalListener`，按需实现其中一个或多个方法；整个系统只有一个

### 3.1、Listener 接口

```java
/**
 * 监听器接口
 */
public interface Listener extends Serializable {

    /** 创建监听器，任务创建时执行 */
    String LISTENER_CREATE = "create";

    /** 开始监听器，任务开始办理时执行 */
    String LISTENER_START = "start";

    /** 完成监听器，当前任务完成后执行 */
    String LISTENER_FINISH = "finish";

    /** 分派监听器，动态修改待办任务信息 */
    String LISTENER_ASSIGNMENT = "assignment";

    /** 表单数据加载监听器，内置表单使用 */
    String LISTENER_FORM_LOAD = "formLoad";

    void notify(ListenerVariable variable);
}
```

同一个实现类可以同时挂在多种事件上（例如 `start,finish`），用 `eventType` 区分本次触发的是哪一种，见 [5.2、区分事件类型](#_5-2、区分事件类型)。

### 3.2、节点和流程监听器

<a id="_5-3、分派监听器"></a>

分派监听器常用来改下个节点的办理人，如下图：

<div><img src="/assignmentlistener.jpg" width="550px" height="450px" /></div>

::: warning 注意
- 当前节点分派监听器：执行时修改【下个节点配置办理人权限】或者其他
- 下个节点配置办理人权限策略：可设置自定义权限策略，比如发起人审批、部门领导审批等
:::

::: code-tabs#listener-impl

@tab:active start 开始

```java
@Component
public class DefStartListener implements Listener {

    private static final Logger log = LoggerFactory.getLogger(DefStartListener.class);

    /**
     * 设置办理人 id、所拥有的权限等操作，也可以放到业务代码中办理前设置，或者节点监听器
     * @param listenerVariable 监听器变量
     */
    @Override
    public void notify(ListenerVariable listenerVariable) {
        log.info("流程开始监听器，本次触发的事件类型：" + listenerVariable.getEventType());

        // 本次流程动作的执行上下文，用于设置当前办理人、办理权限等
        WorkflowContext context = listenerVariable.getContext();
        LoginUser user = SecurityUtils.getLoginUser();
        // 设置当前办理人 id
        context.setHandler(user.getUser().getUserId().toString());

        // 设置办理人所拥有的权限，比如角色、部门、用户等
        List<String> permissionList = context.getPermissions();
        if (StringUtils.isEmpty(permissionList)) {
            permissionList = new ArrayList<>();
        }

        List<SysRole> roles = user.getUser().getRoles();
        if (Objects.nonNull(roles)) {
            permissionList.addAll(roles.stream().map(role -> "role:" + role.getRoleId()).collect(Collectors.toList()));
        }
        permissionList.add("dept:" + SecurityUtils.getLoginUser().getUser().getDeptId());
        permissionList.add(user.getUser().getUserId().toString());
        context.setPermissions(permissionList);

        log.info("流程开始监听器结束......");
    }
}
```

@tab assignment 分派

```java
@Component
public class AssignmentListener implements Listener {

    private static final Logger log = LoggerFactory.getLogger(AssignmentListener.class);

    @Override
    public void notify(ListenerVariable variable) {
        log.info("分派监听器开始执行......");
        List<Task> tasks = variable.getNextTasks();
        Instance instance = variable.getInstance();
        for (Task task : tasks) {
            List<String> permissionList = task.getPermissionList();
            // 如果设置了发起人审批，则需要动态替换权限标识
            for (int i = 0; i < permissionList.size(); i++) {
                String permission = permissionList.get(i);
                if (StringUtils.isNotEmpty(permission) && permission.contains(FlowCons.WARMFLOWINITIATOR)) {
                    permissionList.set(i, permission.replace(FlowCons.WARMFLOWINITIATOR, instance.getCreateBy()));
                }
            }
        }
        log.info("分派监听器执行结束......");
    }
}
```

@tab finish 完成

```java
@Component
public class DefFinishListener implements Listener {

    private static final Logger log = LoggerFactory.getLogger(DefFinishListener.class);

    @Resource
    private TestLeaveMapper testLeaveMapper;

    /**
     * 业务表新增或者更新操作，也可以放到业务代码中办理完成后，或者节点监听器
     * @param listenerVariable 监听器变量
     */
    @Override
    public void notify(ListenerVariable listenerVariable) {
        log.info("流程完成监听器");
        Instance instance = listenerVariable.getInstance();
        Map<String, Object> variable = listenerVariable.getVariable();
        if (StringUtils.isNotNull(variable)) {
            String businessId = instance.getBusinessId();
            Object businessType = variable.get("businessType");
            /** 如果{@link com.ruoyi.system.service.impl.TestLeaveServiceImpl}中更新了，这里就不用更新了 */
            // 更新业务数据
            if ("testLeave".equals(businessType)) {
                // 可以统一使用一个流程监听器，不同实体类，不同的操作
                TestLeave testLeave = testLeaveMapper.selectTestLeaveById(businessId);
                if (ObjectUtil.isNull(testLeave)) {
                    testLeave = (TestLeave) variable.get("businessData");
                }
                testLeave.setNodeCode(instance.getNodeCode());
                testLeave.setNodeName(instance.getNodeName());
                testLeave.setNodeType(instance.getNodeType());
                testLeave.setFlowStatus(instance.getFlowStatus());
                // 如果没有实例 id，说明是新增
                if (ObjectUtil.isNull(testLeave.getInstanceId())) {
                    testLeave.setInstanceId(instance.getId());
                    testLeaveMapper.insertTestLeave(testLeave);
                    testLeave.setCreateTime(DateUtils.getNowDate());
                    // 新增抄送人方法，也可发送通知
                    if (StringUtils.isNotNull(testLeave.getAdditionalHandler())) {
                        List<User> users = FlowEngine.userService().structureUser(instance.getId()
                                , testLeave.getAdditionalHandler(), "4");
                        FlowEngine.userService().saveBatch(users);
                    }
                } else {
                    testLeave.setUpdateTime(DateUtils.getNowDate());
                    testLeaveMapper.updateTestLeave(testLeave);
                }
            }
        }

        log.info("流程完成监听器结束......");
    }
}
```

:::

创建监听器在下一个任务生成前执行，适合初始化信息或校验数据是否合法。超时自动审批是典型用法，完整例子见 [监听器 + 节点扩展属性的妙用](../enhance/listenerAndNode.md#_1-2、创建监听器)。

### 3.3、全局监听器

实现 `GlobalListener` 即可，按实际业务需求实现其中一个或多个方法。

```java
/**
 * 全局监听器：整个系统只有一个，任务开始、分派、完成和创建时期执行
 *
 * @author warm
 * @since 2024/11/17
 */
@Component
public class CustomGlobalListener implements GlobalListener {

    private static final Logger log = LoggerFactory.getLogger(CustomGlobalListener.class);

    /**
     * 开始监听器，任务开始办理时执行
     * @param listenerVariable 监听器变量
     */
    public void start(ListenerVariable listenerVariable) {
        log.info("全局开始监听器开始执行......");
        log.info("全局开始监听器执行结束......");
    }

    /**
     * 分派监听器，动态修改待办任务信息
     * @param listenerVariable 监听器变量
     */
    public void assignment(ListenerVariable listenerVariable) {
        log.info("全局分派监听器开始执行......");
        log.info("全局分派监听器执行结束......");
    }

    /**
     * 完成监听器，当前任务完成后执行
     * @param listenerVariable 监听器变量
     */
    public void finish(ListenerVariable listenerVariable) {
        log.info("全局完成监听器开始执行......");
        log.info("全局完成监听器执行结束......");
    }

    /**
     * 创建监听器，任务创建时执行
     * @param listenerVariable 监听器变量
     */
    public void create(ListenerVariable listenerVariable) {
        log.info("全局创建监听器开始执行......");
        log.info("全局创建监听器执行结束......");
    }
}
```

## 4、配置到流程

写好实现类后，再挂到节点、流程定义上。多个监听器时，`listener_type` 用 `,` 分隔，`listener_path` 用 `@@` 分隔，**两个字段按下标一一对应**。

### 4.1、页面配置

::: code-tabs#listener-ui

@tab:active 节点监听器

在流程节点中配置，只作用于当前节点。

<div><img src="https://foruda.gitee.com/images/1732545153700629064/3183155f_2218307.png" width="500"></div>

@tab 流程监听器

在流程定义中配置，作用于当前流程的所有节点。

<div><img src="https://foruda.gitee.com/images/1732548175204139076/1f88c928_2218307.png" width="600px"></div>

:::

### 4.2、字段与匹配规则

| 字段 | 说明 | 示例 |
| :--- | :--- | :--- |
| `listener_type` | 监听器类型，多个用 `,` 分隔 | `start,finish` |
| `listener_path` | 监听器路径，支持类包名和表达式，多个用 `@@` 分隔 | `com.xx.StartListener@@com.xx.FinishListener` |

默认支持内置 SpEL 表达式，也支持扩展，例如：

```text
#{@assignmentExpListener.notify(#listenerVariable)}
```

匹配规则：默认先判断是否是监听器表达式，再尝试加载类路径。表达式扩展见 [监听器表达式扩展](../enhance/listener_two_open.md)。

### 4.3、监听器下拉框

> 配置下拉框后，页面上可以直接选择监听器，不必手动输入类路径

<div><img src="https://foruda.gitee.com/images/1773978545571972576/2f631819_2218307.png" width="800px"></div>

实现 `ListenerListService.listenerList()`，返回 `List<ListenerVo>`：

```java
public interface ListenerListService {

    List<ListenerVo> listenerList();

}
```

```java
/**
 * 获取监听器列表
 *
 * @author warm
 * @since 2026/3/20
 */
@Service
public class ListenerListServiceImpl implements ListenerListService {

    @Override
    public List<ListenerVo> listenerList() {
        List<ListenerVo> listenerList = new ArrayList<>();
        listenerList.add(new ListenerVo("create", "com.ruoyi.system.listener.AutoApprovalListener", "超时自动审批监听器"));
        listenerList.add(new ListenerVo("finish", "com.ruoyi.system.listener.HttplListener", "远程请求监听器"));
        listenerList.add(new ListenerVo("finish", "com.ruoyi.system.listener.ScriptlListener", "脚本监听器"));
        listenerList.add(new ListenerVo("start", "com.ruoyi.system.listener.StartListener", "开始监听器"));
        listenerList.add(new ListenerVo("assignment", "com.ruoyi.system.listener.AssignmentListener", "分派监听器"));
        listenerList.add(new ListenerVo("finish", "com.ruoyi.system.listener.FinishListener", "完成监听器"));
        listenerList.add(new ListenerVo("create", "com.ruoyi.system.listener.CreateListener", "创建监听器"));
        return listenerList;
    }
}
```

## 5、进阶

### 5.1、监听器参数

路径可写成 `类路径({json})`，引擎会把括号内的内容放入流程变量 `FlowCons.WARM_LISTENER_PARAM`：

```text
com.xx.FinishListener({"name":"John Doe","age":30})
```

<div><img src="https://foruda.gitee.com/images/1732548102324679120/544ff483_2218307.png" width="600px"></div>

```java
public void notify(ListenerVariable variable) {
    Map<String, Object> variableMap = variable.getVariable();
    // 拿到 json 后使用序列化可以拿到配置信息
    if (MapUtil.isNotEmpty(variableMap)) {
        Object o = variableMap.get(FlowCons.WARM_LISTENER_PARAM);
        HashMap hashMap = JSONObject.parseObject(JSONObject.toJSONString(o), HashMap.class);
    }
    log.info("创建监听器结束");
}
```

### 5.2、区分事件类型

<a id="_5-2、区分事件类型"></a>

> v2.0.0 起，监听器上下文新增 `eventType`，表示本次实际触发的事件类型，取值见 `Listener` 接口中的事件常量

同一个监听器可以同时配置在多种事件上（比如 `start,finish`）。如果需要在实现类中区分本次是哪种事件，直接读取 `eventType`：

```java
public void notify(ListenerVariable variable) {
    // create、start、assignment、finish
    String eventType = variable.getEventType();
    if (Listener.LISTENER_START.equals(eventType)) {
        // 开始监听器逻辑
    } else if (Listener.LISTENER_FINISH.equals(eventType)) {
        // 完成监听器逻辑
    }
}
```
