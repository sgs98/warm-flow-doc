
# Warm-Flow 1.8.5 正式发布：超时自动审批、暂存功能来了！

  **亲爱的 Warm-Flow 用户们，有一段时间没有发布新版本，不少人质疑作者是否要停更了。在这里和大家说不会的，只是作者的生活需要一段时间调整。** 
  在此，我们非常高兴地宣布 Warm-Flow 1.8.5 版本**今日正式发布！**  

  本次更新聚焦于提升您的工作流开发体验，带来了**超时自动审批、监听器下拉选择、暂存功能**等多项实用特性，同时优化了节点扩展属性
  ，并完成了 **SpringBoot4 和 Jackson3 的适配**。无论您是追求高效开发的个人开发者，还是注重稳定性的企业用户，这些新功能都将让您的工作流开发更加得心应手。

## 本次更新内容

### 新增功能
- **超时自动审批案例:** 再也不用担心流程卡住了
- **监听器支持下拉选:** 可视化选择，开发更便捷
- **暂存功能:** 草稿保存，数据不丢失
- **SpringBoot4 适配:** 紧跟最新技术栈
- **Jackson3 支持:** 更好的 JSON 处理能力
- **节点扩展属性新增数字框和时间选择器:** 节点扩展属性更丰富
- **获取节点扩展属性接口:** 数据获取更灵活
- **easy-query orm 插件包:** ORM 生态再扩容
- **Solon Expression表达式:** 为 Solon 提供了一套表达式通用接口

### 功能优化
- **暗黑模式体验优化:** 夜间开发更舒适
- **审批表单空字符串不保存:** 数据存储更合理
- **优化代码注释和静态属性:** 代码质量持续提升

### Bug 修复
- 修复 solon 版本下 BeanConfig 被重复执行的问题
- 解决设计器高度被锁死的问题
- solon 版本支持通过@Bean 或@Component 方式注入处理器和监听器

### 升级提示
- logic-flow 升级至 2.1.11

### 移除
- 排除冲突的依赖

## 新功能预览

<table>
    <tbody>
        <tr>
            <td><img src="https://foruda.gitee.com/images/1773982064615165623/e892d638_2218307.png" width="800px"/></td>
        </tr>
        <tr>
            <td><img src="https://foruda.gitee.com/images/1773976267016733961/ff42ecae_2218307.png" width="800px"/></td>
        </tr>
        <tr>
            <td><img src="https://foruda.gitee.com/images/1773979979897448978/f15779bc_2218307.png" width="800px"/></td>
        </tr>
        <tr>
            <td><img src="https://foruda.gitee.com/images/1773979992154566596/d16bf994_2218307.png" width="800px"/></td>
        </tr>
        <tr>
            <td><img src="https://foruda.gitee.com/images/1773978545571972576/2f631819_2218307.png" width="800px"/></td>
        </tr>
    </tbody>
</table>

## 为什么选择 Warm-Flow？

作为国产工作流引擎，Warm-Flow 已服务众多开发者和企业，我们的核心优势：

**简洁轻量:** 仅需 7 张表，代码量少，上手快速  
**双模式支持:** 原生支持经典和仿钉钉双模式  
**快速集成:** 通过 jar 包快速集成设计器  
**广泛兼容:** 支持 MyBatis、Mybatis-Plus、Jpa 和 Easy-Query 等多种 ORM 框架  
**多种表达式:** 条件表达式、办理人表达式、票签策略表达式，让项目灵活度拉满

## 功能全景

![](https://foruda.gitee.com/images/1773981444246272785/259ff9b7_2218307.png)

![](https://foruda.gitee.com/images/1754530281717340950/b531c256_2218307.png)
![](https://foruda.gitee.com/images/1754530582498275502/be3acb55_2218307.png)

## 立即体验

**演示地址**：[http://www.warm-flow.cn](http://www.warm-flow.cn)  
**账号密码**：admin / admin123  
**官方网站**：[https://www.warm-flow.com](https://www.warm-flow.com)

想要深入了解？观看我们的视频教程：[从零精通：全流程开发与源码解读](https://www.bilibili.com/video/BV1AWRGYEEVr/)

---

**立即升级，体验更高效的工作流开发！**
