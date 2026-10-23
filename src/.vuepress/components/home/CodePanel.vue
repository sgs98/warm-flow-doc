<template>
  <div class="wf-panel">
    <div class="wf-tabs">
      <span class="on">三步集成</span><span>pom.xml</span><span>application.yml</span>
    </div>
    <pre class="wf-code"><span class="step">1</span> <span class="k">&lt;dependency&gt;</span>
   <span class="k">&lt;groupId&gt;</span><span class="s">io.github.sgs98</span><span class="k">&lt;/groupId&gt;</span>
   <span class="k">&lt;artifactId&gt;</span><span class="s">warm-flow-mybatis-plus-sb3-starter</span><span class="k">&lt;/artifactId&gt;</span>
   <span class="k">&lt;version&gt;</span><span class="s">2.1.0</span><span class="k">&lt;/version&gt;</span>
 <span class="k">&lt;/dependency&gt;</span>
<span class="step">2</span> <span class="c">-- 执行建表 SQL（8 张核心表；事件能力关闭时实际使用 7 张）</span>
<span class="step">3</span> <span class="a">@Autowired</span> <span class="k">private</span> <span class="t">WorkflowService</span> <span class="v">workflowService</span>;

   <span class="c">// 办理人走 ${handler} 表达式，流程变量随需传递</span>
   <span class="t">Map</span>&lt;<span class="t">String</span>,<span class="t">Object</span>&gt; <span class="v">variable</span> = <span class="t">Map</span>.of(<span class="s">"handler"</span>, <span class="s">"1001"</span>);
   <span class="t">StartCommand</span> <span class="v">command</span> = <span class="k">new</span> <span class="t">StartCommand</span>();
   <span class="v">command</span>.<span class="f">setBusinessId</span>(<span class="s">"1001"</span>);
   <span class="v">command</span>.<span class="f">setFlowCode</span>(<span class="s">"leave"</span>);
   <span class="v">command</span>.<span class="f">setVariables</span>(<span class="v">variable</span>);
   <span class="t">WorkflowResult</span> <span class="v">result</span> = <span class="v">workflowService</span>.<span class="f">start</span>(<span class="v">command</span>);</pre>
  </div>
</template>
