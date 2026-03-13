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

## 2、Easy-Query
::: tip
- 默认逻辑未开启，如诺需要开启，需高版本比如3.1.79或者以上
- 如果使用Easy-Query的orm框架，只支持Easy-Query自身的逻辑删除方式
:::

### 2.1、和原系统不共用逻辑删除策略

```java
@Component
public class WarmLogicDelStrategy extends AbstractConfigurationLogicDeleteStrategy {

    @Override
    protected SQLActionExpression1<WherePredicate<Object>> getPredicateFilterExpression() {
        return o -> o.eq("delFlag", "0");
    }

    @Override
    protected SQLActionExpression1<ColumnSetter<Object>> getDeletedSQLExpression() {
        return o -> o.set("delFlag", "2");
    }

    @Override
    public String getStrategy() {
        return WarmLogicDelStrategy.class.getName();
    }

    @Override
    public boolean apply(@NonNull Class<?> entityClass) {
        // 流程表开启逻辑删除
        List<String> excludes = List.of("flow_definition", "flow_node", "flow_skip", "flow_instance"
                , "flow_task", "flow_his_task", "flow_user");
        // 获取entityClass上的@Table注解的值
        Table annotation = entityClass.getAnnotation(Table.class);
        if (annotation == null) {
            return false;
        }
        String tableName = annotation.value();
        return excludes.contains(tableName);
    }
}

```


### 2.2、和原系统共用逻辑删除策略

```java
@Component
public class WarmLogicDelStrategy extends AbstractConfigurationLogicDeleteStrategy {

    @Override
    protected SQLActionExpression1<WherePredicate<Object>> getPredicateFilterExpression() {
        return o -> {
            Class<?> entityClass = o.getTable().getEntityClass();
            // 如果流程表和本系统的逻辑删除字段名不一样，则分别配置
            if (RootEntity.class.isAssignableFrom(entityClass)) {
                o.eq("delFlag", "0");
            } else {
                o.eq("delFlag", "0");
            }
        };
    }

    @Override
    protected SQLActionExpression1<ColumnSetter<Object>> getDeletedSQLExpression() {
        return o -> {
            Class<?> entityClass = o.getTable().getEntityClass();
            // 如果流程表和本系统的逻辑删除字段名不一样，则分别配置
            if (RootEntity.class.isAssignableFrom(entityClass)) {
                o.set("delFlag", "2");
            } else {
                o.set("delFlag", "2");
            }
        };
    }

    @Override
    public String getStrategy() {
        return WarmLogicDelStrategy.class.getName();
    }

    @Override
    public boolean apply(@NonNull Class<?> entityClass) {
        LogicDelProperties logicDelProperties = Solon.context().getBean(LogicDelProperties.class);
        if (!logicDelProperties.getEnable()) {
            return false;
        }
        // 不需要开启逻辑删除的表
        List<String> excludes = logicDelProperties.getExcludes();
        // 获取entityClass上的@Table注解的值
        Table annotation = entityClass.getAnnotation(Table.class);
        if (annotation == null) {
            return false;
        }
        String tableName = annotation.value();
        return !excludes.contains(tableName);
    }
}

```

## 3、通用逻辑删除

```yaml
# warm-flow工作流配置
warm-flow:
  # 是否开启逻辑删除（orm框架本身不支持逻辑删除，可通过这种方式开启，比如jpa）
  logic_delete: true
  # 逻辑删除字段值（开启后默认为2）
  logic_delete_value: 2
  # 逻辑未删除字段（开启后默认为0）
  logic_not_delete_value: 0
```
