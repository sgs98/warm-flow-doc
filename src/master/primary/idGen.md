# id生成器

::: tip
- v2.0.0 起移除了 `key_type`/`keyType` 配置，id 生成策略由所用的 orm 扩展包决定，开箱即用
- 如果觉得内置的 id 不符合业务要求，可通过 `IdUtils.setInstanceNative` 注入自定义生成器
:::

## 1. 功能介绍和使用

### 1.1 默认策略

- 使用 **mybatis** 扩展包时，主键由引擎内置的 19 位雪花算法生成，无需任何配置
- 使用 **mybatis-plus** 扩展包时，自动切换为 mybatis-plus 自带的主键生成策略（实体上的 `@TableId`）

### 1.2 自定义id生成器

如果内置 id 不满足业务要求（比如使用数据库自增、号段、自研算法等），可在引擎启动后注入自定义实现：

```java
// 注入后，所有经过 IdUtils.nextId() 生成的主键都走自定义实现
IdUtils.setInstanceNative(() -> yourIdGenerator.nextId());
```

> 注入的实现需要保证全局唯一，否则会影响流程定义、实例、任务等数据的主键生成。


## 2. 精度问题常见解决思路

[id精度丢失](../other/troubleshooting.html#_1、id精度丢失)
