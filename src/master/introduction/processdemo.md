# 功能演示


## 演示地址

::: warning
- admin/admin123

- 演示地址：[http://www.warm-flow.cn](http://www.warm-flow.cn)  
- 项目地址：[https://gitee.com/min290/hh-vue.git](https://gitee.com/min290/hh-vue.git)  
:::

## 演示图
<div class="yat"><img src="/img/dce0a7ff_2218307.png" alt="演示图"/></div>
<div class="yat"><img src="/img/714f6ddf_2218307.png" alt="演示图"/></div>
<div class="yat"><img src="/img/2f87ee6b_2218307.png" alt="演示图"/></div>
<div class="yat"><img src="/img/747440f8_2218307.png" alt="演示图"/></div>
<div class="yat"><img src="/img/82482501_2218307.png" alt="演示图"/></div>
<div class="yat"><img src="/img/188fc6e5_2218307.png" alt="演示图"/></div>
<div class="yat"><img src="/img/1f4ba9e2_2218307.png" alt="演示图"/></div>
<div class="yat"><img src="/img/c3cbacfa_2218307.png" alt="演示图"/></div>
<div class="yat"><img src="/img/7804d568_2218307.png" alt="演示图"/></div>
<BiliBili bvid="BV1mkd1B2En7" />


## 1、新增定义
::: tip
- 流程编码和流程版本：确定唯一

- 审批表单路径：记录待办任务需要显示的待办信息页面，点击待办时候获取这个路径，动态加载这个页面
:::

<div><img src="/img/eb563152_2218307.png" alt="1、新增定义" width="700"></div>
<div><img src="/img/89b15652_2218307.png" alt="1、新增定义" width="700"></div>


## 2、流程设计
### 2、1节点设置
::: tip 
- 配置节点名称，协作方式（会签、票签和或签），节点权限，是否任意调整，监听器等

- 支持不同节点配置不同得审批表单
:::


<div><img src="/img/ac74e327_2218307.png" alt="2、1节点设置" width="700" /></div>
<div><img src="/img/939d9684_2218307.png" alt="2、1节点设置" width="700" /></div>
<div><img src="/img/3183155f_2218307.png" alt="2、1节点设置" width="700" /></div>

### 2、2跳转线设置
::: tip 
配置跳转名称，跳转类型（通过还是退回）,**退回不能选择通过类型**，调整条件
:::


![2、2跳转线设置](/img/de4b4e75_2218307.png)
![2、2跳转线设置](/img/6466d91c_2218307.png)
## 3、开启流程实例
::: tip
hh-vue项目已经准备了七套流程，以及开启流程代码，开启流程会直接执行到开始节点后一个节点
:::

![](/addIns.png)


## 4、提交流程
::: tip
提交流程后，流程流转到代表任务，由流程设计中的对应权限人去办理
:::


![4、提交流程](/img/d77716b5_2218307.png "屏幕截图")


## 5、办理流程
::: tip
如果是互斥网关则会判断是否满足条件
:::


![5、办理流程](/img/0b9554ec_2218307.png "屏幕截图")
