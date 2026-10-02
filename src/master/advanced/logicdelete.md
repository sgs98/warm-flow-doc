# 逻辑删除

::: tip
- 2.0 起 `warm-flow.logic-delete` 默认 `true`：删除操作更新 `del_flag`（逻辑删除），查询自动过滤已删除数据
- 配置 `warm-flow.logic-delete: false` 可切换为<span class="wf-em">物理删除</span>，starter 会自动注册处理器，无需自己写代码
- 两种 ORM 扩展包实现方式不同：MyBatis-Plus 走自身 `@TableLogic`（已删除值 1）；MyBatis 扩展包走通用逻辑删除配置（已删除值默认 1）
:::

## 1、删除模式对照

| 配置                          | 删除行为                      | 查询                             |
| ----------------------------- | ----------------------------- | -------------------------------- |
| `logic-delete: true`（默认）  | 更新 `del_flag`（逻辑删除）   | 自动过滤 `del_flag` 已删除的数据 |
| `logic-delete: false`         | `DELETE` 直接删除（物理删除） | 不再过滤 `del_flag`              |

::: warning 切换为物理删除前
- 请先清理历史逻辑删除数据（`del_flag` 已是删除值的行），否则这些数据会重新出现在查询结果中
- 关闭逻辑删除后，引擎不再把 `del_flag` 作为删除标记读写，字段可保留以兼容历史数据
:::

## 2、Mybatis-Plus

::: tip
- 如果使用Mybatis-Plus的orm框架，只支持Mybatis-Plus自身的逻辑删除方式
- 默认逻辑未删除值：0，逻辑已删除值：1， 工作流组件内部通过注解实现
- 逻辑删除默认开启。 如若关闭, 需高版本比如3.5.3或者以上  
:::

### 2.1、逻辑删除值

```java {15}
/**
 * 流程节点对象 flow_node
 *
 * @author warm
 * @since 2023-03-29
 */
@Data
@Accessors(chain = true)
@TableName("flow_node")
public class FlowNode implements Node {

    /**
     * 删除标记
     */
    @TableLogic(value = "0", delval = "1")
    private String delFlag;

}

```


### 2.2、物理删除方案

```yaml
# warm-flow工作流配置
warm-flow:
  # true（默认）：走 MyBatis-Plus 自身的 @TableLogic 逻辑删除
  # false：流程表全部物理删除
  logic-delete: false
```

> `logic-delete: false` 时，starter 自动注册 `WarmFlowPostInitTableInfoHandler`，在表信息初始化阶段关闭流程表（`flow_definition`、`flow_node`、`flow_skip`、`flow_instance`、`flow_task`、`flow_his_task`、`flow_user`）的 `withLogicDelete`，删除操作变为物理删除。
>
> `flow_form` 不在该清单内，仍按 MyBatis-Plus 自身的 `@TableLogic` 执行逻辑删除。

::: danger 注意事项
关闭逻辑删除后，MyBatis-Plus 的查询也不再拼接 `del_flag` 条件。切换物理删除模式前，请先清理历史逻辑删除数据，否则已删除的数据会重新出现在查询结果中。
:::

- 如需自定义关闭范围（例如只关闭部分表），可自行实现 `PostInitTableInfoHandler` 并交给 Spring 管理
- 该方案依赖 MyBatis-Plus 3.5.3 及以上版本的 `PostInitTableInfoHandler` 扩展点

## 3、通用逻辑删除

> 当所用 ORM 扩展包自身不提供逻辑删除时（如 MyBatis 扩展包），可通过此方式开启；MyBatis-Plus 走自身的 `@TableLogic`，不读取该配置

```yaml
# warm-flow工作流配置
warm-flow:
  # 是否开启逻辑删除，默认 true
  logic-delete: true
  # 逻辑删除字段值（开启后默认为1）
  logic-delete-value: 1
  # 逻辑未删除字段（开启后默认为0）
  logic-not-delete-value: 0
```

- `logic-delete: true`：删除时执行 `update ... set del_flag = logic-delete-value`，查询拼接 `del_flag = logic-not-delete-value`
- `logic-delete: false`：删除时执行物理 `delete`
