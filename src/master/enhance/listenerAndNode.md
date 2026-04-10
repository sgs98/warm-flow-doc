# 监听器+节点扩展属性的妙用

::: tip
需要了解[监听器](https://www.warm-flow.com/master/advanced/listener.html)和[节点扩展属性](https://www.warm-flow.com/master/advanced/node_ext.html)的基本知识点
- 如监听器种类、监听器生命周期和监听器的实现等
- 节点扩展属性种类和实现等
:::

## 1、超时自动审批
- 节点扩展属性：数字框配置超时时间  
- 创建监听器：监听节点超时未执行，则自动执行

### 1.1、节点扩展属性

> 实现节点扩展属性接口，设置节点设置页面需要显示的属性
```java
ChildNode childNode9 = new ChildNode();
childNode9.setCode("autoApproval");
childNode9.setLabel("超时自动审批");
childNode9.setDesc("请输入超时时间，单位为小时");
childNode9.setType(6);
childNode9.setMust(false);
childNode9.setPrecision(2);
childNode9.setStep("0.01");
childNode9.setMin("0");
childs3.add(childNode9);

ChildNode childNode12 = new ChildNode();
childNode12.setCode("autoApproval_skipType");
childNode12.setLabel("超时自动审批后动作");
childNode12.setDesc("通过还是退回，退回需要画退回线或者设置驳回到指定节点");
childNode12.setType(4);
childNode12.setMust(false);

List<DictItem> dictItems7 = new ArrayList<>();
dictItems7.add(new DictItem("审批通过", "PASS"));
dictItems7.add(new DictItem("审批退回", "REJECT"));
childNode12.setDict(dictItems7);
childs3.add(childNode12);
```

> 配置超时时间，和超时后节点会自动执行的动作
<div><img src="https://foruda.gitee.com/images/1773976267016733961/ff42ecae_2218307.png" width="600px"></div>
<br>

### 1.2、创建监听器
- 给需要超时自动审批节点配置**创建监听器**
- 在监听器中判断是否配置超时策略，如果配置了，启动超时定时任务（用户可以使用其他方式实现定时任务效果）
- 判断该节点任务是否已经执行，未执行则自动审批

**注：这里需要特别提醒，超时自动审批最好用创建监听器。** 比如A--->B，A节点办理的时候，会触发触发B配置的创建监听器
（[需要理解创建监听器的生命周期](https://www.warm-flow.com/master/advanced/listener.html#_3、监听器生命周期图)）

```java
@Component
public class AutoApprovalListener implements Listener {

    @Override
    public void notify(ListenerVariable listenerVariable) {
        // 获取节点扩展属性
        Map<String, String> extMap = nodeService.getExt(listenerVariable.getNode());
        // 获取超时时间
        String autoApprovalTime = extMap.get("autoApproval");
        if (StringUtils.isNotEmpty(autoApprovalTime)) {
            // value为保留两位小数的时间，单位为小时，转成秒，如1.1小时转成3960秒
            long seconds = (long) (Double.parseDouble(autoApprovalTime) * 60 * 60);
            // 自动审批不需要校验办理人权限, 默认审批通过
            FlowParams flowParams = FlowParams.build().ignore(true)
                    .skipType(SkipType.PASS.getKey())
                    .message("超时自动审批");
            // 获取超时后执行动作，通过还是退回
            if (!SkipType.isPass(extMap.get("autoApproval_skipType"))) {
                flowParams.skipType(SkipType.REJECT.getKey());
            }
            // 通过jdk的定时任务，自动审批
            Task task = listenerVariable.getTask();
            executor.schedule(() -> {
                Long instanceId = task.getInstanceId();
                synchronized (("会签超时自动审批：" + instanceId).intern()) {
                    log.info("超时自动审批监听器开始执行......");
                    // 判断需要超时自动执行的任务，是否已经被主动执行，如果还存在则开始自动执行
                    Task taskTemp = taskService.getById(task.getId());
                    if (taskTemp != null) {
                        taskService.skip(task.getId(), flowParams);
                        return;
                    }
                    log.info("超时自动审批监听器执行结束......");
                }
            }, seconds, TimeUnit.SECONDS);
        }
    }
}

```

## 2、远程请求
- 节点扩展属性：输入框配置请求地址
- 完成监听器：获取请求地址，发出访问

### 2.1、节点扩展属性

> 实现节点扩展属性接口，设置节点页面需要显示的属性
```java
ChildNode childNode16 = new ChildNode();
childNode16.setCode("httpUrl");
childNode16.setLabel("远程访问");
childNode16.setDesc("请输入远程访问地址");
childNode16.setType(1);
childNode16.setMust(false);
childs3.add(childNode16);
```

> 配置超时时间，和超时后节点会自动执行的动作
<div><img src="https://foruda.gitee.com/images/1773979979897448978/f15779bc_2218307.png" width="600px"></div>
<br>

### 2.2、完成监听器
- 给需要发起请求的审批节点配置**完成监听器**
- 在监听器获取请求地址，并且执行

```java
@Component
public class HttplListener implements Listener {

    @Resource
    private NodeService nodeService;

    private static final Logger log = LoggerFactory.getLogger(HttplListener.class);

    @Override
    public void notify(ListenerVariable listenerVariable) {
        log.info("远程请求监听器开始执行......");
        // 获取节点
        Map<String, String> extMap = nodeService.getExt(listenerVariable.getNode());
        // 获取超时时间
        String httpUrl = extMap.get("httpUrl");
        if (StringUtils.isNotEmpty(httpUrl)) {
            String result = HttpUtils.sendGet(httpUrl);
            if (StringUtils.isNotEmpty(result)) {
                log.info("请求结果：{}", result);
            }
        }
        log.info("远程请求监听器执行结束......");
    }
}

```

## 3、脚本执行
- 节点扩展属性：输入文本域配置脚本
- 完成监听器：获取脚本，并且执行

### 3.1、节点扩展属性

> 实现节点扩展属性接口，设置节点设置页面需要显示的属性
```java
ChildNode childNode17 = new ChildNode();
childNode17.setCode("script");
childNode17.setLabel("脚本");
childNode17.setDesc("请输入脚本信息");
childNode17.setType(2);
childNode17.setMust(false);
childs3.add(childNode17);
```

> 配置超时时间，和超时后节点会自动执行的动作
<div><img src="https://foruda.gitee.com/images/1773979992154566596/d16bf994_2218307.png" width="600px"></div>
<br>

### 3.2、完成监听器
- 给需要脚本的审批节点配置**完成监听器**
- 在监听器获取脚本，并且执行

```java
@Component
public class ScriptlListener implements Listener {

    @Resource
    private NodeService nodeService;

    private static final Logger log = LoggerFactory.getLogger(ScriptlListener.class);

    @Override
    public void notify(ListenerVariable listenerVariable) {
        log.info("脚本监听器开始执行......");
        // 获取节点
        Map<String, String> extMap = nodeService.getExt(listenerVariable.getNode());
        // 获取超时时间
        String script = extMap.get("script");
        if (StringUtils.isNotEmpty(script)) {
            // 执行脚本。。。
            System.out.println("执行脚本：" + script);
        }
        log.info("脚本监听器执行结束......");
    }
}

```

## 4、其他
- 监听器 + 节点扩展属性的上限非常高，在这里希望大家活学活用
- 如果还有什么使用案例，可以在左下脚 **编辑此页** pr给作者，或者私聊给作者wx【warm-houhou】
