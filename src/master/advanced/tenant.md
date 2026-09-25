# 多租户

## 1、Mybatis-plus
::: tip
- Mybatis-plus只支持自身的多租户方式  

:::

```java
@Component
public class MpTenantHandler implements TenantLineHandler {

    ThreadLocal<String> threadLocal = new ThreadLocal<>();

    @Override
    public Expression getTenantId() {
        // 返回租户ID的表达式，LongValue 是 JSQLParser 中表示 bigint 类型的 class
        return new LongValue(2);
    }

    @Override
    public String getTenantIdColumn() {
        return threadLocal.get();
    }


    /**
     * 指定租户字段：动态切换业务表与流程表的租户列名
     * @param tableName 表名
     */
    @Override
    public boolean ignoreTable(String tableName) {
        TableInfo tableInfo = TableInfoHelper.getTableInfo(tableName);
        List<TableFieldInfo> fieldList = tableInfo.getFieldList();
        fieldList.forEach(field -> {
            // 如果业务和工作流引擎中的租户字段不一致，可以通过这种方式动态切换
            if (field.getColumn().equals("tenant_id") || field.getColumn().equals("tenant_code")) {
                threadLocal.set(field.getColumn());
            }
        });
        return false;
    }

}

```

::: tip 二选一：业务系统未开启租户、只想让流程表开启
如果业务系统本身没有多租户、只想给流程相关的表加租户过滤，把上面的 `ignoreTable` 换成下面这版（同一类里只能保留一个 `ignoreTable`，二者按需二选一）：

```java
    /**
     * 只对流程表开启租户过滤，其余业务表忽略
     * @param tableName 表名
     */
    @Override
    public boolean ignoreTable(String tableName) {
        List<String> flowTableName = Arrays.asList("flow_definition", "flow_his_task", "flow_instance", "flow_node"
                ,"flow_skip", "flow_task", "flow_user");
        TableInfo tableInfo = TableInfoHelper.getTableInfo(tableName);
        AtomicBoolean flag = new AtomicBoolean(true);
        if (flowTableName.contains(tableInfo.getTableName())) {
            flag.set(false);
        }
        List<TableFieldInfo> fieldList = tableInfo.getFieldList();
        fieldList.forEach(field -> {
            if (field.getColumn().equals("tenant_id")) {
                threadLocal.set(field.getColumn());
            }
        });
        return flag.get();
    }
```
:::

Mybatis-plus 的拦截器配置：

```java
@Configuration
public class MybatisPlusConfig {

    @Resource
    private MpTenantHandler mpTenantHandler;

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        TenantLineInnerInterceptor tenantInterceptor = new TenantLineInnerInterceptor();
        tenantInterceptor.setTenantLineHandler(mpTenantHandler);
        interceptor.addInnerInterceptor(tenantInterceptor);
        return interceptor;
    }
}
```

## 2、通用多租户
::: warning 适用范围
`TenantHandler`（通用多租户）目前**仅被 MyBatis 扩展包消费**（`TenantDeleteUtil`），MyBatis-Plus 扩展包不读取它——用 MyBatis-Plus 时请走上文的 `TenantLineHandler` 方式。
:::
::: code-tabs#shell

@tab:active yaml

```yaml
# warm-flow工作流配置
warm-flow:
  # 全局租户处理器（可通过配置文件注入，也可用@Bean/@Component方式）
  tenant-handler-path: org.dromara.warm.flow.core.test.handle.CustomTenantHandler
```

@tab @bean

```java
@Configuration
public class WarmFlowConfig {
    /**
     * 全局租户处理器（可通过配置文件注入，也可用@Bean/@Component方式）
     */
    @Bean
    public TenantHandler tenantHandler() {
        return new CustomTenantHandler();
    }
}

```

@tab @Component

```java
/**
 * 全局租户处理器（可通过配置文件注入，也可用@Bean/@Component方式）
 *
 * @author warm
 */
@Component
public class CustomTenantHandler implements TenantHandler {


    @Override
    public String getTenantId() {
        // 这里返回系统中的当前办理人的租户ID，一般会有工具类获取
        return "000000";
    }
}
```

:::


