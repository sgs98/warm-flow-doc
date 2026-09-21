# 接口文档

> 所有 service 通过 `FlowEngine` 门面获取，比如 `FlowEngine.defService()`、`FlowEngine.workflow()`

## 统一操作门面 WorkflowService

> v2.0.0 起新增的统一流程操作门面，推荐业务系统直接使用。每个操作对应一个 `XxxCommand` 参数对象，统一返回 `WorkflowResult`。

### 启动流程
`WorkflowResult start(StartCommand command)`：启动流程实例并创建首个待办，不办理首节点。
- businessId: 业务id [必传]
- flowCode: 流程编码 [必传]
- operator: 操作者，包含handler(办理人唯一标识)和permissions(办理人权限标识) [按需传输]；实现了[办理人权限处理器](./permission_handler.md)后可以不传
- variables: 流程变量 [按需传输]
- instanceStatus: 流程实例状态，自定义流程状态 [按需传输]
- historyTaskStatus: 历史任务状态，自定义流程状态 [按需传输]
- nextHandlers: 执行的下个任务的办理人 [按需传输]
- nextHandlerAppend: 下个任务处理人配置类型（true-追加，false-覆盖，默认false）[按需传输]

### 完成待办
`WorkflowResult complete(CompleteCommand command)`：完成当前待办并推动流程继续执行。
- taskId: 流程任务id [必传]
- operator: 操作者 [按需传输]
- message: 审批意见 [按需传输]
- variables: 流程变量 [按需传输]
- instanceStatus: 流程实例状态，自定义流程状态 [按需传输]
- historyTaskStatus: 历史任务状态，自定义流程状态 [按需传输]
- nextHandlers: 执行的下个任务的办理人 [按需传输]
- nextHandlerAppend: 下个任务处理人配置类型（true-追加，false-覆盖，默认false）[按需传输]

### 退回
`WorkflowResult reject(RejectCommand command)`：将当前待办退回到合法的前置节点。
- taskId: 流程任务id [必传]
- targetNodeCode: 退回的目标节点编码，[任意退回]时需要 [按需传输]
- 其余字段同 complete

### 任意跳转
`WorkflowResult jump(JumpCommand command)`：将当前待办跳转到指定节点。
- taskId: 流程任务id [必传]
- targetNodeCode: 目标节点编码 [必传]
- 其余字段同 complete

### 撤回
`WorkflowResult revoke(RevokeCommand command)`：撤回申请人发起的流程实例。
- instanceId: 流程实例id [必传]
- message: 审批意见 [按需传输]
- variables: 流程变量 [按需传输]
- instanceStatus: 流程实例状态，自定义流程状态 [按需传输]
- historyTaskStatus: 历史任务状态，自定义流程状态 [按需传输]

### 终止
`WorkflowResult terminate(TerminateCommand command)`：终止流程实例。按照实例id或者任务id终止，二选一。
- instanceId: 流程实例id [按需传输]
- taskId: 流程任务id [按需传输]
- message: 审批意见 [按需传输]
- instanceStatus: 流程实例状态，自定义流程状态 [按需传输]
- historyTaskStatus: 历史任务状态，自定义流程状态 [按需传输]

### 转办
`WorkflowResult transfer(TransferCommand command)`：将当前待办转交给其他办理人。
- taskId: 流程任务id [必传]
- targetHandler: 转办的目标办理人，只能一个 [必传]
- operator: 操作者 [按需传输]
- message: 审批意见 [按需传输]
- historyTaskStatus: 历史任务状态，自定义流程状态 [按需传输]

### 委派
`WorkflowResult delegate(DelegateCommand command)`：将当前待办委派给其他办理人。字段同转办。

### 加签
`WorkflowResult addSigner(AddSignerCommand command)`：为会签或票签节点增加办理人。
- taskId: 流程任务id [必传]
- targetHandlers: 增加的目标办理人集合 [必传]
- operator: 操作者 [按需传输]
- message: 审批意见 [按需传输]
- historyTaskStatus: 历史任务状态，自定义流程状态 [按需传输]

### 减签
`WorkflowResult removeSigner(RemoveSignerCommand command)`：为会签或票签节点移除办理人。
- taskId: 流程任务id [必传]
- targetHandlers: 移除的目标办理人集合 [必传]
- 其余字段同加签

### 返回结果 WorkflowResult
- success: 本次操作是否成功
- operation: 操作名称，如start、complete、reject
- instanceId: 流程实例id
- businessId: 业务id
- instanceStatus: 操作后的流程实例状态
- completedTaskId: 本次操作关联的任务id
- currentTasks: 操作后的当前待办视图集合（taskId、instanceId、nodeCode、nodeName、nodeType、taskStatus、handlers）

## DefService流程定义 
### 导入流程输入流
`Definition importIs(is)`： 流程定义的输入流

### 导入流程json字符串 
`Definition importJson(defStr)`：流程定义defJson的json字符串

### 导入流程json对象 
`Definition importDef(defJson)`：流程定义json对象

### 新增流程定义、节点和跳转 
`Definition insertFlow(definition, nodeList, skipList)`：新增流程定义，并初始化流程节点和流程跳转数据

### 只新增流程定义表数据 
`boolean checkAndSave(definition)`：流程定义对象

### 保存流程节点和跳转 
`void saveDef(defJson, onlyNodeSkip)`：流程定义json对象，onlyNodeSkip：是否只保存节点和跳转

### 导出流程定义json字符串 
`String exportJson(id)`： 导出流程定义(流程定义、流程节点和流程跳转数据)的json字符串

### 获取流程定义全部数据对象 
`Definition getAllDataDefinition(id)`： 获取流程定义全部数据(包含节点和跳转)

### 获取流程定义合并数据对象 
`FlowCombine getFlowCombine(id)`： 获取流程定义合并数据(包含节点和跳转)，`getFlowCombineNoDef(id)`则不查询流程定义，`getFlowCombine(definition)`可复用已有流程定义对象

### 查询流程设计所需的数据 
`DefJson queryDesign(id)`： 查询流程设计所需的数据，比如流程图渲染

### 根据流程定义code列表查询流程定义
`List<Definition> queryByCodeList(flowCode)`： 根据流程定义code列表查询流程定义

### 根据流程定义code查询流程定义
`List<Definition> getByFlowCode(flowCode)`： 根据流程定义code查询流程定义

### 根据flowCode查询已发布的流程定义
`Definition getPublishByFlowCode(flowCode)`： 根据流程定义code查询已发布的流程定义

### 更新流程定义发布状态 
`void updatePublishStatus(defIds, publishStatus)`：
- defIds: 流程定义id列表 [必传]
- publishStatus: 流程定义发布状态 [必传]

### 删除 
`boolean removeDef(ids)`： 删除流程定义相关数据  

### 发布 
`boolean publish(id)`： 发布流程定义  

### 取消发布 
`boolean unPublish(id)`： 取消发布流程定义  

### 复制流程 
`boolean copyDef(id)`： 复制流程定义   

### 激活流程 
`boolean active(id)`： 激活流程

### 挂起流程 
`boolean unActive(id)`： 挂起流程：流程定义挂起后，相关的流程实例都无法继续流转

## InsService流程实例 

### 开启流程 
`Instance start(businessId, flowCode, context)`：传入业务id和流程编码，开启流程实例。context为[WorkflowContext](#流程执行上下文-workflowcontext)，包含如下字段：
- handler: 办理人唯一标识，如用户id，用于记录到实例表和历史表 [按需传输]；如果实现了[办理人权限处理器](./permission_handler.md)可不用传
- permissions: 办理人权限标识，比如用户，角色，部门等 [按需传输]
- ignorePermission: 是否忽略权限校验 [按需传输]
- ignore: 是否忽略权限校验、会签/票签协作规则 [按需传输]
- variables: 流程变量 [按需传输]
- instanceStatus: 流程实例状态，自定义流程状态 [按需传输]
- historyTaskStatus: 历史任务状态，自定义流程状态 [按需传输]
- nextHandlers: 执行的下个任务的办理人 [按需传输]
- nextHandlerAppend: 下个任务处理人配置类型（true-追加，false-覆盖，默认false）[按需传输]
- ext: 扩展字段，预留给业务系统使用 [按需传输]

### 根据defIds查询流程实例集合
`List<Instance> listByDefIds(defIds)`：根据流程定义id集合，查询流程实例集合

### 根据defId查询流程实例集合
`List<Instance> getByDefId(definitionId)`：根据流程定义id，查询流程实例集合

### 删除流程实例 
`boolean remove(instanceIds)`：根据实例ids，删除流程

### 删除流程变量
`void removeVariables(instanceId, keys)`：根据实例id，删除指定的流程变量

### 激活实例 
`boolean active(Long id)`： 激活实例

### 挂起实例 
`boolean unActive(Long id)`： 挂起实例，流程实例挂起后，该流程实例无法继续流转

## TaskService待办任务 

### 流程流转
`Instance execute(taskId, context, skipType)`：传入流程任务id，流程流转。通过[WorkflowContext](#流程执行上下文-workflowcontext)传入办理人、权限、流程变量等，skipType为`PASS`审批通过、`REJECT`退回。

### 撤回流程
`Instance revoke(instanceId, context)`：根据流程实例id，撤回流程实例。

### 根据实例id终止流程
`Instance terminateByInstanceId(instanceId, context)`：根据流程实例id，终止流程。

### 根据任务id终止流程
`Instance terminateByTaskId(taskId, context)`：根据流程任务id，终止流程。

### 调整办理人
`Instance updateHandlers(taskId, context, addHandlers, removeHandlers, cooperateType)`：调整当前待办的办理人，用于加签、减签。
- taskId: 流程任务id [必传]
- addHandlers: 需要增加的办理人 [按需传输]
- removeHandlers: 需要移除的办理人 [按需传输]
- cooperateType: 协作类型，见[协作类型](./collaboration.md) [必传]

### 根据实例id查询待办
`List<Task> getByInsId(instanceId)`：根据流程实例id，查询待办任务集合

### 根据实例id和节点编码查询待办
`List<Task> getByInsIdAndNodeCodes(instanceId, nodeCodes)`：根据流程实例id和节点编码集合，查询待办任务集合

### 加载任务办理数据
`FlowDto load(taskId)`：加载待办任务办理所需数据，无副作用查询

### 加载历史任务数据
`FlowDto hisLoad(hisTaskId)`：加载历史任务数据

## 流程执行上下文 WorkflowContext
> 流程动作的内部执行上下文，承载多个流程动作共享的执行数据，由各Command的`fillContext`填充

- handler: 当前操作者唯一标识
- permissions: 当前操作者可用于权限匹配的标识集合
- ignorePermission: 是否忽略流程办理权限校验
- ignore: 是否忽略权限校验、受托人委派处理和会签/票签协作规则（true：单方办理即可推动节点流转）
- message: 本次流程动作的说明
- variables: 本次流程动作需要写入实例的变量
- instanceStatus: 调用方指定的流程实例状态，未设置时由引擎状态机决定
- historyTaskStatus: 调用方指定的历史任务状态，未设置时由引擎状态机决定
- targetNodeCode: 流程动作的目标节点编码
- nextHandlers: 指定的后续节点办理人集合
- nextHandlerAppend: 是否将指定办理人追加到引擎计算出的办理人集合
- ext: 调用方传入的扩展信息

## NodeService节点 
### 根据节点id获取所有的前置节点 
`previousNodeList(nodeId)`：根据节点id获取所有的前置节点集合
- nodeId: 节点id [必传]

### 获取前置节点 
`previousNodeList(definitionId, nowNodeCode)`：根据流程定义id和当前节点code获取所有的前置节点集合
- definitionId: 流程定义id [必传]
- nowNodeCode: 当前节点code [必传]

### 根据流程定义合并数据获取前置节点
`previousNodeList(nowNodeCode, combine)`：复用[FlowCombine](#获取流程定义合并数据对象)获取所有的前置节点集合，避免重复查询

### 获取后置节点 
`suffixNodeList(nodeId)`：根据节点id获取所有的后置节点集合
- nodeId: 节点id [必传]

### 获取后置节点 
`suffixNodeList(definitionId, nowNodeCode)`：根据流程定义id和当前节点code获取所有的后置节点集合
- definitionId: 流程定义id [必传]
- nowNodeCode: 当前节点code [必传]
- 
### 获取下一节点,不一定是后置节点，如果是通过就是后置，如果是驳回就取前置节点-含流程变量过滤
`getNextNodeList(definitionId, nowNodeCode, anyNodeCode, skipType, variable)`：根据流程定义和当前节点code获取下一节点,如是网关跳过取下一节点,并行网关返回多个节点
- definitionId: 流程定义id [必传]
- nowNodeCode: 当前节点code [必传]
- skipType: 跳转类型（PASS审批通过 REJECT退回） [必传]
- anyNodeCode: anyNodeCode不为空，则可跳转anyNodeCode节点（优先级最高） [按需传输]
- variable: 流程变量,下一个节点是网关需要判断跳转条件,并行网关返回多个节点 [按需传输]

### 根据流程定义id获取流程节点集合
`getByDefId(definitionId)`：根据流程定义id获取流程节点集合

### 根据节点编码获取流程节点
`getByNodeCodes(nodeCodes, definitionId)`：根据节点编码集合和流程定义id获取流程节点集合

### 根据defId和节点编码获取流程节点
`getByDefIdAndNodeCode(definitionId, nodeCode)`：根据流程定义id和节点编码获取流程节点

### 根据流程定义id获取开始节点
`getStartNode(definitionId)`：根据流程定义id获取开始节点

### 根据流程定义id获取中间节点集合
`getBetweenNode(definitionId)`：根据流程定义id获取中间节点集合

### 根据流程定义id获取结束节点
`getEndNode(definitionId)`：根据流程定义id获取结束节点

### 获取节点扩展信息
`getExt(node)`：根据流程节点获取节点扩展信息

## SkipService节点跳转关联Service接口

### 批量删除节点跳转关联
`deleteSkipByDefIds(defIds)`：批量删除节点跳转关联

### 根据流程定义id查询节点跳转线
`getByDefId(definitionId)`：根据流程定义id查询节点跳转线

### 根据流程定义id和节点编码查询节点跳转线
`getByDefIdAndNowNodeCode(definitionId, nowNodeCode)`：根据流程定义id和节点编码查询节点跳转线

## HisTaskService历史记录 
### 根据任务id查询 
`listByTaskId(taskId)`：根据任务id查询历史任务集合

### 根据任务id和协作类型查询 
`listByTaskIdAndCooperateTypes(taskId, Integer... cooperateTypes)`：根据任务id和协作类型查询
- taskId: taskId [必传]
- cooperateTypes: 协作类型集合 [按需传输]

### 根据实例Id和节点编码查询 
`getByInsAndNodeCodes(instanceId, nodeCodes)`：根据实例Id和节点编码查询
- instanceId: 实例Id [必传]
- nodeCodes: 节点编码 [按需传输]

### 根据流程实例id查询
`getByInsId(instanceId)`：根据流程实例id查询历史任务集合

### 根据流程实例Ids删除 
`boolean deleteByInsIds(instanceIds)`：根据流程实例Ids删除

## UserService流程用户 
### 获取待办任务的办理人
`getPermission(associated, type...)`：根据关联id和用户类型，获取办理人唯一标识集合

### 查询待办任务的用户
`listByAssociatedAndTypes(associated, types...)`：根据关联id和用户类型集合，查询流程用户集合

### 批量查询待办任务的用户
`getByAssociateds(associateds, types...)`：根据关联id集合和用户类型集合，批量查询流程用户集合

### 调整办理人
`boolean updatePermission(associated, permissions, type, clear, handler)`：调整待办任务的办理人

## FormService表单 
### 新增表单
`boolean save(form)`：新增表单

### 发布表单
`boolean publish(id)`：发布表单

### 取消发布表单
`boolean unPublish(id)`：取消发布表单

### 复制表单
`boolean copyForm(id)`：复制表单

### 根据表单编码和版本查询
`Form getByCode(formCode, formVersion)`：根据表单编码和版本查询表单

### 分页查询已发布表单
`Page<Form> publishedPage(formName, pageNum, pageSize)`：分页查询已发布表单

### 保存表单内容
`boolean saveContent(id, formContent)`：保存表单内容

## ChartService流程图 
### 开始节点元数据
`String startMetadata(pathWayData)`：获取开始节点流程图元数据

### 流转节点元数据
`String skipMetadata(pathWayData)`：获取流转节点流程图元数据

### 获取流程图状态颜色
`List<String> getChartRgb(modelValue)`：获取流程图状态对应的三原色

## 公共api接口 
### 根据id查询 
`getById(id)`：根据id查询
- id: 主键

### 根据ids主键集合查询 
`getByIds(ids)`：根据ids主键集合查询
- ids: 主键集合

### 分页查询 
`page(entity, page)`：分页查询
- entity: 查询实体
- page: 分页对象，支持设置排序字段

### 查询列表 
`list(entity)`：查询列表

### 查询列表，可排序 
`list(entity, query)`：查询列表，可排序
- entity: 查询实体
- query: 查询代理层处理，支持设置排序字段

### 查询一条记录 
`getOne(entity)`：查询一条记录
- entity: 查询实体

### 获取总数量 
`selectCount(entity)`：获取总数量

### 判断是否存在 
`exists(entity)`：判断是否存在

### 新增 
`save(entity)`：新增
- entity: 实体

### 根据id修改 
`updateById(entity)`：根据id修改

### 根据id删除 
`removeById(id)`：根据id删除

### 根据entity删除 
`remove(entity)`：根据entity删除

### 根据ids批量删除 
`removeByIds(ids)`：根据ids批量删除

### 批量新增 
`saveBatch(list)`：批量新增

### 批量新增 
`saveBatch(list, batchSize)`：批量新增
- batchSize: 插入大小

### 批量更新 
`updateBatch(list)`：批量更新

### id设置正序排列 
`orderById()`：id设置正序排列

### 创建时间设置正序排列 
`orderByCreateTime()`：创建时间设置正序排列

### 更新时间设置正序排列 
`orderByUpdateTime()`：更新时间设置正序排列

### 设置正序排列 
`orderByAsc(orderByField)`：设置正序排列

### 设置倒序排列 
`orderByDesc(orderByField)`：设置倒序排列

### 用户自定义排序方案 
`orderBy(orderByField)`：用户自定义排序方案
