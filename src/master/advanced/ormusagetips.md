# orm扩展包使用技巧

::: tip
- 组件本身提供常见并且基础的api，如果满足不了需求，可以使用orm自身的api

:::

## 1、mybatis-plus

**获取组件中的mapper，使用mybaits-plus的自带方法**
```java

// 第一种方式
@Resource
private FlowTaskMapper taskMapper;

// 第二种方式
FlowTaskMapper taskMapper = FrameInvoker.getBean(FlowTaskMapper.class);
```

> mybatis-plus 扩展包的 Mapper 继承自 MP 的 `BaseMapper`，拿到后可直接调用 `selectList`、`update` 等 MP 通用方法。

## 2、mybatis

**获取组件中的mapper，调用引擎自定义的 Mapper 方法**
```java
// 通过 FrameInvoker 拿到 Spring 容器里的 Mapper Bean
FlowTaskMapper taskMapper = FrameInvoker.getBean(FlowTaskMapper.class);
```

> mybatis 扩展包的 Mapper（如 `FlowTaskMapper`、`FlowDefinitionMapper` 等）**不继承** MP 的 `BaseMapper`，方法是引擎按需在 XML 里定义的；如需更复杂的查询，可拿到对应 `SqlSession` 或自建 Mapper 扫描自己的 XML，而不要套用 MP 的 `BaseMapper` API。
