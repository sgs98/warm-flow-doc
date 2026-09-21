# 条件表达式扩展

::: tip
- 当内置的**条件表达式**不满足业务需求时，可进行扩展

:::

<!-- @include: ./expression_open.md -->

## 3、条件表达式

- 扩展需要实现 `ConditionStrategy` 接口，或者继承 `AbstractConditionStrategy` 抽象类

### 3.1、条件表达式接口

```java
/**
 * 流程条件表达式策略接口
 *
 * @author warm
 */
public interface ConditionStrategy extends ExpressionStrategy<Boolean> {

    /**
     * 条件表达式策略实现集合
     * <p>
     * ExpressionUtil 倒序遍历该集合，因此后注册的策略优先级更高
     */
    List<ExpressionStrategy<Boolean>> EXPRESSION_STRATEGY_LIST = new ArrayList<>();

    /**
     * 注册条件表达式策略
     */
    @Override
    default void setExpression(ExpressionStrategy<Boolean> expressionStrategy) {
        EXPRESSION_STRATEGY_LIST.add(expressionStrategy);
    }

    /**
     * 条件表达式默认使用 @@ 分隔策略类型和表达式主体，如：eq@@flag|4
     */
    @Override
    default String interceptStr() {
        return FlowCons.SPLIT_AT;
    }
}
```

### 3.2、条件表达式抽象类

```java
/**
 * 条件表达式抽象类，复用部分代码
 *
 * @author warm
 */
public abstract class AbstractConditionStrategy implements ConditionStrategy {

    /**
     * 执行表达式前置方法 合法性校验
     *
     * @param name     变量名称：flag
     * @param variable 流程变量
     */
    public void preEval(String name, Map<String, Object> variable) {
        AssertUtil.isEmpty(variable, ExceptionCons.NULL_CONDITION_VALUE);
        Object o = variable.get(name);
        AssertUtil.isNull(o, ExceptionCons.NULL_CONDITION_VALUE);
    }

    /**
     * 执行表达式
     *
     * @param expression 表达式：flag|4
     * @param variable   流程变量
     * @return 执行结果
     */
    @Override
    public Boolean eval(String expression, Map<String, Object> variable) {
        String[] split = expression.split(FlowCons.SPLIT_VERTICAL);
        preEval(split[0].trim(), variable);
        String variableValue = String.valueOf(variable.get(split[0].trim()));
        return afterEval(split[1].trim(), variableValue);
    }

    /**
     * 执行表达式后置方法
     *
     * @param value         表达式最后一个参数，比如：eq@@flag|4 的 [4]
     * @param variableValue 流程变量值
     * @return 执行结果
     */
    public abstract Boolean afterEval(String value, String variableValue);

}
```

### 3.3、条件表达式实现类

```java
/**
 * 条件表达式等于 eq@@flag|4
 *
 * @author warm
 */
public class ConditionStrategyEq extends AbstractConditionStrategy {

    @Override
    public String getType() {
        return ConditionType.EQ.getKey();
    }

    @Override
    public Boolean afterEval(String value, String variableValue) {
        if (MathUtil.isNumeric(value)) {
            return MathUtil.determineSize(variableValue, value) == 0;
        } else {
            return variableValue.equals(value);
        }
    }

}
```

