<template>
  <div class="wf-panel">
    <div class="wf-tabs">
      <span class="on">三步集成</span><span>pom.xml</span><span>application.yml</span>
    </div>
    <pre class="wf-code"><span class="step">1</span> <span class="k">&lt;dependency&gt;</span>
   <span class="k">&lt;groupId&gt;</span><span class="s">org.dromara.warm</span><span class="k">&lt;/groupId&gt;</span>
   <span class="k">&lt;artifactId&gt;</span><span class="s">warm-flow-mybatis-plus-sb3-starter</span><span class="k">&lt;/artifactId&gt;</span>
 <span class="k">&lt;/dependency&gt;</span>
<span class="step">2</span> <span class="c">-- 执行建表 SQL（flow_definition / flow_node / flow_task …共 7 张）</span>
<span class="step">3</span> <span class="a">@Autowired</span> <span class="k">private</span> <span class="t">FlowExecutionService</span> <span class="v">executionService</span>;

   <span class="c">// 办理人走 ${handler} 表达式，流程变量随需传递</span>
   <span class="t">Map</span>&lt;<span class="t">String</span>,<span class="t">Object</span>&gt; <span class="v">variable</span> = <span class="t">Map</span>.of(<span class="s">"handler"</span>, <span class="s">"1001"</span>);
   <span class="t">ExecutionInstance</span> <span class="v">instance</span> = <span class="v">executionService</span>.<span class="f">start</span>(<span class="s">"leave"</span>, <span class="n">1001L</span>, <span class="v">variable</span>);</pre>
  </div>
</template>
