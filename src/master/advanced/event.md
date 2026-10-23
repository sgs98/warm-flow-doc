# 流程事件与内置定时器

::: tip
- warm-flow 内置**流程事件**能力，用于表达流程里的「**等待**」与「**异常路由**」：延迟一段时间、等一个外部消息、任务超时打断、把结果抛给外部系统。
- 配合**内置定时器**，定时类事件无需外部调度器（xxl-job / quartz）即可运行；扫描线程由引擎自己管理，状态全在数据库，重启自动恢复。
- 事件能力**默认关闭**，需要先**建表**再**打开开关**，见 [5、开启事件能力](#_5、开启事件能力)。
- 想直接跑通：看 [5.4 接入清单](#_5-4、接入清单-从上到下照做) → [13、完整示例](#_13、完整示例)；出问题看 [12.2 运行期排查](#_12-2、运行期排查-触发后「没反应」)。
:::

## 1、概念模型

- 事件是挂在**中间节点**（`nodeType = 1`）上的特殊节点，用 `flow_node` 的 4 个事件列声明，**不新增 `NodeType`**。
- 事件节点**不是审批任务**：流程走到事件节点时会「停在」该节点等待，**不会生成 `flow_task`**，也不会伪造审批历史。
- 等待状态统一落在 **`flow_event_wait`** 表，状态独立于 `flow_status`：
  `WAITING`（等待中）/ `RUNNING`（已被执行器抢占）/ `RETRY`（上次处理失败待重试）/ `DEAD`（超过最大重试）/ `CANCELLED`（已取消）。
- 事件类型由 `EventType` 枚举承载。注意与监听器里的 `ListenerVariable.eventType`（create / start / finish / assignment）**含义不同**，两者不要混用「事件类型」这个词；在监听器里取节点事件类型用 `listenerVariable.getNode().getEventType()`。

## 2、事件类型一览

`EventType` 共 11 种，全部配置在**中间节点**上：

| eventType | 位置 | 说明 |
| --- | --- | --- |
| `MESSAGE_START` | `START` 之后 | 消息启动：外部按 `flowCode + 消息名` 启动实例 |
| `TIMER_START` | `START` 之后 | 定时启动：到期后由引擎自动创建实例 |
| `TIMER_CATCH` | 中间 | 定时捕获：延迟 / 间隔到期后继续 |
| `MESSAGE_CATCH` | 中间 | 消息捕获：等待外部按 `实例 + 消息名` 回调 |
| `MESSAGE_THROW` | 中间 | 消息抛出：通过 `EventPublisher` 向外部系统发消息 |
| `TIMER_BOUNDARY` | 边界（附着任务） | 任务超时，中断当前任务并走事件出口 |
| `MESSAGE_BOUNDARY` | 边界（附着任务） | 收到外部消息，中断当前任务并走事件出口 |
| `ERROR_CATCH` | 中间 | 等待实例抛出的指定错误码 |
| `ERROR_BOUNDARY` | 边界（附着任务） | 任务抛出匹配错误码，中断当前任务并走事件出口 |
| `TERMINATE_END` | `END` 之前 | 终止结束：中断其它活动任务与等待记录，实例状态置「终止」（不是「已完成」） |
| `MESSAGE_END` | `END` 之前 | 消息结束：向外部发消息成功后进入 `END` |

固定 `START` / `END` 节点**不承载事件**（`event_type` 为空表示无事件），不需要 `NONE_START` / `NONE_END`。

**按业务需求选型**（先看要做什么，再看它属于哪一类）：

| 我想表达的业务 | 用哪个事件 | 谁来触发 | 详见 |
| --- | --- | --- | --- |
| 到点自动发起一笔流程（每天巡检、合同到期续签） | `TIMER_START` | 引擎定时器 | [6.3](#_6-3、定时启动-timer-start) |
| 业务动作发生时发起流程（支付成功、合同签署） | `MESSAGE_START` | 宿主调 `startByMessage` | [7.1](#_7-1、消息启动-message-start) |
| 流程中间等一段时间再继续（冷静期、冷却期） | `TIMER_CATCH` | 引擎定时器 | [6.4](#_6-4、定时捕获-timer-catch) |
| 流程中间等外部系统答复（风控结果、征信返回） | `MESSAGE_CATCH` | 宿主调 `triggerMessage` | [7.2](#_7-2、消息捕获-message-catch) |
| 审批超过 N 时间没人办就改道（超时升级、自动改派） | `TIMER_BOUNDARY` | 引擎定时器 | [6.5](#_6-5、定时边界-timer-boundary) |
| 审批期间收到外部消息就改道（支付成功立即放行） | `MESSAGE_BOUNDARY` | 宿主调 `triggerMessage` | [7.2](#_7-2、消息捕获-message-catch) |
| 业务办理失败改走善后支路 | 实例级 `ERROR_CATCH` / 任务级 `ERROR_BOUNDARY` | 宿主调 `throwError` | [8](#_8、错误事件) |
| 办完通知外部系统，但流程继续往下走 | `MESSAGE_THROW` | 到达即回调 `EventPublisher` | [7.3](#_7-3、消息抛出-消息结束) |
| 结束前通知外部系统 | `MESSAGE_END` | 到达即回调 `EventPublisher` | [7.3](#_7-3、消息抛出-消息结束) |
| 要中断所有在办任务与等待、直接收口 | `TERMINATE_END` | 到达即执行 | [7.3](#_7-3、消息抛出-消息结束) |

按运行行为归为四类，理解了分类就理解了全部事件：

| 行为类别 | 事件 | 核心行为 |
| --- | --- | --- |
| **造实例**（流程还不存在） | 定时启动 / 消息启动 | 引擎按计划 / 宿主按消息自动发起实例；与手动启动互斥 |
| **停下来等**（流程停驻，无待办） | 定时捕获 / 消息捕获 / 错误捕获 | 等时间到 / 等宿主回调 / 等实例内抛错；条件满足沿出口继续 |
| **给别人上闹钟**（附着在任务上） | 定时边界 / 消息边界 / 错误边界 | 任务办完则闹钟取消；超时 / 收到消息 / 抛错则中断任务走异常出口 |
| **到达即执行**（不等待） | 消息抛出 / 消息结束 / 终止结束 | 发消息后继续 / 发消息后进结束 / 中断一切并置终态 |

行为图解分布在下文各类型章节：[定时捕获 vs 定时边界](#_6-5、定时边界-timer-boundary)、[两种启动](#_7-1、消息启动-message-start)、[抛出与结束](#_7-3、消息抛出-消息结束)、[三种捕获](#_8、错误事件)。

## 3、在设计器中配置

经典与仿钉钉两种设计器均支持全部 11 类事件，配置入口分两条路：

### 3.1、创建事件节点

- **捕获 / 边界事件**：从左侧「事件节点」区拖入。定时事件、消息事件、错误事件是捕获节点；边界事件是独立节点，拖入后在其面板「附着任务节点」下拉选择要挂的审批节点。
- **启动 / 抛出 / 结束事件**：拖一个普通中间节点，在属性面板「事件」区选择类型。类型下拉按拓扑位置自动过滤，与后端发布校验一致：

| 当前节点位置 | 可选类型 |
| --- | --- |
| 流程中间任意位置 | 捕获（定时 / 消息 / 错误）、抛出（消息） |
| 紧邻固定开始节点 | 上行全部 + 启动（定时 / 消息启动） |
| 直连固定结束节点 | 上行全部 + 结束（终止 / 消息结束） |
| —（不可选） | 边界事件只能拖入侧栏「边界事件」节点 |

- **类别锁定**：节点选定事件类型后，下拉只显示同类别选项（如捕获节点只能在三种捕获间切换）；想换成别的类别，删掉重拖。
- 已被边界事件附着的普通节点，事件摘要会显示「已被 N 个边界事件附着」；此时把它转成事件节点会使附着失效，需先在边界事件面板更换附着目标。

### 3.2、定时配置选择器

三种定时策略均通过选择器配置，自动生成 ISO-8601 持久化值，无需手写格式：

- **延迟时长 / 固定间隔**：「数值 + 单位」（秒 / 分钟 / 小时 / 天），如 `1 + 天` 等价于 `P1D`、`30 + 秒` 等价于 `PT30S`。
- **指定时间点**：时间选择器列表，可添加多个每日触发时刻（最多 8 个），生成 `["09:00","18:00"]`。
- **时区**：可搜索下拉，预置常用时区也允许手填（如 `Asia/Shanghai`），留空取引擎默认。
- **重复次数**：仅 `FIXED` 有效，留空不限次数。
- **高级模式**：`P1DT12H` 这类组合时长选择器表达不了，会自动切到高级模式手写；改成单一单位后可点「返回选择器」切回。

### 3.3、事件摘要

节点折叠摘要用中文展示事件配置，如「定时捕获 · 延迟时长 1 天」「指定时间点 09:00、18:00」「错误捕获 · 通配」，便于在画布上快速识别。

## 4、节点字段与 JSON 配置

### 4.1、节点事件字段

`flow_node` 新增 4 列（其余 4 套数据库脚本已同步）：

| 字段 | 列名 | 说明 |
| --- | --- | --- |
| `eventType` | `event_type` | 事件类型，取值见上表 |
| `eventName` | `event_name` | 消息名称（消息事件）/ 错误码（错误事件） |
| `attachedToNodeCode` | `attached_to_node_code` | 边界事件附着的任务节点编码 |
| `interrupting` | `interrupting` | 是否中断型；当前边界事件固定为 `true` |

### 4.2、定时配置（`node_config` 的 `event` 段）

定时参数**不新增列**，复用已有的 `flow_node.node_config`，放在 `event` 段（与服务任务的 `serviceTask` 段并列，同一节点不会同时出现两段）：

```json
{
  "event": {
    "timerType": "AFTER",
    "timerValue": "P3D",
    "timezone": "Asia/Shanghai"
  }
}
```

消息 / 错误事件不需要定时参数，`event` 段可以为空。

#### 节点默认流程变量（`variables`）

**每个节点都能配**，不局限于事件节点。用处是给后续的条件网关兜底：某个变量这一单不一定传，
但网关条件要拿它求值（缺了会报「跳转条件不能为空」），就在前面的节点或网关自身上配个默认值。

变量写在 `node_config` 的**顶层**（与 `event` / `serviceTask` 并列）：

```json
{
  "variables": {
    "veto": 0,
    "channel": "daily"
  },
  "event": {
    "timerType": "POINT_IN_TIME",
    "timerValue": "[\"09:00\"]",
    "timezone": "Asia/Shanghai"
  }
}
```

生效规则：

| 规则 | 说明 |
| --- | --- |
| 何时补充 | 流程**走到该节点**时（含网关自身），补充后可供它后面的条件出线求值 |
| 是否覆盖 | **不覆盖**——只有变量还不存在时才写入；办理时传入的同名变量优先 |
| 落库 | 随本次变量写入实例的 `flow_instance.variable`，后续节点都能读到 |
| 定时 / 消息启动 | 没有调用方时同样生效，并且发布即写入等待记录 `payload`，重试 / 租约恢复后仍可读 |

::: tip 「默认」的含义
它是**兜底默认值**而不是「赋值」，所以先到节点的默认值不会被后节点的默认值顶掉，
也不会盖住业务实时传入的值。想让办理时传的值生效，两侧用同一个 key 即可。
:::

早期版本把默认变量嵌在 `event` 段里（`node_config.event.variables`），
新版本的节点级写法优先，读不到时会回落到旧位置，**存量 JSON 不需要迁移**。

### 4.3、设计器 / 导入 JSON

```json
{
  "nodeType": 1,
  "nodeCode": "approveTimeout",
  "nodeName": "审批超时",
  "eventType": "TIMER_BOUNDARY",
  "attachedToNodeCode": "approve",
  "interrupting": true,
  "nodeConfig": "{\"event\":{\"timerType\":\"AFTER\",\"timerValue\":\"P3D\",\"timezone\":\"Asia/Shanghai\"}}"
}
```

## 5、开启事件能力

### 5.1、建表

按所用数据库执行脚本（`flow_event_wait` 表 + `flow_node` 4 个事件列）：

| 数据库 | 脚本 |
| --- | --- |
| MySQL | 全量 `sql/mysql/warm-flow-all.sql`，或升级脚本 `sql/mysql/v1-upgrade/warm-flow_2.1.0.sql` |
| Oracle | `sql/oracle/oracle-wram-flow-all.sql` |
| PostgreSQL | `sql/postgresql/postgresql-warm-flow-all.sql` |
| SQL Server | `sql/sqlserver/sqlserver.sql` |

::: warning
只升级 jar 而不建表时，定时器会 **fail-soft 自动停用**（不会周期报错），因此必须显式建表后再打开开关。
:::

### 5.2、yml 配置

```yml
warm-flow:
  # 事件能力总开关，默认 false
  timer-enabled: true
  # 定时 / 消息触发时的系统操作人（实例、历史 createBy 的兜底身份），默认 system
  system-handler: system
  # 定时器执行线程池大小，默认 2
  timer-pool-size: 2
  # 扫描间隔（毫秒），默认 5000
  timer-scan-interval: 5000
  # 单轮扫描目标条数，默认 100
  timer-batch-size: 100
  # 单轮每个状态最多扫描页数，默认 10
  timer-max-scan-pages: 10
  # 抢占租约时长（秒），默认 60
  timer-lease-seconds: 60
  # 最大重试次数，超过后等待记录转为 DEAD，默认 3
  timer-max-retry-count: 3
  # 执行器租约续期间隔（毫秒），默认 20000
  timer-lease-renew-interval: 20000
```

### 5.3、注册消息发布器

只有用到 `MESSAGE_THROW` / `MESSAGE_END` 时才需要。引擎按类型从容器取 `EventPublisher`（`FlowEngine.eventPublisher()`），**全局一个**——所有流程定义、所有实例共用，流程定义与节点上不需要也无法指定发布器：

```java
import org.dromara.warm.flow.core.service.event.EventMessage;
import org.dromara.warm.flow.core.service.event.EventPublisher;

@Component
public class MyEventPublisher implements EventPublisher {

    @Override
    public void publish(EventMessage message) {
        // 接到 HTTP / MQ / 业务事件总线
        // 注意：与流程推进在同一事务内同步调用，抛异常即整体回滚并进入重试
    }
}
```

::: warning 四个容易踩的点
- **未注册不会报错**：只打一条 `未注册 EventPublisher，消息事件 MESSAGE_THROW(membership.cancelled) 发布被跳过 node=xxx` 的 WARN，流程照常继续。排查「消息没发出去」先看有没有这条 WARN。
- **不要注册多个 `EventPublisher` Bean**：按类型取会因不唯一而失败，被引擎吞掉后等价于未注册（静默跳过 + WARN），同样很难查。
- **引擎不分发**：到达 `MESSAGE_THROW` / `MESSAGE_END` 节点只会无脑回调一次 `publish`，不做消息名路由。「按事件名分发」是宿主自己的事。
- **取 Bean 的能力来自 Spring 模式插件**：`FrameInvoker.setBeanFunction(SpringUtil::getBean)` 由 `warm-flow-plugin-modes-sb` 的 `BeanConfig` 注入；没引入该插件（或非容器环境）时 `getBean` 直接返回 `null`，同样等价于「未注册」。非容器场景可以自己调 `FrameInvoker.setBeanFunction(...)` 返回发布器实例。
:::

按事件名分发的两种写法：

```java
// 写法一：发布器内分支，决定投到哪个 topic / 哪个回调地址
@Override
public void publish(EventMessage message) {
    switch (message.getEventName()) {
        case "membership.cancelled" -> mqTemplate.syncSend("topic-cancel", message);
        case "refund.finish" -> mqTemplate.syncSend("topic-refund", message);
        default -> log.info("忽略未订阅的消息：{}", message.getEventName());
    }
}
```

```java
// 写法二：发布器统一投递（Spring 事件 / MQ 消费端都适用），订阅侧按事件名过滤
@EventListener(condition = "#message.eventName == 'membership.cancelled'")   // 编译需开启 -parameters，否则写 #p0.eventName
public void onMembershipCancelled(EventMessage message) {
    // 真实业务动作：发通知、调第三方、驱动下一个流程……
}
```

三种常见投递实现（可靠性递增）：

**（1）发消息队列**

```java
@Component
@RequiredArgsConstructor
public class MqEventPublisher implements EventPublisher {

    private final RocketMQTemplate rocketMQTemplate;

    @Override
    public void publish(EventMessage message) {
        // 用消息名做 topic / tag，消费端按事件名订阅
        rocketMQTemplate.syncSend("flow-event:" + message.getEventName(), message);
    }
}
```

**（2）调第三方 HTTP 回调**

```java
@Component
@RequiredArgsConstructor
public class HttpEventPublisher implements EventPublisher {

    private final RestClient restClient;

    @Override
    public void publish(EventMessage message) {
        restClient.post()
            .uri("https://biz.example.com/hooks/flow-event")
            .header("X-Event-Name", message.getEventName())
            .body(Map.of("instanceId", message.getInstanceId()
                , "nodeCode", message.getNodeCode(), "payload", message.getPayload()))
            .retrieve()
            .toBodilessEntity();
    }
}
```

**（3）可靠投递：Outbox + 幂等（生产推荐）**

发布是同步、同事务的，`publish` 里抛异常会让上游流程一起回滚。既想「投递失败不影响主流程」又「不丢消息」，就同事务写 Outbox，再由异步任务投递：

```java
@Component
@RequiredArgsConstructor
public class OutboxEventPublisher implements EventPublisher {

    private final EventOutboxMapper outboxMapper;

    @Override
    public void publish(EventMessage message) {
        EventOutbox row = new EventOutbox();
        // 幂等键：同一实例 + 同一节点 + 同一事件名只入库一次（表上加唯一索引）
        row.setEventKey(message.getInstanceId() + "#" + message.getNodeCode() + "#" + message.getEventName());
        row.setEventName(message.getEventName());
        row.setPayload(FlowEngine.jsonConvert().objToStr(message.getPayload()));
        row.setStatus("PENDING");
        outboxMapper.insert(row);   // 与流程同一事务：流程提交即入库，回滚则一起撤销
    }
}
// 另起定时任务扫描 PENDING → 投递 MQ / HTTP → 成功置 SENT，失败累加重试次数，超阈值转人工
```

要求「投递失败必须回滚流程」时，让异常直接抛出（不要 catch）即可，这是引擎的默认语义。

::: tip 至少一次
引擎是**至少一次**语义，宿主侧必须幂等：按业务幂等键（实例 + 节点 + 事件名）去重，或把上面的 `eventKey` 建成唯一索引。
:::

### 5.4、接入清单（从上到下照做）

| # | 做什么 | 什么时候必须做 | 详见 |
| --- | --- | --- | --- |
| 1 | 建 `flow_event_wait` 表 + `flow_node` 4 个事件列 | **总是**（不建表定时器会 fail-soft 自动停用） | [5.1](#_5-1、建表) |
| 2 | 配置 `warm-flow.timer-enabled: true` | 用到定时类事件（`TIMER_*`） | [5.2](#_5-2、yml-配置) |
| 3 | 注册 `EventPublisher` Bean | 用到 `MESSAGE_THROW` / `MESSAGE_END` | [5.3](#_5-3、注册消息发布器) |
| 4 | 配好事件节点，**发布并激活**定义 | **总是** | [3](#_3、在设计器中配置) / [4](#_4、节点字段与-json-配置) |
| 5 | 宿主侧调用触发 API | 消息类（`startByMessage` / `triggerMessage`）、错误类（`throwError`） | [7](#_7、消息事件) / [8](#_8、错误事件) |
| 6 | 观察等待记录、定位问题 | 接入与排查阶段 | [9](#_9、查询等待中的事件) / [11](#_11、等待记录生命周期) |

三条最容易漏的前提：

- **事件能力默认关闭**：`timer-enabled=false` 时定时类事件不会触发；消息 / 错误类事件不依赖该开关（它们是宿主直接调 API 驱动的），但依赖定义已发布。
- **定义必须「已发布 + 未挂起」**：否则 `startByMessage` 报 `流程定义不存在!`，`TIMER_START` 也不会创建等待记录。
- **事件节点不产生待办**：停在事件节点的实例在待办 / 已办列表里看不到任何东西，只能靠 [第 9 节](#_9、查询等待中的事件) 的事件视图确认。

## 6、定时事件

### 6.1、时间格式

时间值使用 JDK `java.time` 的 ISO-8601 格式：

```text
PT30M   30 分钟
PT1H    1 小时
P1D     1 天
P3D     3 天
```

core **不引入**第三方 Cron 依赖；每天固定时间点用 `POINT_IN_TIME` 覆盖。

### 6.2、三种定时策略

| timerType | 含义 | 计算方式 | 适用 |
| --- | --- | --- | --- |
| `AFTER` | 单次延迟 | `当前时间 + 时长` | 审批后等待 3 天、任务创建后 30 分钟超时 |
| `FIXED` | 固定间隔 | `上次触发时间 + 时长` | 每小时、每天间隔执行 |
| `POINT_IN_TIME` | 指定时间点 | 取下一个大于当前时间的 `HH:mm` | 每天 09:00、每天 09:00 与 18:00 |

配置示例：

```json
// 延迟 3 天
{ "timerType": "AFTER", "timerValue": "P3D", "timezone": "Asia/Shanghai" }

// 每 1 小时，最多 24 次
{ "timerType": "FIXED", "timerValue": "PT1H", "maxCount": 24, "timezone": "Asia/Shanghai" }

// 每天 09:00 和 18:00
{ "timerType": "POINT_IN_TIME", "timerValue": "[\"09:00\",\"18:00\"]", "timezone": "Asia/Shanghai" }
```

### 6.3、定时启动 TIMER_START

**一句话**：流程定义发布后，引擎按你配的计划**自动发起流程实例**，全程不需要人调用启动接口。

**行为过程**：

1. 定义发布且处于激活状态时，引擎为该节点创建一条**定义级**等待记录（`definition_id` 有值、`instance_id` 为空）——此时还没有任何实例。
2. 到达计划时间，引擎自动创建流程实例并推进到下一个节点，`flow_event_wait` 里看得到这次触发的时间与状态。
3. 到点触发失败（如数据库异常）会自动重试，超过重试上限转 `DEAD`，不会静默丢失。

**业务场景**：合同到期自动发起续签评审；每天 09:00 自动发起一轮数据巡检流程；试用期届满自动发起转正审批。

**需要配置**：定时策略（AFTER / FIXED / POINT_IN_TIME）与时间值，见 [6.2](#_6-2、三种定时策略)。

**注意**：

- 这类流程**不支持手动启动**（会报「该流程由启动事件触发，不支持手动启动」）。
- 业务 ID 由引擎生成：`T{等待行id}_{计划触发时间毫秒}`，同一次计划触发重试时复用。
- 定义取消发布 / 挂起 / 失效会取消对应等待记录；重新激活时从激活时间重新计算计划，**不补发**挂起期间错过的触发。
- 同一定义不能混用 `MESSAGE_START` 与 `TIMER_START`。

### 6.4、定时捕获 TIMER_CATCH

**一句话**：流程走到这个节点会**自己停下来等时间**，到点后自动继续，全程不需要任何人操作。

**行为过程**：

1. 流程推进到达该节点时，创建一条**实例级**等待记录；实例停在事件节点上，**不生成待办任务**——代办列表里什么都不会出现。
2. 时间未到之前，实例一直停在这里；查询实例等待中的事件用 [第 9 节](#_9、查询等待中的事件) 的事件视图。
3. 到点后引擎自动完成这条等待，流程沿事件出口继续走向下一节点。

**业务场景**：报销单提交后**冷却 3 天**再进入财务复核（防止当天反复改单）；供应商对账单发出后等 7 天自动视为确认。

**需要配置**：定时策略与时间值；放在流程中间任意位置（前置节点完成后自然到达）。

**注意**：实例在等待期间被挂起时，到期记录不丢弃：实例恢复后**只补发一次**当前计划触发，不按挂起时长逐次补发。

### 6.5、定时边界 TIMER_BOUNDARY

**一句话**：给某个审批节点**上一个超时闹钟**——任务按时办完则闹钟无声取消；超时没人办，就把任务中断、流程改道。

**行为过程**：

1. 边界事件附着在某个普通任务节点上（`attached_to_node_code` = 任务节点编码），**任务创建的那一刻**生成边界等待（`attached_task_id` = 任务 ID），开始计时。
2. 任务在时限内**正常完成** → 闹钟取消，边界等待记录置 `CANCELLED`，流程表现和没配边界完全一样。
3. 时限到了**还没办** → 中断当前任务：任务归档为 `flow_status = invalid`（任务状态「失效」）、备注「定时边界事件中断」，然后沿边界事件出口推进——通常是转交给上级、或生成催办节点。

**业务场景**：请假审批挂 3 天闹钟，主管 3 天没处理就自动升级给部门总监；采购单 24 小时未响应自动改派其他人。

**需要配置**：附着任务节点（下拉选择）、定时策略与时间值；边界出口连到超时后的去处。

**注意**：任务状态 `invalid` 表示原审批任务因边界事件**失效**，不代表审批人同意；被附着节点的属性面板会显示「已被 N 个边界事件附着」，不要把它再转成事件节点（会使附着失效）。

定时捕获与定时边界的行为差异（捕获是流程自己停下等时间，边界是给正在办理的任务上闹钟）：

<img src="/event/catch-vs-boundary.svg" alt="定时捕获与定时边界对比：捕获让流程停在节点等待并自动放行，边界中断原任务改走边界出口" width="680" height="320" loading="lazy" />

一句话选择：等时间本身就是流程的一个步骤（到点继续），用**捕获**；想让某个审批环节有超时兜底（没人办就自动处理），用**边界**。

## 7、消息事件

### 7.1、消息启动 MESSAGE_START

**一句话**：流程实例不是人点的，而是**业务事件发生时由宿主程序发起**——比如「订单支付成功」这个动作触发出一笔对账流程。

**行为过程**：

1. 定义发布后，宿主在业务代码里（通常是 MQ 消费者、回调接口里）调用 `startByMessage`，传入业务单据 ID、流程编码和消息名。
2. 引擎按 `flowCode + 消息名` 找到启动节点，创建实例并把 `payload` 合并进流程变量——后续审批节点可以直接取到订单号、金额这些业务数据。
3. **引擎不按 `businessId` 去重**：重复调用会创建出多个实例（引擎没有按业务主键查实例的能力）。要幂等请在业务侧拦住第二次调用，例如用 `businessId` 在业务表上加唯一索引，或先判断业务单据"已发起"再调 `startByMessage`。

**业务场景**：`order.paid`（订单已支付）触发对账流程；`contract.signed`（合同已签）触发归档流程。

**需要配置**：消息名称（须与调用方传入的 `eventName` 一致）；节点放在固定开始节点之后。

```java
WorkflowContext context = new WorkflowContext();
context.setHandler("admin");        // 本次触发的操作人（审计字段）
context.setTenantId("t1");          // 可选：显式指定租户

Instance ins = FlowEngine.insService().startByMessage(
        "biz-1001",                 // businessId，调用方指定（如订单号），用于幂等与业务关联
        "leaveFlow",                // flowCode
        "order.paid",               // eventName，需与 MESSAGE_START 节点的 event_name 一致
        payload,                    // Map<String,Object>，合并进流程变量
        context);
```

**它和 `TIMER_START` 的关键区别**：`MESSAGE_START` **不落 `flow_event_wait`**。发布定义时只有 `TIMER_START` 会写一条定义级等待记录（`definition_id` 有值、`instance_id` 为空），消息启动完全靠宿主调用驱动——查等待表看不到「消息启动」的记录是正常的，别以为没生效。

**参数说明**：

| 参数 | 说明 |
| --- | --- |
| `businessId` | 业务单据 ID，调用方指定；只落到 `flow_instance.business_id`，引擎不校验唯一性 |
| `flowCode` | 流程编码；引擎取该编码**已发布**的版本 |
| `eventName` | 必须与该定义 `MESSAGE_START` 节点的 `event_name` 完全一致（区分大小写） |
| `payload` | 合并进流程变量；先并入 `context.variables`，同 key 以 `payload` 为准 |
| `context` | `handler` 为本次操作人（审计字段）、`tenantId` 显式指定租户，未传按 [第 10 节](#_10、扩展点与触发身份) 兜底 |

常见报错（都是抛异常，不会静默失败，**捕获不到异常就说明启动成功了**）：

| 报错 | 原因 |
| --- | --- |
| `流程定义不存在!` | `flowCode` 没有已发布版本（导入了但没发布、被取消发布或已删除） |
| `未找到消息名称匹配的消息事件节点` | `eventName` 与启动节点的 `event_name` 不一致 |
| `启动事件拓扑与等待记录不匹配` | 该定义的启动事件不是 `MESSAGE_START`（例如是 `TIMER_START` 流程） |
| `当前流程定义已挂起，不可开启新的流程` | 定义被挂起 |
| `业务id为空!` / `流程编码缺失!` | 必填参数没传 |

**调用后怎么确认**：返回值就是已持久化的实例，用 `ins.getId()` 落库关联业务单据；想看它停在哪个节点、在等什么事件，用 [第 9 节](#_9、查询等待中的事件) 查询。

两种启动事件的行为对比（它们负责创建流程实例，与手动启动互斥，彼此也互斥）：

<img src="/event/start-compare.svg" alt="定时启动与消息启动对比：前者由引擎定时器创建实例，后者由宿主调用 startByMessage 创建实例" width="680" height="300" loading="lazy" />

### 7.2、消息捕获 MESSAGE_CATCH

**一句话**：流程推进到一半，**停下来等一个外部系统的答复**，答复到了再继续——典型的「流程暂停，等外部世界」。

**行为过程**：

1. 流程到达该节点时创建等待记录，实例停住、无待办。
2. 外部结果回来后，宿主调用 `triggerMessage` 按实例 + 消息名触发。
3. 触发成功后 `payload` 合并进流程变量，流程沿出口继续。

**业务场景**：审批中需要第三方风控出具意见——流程停在「风控审核结果」捕获节点，风控系统回调宿主接口后流程继续；背调结果、征信返回同理。

**需要配置**：消息名称；宿主在拿到外部结果的地方调用触发 API。

```java
Instance ins = FlowEngine.insService().triggerMessage(
        instanceId,
        "risk.result",              // eventName：必须与等待中节点的 event_name 完全一致
        payload,                    // 合并进流程变量（同时写入 flow_event_wait.payload）
        context);
```

**匹配与处理过程**：

1. 先校验实例存在，再按 `instance_id` + `event_type in (MESSAGE_CATCH, MESSAGE_BOUNDARY)` + `event_name` 相等 + `status in (WAITING, RETRY)` 找**第一条**匹配的等待记录。
2. `payload` 先落到该等待记录的 `payload` 列（失败重试、租约恢复后仍能读到），然后用条件更新抢占（`WAITING` / `RETRY` → `RUNNING`）。
3. 抢占成功后**同步执行**这条等待记录（与定时到期共用同一套推进 / 重试语义），`payload` 合并为流程变量后沿出口继续。
4. 抢占失败（记录已被别的线程抢走 / 已取消 / 已死）只打 WARN，返回当前实例、流程不变。

**两种失败的区分**（排查时最有用）：

| 现象 | 原因 | 怎么确认 |
| --- | --- | --- |
| 抛异常 `未找到匹配的消息等待记录` | `eventName` 写错、实例已不在等这个消息、大小写不一致 | 用 `waitingEvents(instanceId)` 看当前等待的真实 `eventName` |
| 抛异常 `流程实例获取失败!` | `instanceId` 不存在 | 先确认实例主键 |
| **不报错但流程没动**，日志有 `消息等待记录已被抢占或不可触发，流程不变 eventName=xxx` | 记录已被抢占 / 已取消 / 已死 | 查该实例的 `flow_event_wait.status` |

- 一次调用只推进**第一条**匹配记录：同一实例有多条同名等待（多分支场景）时，要按业务顺序多次调用，或用不同消息名区分。
- 触发 `MESSAGE_BOUNDARY` 时行为相同，只是后果是中断：附着任务归档为 `invalid`、备注「消息边界事件中断」，流程沿边界出口走（对比 [6.5 定时边界](#_6-5、定时边界-timer-boundary)）。

### 7.3、消息抛出 / 消息结束

**一句话**：这两个事件是流程**主动向外部世界喊话**的出口——不等待、不停留，到达就通过 `EventPublisher` 回调宿主。

**行为过程**：

1. 流程到达节点，引擎构造 `EventMessage`（含事件类型、消息名、实例 ID、节点编码、流程变量等）回调宿主注册的发布器。
2. **消息抛出**：回调完成后流程立刻沿出口继续走下一节点——它只是「路过时通知一声」。
3. **消息结束**：回调完成后直接进入固定 `END`，实例正常完成——「走之前通知一声」。
4. 发布器**在同一事务内同步调用**：抛异常则整体回滚并按定时策略重试；需要可靠投递时由业务方在发布器里接 Outbox。

**业务场景**：消息抛出——审批通过一个环节就向业务系统推送进度；消息结束——流程归档前向数据仓库发一条归档消息。

**需要配置**：消息名称；宿主注册 `EventPublisher` Bean（见 [5.3](#_5-3、注册消息发布器)），未注册时跳过发布打 WARN、流程照常继续。

消息抛出与两种结束事件的行为对比（三者都不等待，区别在对流程的后果）：

<img src="/event/throw-and-end.svg" alt="消息抛出与两种结束事件对比：消息抛出后继续走，消息结束在结束前通知外部，终止结束中断一切并置终态" width="680" height="330" loading="lazy" />

::: tip 三种「结束」的实例状态不一样
结构上三者都收口到固定 `END` 节点，但**实例语义**不同，列表筛选时要区分：

| 收口方式 | 实例状态（`flow_instance.flow_status`） | 历史留痕（`flow_his_task`） |
| --- | --- | --- |
| 直接走到固定 `END` | 已完成 `finish` | 普通已办记录 |
| 消息结束 `MESSAGE_END` | 已完成 `finish` | 额外一条 `task_id=0` 记录，备注「流程由该结束事件节点结束」 |
| 终止结束 `TERMINATE_END` | **终止 `termination`** | 额外一条 `task_id=0` 记录，备注「流程由该终止结束事件终止」 |

宿主自定义编码时，两者分别落 `StatusMapper.instanceStatus(FlowStatus.TERMINATE)` 与 `instanceStatus(FlowStatus.FINISHED)`，互不串列。
:::

`EventMessage` 字段（发布器拿到的就是这些，全部来自「节点 + 实例」，没有定义级配置）：

| 字段 | 说明 |
| --- | --- |
| `eventType` | `MESSAGE_THROW` / `MESSAGE_END` |
| `eventName` | 消息名称（节点上配的 `eventName`） |
| `definitionId` | 流程定义主键 |
| `instanceId` | 流程实例主键 |
| `nodeCode` | 事件节点编码 |
| `tenantId` | 租户标识 |
| `payload` | 流程变量快照 |
| `eventWaitId` | 等待记录主键，抛出 / 结束事件不落等待记录，恒为 `null` |
| `triggerTime` | 触发时间 |

::: tip 抛出事件是「直通节点」
`MESSAGE_THROW` 不生成待办、没有 `flow_user` 与历史任务，也不落 `flow_event_wait` 行——到达时同步回调一次发布器就继续往下走。因此它**只能从发布器回调和流程图节点状态观察**，待办 / 已办列表里看不到任何痕迹（这是最容易误判成「没生效」的地方）。
:::

**完整闭环**：把「消息抛出」当成对外喊话，另一端用 [7.1 消息启动](#_7-1、消息启动-message-start) 接住，就是最常见的跨流程协作（A 流程办完 → 触发 B 流程）：

```text
流程A：…… → 消息抛出 membership.cancelled → 结束
                    │  到达即回调 EventPublisher.publish（同一事务内同步）
                    ▼
宿主：MQ / HTTP 投递 → 消费端
                    │
                    ▼
流程B：startByMessage(bizId, "notifyFlow", "membership.cancelled", message.getPayload(), context)
       消息启动 membership.cancelled → 发通知 → 结束
```

```java
// 消费端：收到抛出方的消息 → 用消息启动下游流程（载荷直接作为下游的流程变量）
Instance downstream = FlowEngine.insService().startByMessage(
        "notify-" + message.getInstanceId(),   // businessId：带上来源实例，便于回溯
        "notifyFlow",                          // 下游流程编码（需已发布）
        message.getEventName(),                // 与下游 MESSAGE_START 节点的 eventName 一致
        message.getPayload(),                  // 源流程变量 → 下游流程变量
        context);
```

## 8、错误事件

**一句话**：错误事件是**实例内部的异常路由**——业务办理失败了，不把异常直接甩给用户，而是把流程引导到一条专门处理失败的支路上。

与消息事件的本质区别：消息来自**实例外部**（第三方系统、宿主程序），错误由**宿主针对这个实例**显式抛出，不经过外部系统。

**行为过程**（以报销流程为例）：

1. 宿主在业务代码里判断到失败（如支付通道返回「卡余额不足」），调用抛错 API 并带上错误码 `PAY_FAILED`。
2. 引擎按**作用域**匹配错误事件等待记录：任务级只找附着在当前任务上的错误边界，实例级只找实例上的错误捕获。
3. 匹配成功 → 边界触发则中断当前任务走异常出口；捕获触发则流程从捕获节点继续——比如进入「失败善后」节点，通知提单人改卡重试。
4. 匹配失败 → 抛「流程错误未被捕获」异常，实例状态不变、事务整体回滚，是否终止由宿主决定。

**业务场景**：付款审批通过后执行支付失败 → 错误码 `PAY_FAILED` 路由到「支付失败处理」节点，由财务确认后重试或改单，而不是让流程卡死在已办结的审批后面。

**需要配置**：错误码（设计器里叫「错误码」，**可空 = 通配**捕获任意错误码）；捕获节点放流程中间、边界节点附着任务；宿主在失败处调用抛错 API。

**两个作用域，严格对应**：

| 入口 | 作用域 | 匹配的等待 |
| --- | --- | --- |
| `TaskService.throwError(taskId, errorCode, errorMessage)` | 任务级 | 附着在该任务节点上的 `ERROR_BOUNDARY` |
| `InsService.throwError(instanceId, errorCode, errorMessage)` | 实例级 | 该实例的 `ERROR_CATCH` |

三种中间捕获事件形态相同（流程停下等待），本质区别是**等的对象不同**——定时等引擎时钟、消息等外部系统、错误等实例内抛出的错误码：

<img src="/event/three-catch.svg" alt="三种中间捕获事件对比：定时捕获等到点、消息捕获等外部回调、错误捕获等业务抛错" width="680" height="330" loading="lazy" />

```java
// 任务级失败：只匹配任务节点上的错误边界
FlowEngine.taskService().throwError(taskId, "PAY_FAILED", "支付失败");

// 实例级抛出：只匹配实例上的错误捕获
FlowEngine.insService().throwError(instanceId, "TIMEOUT", "整体超时");
```

- **错误码复用 `event_name` 列**（设计器标签为「错误码」），`ERROR_CATCH` / `ERROR_BOUNDARY` 的错误码**可空，空表示通配**（捕获任意错误码）。
- 匹配规则：精确错误码优先于通配；同实例同码多条等待时取主键最小的一条。
- 边界触发走边界中断路径（附着任务归档 `INVALID`、备注「错误边界中断」）；捕获触发走捕获推进路径（不伪造历史任务）。
- **不做跨作用域退回**：任务级错误不会退到实例级捕获，反之亦然。
- **未捕获错误**：抛出后无匹配时抛「流程错误未被捕获」异常，**不修改任何状态**，由调用方事务整体回滚，是否终止由宿主自行决定。
- 服务任务 / 监听器执行失败时，引擎**不自动**抛错误事件，保持原有异常传播语义；需要路由时由宿主在自己的代码里显式调用 `throwError`。

## 9、查询等待中的事件

流程停在事件节点时**没有普通待办**（待办 / 已办列表里什么都看不到），只能通过事件视图查询。「它在等什么、什么时候触发、是不是卡住了」都靠这一节。

### 9.1、查某个实例在等什么

```java
// 单实例：逐条打印最直观
List<EventView> events = FlowEngine.workflow().waitingEvents(instanceId);
events.forEach(e -> log.info("等待中：{} {}({}) 下次触发={} 状态={}"
        , e.getEventType(), e.getEventName(), e.getNodeCode(), e.getNextTriggerAt(), e.getStatus()));

// 写操作的结果里也带当前等待事件（例如办理完一个节点后，看看接下来等什么）
WorkflowResult result = FlowEngine.workflow().complete(command);
List<EventView> events = result.getCurrentEvents();
```

| `EventView` 字段 | 说明 |
| --- | --- |
| `eventType` | 事件类型（`EventType` 枚举值） |
| `eventName` | 消息名 / 错误码（非消息、错误事件为 null） |
| `nodeCode` | 事件节点编码 |
| `attachedTaskId` | 边界事件附着在哪个任务上（仅边界事件有值） |
| `nextTriggerAt` | 下次触发时间，**只有定时类事件才有值**（消息 / 错误等待为 null） |
| `status` | 等待状态。`waitingEvents` **只返回 `WAITING` / `RETRY`**（可被触发的）；想看 `CANCELLED` / `DEAD` 用 [9.2](#_9-2、全局查询等待记录-排查利器) 的查询 |

### 9.2、全局查询等待记录（排查利器）

「有哪些流程停在事件上、哪些在重试、有没有 `DEAD`」用 `WorkflowService` 的查询接口：

```java
EventWaitQuery query = new EventWaitQuery();
query.setFlowCode("orderFlow");
query.setStatuses(List.of("WAITING", "RETRY"));
query.setTimerOnly(false);                  // 放开默认的「只看定时类」

Page<EventWait> page = FlowEngine.workflow().pageEventWaits(query);
page.getList().forEach(w -> log.info("{} {} 状态={} 下次触发={} 重试={}"
        , w.getEventType(), w.getEventName(), w.getStatus(), w.getNextTriggerAt(), w.getRetryCount()));

// 不分页取列表 / 计数 / 按主键取详情
List<EventWait> waits = FlowEngine.workflow().listEventWaits(query);
long total = FlowEngine.workflow().countEventWaits(query);
EventWait one = FlowEngine.workflow().getEventWait(waitId);
```

| 常用条件 | 说明 |
| --- | --- |
| `flowCode` / `definitionId(s)` | 按流程定义过滤（`flowCode` 与 `definitionId(s)` 互斥，同时传会报错） |
| `instanceId` / `instanceIds` / `businessId` | 按实例 / 业务单据过滤（`businessId` 与实例条件互斥） |
| `eventTypes` | 多选，如 `TIMER_CATCH` / `MESSAGE_CATCH` / `ERROR_BOUNDARY` |
| `statuses` | 多选：`WAITING` / `RUNNING` / `RETRY` / `DEAD` / `CANCELLED` |
| `eventName` | 消息名 / 错误码 |
| `nodeCode` / `attachedTaskId` | 按事件节点 / 附着任务定位 |
| `nextTriggerAtFrom` / `nextTriggerAtTo` | 下次触发时间区间 |
| `timerOnly` | **默认 `true`，只查定时类事件** |
| `pageNum` / `pageSize` / `orderBy` / `isAsc` | 分页与排序（`orderBy` 走白名单，非法列名会报错） |

::: warning `timerOnly` 默认为 `true`，这是「查不到数据」的头号原因
消息捕获 / 错误捕获的 `next_trigger_at` 为空，默认被这个开关过滤掉了。排查消息、错误事件时要 `setTimerOnly(false)`，或者显式传 `setEventTypes(List.of("MESSAGE_CATCH"))`（显式传事件类型时以传入值为准）。
:::

**典型排查动作**：实例停着不动 → 先用 `waitingEvents(instanceId)` 看它在等哪个消息名 / 定时；消息明明发了但没动 → 对比 `eventName` 与 `status`；状态是 `DEAD` → 读 `lastError` 看失败原因（见 [第 11 节](#_11、等待记录生命周期)）。

## 10、扩展点与触发身份

| 扩展点 | 获取方式 | 默认实现 |
| --- | --- | --- |
| `EventPublisher` | 容器 Bean（`FlowEngine.eventPublisher()`） | 无，未注册则跳过消息发布 |
| `EventTaskHandler` | 容器 Bean | `EventRuntimeHandler`（由 ORM starter 注册），宿主可定义同类型 Bean 覆盖以接管事务边界 |

触发身份与租户按「**调用方显式传入 > 系统兜底**」解析：`startByMessage` / `triggerMessage` 的 `WorkflowContext` 里 `handler` / `tenantId` 优先；未传时定时 / 消息触发的审计身份回退到 `warm-flow.system-handler`（默认 `system`），租户回退到 `TenantHandler` 的线程取值。

## 11、等待记录生命周期

- **一次性事件**（`AFTER` 的定时捕获、消息捕获、错误捕获、启动事件等）：成功后删除等待记录。
- **重复事件**（`FIXED` / `POINT_IN_TIME`）：成功后计算下一次 `next_trigger_at` 继续等待。
- **执行失败**：进入 `RETRY` 并按 `timer-max-retry-count` 重试，超过后转 `DEAD`（保留 `last_error`、`retry_count`）。
- **取消**：边界等待随附着任务完成 / 撤回 / 终止 / 作废 / 级联删除一并取消，状态置 `CANCELLED`（按保留期由清理任务删除）；
  实例到达结束节点（普通结束、终止结束、消息结束）时同样会取消本实例的全部等待记录，避免流程完成后仍有僵尸等待被外部事件唤醒。
- 消息触发**不经过定时扫描**（`next_trigger_at` 为 NULL），因此不参与重试调度。

状态流转：

```text
创建 ──▶ WAITING ──(抢占)──▶ RUNNING ──成功─┬─▶ 一次性事件：删除
                                          └─▶ 重复事件：回 WAITING，更新 next_trigger_at
                     │           └─失败─▶ RETRY ──(retry_at 到期)──▶ RUNNING … 超过 max_retry_count ──▶ DEAD
                     └─(定义取消发布 / 任务完成 / 撤回 / 终止 / 实例删除)─▶ CANCELLED
                     └─(进程宕机 / 执行卡死，lock_until 过期)─▶ 重新可被抢占（重启不丢，靠租约恢复）
```

### 11.1、`flow_event_wait` 关键列（直接查库排查用）

| 列 | 含义与排查用途 |
| --- | --- |
| `definition_id` | 定义级等待（**只有 `TIMER_START` 用**，`instance_id` 为空） |
| `instance_id` | 实例级等待（为空即定义级） |
| `node_code` | 停在哪个事件节点 |
| `event_type` / `event_name` | 事件类型；`event_name` 为消息名（消息事件）或错误码（错误事件） |
| `status` | 等待状态，只有 `WAITING` / `RETRY` 才可能被触发 |
| `next_trigger_at` | 定时类的下次触发时间；消息 / 错误类为 NULL（由宿主调用驱动，不参与扫描） |
| `attached_task_id` | 边界事件附着在哪个待办上（该任务办完这条记录就会被取消） |
| `repeat_count` / `max_repeat_count` | 重复事件已触发次数 / 次数上限（`FIXED` 的 `maxCount`） |
| `retry_count` / `max_retry_count` / `retry_at` | 失败重试次数 / 上限 / 下次重试时间 |
| `lock_owner` / `lock_until` | 抢占持有者与租约到期时间；`RUNNING` 一直不动先看这两个是否已过期 |
| `payload` | 消息触发时宿主传入的载荷（触发后合并为流程变量） |
| `last_error` | 最近一次失败原因，`RETRY` / `DEAD` 时看这里 |

```sql
-- 某实例当前在等什么
SELECT node_code, event_type, event_name, status, next_trigger_at, retry_count, last_error
FROM flow_event_wait WHERE instance_id = 123456789;

-- 全局体检：有没有堆积的重试 / 死记录
SELECT status, COUNT(*) FROM flow_event_wait GROUP BY status;
```

::: warning 逻辑删除默认开启
`warm-flow.logic-delete` 默认为 `true`，引擎的「删除」是**软删除**（`del_flag = '1'`）。手写 SQL 排查时按需加 `del_flag = '0'`；关闭逻辑删除（`logic-delete: false`）才是物理删除，切换前要先清理存量 `del_flag = '1'` 数据。
:::

## 12、发布校验与常见报错

### 12.1、发布校验（导入 / 发布阶段）

发布时由后端统一校验，常见报错：

| 报错 | 原因 |
| --- | --- |
| 消息事件必须配置消息名称 | `MESSAGE_*` 节点缺少 `eventName`（错误事件可空表示通配） |
| 定时事件必须配置合法的定时参数 | 定时节点缺少 / 写错 `node_config.event` |
| 事件定时配置 timerType 只能是 AFTER / FIXED / POINT_IN_TIME | `timerType` 非法 |
| 定时时间值格式非法，应为 ISO-8601 时长 | `timerValue` 不是 `PT30M` / `P3D` 这类格式 |
| 指定时间点格式非法，应为每日时间点集合 | `POINT_IN_TIME` 的 `timerValue` 不是 `["09:00","18:00"]` |
| 边界事件必须配置附着节点编码 | 边界事件缺 `attachedToNodeCode` |
| 边界事件只能附着到未配置事件的中间任务节点 | 附着到了网关 / 事件节点 / 已带事件的节点 |
| 第一阶段边界事件必须为中断型 | `interrupting` 不是 `true` |
| 事件节点必须使用中间节点类型 | 事件字段配在了网关或固定节点上 |
| 固定开始 / 结束节点不允许配置事件属性 | `START` / `END` 上写了事件字段 |
| 启动事件必须紧邻固定开始节点…… | `*_START` 拓扑不合法 |
| 结束事件必须有入线，且唯一出口直接指向固定结束节点 | `*_END` 拓扑不合法 |
| 捕获事件必须有出线 / 抛出事件必须有入线 | `*_CATCH` 无出口、`*_THROW` 无入口 |
| 同一定义不能混用消息启动与定时启动事件 | 同时配了 `MESSAGE_START` 与 `TIMER_START` |
| 该流程由启动事件触发，不支持手动启动 | 对启动事件流程调用了普通启动 API |

### 12.2、运行期排查（触发后「没反应」）

事件节点的排查思路和普通审批完全不同：**它不在待办列表里**，所以「看不到任务」是正常的，要按现象往下查。

| 现象 | 可能原因 | 怎么确认 |
| --- | --- | --- |
| 流程停住不动，待办 / 已办里什么都没有 | **正常**：事件节点不产生待办 | `waitingEvents(instanceId)` 看它在等什么、还有什么事件 |
| 消息发了但流程没动 | `eventName` 大小写 / 拼写不一致；实例等的是别的消息；等待记录状态不是 `WAITING` / `RETRY` | 对比 `waitingEvents` 里的 `eventName` 与调用入参 |
| 调 `triggerMessage` 抛 `未找到匹配的消息等待记录` | 消息名写错，或该实例已经不在等这个消息 | 同上；确认实例主键正确（否则报 `流程实例获取失败!`） |
| 日志有 `消息等待记录已被抢占或不可触发，流程不变` | 记录已被抢占 / `CANCELLED` / `DEAD` | 查该实例 `flow_event_wait.status`；`DEAD` 看 `last_error` |
| `MESSAGE_THROW` / `MESSAGE_END` 宿主没收到回调 | 没注册 `EventPublisher`；注册了多个（等价未注册）；没引入 `warm-flow-plugin-modes-sb`（取 Bean 能力缺失） | 搜日志 `未注册 EventPublisher`（见 [5.3](#_5-3、注册消息发布器)） |
| 定时事件到点不触发 | `timer-enabled` 没开；没建 `flow_event_wait` 表；定义没发布或已挂起 | 启动日志找 `内置定时器已启动`；没有就看有没有 `flow_event_wait 表不存在，内置定时器扫描自动停用`；再查等待记录的 `status` / `next_trigger_at` |
| 发布后 `TIMER_START` 没有等待记录 | 定义未发布 / 已挂起；固定开始节点的后继不是 `TIMER_START`；定时参数非法 | 发布时会直接报 `定时事件必须配置合法的定时参数`，其余按 [6.3](#_6-3、定时启动-timer-start) 的创建条件核对 |
| 边界事件没触发 | 附着节点编码填错；被附着的任务已经办完（等待记录随之取消）；实例/任务在时限内被终止 | 查 `attached_task_id` 对应任务的状态与 `flow_event_wait.status` |
| 手动启动报 `该流程由启动事件触发，不支持手动启动` | 对 `MESSAGE_START` / `TIMER_START` 流程调了普通启动 API | 消息启动用 `startByMessage`，定时启动等定时器 |
| 报 `流程错误未被捕获` | 错误码没匹配上任何错误事件；**作用域用错**（任务级只匹配任务上的边界，实例级只匹配实例上的捕获） | 核对 `throwError` 用的是 `taskService` 还是 `insService`，以及错误码 / 是否通配 |
| 抛错后实例状态完全没变 | 未捕获错误时引擎不改任何状态，由调用方事务回滚 | 看上层是否 catch 掉了异常（服务任务 / 监听器抛的 Java 异常**不会**自动变成错误事件） |
| 重复触发出现多笔实例 | `MESSAGE_START` **不按 `businessId` 去重** | 业务侧用唯一约束 / 状态机拦住第二次调用（见 [7.1](#_7-1、消息启动-message-start)） |
| 触发成功但流程里读不到 payload | `payload` 传空；key 与 `context.variables` 冲突（**同 key 以 `payload` 为准**） | 查实例流程变量 |

## 13、完整示例

六个示例都能直接复制 JSON、导入发布后跑通（定义 JSON 已通过引擎的导入 + 发布校验；`flowCode` 若与已有定义重名，改成你自己的即可）。每个示例都配了流程图和「谁在什么时机做什么」，可以直接对照着接。代码里**发起 / 触发 / 抛错**走 `FlowEngine.insService()`（`start` / `startByMessage` / `triggerMessage` / `throwError`），**办理与查询**走 `FlowEngine.workflow()`（`complete` / `waitingEvents` / `listEventWaits`）；`FlowEngine.taskService()` 另有任务级 `throwError`（见 [7](#_7、消息事件) / [8](#_8、错误事件)）。

| 示例 | 覆盖的事件 | 一句话 | 对应 demo 案例 |
| --- | --- | --- | --- |
| [13.1 审批超时自动转交](#_13-1、示例一-审批超时自动转交-timer-boundary) | `TIMER_BOUNDARY` | 审批节点挂个闹钟，到点没办就中断任务改道 | 案例 1 |
| [13.2 订单对账](#_13-2、示例二-订单对账-消息启动-消息捕获-消息抛出) | `MESSAGE_START` / `MESSAGE_CATCH` / `MESSAGE_THROW` | 被业务事件发起 → 等异步结果 → 办完通知外部 | 案例 2 |
| [13.3 付款失败善后](#_13-3、示例三-付款失败善后-error-boundary) | `ERROR_BOUNDARY` | 业务失败不甩异常，自动转善后支路 | 案例 4 |
| [13.4 账号注销冷静期](#_13-4、示例四-账号注销冷静期-timer-catch-message-throw) | `TIMER_CATCH` / `MESSAGE_THROW` | 流程中间等一段固定时间，到期自动继续 | 案例 3 |
| [13.5 每日自动巡检](#_13-5、示例五-每日自动巡检-timer-start-terminate-end) | `TIMER_START` / `TERMINATE_END` | 每天定时自动发起，异常时直接终止收口 | 案例 5 |
| [13.6 注销结果通知](#_13-6、示例六-注销结果通知-message-start-message-end) | `MESSAGE_START` / `MESSAGE_END` | 被上游抛出的消息启动，结束前再通知外部 | 案例 6 |

六个示例合起来覆盖了除 `MESSAGE_BOUNDARY`、`ERROR_CATCH` 之外的全部事件类型；这两种的写法分别与 13.1 / 13.3 对称，见 [7.2](#_7-2、消息捕获-message-catch) 与 [第 8 节](#_8、错误事件)。

### 13.1、示例一：审批超时自动转交（TIMER_BOUNDARY）

**业务背景**：审批人可能出差、漏看，任务不能无限挂着。业务要求「3 秒内没人办（生产里通常是一天）就自动转交上级」，且转交后原任务不能再被办理。

**用事件怎么表达**：审批节点本身不用改，只在它身上「挂一个定时边界」——到点还没办就中断这个任务，改走边界出口。

<img src="/event/demo-timeout-boundary.svg" alt="示例一流程图：开始进入人工审批，3 秒内办理则正常结束，超时未办则任务失效改走超时转交" width="680" height="330" loading="lazy" />

**谁在什么时机做什么**：

| 时刻 | 发生了什么 | 谁做的 |
| --- | --- | --- |
| 发起时 | 创建「人工审批」待办，同时写一条附着在该任务上的边界等待（`flow_event_wait.attached_task_id` = 这个任务） | 引擎 |
| 3 秒内 | 任务正常归档，边界等待置 `CANCELLED` —— 效果和没配边界完全一样 | 审批人办理 |
| 3 秒到点仍没办 | 定时器抢占边界等待并触发：任务归档失效，流程沿边界出口走「超时转交」 | 内置定时器 |
| 任意时刻 | 查 `waitingEvents(instanceId)` 能看到这条边界等待挂在哪个任务上 | 宿主排查 |

两条路互斥，谁先发生谁生效；边界等待只会被消费一次。

```json
{
  "flowCode": "docTimeoutDemo",
  "flowName": "超时转交",
  "modelValue": "CLASSICS",
  "nodeList": [
    { "nodeType": 0, "nodeCode": "start", "nodeName": "开始",
      "skipList": [{ "nowNodeCode": "start", "nextNodeCode": "approve", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "approve", "nodeName": "人工审批", "permissionFlag": "user:approver1",
      "skipList": [{ "nowNodeCode": "approve", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "timeout", "nodeName": "超时转交",
      "eventType": "TIMER_BOUNDARY", "attachedToNodeCode": "approve", "interrupting": true,
      "nodeConfig": "{\"event\":{\"timerType\":\"AFTER\",\"timerValue\":\"PT3S\"}}",
      "skipList": [{ "nowNodeCode": "timeout", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 2, "nodeCode": "end", "nodeName": "结束" }
  ]
}
```

```java
// 1. 导入 + 发布
Definition def = FlowEngine.defService().importJson(json);
FlowEngine.defService().publish(def.getId());

// 2. 发起流程
StartCommand start = new StartCommand();
start.setBusinessId("biz-1");
start.setFlowCode("docTimeoutDemo");
start.setOperator(new OperatorContext("admin"));      // 发起人
WorkflowResult started = FlowEngine.workflow().start(start);
Long instanceId = started.getInstanceId();
Long taskId = started.getCurrentTasks().get(0).getTaskId();   // 「人工审批」待办

// 3A. 3 秒内办理 → 边界等待取消，流程正常结束
CompleteCommand complete = new CompleteCommand();
complete.setTaskId(taskId);
complete.setOperator(new OperatorContext("approver1"));
FlowEngine.workflow().complete(complete);
```

**3B. 就是不办**：等 3 秒，内置定时器扫描到这条边界等待并触发（扫描间隔默认 5 秒，所以实际生效时间最长约 `3s + timer-scan-interval`）。

**怎么确认到底走了哪条路**：

| 观察点 | 3A 正常办理 | 3B 超时触发 |
| --- | --- | --- |
| 原「人工审批」任务的已办记录 `flow_his_task.flow_status` | `pass` 审批通过 | `invalid` 失效，备注「定时边界事件中断」 |
| 流程去向 | 直接结束 | 沿 `timeout` 出口继续到结束 |
| `waitingEvents(instanceId)` | 边界等待被取消，查不到 | 触发后一次性记录删除，查不到 |

**怎么改**：

- 生产时限：`timerValue` 换成 `P1D`（1 天）、`PT4H`（4 小时）这类 ISO-8601 时长，见 [6.1](#_6-1、时间格式)。
- 换成「不定时、但收到外部消息就改道」：把 `eventType` 改成 `MESSAGE_BOUNDARY`、配 `eventName`，宿主侧用 `triggerMessage` 触发，其余写法完全对称（见 [7.2](#_7-2、消息捕获-message-catch)）。
- **注意**：边界事件当前**只能是中断型**（`interrupting` 必须为 `true`，否则发布报 `第一阶段边界事件必须为中断型`）。想「不中断原任务、只额外走一条支线」，用普通节点 + 网关表达，不要用边界事件。

### 13.2、示例二：订单对账（消息启动 + 消息捕获 + 消息抛出）

**业务背景**：订单支付的**业务事件**发生在支付系统里，对账流程要「被它触发」而不是让人手动点；风控结果是**异步**回来的，流程要在中间等；对账完成后又要**通知**结算系统。三件事正好对应消息事件的三种用法。

<img src="/event/demo-order-message.svg" alt="示例二完整链路图：订单已支付消息启动，等待风控结果消息捕获，对账确认后消息抛出通知外部" width="680" height="500" loading="lazy" />

**三种用法一次说清**：

| 用法 | 本示例里的位置 | 谁触发 | 流程的表现 |
| --- | --- | --- | --- |
| 消息启动 `MESSAGE_START` | ① 订单已支付（`order.paid`） | 宿主调 `startByMessage` | 实例被**创建**出来 |
| 消息捕获 `MESSAGE_CATCH` | ② 等待风控结果（`risk.result`） | 宿主调 `triggerMessage` | 实例**停在这里等**，没有待办 |
| 消息抛出 `MESSAGE_THROW` | ④ 对账结果通知（`order.settled`） | 到达即回调 `EventPublisher.publish` | **不等待**，通知完继续走 |

三者都不是「自动」的：①②④ 必须在宿主侧写代码去调 API 或接消息，只有 ③ 是人工办理的普通审批节点。

```json
{
  "flowCode": "docOrderFlow",
  "flowName": "订单对账",
  "modelValue": "CLASSICS",
  "nodeList": [
    { "nodeType": 0, "nodeCode": "start", "nodeName": "开始",
      "skipList": [{ "nowNodeCode": "start", "nextNodeCode": "msgStart", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "msgStart", "nodeName": "订单已支付",
      "eventType": "MESSAGE_START", "eventName": "order.paid",
      "skipList": [{ "nowNodeCode": "msgStart", "nextNodeCode": "riskCatch", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "riskCatch", "nodeName": "等待风控结果",
      "eventType": "MESSAGE_CATCH", "eventName": "risk.result",
      "skipList": [{ "nowNodeCode": "riskCatch", "nextNodeCode": "settle", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "settle", "nodeName": "对账确认", "permissionFlag": "user:approver3",
      "skipList": [{ "nowNodeCode": "settle", "nextNodeCode": "notifyTh", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "notifyTh", "nodeName": "对账结果通知",
      "eventType": "MESSAGE_THROW", "eventName": "order.settled",
      "skipList": [{ "nowNodeCode": "notifyTh", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 2, "nodeCode": "end", "nodeName": "结束" }
  ]
}
```

宿主侧一共四段代码，正好对应四个环节：

```java
// ① 注册发布器（全局一次，见 5.3）：MESSAGE_THROW 到达时引擎回调它
@Component
public class OrderEventPublisher implements EventPublisher {
    @Override
    public void publish(EventMessage message) {
        log.info("流程发来消息：{} 实例={} 载荷={}"
                , message.getEventName(), message.getInstanceId(), message.getPayload());
        mqTemplate.syncSend("flow-event:" + message.getEventName(), message);   // 投递给外部系统
    }
}

// ② 支付成功 → 消息启动（写在你自己的支付回调 / MQ 消费者里）
//    导入 + 发布（FlowEngine.defService().importJson(json) + publish(def.getId())）不能省略，否则报「流程定义不存在!」
WorkflowContext context = new WorkflowContext();
context.setHandler("system");                 // 无人值守场景用系统账号
Instance order = FlowEngine.insService().startByMessage(
        "order-1001",                         // businessId = 订单号，便于业务回溯
        "docOrderFlow",                       // flowCode
        "order.paid",                         // 必须与 MESSAGE_START 节点的 eventName 完全一致
        Map.of("orderId", "1001", "amount", "128.00"),
        context);

// 这一步之后实例停在「等待风控结果」：没有待办，只能这样确认
FlowEngine.workflow().waitingEvents(order.getId())
        .forEach(e -> log.info("在等 {}（{}）", e.getEventName(), e.getEventType()));

// ③ 风控结果回来 → 触发消息捕获
FlowEngine.insService().triggerMessage(
        order.getId(), "risk.result", Map.of("riskLevel", "low"), context);
// 触发成功后 payload 合并进流程变量，实例推进到「对账确认」，产生 approver3 待办

// ④ 审批人办理「对账确认」→ 流程走到「对账结果通知」（MESSAGE_THROW）
//    引擎回调 OrderEventPublisher → 你投递 order.settled → 流程继续走到结束
```

**逐步确认**：

| 步骤 | 怎么确认这一步生效了 |
| --- | --- |
| ② 消息启动 | `startByMessage` 不抛异常、`order.getId()` 有值；`waitingEvents` 能看到 `MESSAGE_CATCH(risk.result)` |
| ③ 消息触发 | `triggerMessage` 不抛异常；`waitingEvents` 里 `risk.result` 消失；`flow_task` 出现「对账确认」待办 |
| ④ 消息抛出 | 日志出现发布器里的 `流程发来消息：order.settled`；实例随后进入终态（`flow_status = finish`）。抛出是直通节点，**不产生待办与历史任务** |

::: warning 两个别误判的点
- 「实例停在事件节点、待办列表里什么都没有」是**正常**的，事件节点本来就不产生待办。
- 「消息抛出后实例状态没变、也没有待办」也是**正常**的：它只是路过通知一声，确认要看发布器回调和流程图，见 [7.3](#_7-3、消息抛出-消息结束)。
:::

**怎么改**：

- 消息名要用**你自己的业务契约**（`order.paid` / `risk.result` / `order.settled` 只是示例），全链路（设计器节点、宿主调用、发布器分发）必须一致。
- 支付回调通常会重复投递：`MESSAGE_START` **不按 `businessId` 去重**，宿主侧要用业务唯一键或状态机拦住第二次调用（见 [7.1](#_7-1、消息启动-message-start)）。
- 结果**不依赖外部回调**、只是要等一段时间才能继续（如「T+1 日再对账」）：把「等待风控结果」换成 `TIMER_CATCH`（到期自动继续）；它和 `MESSAGE_CATCH` 的推进 / 重试语义完全相同，只是触发源是引擎时钟而不是外部调用。
- 想让 ④ 的投递更可靠：发布器里落 Outbox / 发 MQ，别在发布器里做重业务逻辑（它和流程在同一个事务里，见 [5.3](#_5-3、注册消息发布器)）。

### 13.3、示例三：付款失败善后（ERROR_BOUNDARY）

**业务背景**：审批走到最后一步「财务执行付款」，付款通道可能返回「卡余额不足」。这时不应该把异常抛给审批人、也不该让流程卡死，而应自动进入一条**善后支路**（通知财务改卡、重新付款或取消单据）。

**用事件怎么表达**：在「财务执行付款」上挂一个错误边界。谁在这个任务上抛出匹配的错误码，就中断任务、改走边界出口——**错误来自实例内部**（宿主针对这个实例显式抛出），不同于消息事件的外部投递。

<img src="/event/demo-error-boundary.svg" alt="示例三流程图：财务执行付款成功则正常结束，付款失败抛错命中错误边界则中断任务走善后支路" width="680" height="340" loading="lazy" />

**谁在什么时机做什么**：

| 时刻 | 发生了什么 | 谁做的 |
| --- | --- | --- |
| 到「财务执行付款」 | 产生 approver2 待办，同时写一条附着在该任务上的错误边界等待（`event_name = PAY_FAILED`） | 引擎 |
| 付款成功 | 任务正常办理，边界等待取消，流程照常到结束 | 审批人 |
| 付款失败 | 宿主捕获到失败，调 `throwError(taskId, "PAY_FAILED", ...)`：任务归档失效，流程走「付款失败处理」→「善后确认」 | 宿主业务代码 |
| 错误码不匹配 | 抛「流程错误未被捕获」，**实例与任务状态完全不变**，事务回滚 | 引擎 |

```json
{
  "flowCode": "docPayFlow",
  "flowName": "付款失败善后",
  "modelValue": "CLASSICS",
  "nodeList": [
    { "nodeType": 0, "nodeCode": "start", "nodeName": "开始",
      "skipList": [{ "nowNodeCode": "start", "nextNodeCode": "pay", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "pay", "nodeName": "财务执行付款", "permissionFlag": "user:approver2",
      "skipList": [{ "nowNodeCode": "pay", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "payErr", "nodeName": "付款失败处理",
      "eventType": "ERROR_BOUNDARY", "eventName": "PAY_FAILED",
      "attachedToNodeCode": "pay", "interrupting": true,
      "skipList": [{ "nowNodeCode": "payErr", "nextNodeCode": "rescue", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "rescue", "nodeName": "善后确认", "permissionFlag": "user:admin",
      "skipList": [{ "nowNodeCode": "rescue", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 2, "nodeCode": "end", "nodeName": "结束" }
  ]
}
```

```java
// 1. 导入 + 发布（同示例一），然后发起流程：开始节点直接进「财务执行付款」，产生 approver2 待办
//    任务主键从待办列表 / WorkflowResult.currentTasks 里取
Long payTaskId = ...;

// 2. 付款失败：任务级抛错，只匹配附着在该任务节点上的 ERROR_BOUNDARY
FlowEngine.taskService().throwError(payTaskId, "PAY_FAILED", "卡余额不足");
```

**怎么确认**：已办里原「财务执行付款」记录 `flow_status = invalid`（备注「错误边界事件中断」），流程进入「善后确认」并产生 admin 待办。

**抛错失败时**（错误码不匹配、或作用域用错——任务级抛错匹配不到实例捕获）：会抛 `流程错误未被捕获`，**实例 / 任务状态完全不变**，由调用方事务回滚，是否终止由宿主决定，见 [第 8 节](#_8、错误事件)。

**怎么改**：

- 错误码留空即**通配**，捕获该作用域内任意错误码（只做兜底、不区分失败类型时用）。
- 很多任务都可能失败时，别给每个任务都挂边界：改用**实例级** `InsService.throwError` + 一个 `ERROR_CATCH` 兜底，作用域写起来更省事（见 [第 8 节](#_8、错误事件) 的作用域对照表）。
- 边界只认**显式抛错**：服务任务 / 监听器里直接抛的 Java 异常不会自动变成错误事件，必须由宿主代码 catch 后调 `throwError`。

### 13.4、示例四：账号注销冷静期（TIMER_CATCH + MESSAGE_THROW）

**业务背景**：注销是敏感操作，业务要求「提交后给用户 2 分钟反悔期，到期自动进入注销终审」；终审通过后还要通知外部系统「会员已注销」。前者是**流程中间等一段固定时间**，后者是**主动通知外部**。

**用事件怎么表达**：中间放一个**定时捕获**（`TIMER_CATCH`）节点——它不产生待办，时间到由引擎自动放行；办完用 `MESSAGE_THROW` 抛出注销事件。这两步宿主都**不需要写任何业务代码**，是本示例最值得体会的点。

<img src="/event/demo-cooldown-timer-catch.svg" alt="示例四流程图：提交注销申请后进入 2 分钟冷静期定时捕获，到点自动继续终审确认，最后消息抛出通知外部" width="680" height="270" loading="lazy" />

**谁在什么时机做什么**：

| 时刻 | 发生了什么 | 谁做的 |
| --- | --- | --- |
| 走到「冷静期」 | 实例停在事件节点，**没有待办**，写一条 `TIMER_CATCH` 等待（`next_trigger_at` = 当前时间 + 2 分钟） | 引擎 |
| 2 分钟内用户撤销 / 管理员终止 | 实例结束，等待记录一并清理 | 宿主业务 |
| 2 分钟到点 | 定时器抢占等待并触发，实例自动推进到「注销终审确认」 | 内置定时器 |
| 终审通过 | 到达 `MESSAGE_THROW`，同步回调发布器投出 `membership.cancelled`（示例六订阅它） | 引擎回调 → 宿主投递 |

```json
{
  "flowCode": "docCooldownFlow",
  "flowName": "账号注销-冷静期",
  "modelValue": "CLASSICS",
  "nodeList": [
    { "nodeType": 0, "nodeCode": "start", "nodeName": "开始",
      "skipList": [{ "nowNodeCode": "start", "nextNodeCode": "apply", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "apply", "nodeName": "提交注销申请", "permissionFlag": "warmFlowInitiator",
      "skipList": [{ "nowNodeCode": "apply", "nextNodeCode": "cooldown", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "cooldown", "nodeName": "冷静期 2 分钟",
      "eventType": "TIMER_CATCH",
      "nodeConfig": "{\"event\":{\"timerType\":\"AFTER\",\"timerValue\":\"PT2M\"}}",
      "skipList": [{ "nowNodeCode": "cooldown", "nextNodeCode": "confirm", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "confirm", "nodeName": "注销终审确认", "permissionFlag": "user:admin",
      "skipList": [{ "nowNodeCode": "confirm", "nextNodeCode": "msgThrow", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "msgThrow", "nodeName": "注销结果推送",
      "eventType": "MESSAGE_THROW", "eventName": "membership.cancelled",
      "skipList": [{ "nowNodeCode": "msgThrow", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 2, "nodeCode": "end", "nodeName": "结束" }
  ]
}
```

宿主侧代码：**没有**。定时捕获与消息抛出的触发源都不是宿主调用，宿主只需要在排查时确认它确实在等：

```java
// 走到「冷静期」后宿主什么都不用做：2 分钟到点会自动推进
// 唯一值得写的是排查查询
List<EventView> waiting = FlowEngine.workflow().waitingEvents(instanceId);
// 会看到 eventType = TIMER_CATCH，nextTriggerAt = 到点时间
```

**怎么确认**：

| 步骤 | 怎么确认这一步生效了 |
| --- | --- |
| 走到冷静期 | 待办列表是**空的**（正常！），`waitingEvents(instanceId)` 有一条 `TIMER_CATCH` |
| 到点自动继续 | 约 2 分钟后实例自动出现在「注销终审确认」的 admin 待办里，全程没人点过按钮 |
| 抛出通知 | 发布器回调里出现 `membership.cancelled`；没接发布器时打 WARN `未注册 EventPublisher，消息事件 MESSAGE_THROW(membership.cancelled) 发布被跳过` |

::: tip 「2 分钟」实际会晚几秒
定时器是**扫描式**的（扫描间隔见 [5.2](#_5-2、yml-配置)），所以 2 分钟的等待会在 **2 分 0 秒 ~ 2 分 5 秒**之间推进。别把它当秒表用，要精确触发得调小扫描间隔。
:::

**怎么改**：

- 时长写真实业务值（`P1D` = 1 天、`PT30M` = 30 分钟，见 [6.1](#_6-1、时间格式)）。
- 「到期后还要再判断一次」不能只靠 `TIMER_CATCH`：事件节点放行时**不做条件判断**，条件要放在它后面的网关里。
- 触发源换成外部消息用 `MESSAGE_CATCH`：推进 / 重试语义完全一样，只是等的是回调而不是时钟（见 [7.2](#_7-2、消息捕获-message-catch)）。

### 13.5、示例五：每日自动巡检（TIMER_START + TERMINATE_END）

**业务背景**：每天 09:00 要跑一次数据巡检，没人会去点「发起」；巡检发现严重异常时，要立刻把整单收口，别让另一条支线上的待办继续挂着。

**用事件怎么表达**：把流程做成**定时启动**（`TIMER_START`）——定义发布时引擎就写一条「定义级」等待，到点自动创建实例；异常分支上用**终止结束**（`TERMINATE_END`）直接收口。

<img src="/event/demo-daily-check-timer-start.svg" alt="示例五流程图：每天 09:00 定时启动创建实例，执行巡检后并行质检复核与风控判定，风控后经互斥网关按 veto 变量选路，严重异常走终止结束直接收口" width="680" height="560" loading="lazy" />

**和普通流程的差别**（这几条最容易踩）：

| 对比项 | 普通流程 | 定时启动流程（本例） |
| --- | --- | --- |
| 谁创建实例 | 宿主调 `start` | **引擎定时器**，发布时写入一条定义级等待 |
| 能手动发起吗 | 能 | **不能**，`start` 抛 `该流程由启动事件触发，不支持手动启动` |
| 有发起人吗 | 有 | 没有（实例的发起人相关字段为空） |
| 能撤销 / 转办吗 | 能 | 不能（没有发起人、没有源待办） |
| 怎么停掉定时 | —— | 挂起定义，或取消发布（发布钩子会取消定义级等待） |
| 等待记录长什么样 | 只有实例级 | `definition_id` 有值、**`instance_id` 为空**（定义级） |

```json
{
  "flowCode": "docDailyCheckFlow",
  "flowName": "每日自动巡检",
  "modelValue": "CLASSICS",
  "nodeList": [
    { "nodeType": 0, "nodeCode": "start", "nodeName": "开始",
      "skipList": [{ "nowNodeCode": "start", "nextNodeCode": "timerStart", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "timerStart", "nodeName": "每天 09:00 自动发起",
      "eventType": "TIMER_START",
      "nodeConfig": "{\"event\":{\"timerType\":\"POINT_IN_TIME\",\"timerValue\":\"[\\\"09:00\\\"]\",\"timezone\":\"Asia/Shanghai\"}}",
      "skipList": [{ "nowNodeCode": "timerStart", "nextNodeCode": "inspect", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "inspect", "nodeName": "执行数据巡检", "permissionFlag": "user:approver3",
      "skipList": [{ "nowNodeCode": "inspect", "nextNodeCode": "gw1", "skipType": "PASS" }] },
    { "nodeType": 4, "nodeCode": "gw1", "nodeName": "并行分支",
      "skipList": [
        { "nowNodeCode": "gw1", "nextNodeCode": "qa", "skipType": "PASS" },
        { "nowNodeCode": "gw1", "nextNodeCode": "risk", "skipType": "PASS" } ] },
    { "nodeType": 1, "nodeCode": "qa", "nodeName": "质检复核", "permissionFlag": "user:approver1",
      "skipList": [{ "nowNodeCode": "qa", "nextNodeCode": "gw2", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "risk", "nodeName": "风控否决判定", "permissionFlag": "user:approver2",
      "skipList": [{ "nowNodeCode": "risk", "nextNodeCode": "gwRisk", "skipType": "PASS" }] },
    { "nodeType": 3, "nodeCode": "gwRisk", "nodeName": "是否严重异常",
      "skipList": [
        { "nowNodeCode": "gwRisk", "nextNodeCode": "terminate", "skipType": "PASS", "skipCondition": "eq@@veto|1" },
        { "nowNodeCode": "gwRisk", "nextNodeCode": "gw2", "skipType": "PASS" } ] },
    { "nodeType": 1, "nodeCode": "terminate", "nodeName": "严重异常终止",
      "eventType": "TERMINATE_END",
      "skipList": [{ "nowNodeCode": "terminate", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 4, "nodeCode": "gw2", "nodeName": "汇聚",
      "skipList": [{ "nowNodeCode": "gw2", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 2, "nodeCode": "end", "nodeName": "结束" }
  ]
}
```

条件放在**哪条出线上**是本例的关键——只有**网关**的出线才认「跳转条件」：

::: danger 跳转条件必须配在网关出线上
中间节点（人工 / 服务节点）有多条 PASS 出线时，引擎只取**第一条**，出线上的 `skipCondition` **不参与路由**；条件只在**互斥网关**（`nodeType=3`）与**包容网关**（`nodeType=5`）的出口上求值（实现见 `NodeServiceImpl.getSkipByCheck` 与 `SerialGatewayStrategy`）。设计器同理，只在网关连线上显示「跳转条件」输入框。
所以本例不能把条件直接挂在「风控否决判定」的两条出线上，而是先经 `gwRisk` 互斥网关再分流——这也是本页最容易踩的坑。
:::

互斥网关的选路规则：

| 办理「风控否决判定」时的 `veto` | 结果 |
| --- | --- |
| `1` | 命中「严重异常」条件出线 → 走 `terminate`（`TERMINATE_END`） |
| 其它值（如 `0`） | 条件不命中 → 走**无条件**默认出线 `gw2`（无异常，与质检支线汇合） |
| **缺失** | 条件求值时抛 `跳转条件不能为空!`——办理这个节点时**必须**带上该变量 |

办理时带的流程变量会**立刻参与本次路由判断**（宿主侧就是 `CompleteCommand.setVariables(...)`）。

宿主侧代码：**没有**。定时启动不由宿主调用，宿主只要保证定时器在跑（starter 自动启动；手工关过要重启）：

```java
// 定义发布 + 激活后引擎自动写定义级等待，到点自动创建实例，无需 start()
// 唯一要注意的是别把定时器关掉（见 5.2 的 timer-enabled / timer-scan-interval）
```

**怎么确认**：

| 步骤 | 怎么确认这一步生效了 |
| --- | --- |
| 发布成功 | 日志 `流程定义 xxx 发布，已创建定时启动等待 node=timerStart nextTriggerAt=...`；`flow_event_wait` 有 1 行且 `instance_id` 为空 |
| 到点自动发起 | `flow_instance` 出现新实例，`flow_code = docDailyCheckFlow`，没有发起人 |
| 分流生效 | 办理「风控否决判定」时带 `veto=1` → 实例直接到终态；带 `veto=0` → 待办继续走到 `gw2` 汇聚之后（不带该变量会抛 `跳转条件不能为空!`） |
| 严重异常终止 | 实例状态为**终止**（`flow_status=termination`，不是「已完成」）；另一条支线没办完的待办按「失效」归档进 `flow_his_task`，该实例的其它等待记录被取消 |
| 没到点 | 定义级等待的 `next_trigger_at` 就是下次 09:00，用 `listEventWaits` + `definitionId` 可查 |

::: warning 定时启动不是「一发布就跑」
`TIMER_START` 只在你**发布且未挂起**定义时建等待，且 `POINT_IN_TIME` 取的是「**下一个**大于当前时间的 09:00」——今天 09:00 已过就是明天。想立刻验证，把它临时改成 `{"timerType":"AFTER","timerValue":"PT30S"}`。
:::

**怎么改**：

- 巡检周期 / 时区见 [6.1](#_6-1、时间格式) 与 [6.2](#_6-2、三种定时策略)；`POINT_IN_TIME` 可配多个时刻（如 `["09:00","21:00"]`）。
- 分流口径由 `gwRisk` 互斥网关的出线条件决定（本例 `veto=1` 走终止）；条件运算见 [条件表达式](../primary/condition.md)、网关规则见 [网关](../primary/gateway.md)。
- 不需要并行支线时，把 `gw1` / `qa` / `risk` / `gwRisk` / `gw2` 换成一个普通审批节点，`terminate` 直接接在它后面即可（此时不需要条件）。
- 「终止」只影响**本实例**：其它实例、其它定义都不受影响。

### 13.6、示例六：注销结果通知（MESSAGE_START + MESSAGE_END）

**业务背景**：会员注销完成后要通知外部系统（发短信、同步 CRM），并且这条链路应该由**示例四抛出的消息**自动启动，而不是靠人再点一次。

**用事件怎么表达**：上游 `MESSAGE_THROW` → 宿主订阅 → `startByMessage` → 本流程的 `MESSAGE_START`；本流程办完再用 `MESSAGE_END` 上报一次「通知已送达」。**两个流程定义之间没有任何配置关联**，唯一的纽带是同一个消息名。

<img src="/event/demo-notify-message-start.svg" alt="示例六链路图：上游注销冷静期流程的消息抛出经事件发布器回调给宿主订阅器，宿主再启动下游注销结果通知流程" width="680" height="300" loading="lazy" />

**闭环的三步**：

| 步骤 | 谁做的 | 做了什么 |
| --- | --- | --- |
| ① 上游抛出 | 引擎 | 到达 `MESSAGE_THROW` 时同步回调注册的 `EventPublisher`，带上 `membership.cancelled` 与载荷 |
| ② 宿主订阅 | **宿主代码** | 订阅器收到消息，用同一个消息名调 `startByMessage` 创建下游实例 |
| ③ 下游收尾 | 引擎 → 宿主 | 下游走完「发送注销通知」，到达 `MESSAGE_END` 时再回调一次发布器（`notify.done`） |

```json
{
  "flowCode": "docNotifyFlow",
  "flowName": "注销结果通知",
  "modelValue": "CLASSICS",
  "nodeList": [
    { "nodeType": 0, "nodeCode": "start", "nodeName": "开始",
      "skipList": [{ "nowNodeCode": "start", "nextNodeCode": "msgStart", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "msgStart", "nodeName": "账号已注销",
      "eventType": "MESSAGE_START", "eventName": "membership.cancelled",
      "skipList": [{ "nowNodeCode": "msgStart", "nextNodeCode": "notify", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "notify", "nodeName": "发送注销通知", "permissionFlag": "user:admin",
      "skipList": [{ "nowNodeCode": "notify", "nextNodeCode": "msgEnd", "skipType": "PASS" }] },
    { "nodeType": 1, "nodeCode": "msgEnd", "nodeName": "通知结果回执",
      "eventType": "MESSAGE_END", "eventName": "notify.done",
      "skipList": [{ "nowNodeCode": "msgEnd", "nextNodeCode": "end", "skipType": "PASS" }] },
    { "nodeType": 2, "nodeCode": "end", "nodeName": "结束" }
  ]
}
```

宿主侧的订阅代码（与示例四配套，缺了它链路就断）：

```java
// 收到上游抛出的消息 -> 启动下游流程（与 7.1 的调用写法一致）
@EventListener
public void onMembershipCancelled(MembershipCancelledEvent event) {
    WorkflowContext context = new WorkflowContext();
    context.setHandler("system");     // 审计身份：无人工操作人时用系统身份

    Instance downstream = FlowEngine.insService().startByMessage(
            event.getBusinessId(),    // 与上游同一个业务号，便于关联
            "docNotifyFlow",          // 下游流程编码（本示例）
            "membership.cancelled",   // 必须与 MESSAGE_START 节点的 event_name 完全一致
            MapUtil.of("cancelTime", event.getTime()),
            context);
}
```

::: tip 消息名必须三方一致
设计器节点上的 `eventName`、宿主 `startByMessage` 的 `eventName`、发布器分发用的消息名，必须完全一致。引擎**不做消息路由**：它只负责「到达抛出节点时回调一次发布器」，至于「谁接、接了之后启动哪个流程」全在宿主代码里。
:::

**怎么确认**：

| 步骤 | 怎么确认这一步生效了 |
| --- | --- |
| 下游被启动 | `flow_instance` 出现 `flow_code = docNotifyFlow` 的新实例；`businessId` 与上游是同一个 |
| 不是手动发起 | 该定义没有普通发起入口，`start` 会抛 `该流程由启动事件触发，不支持手动启动` |
| 收尾上报 | 发布器回调里出现 `notify.done`；没接发布器时 WARN `未注册 EventPublisher，消息事件 MESSAGE_END(notify.done) 发布被跳过` |
| 链路断了怎么查 | 上游抛出后下游没实例：先看发布器是否注册（[5.3](#_5-3、注册消息发布器)），再看订阅器里的消息名与 `flowCode` 是否写对 |

**怎么改**：

- 下游也可以只是「发个 MQ 就完事」，不一定要再起一个流程——看你要不要在引擎里留下办理记录。
- `MESSAGE_END` 与 `MESSAGE_THROW` 的差别只在位置：前者必须在结束前、唯一出口指向固定结束节点；后者只需有入线。
- 幂等仍在宿主侧：上游重复抛出会重复启动下游（引擎不按 `businessId` 去重，见 [7.1](#_7-1、消息启动-message-start)）。

### 13.7、跑通之后

- 生产投递换成 Outbox / MQ 可靠投递 + 宿主幂等（[5.3](#_5-3、注册消息发布器)）。
- 定时参数换成业务真实周期，注意 ISO-8601 时长写法（[6.1](#_6-1、时间格式)）和三种触发策略的区别（[6.2](#_6-2、三种定时策略)）。
- 上线前把 [12.2 运行期排查](#_12-2、运行期排查-触发后「没反应」) 逐条对一遍，尤其是 `timerOnly` 与 `flow_event_wait.status`。
