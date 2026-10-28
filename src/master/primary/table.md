# 表结构

## 1.1 表描述
Warm-Flow的表结构设计简洁明了，主要分为流程定义相关表和流程实例相关表两大类：

- **流程定义相关表**‌：
    1. **flow_definition**‌（流程定义表）：记录流程的整体信息，类似于集团军对某个区域的进行A计划军事演练。
    2. **flow_node**‌（流程节点表）：记录流程中的各个节点信息，相当于军事演练中的各个任务环节。
    3. **flow_skip**‌（节点跳转关联表）：记录节点之间的跳转关系，确保任务按计划推进。
- **流程实例相关表**‌：  
    4. **flow_instance**‌（流程实例表）：记录每一次流程实例的信息，如某次A计划军事演练。  
    5. **flow_task**‌（待办任务表）：记录待办任务信息，如解放军执行的第一个任务。  
    6. **flow_his_task**‌（历史任务记录表）：记录已完成的任务信息，用于记录演练过程。  
    7. **flow_user**‌（流程用户表）：记录任务是谁可以办理，用于任务分配。  
    8. **flow_event_wait**‌（事件等待表）：记录需要「等待」的事件（定时 / 消息 / 错误）当前等到了什么程度，如演练中「等待增援命令到达」这一环节。仅在开启事件能力时使用，事件能力默认关闭。  
 
通过这些表，Warm-Flow能够高效地管理流程的定义、实例、任务、用户与事件等待信息，实现流程的自动化和高效管理。

## 1.2 表清单

| **#** | **数据表**        | **名称**       | **备注说明**         |
| ----- | ----------------- | -------------- | -------------------- |
| 1     | flow_definition   | 流程定义表     |                      |
| 2     | flow_event_wait   | 事件等待表     | 事件能力关闭时不使用 |
| 3     | flow_his_task     | 历史任务记录表 |                      |
| 4     | flow_instance     | 流程实例表     |                      |
| 5     | flow_node         | 流程节点表     |                      |
| 6     | flow_skip         | 节点跳转关联表 |                      |
| 7     | flow_task         | 待办任务表     |                      |
| 8     | flow_user         | 流程用户表     |                      |

::: tip 关于 flow_form（表单表）
除上述 8 张核心表外，引擎还有一张**可选**的 `flow_form` 表，服务于内置表单功能（对应 `FormService`，字段如 `form_code`/`form_name`/`version`/`is_publish`/`form_type`/`form_path`/`form_content`/`ext` 等）。该表目前仅在升级脚本 `sql/mysql/v1-upgrade/warm-flow_form.sql` 中提供，**尚未纳入各库的全量脚本 `warm-flow-all.sql`**，且功能仍在完善中；不使用内置表单时无需建表。
:::

::: warning 审计字段默认值
各表的 `create_by` / `update_by` 在 SQL 中均为 `varchar(64) DEFAULT ''`，`del_flag` 为 `char(1) DEFAULT '0'`；下方明细表为排版简洁未逐一标注默认值，以建表脚本为准。
:::


## 1.3 表字段明细

::: warning 同名列在不同表里含义不同
`flow_status` 这一个列名在实例表与任务表里存的是**两套编码**，不要互相套用：

| 列                          | 编码含义 | 取值                                                              |
| --------------------------- | -------- | ----------------------------------------------------------------- |
| `flow_instance.flow_status` | 实例状态 | `draft` 待提交、`waiting` 审批中、`termination` 终止、`invalid` 作废、`cancel` 撤销、`finish` 已完成、`back` 已退回、`restart` 重启 |
| `flow_task.flow_status`     | 任务状态 | `pending` 待审批、`pass` 通过、`auto_pass` 自动审批、`back` 退回、`invalid` 失效、`take_back` 拿回、`copy` 抄送 |
| `flow_his_task.flow_status` | 任务状态 | 同上；2.1.0 的撤回归档曾写实例码 `cancel`，2.1.1 起改为 `back`，目前唯一例外是终止归档写 `termination` |

实例与任务是两张表、两套独立编码空间，即使编码字面相同也不能混用；例如任务通过是 `pass`，实例已完成是 `finish`。宿主想换成自己的编码见 [自定义流程状态](../enhance/customstatus.md)。
:::

### 1.3.1 **flow_definition [**流程定义表**]**

| **#** | **字段**        | **名称**                                       | **数据类型** | **主键** | **非空** | **默认值** | **备注说明** |
| ----- | --------------- | ---------------------------------------------- | ------------ | -------- | -------- | ---------- | ------------ |
| 1     | id              | 主键id                                         | BIGINT       | √        | √        |            |              |
| 2     | flow_code       | 流程编码                                       | VARCHAR(40)  |          | √        |            |              |
| 3     | flow_name       | 流程名称                                       | VARCHAR(100) |          | √        |            |              |
| 4     | model_value     | 设计器模型（CLASSICS经典模型 MIMIC仿钉钉模型） | VARCHAR(40)  |          | √        | 'CLASSICS' |              |
| 5     | category        | 流程类别                                       | VARCHAR(100) |          |          |            |              |
| 6     | version         | 流程版本                                       | VARCHAR(20)  |          | √        |            |              |
| 7     | is_publish      | 是否发布（0未发布 1已发布 9失效）              | TINYINT(1)       |          | √        | 0          |              |
| 8     | form_custom     | 审批表单是否自定义（Y是 N否）                  | CHAR(1)      |          |          | 'N'        |              |
| 9     | form_path       | 审批表单路径                                   | VARCHAR(100) |          |          |            |              |
| 10    | activity_status | 流程激活状态（0挂起 1激活）                    | TINYINT(1)       |          | √        | 1          |              |
| 11    | listener_type   | 监听器类型                                     | VARCHAR(100) |          |          |            |              |
| 12    | listener_path   | 监听器路径                                     | VARCHAR(400) |          |          |            |              |
| 13    | ext             | 业务详情 存业务表对象json字符串                | VARCHAR(500) |          |          |            |              |
| 14    | def_config      | 流程定义配置（自动审批等引擎配置与自定义扩展属性json） | TEXT         |          |          |            |              |
| 15    | create_time     | 创建时间                                       | DATETIME     |          |          |            |              |
| 16    | create_by       | 创建人                                                       | VARCHAR(64)  |          |          |            |              |
| 17    | update_time     | 更新时间                                       | DATETIME     |          |          |            |              |
| 18    | update_by       | 更新人                                                       | VARCHAR(64)  |          |          |            |              |
| 19    | del_flag        | 删除标志                                       | CHAR(1)      |          |          | '0'        |              |
| 20    | tenant_id       | 租户id                                         | VARCHAR(40)  |          |          |            |              |

### 1.3.2 **flow_his_task [**历史任务记录表**]**

| **#** | **字段**         | **名称**                                                     | **数据类型** | **主键** | **非空** | **默认值** | **备注说明** |
| ----- | ---------------- | ------------------------------------------------------------ | ------------ | -------- | -------- | ---------- | ------------ |
| 1     | id              | 主键id                                                       | BIGINT       | √        | √        |            |              |
| 2     | definition_id   | 对应flow_definition表的id                                    | BIGINT       |          | √        |            |              |
| 3     | instance_id     | 对应flow_instance表的id                                      | BIGINT       |          | √        |            |              |
| 4     | task_id         | 对应flow_task表的id                                          | BIGINT       |          | √        |            |              |
| 5     | node_code       | 开始节点编码                                                 | VARCHAR(100) |          |          |            |              |
| 6     | node_name       | 开始节点名称                                                 | VARCHAR(100) |          |          |            |              |
| 7     | node_type       | 开始节点类型（0开始节点 1中间节点 2结束节点 3互斥网关 4并行网关 5包容网关 6服务任务） | TINYINT(1)       |          |          |            |              |
| 8     | target_node_code | 目标节点编码                                                 | VARCHAR(200) |          |          |            |              |
| 9     | target_node_name | 结束节点名称                                                 | VARCHAR(200) |          |          |            |              |
| 10    | approver        | 审批者                                                       | VARCHAR(40)  |          |          |            |              |
| 11    | cooperate_type  | 协作方式（none无 transfer转办 delegate委派 add_signer加签 remove_signer减签；行为维度，结果见 flow_status） | VARCHAR(20)  |          | √        | 'none'     |              |
| 12    | collaborator    | 协作人                                                       | VARCHAR(500) |          |          |            |              |
| 13    | skip_type       | 流转类型（PASS通过 REJECT退回 NONE无动作）                   | VARCHAR(10)  |          | √        |            |              |
| 14    | flow_status     | 任务状态（pending待审批 pass通过 auto_pass自动审批 back退回 invalid失效 take_back拿回 copy抄送；2.1.1 起终止归档写 termination） | VARCHAR(20)  |          | √        |            |              |
| 15    | form_custom     | 审批表单是否自定义（Y是 N否）                                | CHAR(1)      |          |          | 'N'        |              |
| 16    | form_path       | 审批表单路径                                                 | VARCHAR(100) |          |          |            |              |
| 17    | message         | 审批意见                                                     | VARCHAR(500) |          |          |            |              |
| 18    | variable        | 任务变量                                                     | TEXT         |          |          |            |              |
| 19    | ext             | 业务详情 存业务表对象json字符串                              | TEXT         |          |          |            |              |
| 20    | node_config     | 节点配置（服务任务等引擎配置与自定义扩展属性json）             | TEXT         |          |          |            |              |
| 21    | create_time     | 任务开始时间                                                 | DATETIME     |          |          |            |              |
| 22    | update_time     | 审批完成时间                                                 | DATETIME     |          |          |            |              |
| 23    | del_flag        | 删除标志                                                     | CHAR(1)      |          |          | '0'        |              |
| 24    | tenant_id       | 租户id                                                       | VARCHAR(40)  |          |          |            |              |

### 1.3.3 **flow_instance [**流程实例表**]**

| **#** | **字段**        | **名称**                                                     | **数据类型** | **主键** | **非空** | **默认值** | **备注说明** |
| ----- | --------------- | ------------------------------------------------------------ | ------------ | -------- | -------- | ---------- | ------------ |
| 1     | id              | 主键id                                                       | BIGINT       | √        | √        |            |              |
| 2     | definition_id   | 对应flow_definition表的id                                    | BIGINT       |          | √        |            |              |
| 3     | business_id     | 业务id                                                       | VARCHAR(40)  |          | √        |            |              |
| 4     | node_type       | 节点类型（0开始节点 1中间节点 2结束节点 3互斥网关 4并行网关 5包容网关 6服务任务） | TINYINT(1)       |          | √        |            |              |
| 5     | node_code       | 流程节点编码                                                 | VARCHAR(40)  |          | √        |            |              |
| 6     | node_name       | 流程节点名称                                                 | VARCHAR(100) |          |          |            |              |
| 7     | variable        | 任务变量                                                     | TEXT         |          |          |            |              |
| 8     | flow_status     | 实例状态（draft待提交 waiting审批中 termination终止 invalid作废 cancel撤销 finish已完成 back已退回 restart重启） | VARCHAR(20)  |          | √        |            |              |
| 9     | activity_status | 流程激活状态（0挂起 1激活）                                  | TINYINT(1)       |          | √        | 1          |              |
| 10    | def_json        | 流程定义json                                                 | TEXT         |          |          |            |              |
| 11    | create_time     | 创建时间                                                     | DATETIME     |          |          |            |              |
| 12    | create_by       | 创建者                                                       | VARCHAR(64)  |          |          |            |              |
| 13    | update_time     | 更新时间                                                     | DATETIME     |          |          |            |              |
| 14    | update_by       | 更新人                                                       | VARCHAR(64)  |          |          |            |              |
| 15    | ext             | 扩展字段，预留给业务系统使用                                 | VARCHAR(500) |          |          |            |              |
| 16    | del_flag        | 删除标志                                                     | CHAR(1)      |          |          | '0'        |              |
| 17    | tenant_id       | 租户id                                                       | VARCHAR(40)  |          |          |            |              |

### 1.3.4 **flow_node [**流程节点表**]**

| **#** | **字段**        | **名称**                                                     | **数据类型** | **主键** | **非空** | **默认值** | **备注说明** |
| ----- | --------------- | ------------------------------------------------------------ | ------------ | -------- | -------- | ---------- | ------------ |
| 1     | id              | 主键id                                                       | BIGINT       | √        | √        |            |              |
| 2     | node_type       | 节点类型（0开始节点 1中间节点 2结束节点 3互斥网关 4并行网关 5包容网关 6服务任务） | TINYINT(1)       |          | √        |            |              |
| 3     | definition_id   | 流程定义id                                                   | BIGINT       |          | √        |            |              |
| 4     | node_code       | 流程节点编码                                                 | VARCHAR(100) |          | √        |            |              |
| 5     | node_name       | 流程节点名称                                                 | VARCHAR(100) |          |          |            |              |
| 6     | permission_flag | 权限标识（权限类型:权限标识，可以多个，用@@隔开)             | VARCHAR(200) |          |          |            |              |
| 7     | node_ratio      | 流程签署比例值                                               | VARCHAR(200) |          |          |            |              |
| 8     | coordinate      | 坐标                                                         | VARCHAR(100) |          |          |            |              |
| 9     | any_node_skip   | 任意结点跳转                                                 | VARCHAR(100) |          |          |            |              |
| 10    | listener_type   | 监听器类型                                                   | VARCHAR(100) |          |          |            |              |
| 11    | listener_path   | 监听器路径                                                   | VARCHAR(400) |          |          |            |              |
| 12    | form_custom     | 审批表单是否自定义（Y是 N否）                                | CHAR(1)      |          |          | 'N'        |              |
| 13    | form_path       | 审批表单路径                                                 | VARCHAR(100) |          |          |            |              |
| 14    | create_time     | 创建时间                                                     | DATETIME     |          |          |            |              |
| 15    | create_by       | 创建人                                                       | VARCHAR(64)  |          |          |            |              |
| 16    | update_time     | 更新时间                                                     | DATETIME     |          |          |            |              |
| 17    | update_by       | 更新人                                                       | VARCHAR(64)  |          |          |            |              |
| 18    | ext             | 节点扩展属性                                                 | TEXT         |          |          |            |              |
| 19    | node_config     | 节点配置（服务任务、事件、节点默认变量等引擎节点配置json）   | TEXT         |          |          |            |              |
| 20    | event_type      | 事件类型（取值见[流程事件与内置定时器](../advanced/event.md)，空表示无事件） | VARCHAR(40)  |          |          |            |              |
| 21    | event_name      | 事件名称（消息事件使用；错误事件存错误码，可空表示通配）     | VARCHAR(100) |          |          |            |              |
| 22    | attached_to_node_code | 边界事件附着的任务节点编码                             | VARCHAR(100) |          |          |            |              |
| 23    | interrupting    | 边界事件是否中断型（1中断 0非中断）                          | TINYINT(1)   |          |          |            |              |
| 24    | del_flag        | 删除标志                                                     | CHAR(1)      |          |          | '0'        |              |
| 25    | tenant_id       | 租户id                                                       | VARCHAR(40)  |          |          |            |              |

### 1.3.5 **flow_event_wait [**事件等待表**]**

定时 / 消息 / 错误等需要「等待」的事件统一落在本表；一次性成功后删除，`DEAD` / `CANCELLED` 按保留期清理。完整生命周期见 [流程事件与内置定时器](../advanced/event.md)。

| **#** | **字段**           | **名称**                                                     | **数据类型** | **主键** | **非空** | **默认值** | **备注说明** |
| ----- | ------------------ | ------------------------------------------------------------ | ------------ | -------- | -------- | ---------- | ------------ |
| 1     | id                 | 主键id                                                       | BIGINT       | √        | √        |            |              |
| 2     | definition_id      | 流程定义id（定时启动事件必有，实例级等待为空）               | BIGINT       |          |          |            |              |
| 3     | instance_id        | 流程实例id（实例等待事件必有，定义级定时启动为空）           | BIGINT       |          |          |            |              |
| 4     | node_code          | 事件节点编码（定位沿用 definition_id + node_code）            | VARCHAR(100) |          |          |            |              |
| 5     | event_type         | 事件类型（同 flow_node.event_type）                          | VARCHAR(40)  |          | √        |            |              |
| 6     | event_name         | 事件名称（消息事件使用）                                     | VARCHAR(100) |          |          |            |              |
| 7     | attached_task_id   | 边界事件关联的待办任务id                                     | BIGINT       |          |          |            |              |
| 8     | trigger_type       | 触发策略类型（AFTER固定时长 FIXED固定间隔 POINT_IN_TIME指定时间点） | VARCHAR(40)  |          |          |            |              |
| 9     | trigger_interval   | 触发策略原始配置（如 PT30S / P1D / ["09:00"]）               | VARCHAR(100) |          |          |            |              |
| 10    | next_trigger_at    | 下次触发时间                                                 | DATETIME     |          |          |            |              |
| 11    | timezone           | 定时触发使用的时区                                           | VARCHAR(40)  |          |          |            |              |
| 12    | repeat_count       | 已触发次数                                                   | INT          |          |          |            |              |
| 13    | max_repeat_count   | 最大触发次数（超过后不再排下一次）                           | INT          |          |          |            |              |
| 14    | status             | 等待状态（WAITING等待中 RUNNING执行中 CANCELLED已取消 RETRY待重试 DEAD已废弃） | VARCHAR(20)  |          | √        |            |              |
| 15    | retry_count        | 已重试次数                                                   | INT          |          |          |            |              |
| 16    | max_retry_count    | 最大重试次数（超过后转 DEAD）                                | INT          |          |          |            |              |
| 17    | retry_at           | 下次重试时间                                                 | DATETIME     |          |          |            |              |
| 18    | lock_owner         | 抢占持有者标识                                               | VARCHAR(64)  |          |          |            |              |
| 19    | lock_until         | 抢占租约到期时间                                             | DATETIME     |          |          |            |              |
| 20    | version            | 乐观锁版本号                                                 | INT          |          |          |            |              |
| 21    | payload            | 消息事件接收的业务载荷；定时启动另存节点默认变量             | TEXT         |          |          |            |              |
| 22    | last_error         | 最近一次失败原因摘要                                         | VARCHAR(500) |          |          |            |              |
| 23    | create_time        | 创建时间                                                     | DATETIME     |          |          |            |              |
| 24    | update_time        | 更新时间                                                     | DATETIME     |          |          |            |              |
| 25    | del_flag           | 删除标志                                                     | CHAR(1)      |          |          | '0'        |              |
| 26    | tenant_id          | 租户id                                                       | VARCHAR(40)  |          |          |            |              |

### 1.3.6 **flow_skip [**节点跳转关联表**]**

| **#** | **字段**       | **名称**                                                     | **数据类型** | **主键** | **非空** | **默认值** | **备注说明** |
| ----- | -------------- | ------------------------------------------------------------ | ------------ | -------- | -------- | ---------- | ------------ |
| 1     | id              | 主键id                                                       | BIGINT       | √        | √        |            |              |
| 2     | definition_id   | 流程定义id                                                   | BIGINT       |          | √        |            |              |
| 3     | now_node_code   | 当前流程节点的编码                                           | VARCHAR(100) |          | √        |            |              |
| 4     | now_node_type   | 当前节点类型（0开始节点 1中间节点 2结束节点 3互斥网关 4并行网关 5包容网关 6服务任务） | TINYINT(1)       |          |          |            |              |
| 5     | next_node_code  | 下一个流程节点的编码                                         | VARCHAR(100) |          | √        |            |              |
| 6     | next_node_type  | 下一个节点类型（0开始节点 1中间节点 2结束节点 3互斥网关 4并行网关 5包容网关 6服务任务） | TINYINT(1)       |          |          |            |              |
| 7     | skip_name       | 跳转名称                                                     | VARCHAR(100) |          |          |            |              |
| 8     | skip_type       | 跳转类型（PASS审批通过 REJECT退回）                          | VARCHAR(40)  |          |          |            |              |
| 9     | skip_condition  | 跳转条件                                                     | VARCHAR(200) |          |          |            |              |
| 10    | coordinate      | 坐标                                                         | VARCHAR(100) |          |          |            |              |
| 11    | create_time     | 创建时间                                                     | DATETIME     |          |          |            |              |
| 12    | create_by       | 创建人                                                       | VARCHAR(64)  |          |          |            |              |
| 13    | update_time     | 更新时间                                                     | DATETIME     |          |          |            |              |
| 14    | update_by       | 更新人                                                       | VARCHAR(64)  |          |          |            |              |
| 15    | del_flag        | 删除标志                                                     | CHAR(1)      |          |          | '0'        |              |
| 16    | tenant_id       | 租户id                                                       | VARCHAR(40)  |          |          |            |              |

### 1.3.7 **flow_task [**待办任务表**]**

| **#** | **字段**      | **名称**                                                     | **数据类型** | **主键** | **非空** | **默认值** | **备注说明** |
| ----- | ------------- | ------------------------------------------------------------ | ------------ | -------- | -------- | ---------- | ------------ |
| 1     | id              | 主键id                                                       | BIGINT       | √        | √        |            |              |
| 2     | definition_id   | 对应flow_definition表的id                                    | BIGINT       |          | √        |            |              |
| 3     | instance_id     | 对应flow_instance表的id                                      | BIGINT       |          | √        |            |              |
| 4     | node_code       | 节点编码                                                     | VARCHAR(100) |          | √        |            |              |
| 5     | node_name       | 节点名称                                                     | VARCHAR(100) |          |          |            |              |
| 6     | node_type       | 节点类型（0开始节点 1中间节点 2结束节点 3互斥网关 4并行网关 5包容网关 6服务任务） | TINYINT(1)       |          | √        |            |              |
| 7     | flow_status     | 任务状态（pending待审批 pass通过 auto_pass自动审批 back退回 invalid失效 take_back拿回 copy抄送） | VARCHAR(20)  |          | √        |            |              |
| 8     | form_custom     | 审批表单是否自定义（Y是 N否）                                | CHAR(1)      |          |          | 'N'        |              |
| 9     | form_path       | 审批表单路径                                                 | VARCHAR(100) |          |          |            |              |
| 10    | create_time     | 创建时间                                                     | DATETIME     |          |          |            |              |
| 11    | create_by       | 创建人                                                       | VARCHAR(64)  |          |          |            |              |
| 12    | update_time     | 更新时间                                                     | DATETIME     |          |          |            |              |
| 13    | update_by       | 更新人                                                       | VARCHAR(64)  |          |          |            |              |
| 14    | del_flag        | 删除标志                                                     | CHAR(1)      |          |          | '0'        |              |
| 15    | tenant_id       | 租户id                                                       | VARCHAR(40)  |          |          |            |              |

### 1.3.8 **flow_user [**流程用户表**]**

| **#** | **字段**     | **名称**                                                     | **数据类型** | **主键** | **非空** | **默认值** | **备注说明** |
| ----- | ------------ | ------------------------------------------------------------ | ------------ | -------- | -------- | ---------- | ------------ |
| 1     | id              | 主键id                                                       | BIGINT       | √        | √        |            |              |
| 2     | type            | 人员类型（1待办任务的审批人权限 2待办任务的转办人权限 3待办任务的委托人权限 4待办任务的抄送人） | CHAR(1)      |          | √        |            |              |
| 3     | processed_by    | 权限人                                                       | VARCHAR(80)  |          |          |            |              |
| 4     | associated      | 关联id（待办任务id；抄送人记录为 flow_his_task.id）            | BIGINT       |          | √        |            |              |
| 5     | create_time     | 创建时间                                                     | DATETIME     |          |          |            |              |
| 6     | create_by       | 创建人                                                       | VARCHAR(80)  |          |          |            |              |
| 7     | update_time     | 更新时间                                                     | DATETIME     |          |          |            |              |
| 8     | update_by       | 更新人                                                       | VARCHAR(64)  |          |          |            |              |
| 9     | del_flag        | 删除标志                                                     | CHAR(1)      |          |          | '0'        |              |
| 10    | tenant_id       | 租户id                                                       | VARCHAR(40)  |          |          |            |              |
