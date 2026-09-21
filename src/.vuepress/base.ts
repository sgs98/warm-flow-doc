// 部署基路径：GitHub Pages 项目站点部署在子路径下，构建时通过 VUE_BASE 注入，
// 默认保持根路径，兼容现有 Gitee / nginx 部署
const rawBase = process.env.VUE_BASE || "/";

export const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
