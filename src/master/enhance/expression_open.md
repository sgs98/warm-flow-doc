# 条件表达式扩展


## 1、表达式公共接口

`ExpressionStrategy`接口，是表达式策略类接口，抽离公共方法
- 1、`getType()`: 表达式策略类型，也是表达式的前缀  
- 2、`interceptStr()`: 返回策略类型和真实表达式之间的分隔符，为空表示保留完整表达式；非空时会先移除 `getType() + interceptStr()` 再把剩余内容交给 `eval()` 执行  
- 3、`eval()`: 执行表达式  
- 4、`setExpression()`: 设置新增的表达式，方便扩展  

```java
/**
 * 表达式策略类接口
 *
 * @author warm
 */
public interface ExpressionStrategy<T> {

    /**
     * 获取策略类型
     *
     * @return 类型
     */
    String getType();

    /**
     * 返回策略类型和真实表达式之间的分隔符
     * <p>
     * 返回空字符串表示执行策略时保留完整表达式；返回非空时会先移除
     * {@code getType() + interceptStr()}，再把剩余内容交给 eval()。
     *
     * @return 表达式截取分隔符
     */
    default String interceptStr() {
        return "";
    }

    /**
     * 执行表达式
     *
     * @param expression 表达式
     * @param variable   流程变量
     * @return 执行结果
     */
    T eval(String expression, Map<String, Object> variable);


    /**
     * 设置表达式
     * @param expressionStrategy 表达式
     */
    void setExpression(ExpressionStrategy<T> expressionStrategy);

}
```

## 2、注册表达式实现类
- 通过这个方法进行注册ExpressionUtil.setExpression

```java
ExpressionUtil.setExpression(new ExpressionStrategyEq());
```
