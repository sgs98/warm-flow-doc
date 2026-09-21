# 自定义流程状态


::: tip
- instanceStatus：流程实例表状态，当前流程状态    
- historyTaskStatus：历史任务表状态，过程状态记录，按照自身业务要求，可以与流程实例状态不同  

:::



## 1、开启流程

```java
    public void insertTestLeave(TestLeave testLeave, Integer flowStatus)
    {
        String id = IdUtils.nextIdStr();
        testLeave.setId(id);
        LoginUser user = SecurityUtils.getLoginUser();

        StartCommand command = new StartCommand();
        command.setOperator(new OperatorContext(user.getUser().getUserId().toString(), null));
        command.setBusinessId(id);
        command.setFlowCode(getFlowType(testLeave));

        // 自定义流程状态扩展，instanceStatus与historyTaskStatus可以不同
        if (Objects.nonNull(flowStatus)) {
            command.setInstanceStatus(flowStatus).setHistoryTaskStatus(flowStatus);
        }

        WorkflowResult result = FlowEngine.workflow().start(command);
    }
```

## 2、流程跳转

```java
        // 自定义流程状态扩展，instanceStatus与historyTaskStatus可以不同
        if (Objects.nonNull(flowStatus)) {
            command.setInstanceStatus(flowStatus).setHistoryTaskStatus(flowStatus);
        }
        WorkflowResult result = FlowEngine.workflow().complete(command);
```

```java
        // 自定义流程状态扩展，instanceStatus与historyTaskStatus可以不同
        if (Objects.nonNull(flowStatus)) {
            command.setInstanceStatus(flowStatus).setHistoryTaskStatus(flowStatus);
        }
        WorkflowResult result = FlowEngine.workflow().reject(command);
```

## 3、其他请查阅核心api
