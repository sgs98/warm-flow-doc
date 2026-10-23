# SPI 扩展点

::: tip
- warm-flow 的扩展点在 2.0.1 版本后收敛为两级：<span class="wf-em">业务扩展点</span> 和 <span class="wf-em">引擎内部策略</span>
- 业务扩展点主要放在 `org.dromara.warm.flow.core.spi` 包；`EventPublisher` 位于 `org.dromara.warm.flow.core.service.event`，同样通过 Bean 注册后生效
- 引擎内部策略放在 `org.dromara.warm.flow.core.strategy` 包，业务方一般无需触碰
:::

## 1、两级扩展点模型

扩展点的归属按一条标准划分：<span class="wf-em">是否有引擎之外的模块或业务需要为它提供实现</span>。有的才放进 `spi` 包；只为引擎内部服务的（策略模式内部实现）放 `strategy` 包。

| 层级 | 所在包 | 谁来实现 | 注册方式 |
| :--- | :--- | :--- | :--- |
| 业务扩展点 | `core/spi`，`EventPublisher` 在 `core/service/event` | 宿主业务方 | Spring Bean（`@Component` / `@Bean`），或 `FlowEngine.initXxx(...)` |
| 引擎内部策略 | `core/strategy` | 引擎内置 + 表达式扩展模块 | `ExpressionUtil.setExpression(...)` 程序化注册 |

```
warm-flow-core
├── org.dromara.warm.flow.core.spi            ← 业务扩展点契约（业务方实现）
│   ├── Listener / GlobalListener             节点监听器 / 全局监听器
│   ├── PermissionHandler                     办理人与权限
│   ├── DataFillHandler                       数据填充
│   ├── TenantHandler                         多租户
│   ├── StatusMapper                          状态编码映射
│   ├── ListenerVariable                      监听器上下文（随契约提供）
│   └── impl/DefaultStatusMapper              兜底实现
└── org.dromara.warm.flow.core.strategy       ← 引擎内部策略（一般无需实现）
    ├── ExpressionStrategy                    表达式策略基接口
    ├── ConditionStrategy                     条件表达式（eq@@、spel@@ 等）
    ├── HandlerStrategy                       办理人表达式（$、#）
    ├── ListenerStrategy                      监听器表达式（#）
    ├── ServiceTaskStrategy                   服务任务表达式（#）
    ├── VoteSignStrategy                      票签表达式
    ├── GatewayStrategy                       网关路由
    ├── DefaultHandlerStrategy                办理人变量兜底
    ├── condition/                            内置条件策略
    └── gateway/                              内置网关策略
```

## 2、业务扩展点总览

| 接口 | 职责 | 触发时机 | 引擎兜底 |
| :--- | :--- | :--- | :--- |
| `Listener` | 节点监听器 | 节点创建 / 开始 / 分派 / 完成 | 无，按需实现 |
| `GlobalListener` | 全局监听器 | 所有流程的同一组事件 | 无，整个系统最多一个 |
| `PermissionHandler` | 当前用户权限与办理人标识 | 任务权限匹配、办理人入库 | 无，必须提供 |
| `DataFillHandler` | 实体字段自动填充 | 实体保存 / 更新前 | default 方法内置默认行为 |
| `TenantHandler` | 多租户隔离 | ORM 查询 / 保存 / 逻辑删除 | 无，未注册即不启用租户 |
| `StatusMapper` | 状态语义 → 宿主状态编码 | 状态持久化与终态判断 | `DefaultStatusMapper`（空透传） |
| `EventPublisher`（`core.service.event`） | 消息抛出 / 消息结束发布器 | 到达 `MESSAGE_THROW` / `MESSAGE_END` | 无，未注册时上报 `EVENT_PUBLISHER_MISSING` 并跳过 |

::: warning 与旧版本的差异
自 2.0.1 起，`warm-flow.global-listener-path` 配置项已移除。全局监听器按 SPI/Bean 方式注册：实现 `GlobalListener` 并交给容器管理即可，不再支持类路径字符串配置。
:::

## 3、注册方式

### 3.1、Spring / Spring Boot（推荐）

实现接口后加 `@Component`（或 `@Bean`）即可。Spring Boot 适配模块启动时会把 `ApplicationContext` 挂载到 `FrameInvoker`，引擎统一通过 `FrameInvoker.getBean(...)` 按类型查找实现：

```java
@Component
public class DemoPermissionHandler implements PermissionHandler {

    @Override
    public List<String> permissions() {
        // 返回当前用户的权限集合：用户 id、角色、部门等
        return UserContextHolder.get().getPermissionFlags();
    }

    @Override
    public String getHandler() {
        // 当前办理人唯一标识（通常是用户 id），用于记录发起人、办理人
        return UserContextHolder.get().getUserId();
    }
}
```

### 3.2、非 Spring 环境

没有 IoC 容器时，启动前手动向 `FrameInvoker` 注册按类型取实例的函数：

```java
Map<Class<?>, Object> registry = new HashMap<>();
registry.put(PermissionHandler.class, new MyPermissionHandler());
registry.put(DataFillHandler.class, new MyDataFillHandler());

FrameInvoker.setBeanFunction(registry::get);
```

部分扩展点也支持在 `FlowEngine` 初始化时直接指定实现类全路径（先类路径、再容器、最后兜底）：

```java
FlowEngine.initPermissionHandler("com.xxx.MyPermissionHandler");
FlowEngine.initDataFillHandler(null);   // 传 null 则只走容器 + 兜底
FlowEngine.initStatusMapper(null);      // 未注册时回退 DefaultStatusMapper
```

### 3.3、全局监听器只认 Bean

```java
@Component
public class DemoGlobalListener implements GlobalListener {

    @Override
    public void start(ListenerVariable listenerVariable) {
        // 所有流程的任务开始事件都会到这里
    }

    @Override
    public void assignment(ListenerVariable listenerVariable) {
        // 可在此按节点编码动态指定办理人
    }
}
```

## 4、各扩展点用法

### 4.1、Listener 节点监听器

在设计器节点属性面板「节点监听器」中，按事件（`create` / `start` / `assignment` / `finish`）配置实现类的全路径（对应容器中的 Bean）。同一个节点可配置多个监听器。

```java
@Component
public class DemoTaskListener implements Listener {

    @Override
    public void notify(ListenerVariable listenerVariable) {
        // listenerVariable 携带 definition / instance / node / task / variable 等上下文
        // 通过 eventType 区分本次触发的事件类型
    }
}
```

监听器事件的触发时机、执行顺序（节点级 → 全局级）详见 [监听器](./listener.md)。

### 4.2、GlobalListener 全局监听器

接口方法与 `Listener` 的事件一一对应（`create` / `start` / `assignment` / `finish`），全部是 default 方法，按需实现其中一个或多个。整个系统只能注册一个，对全部流程生效。典型用途：统一办理人分配、全局日志审计。

### 4.3、PermissionHandler 办理人与权限

| 方法 | 用途 |
| :--- | :--- |
| `permissions()` | 当前用户权限集合，用于匹配节点配置的办理权限 |
| `getHandler()` | 当前办理人唯一标识（用户 id），用于入库记录发起人 / 办理人 |
| `convertPermissions(...)` | 可选。把设计器里配置的角色 / 部门标识转换成真实用户 id |
| `resolveCopyHandlers(...)` | 可选。把抄送人标识展开为具体用户；默认复用 `convertPermissions` |

详见 [办理人权限处理器](../primary/permission_handler.md)。

### 4.4、DataFillHandler 数据填充

接口方法均为 default 实现，按需覆盖：

| 方法 | 默认行为 |
| :--- | :--- |
| `idFill(...)` | 实体 id 为空时用 `IdUtils.nextId()` 生成主键 |
| `insertFill(...)` | 填充创建 / 更新时间，并尝试写入 createBy / updateBy |
| `updateFill(...)` | 填充更新时间与 updateBy |

详见 [数据填充处理器](../primary/datafillhandler.md)。

### 4.5、TenantHandler 多租户

只含一个方法 `getTenantId()`，返回当前租户 id。ORM 适配层会把它拼进查询、保存和逻辑删除条件，实现按租户隔离流程数据。详见 [多租户](./tenant.md)。

### 4.6、StatusMapper 状态编码映射

引擎内部统一使用状态语义（`FlowStatus` / `TaskStatus`），落库前通过该扩展点映射为宿主系统的状态编码：

| 方法 | 用途 |
| :--- | :--- |
| `instanceStatus(FlowStatus)` | 实例状态语义 → 宿主实例状态编码 |
| `taskStatus(TaskStatus)` | 任务状态语义 → 宿主任务状态编码 |
| `cooperateStatus(CooperateType)` | 转办 / 委派 / 加签 / 减签留下的历史状态编码 |
| `isTerminal(String)` | 判断编码是否为实例终态 |
| `label(String)` / `taskLabel(String)` | 按实例 / 任务维度解析展示文案 |

未实现时使用兜底 `DefaultStatusMapper`（空透传，直接用语义 key 作为编码）。自定义状态编码详见 [自定义状态](../enhance/customstatus.md)。

## 5、引擎内部策略（一般无需实现）

`strategy` 包是引擎的内部扩展区，核心是 `ExpressionStrategy` 表达式策略族：core 只定义统一的「前缀路由 + 表达式执行」契约，具体表达式实现由内置策略或表达式扩展模块注册。

**前缀路由规则**：`ExpressionUtil` 根据表达式前缀选择策略，<span class="wf-em">后注册的同类型策略优先匹配</span>。

| 表达式示例 | 策略族 | 说明 |
| :--- | :--- | :--- |
| `eq@@flag\|4` | ConditionStrategy | 内置条件表达式（eq / ne / gt / ge / lt / le / like / notLike） |
| `spel@@#{@xxx.check(...)}` | ConditionStrategy / VoteSignStrategy | SpEL 条件 / 票签（sb 扩展模块注册） |
| `${flag}` | HandlerStrategy | 办理人变量表达式（内置 `DefaultHandlerStrategy`，前缀 `$`） |
| `#{...}` | HandlerStrategy / ListenerStrategy / ServiceTaskStrategy | SpEL 办理人 / 监听器 / 服务任务（sb 扩展模块注册） |

内置条件策略在 `core/strategy/condition`，SpEL 实现在 `warm-flow-plugin-modes-sb` 的 `BeanConfig` 中注册：

```java
// warm-flow-plugin-modes-sb 启动时统一注册
ExpressionUtil.setExpression(new ConditionStrategySpel());
ExpressionUtil.setExpression(new ListenerStrategySpel());
ExpressionUtil.setExpression(new HandlerStrategySpel());
ExpressionUtil.setExpression(new ServiceTaskStrategySpel());
ExpressionUtil.setExpression(new VoteSignStrategySpel());
```

业务方如果需要新的表达式语法（自定义前缀），参考 [变量与表达式扩展](./variableStategy.md) 实现 `ExpressionStrategy` 子接口并调用 `ExpressionUtil.setExpression(...)` 注册即可。

## 6、兜底实现的归属规则

兜底实现<span class="wf-em">跟着接口走</span>：

- 接口在 `spi` 包 → 兜底在 `spi.impl` 子包（如 `DefaultStatusMapper`）
- 接口在 `strategy` 包 → 兜底在 `strategy` 包（如 `DefaultHandlerStrategy`，办理人 `${flag}` 变量表达式的兜底）

两者是不同机制的兜底，<span class="wf-em">并非重复</span>：`DefaultStatusMapper` 兜的是「状态语义 → 编码」的映射，`DefaultHandlerStrategy` 兜的是「办理人变量表达式」的解析。

## 7、如何选择扩展方式

| 需求 | 用什么 |
| :--- | :--- |
| 某个节点办理时发消息、改业务表 | `Listener`（节点监听器） |
| 所有流程统一拦截（审计、办理人分配） | `GlobalListener` |
| 接入登录用户 / 权限体系 | `PermissionHandler` |
| 实体审计字段自动填充 | `DataFillHandler` |
| 多租户隔离 | `TenantHandler` |
| 对接宿主系统自己的状态编码 | `StatusMapper` |
| 消息抛出 / 消息结束回调宿主系统 | `EventPublisher` |
| 把部门 / 角色等抄送标识展开成具体用户 | `PermissionHandler#resolveCopyHandlers` |
| 新的条件 / 办理人表达式语法 | `ExpressionStrategy` + `ExpressionUtil.setExpression` |
| 流程节点 / 连线上的动态业务数据 | 节点扩展属性，见 [节点扩展属性](./node_ext.md) |
