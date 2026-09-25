# 逻辑删除

## 1、Mybatis-Plus
::: tip
- 如果使用Mybatis-Plus的orm框架，只支持Mybatis-Plus自身的逻辑删除方式
- 默认逻辑未删除值：0，逻辑已删除值：1， 工作流组件内部通过注解实现
- 逻辑删除默认开启。 如若关闭, 需高版本比如3.5.3或者以上  
:::

### 1.1、逻辑删除值

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


### 1.2、关闭逻辑删除方案

```java
/**
 * 关闭逻辑删除，需高版本比如3.5.3或者以上
 *
 * @author warm
 */
@Component
public class PlusPostInitTableInfoHandler implements PostInitTableInfoHandler {

    List<String> tableNames = Arrays.asList("flow_definition", "flow_node", "flow_skip", "flow_instance", "flow_task"
            , "flow_his_task", "flow_user");
    @Override
    public void postTableInfo(TableInfo tableInfo, Configuration configuration) {
        String tableName = tableInfo.getTableName();
        if (tableNames.contains(tableName)) {
            Class<?> clazz = tableInfo.getClass();
            Field[] fields = clazz.getDeclaredFields();
            try {
                for (Field field : fields) {
                    if ("withLogicDelete".equals(field.getName())) {
                        field.setAccessible(true);
                        // 关闭逻辑删除
                        field.set(tableInfo, false);
                    }
                }
            } catch (IllegalAccessException e) {
                throw new FlowException("反射设置对象值异常");
            }
        }
    }
}

```
## 2、通用逻辑删除

```yaml
# warm-flow工作流配置
warm-flow:
  # 当所用 ORM 扩展包自身不提供逻辑删除时（如 MyBatis 扩展包），可通过此方式开启；
  # MyBatis-Plus 走自身的 @TableLogic，不读取该配置
  logic-delete: true
  # 逻辑删除字段值（开启后默认为2）
  logic-delete-value: 2
  # 逻辑未删除字段（开启后默认为0）
  logic-not-delete-value: 0
```
