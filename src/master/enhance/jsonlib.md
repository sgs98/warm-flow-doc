# json库扩展

::: tip
- 目前支持 Snack3、Snack4、Jackson、Jackson3、fastjson 和 Gson 六种 json 库
- 通过 `warm-flow-plugin-modes-sb` / ORM 的 `sb3`、`sb4` starter 引入时，已自动带上 json 实现，无需额外配置

:::

## json库扩展
- 扩展 json 库需要实现 `JsonConvert` 接口的 `strToMap`、`strToBean`、`strToList`、`objToStr` 方法
- 并通过 spi 机制加载，可参照 `warm-flow-plugin-json` 模块
- 在 resource 目录下新建 `META-INF/services` 文件夹，并在该文件夹下新建文件 `org.dromara.warm.flow.core.json.JsonConvert`, 配置实现类的全限定名，如 `org.dromara.warm.plugin.json.JsonConvertJackson`
- json 实现按声明顺序由 `ServiceLoaderUtil` 取第一个，全部实现可放在同一个 SPI 文件中

```java
public class JsonConvertJackson implements JsonConvert {

    private static final Logger log = LoggerFactory.getLogger(JsonConvertJackson.class);

    /**
     * 将字符串转为map
     * @param jsonStr json字符串
     * @return map
     */
    @Override
    public Map<String, Object> strToMap(String jsonStr) {
        if (StringUtils.isNotEmpty(jsonStr)) {
            ObjectMapper objectMapper = new ObjectMapper();
            try {
                return objectMapper.readValue(jsonStr, TypeFactory.defaultInstance().constructMapType(Map.class, String.class, Object.class));
            } catch (IOException e) {
                log.error("json转换异常", e);
                throw new FlowException("json转换异常");
            }
        }
        return new HashMap<>();
    }

    /**
     * 将字符串转为bean
     * @param jsonStr json字符串
     * @param clazz 目标类型
     * @return 目标对象
     */
    @Override
    public <T> T strToBean(String jsonStr, Class<T> clazz) {
        if (StringUtils.isNotEmpty(jsonStr)) {
            ObjectMapper objectMapper = new ObjectMapper();
            try {
                return objectMapper.readValue(jsonStr, clazz);
            } catch (IOException e) {
                log.error("json转换异常", e);
                throw new FlowException("json转换异常");
            }
        }
        return null;
    }

    /**
     * 将字符串转为集合
     * @param jsonStr json字符串
     * @return List<T>
     */
    @Override
    public <T> List<T> strToList(String jsonStr) {
        if (StringUtils.isNotEmpty(jsonStr)) {
            ObjectMapper objectMapper = new ObjectMapper();
            try {
                return objectMapper.readValue(jsonStr, new TypeReference<List<T>>() {
                });
            } catch (IOException e) {
                log.error("json转换异常", e);
                throw new FlowException("json转换异常");
            }
        }
        return new ArrayList<>();
    }

    /**
     * 将对象转为字符串
     * @param variable 待转换对象
     * @return json字符串
     */
    @Override
    public String objToStr(Object variable) {
        if (ObjectUtil.isNotNull(variable)) {
            ObjectMapper objectMapper = new ObjectMapper();
            try {
                return objectMapper.writeValueAsString(variable);
            } catch (Exception e) {
                log.error("对象转换异常", e);
                throw new FlowException("对象转换异常");
            }
        }
        return null;
    }

}
```

