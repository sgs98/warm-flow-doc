// 从 src/README.md 的 <script> 块里抽出三个数组，生成带类型的 data/home.ts。
// 目的：避免手抄 60 条 Dromara 项目时出错。README 被删空后本脚本即可退役。
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const readme = fileURLToPath(new URL("../../README.md", import.meta.url));
const src = (await import("node:fs")).readFileSync(readme, "utf8");

const grab = (name) => {
  // README 里是 `const x = ref([])` + `x.value = [...]`。marker 含开头的 `[`，
  // slice 会把它丢掉，所以这里补回，否则生成的数组缺左括号。
  const marker = `${name}.value = [`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`未找到 ${name}`);
  const end = src.indexOf("];", start);
  return "[" + src.slice(start + marker.length, end + 1);
};

// README 里的 `base + "x"` 改成模板串，保持子路径部署行为不变
const fix = (block) => block.replace(/\bbase \+ "([^"]*)"/g, "`${base}$1`");

const out = `// 由 scripts/extract-home-data.mjs 从 src/README.md 生成，勿手改数组内容。
export interface ProjectItem {
  href: string;
  title: string;
  src: string;
}
export interface CaseItem extends ProjectItem {
  author: string;
  intro: string;
}

const base = import.meta.env.BASE_URL;

export const cases: CaseItem[] = ${fix(grab("kyProjectList"))};

export const dromaraProjects: ProjectItem[] = ${fix(grab("dromaraList"))};

export const companies: ProjectItem[] = ${fix(grab("qyProjectList"))};
`;

mkdirSync(fileURLToPath(new URL("../data/", import.meta.url)), { recursive: true });
writeFileSync(fileURLToPath(new URL("../data/home.ts", import.meta.url)), out);
console.log("data/home.ts 已生成");
