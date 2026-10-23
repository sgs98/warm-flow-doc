#!/usr/bin/env python3
"""Warm-Flow 功能思维导图 SVG 生成器（2.1.0 内容，品牌设计语言）。
内容事实来源：warm-flow 引擎源码 enums（NodeType/EventType/CooperateType/Listener）。
重新生成：python3 gen-mindmap.py > ../src/.vuepress/public/mindmap.svg
"""
import html

# ---------- 内容数据（右侧 / 左侧分支） ----------
RIGHT = [
    ("基础功能", None, ["通过", "退回", "撤销", "拿回", "任意跳转", "终止", "转办", "委派", "会签 / 票签", "加签 / 减签"]),
    ("事件能力", "2.1 新增", ["定时启动", "消息启动", "定时捕获", "消息捕获", "消息抛出", "定时边界", "消息边界", "错误边界", "错误捕获", "终止结束", "消息结束"]),
    ("流程网关", None, ["互斥网关", "并行网关", "包含网关"]),
    ("流程图", None, ["自带流程图", "节点状态着色", "运行态流程图", "实例历史图"]),
]
LEFT = [
    ("表达式", None, ["条件表达式（内置 + SpEL）", "自定义条件扩展", "办理人 ${handler} 变量", "发起人 / 固定办理人", "角色 / 部门 / 权限标识", "SpEL 动态指定办理人"]),
    ("监听器", None, ["create 创建", "start 启动", "assignment 转派", "finish 完成", "formLoad 表单", "全局 / 流程 / 节点作用域", "支持 SpEL 监听"]),
    ("服务任务", "2.1 新增", ["自动执行", "脚本处理", "Handler 扩展"]),
    ("多生态支持", None, ["MyBatis / MyBatis-Plus（当前仓库维护）", "JPA / BeetlSql（社区）", "MySQL / Oracle / PostgreSQL / SQL Server", "snack3/4 · Jackson2/3 · Fastjson2 · Gson", "Spring Boot 3 / 4 · JDK 17+"]),
]

# ---------- 设计令牌 ----------
BRAND = "#126bae"; BRAND_INK = "#0b4d7e"; AMBER = "#e08a2e"
LEAF_BG = "#f3f7fb"; LEAF_LINE = "#d5e1ec"; TEXT = "#1c2933"; MUTE = "#5b6b7a"
LINE = "#b9cde0"; BRANCH_BG = "#e8f1f9"

ROW_H, LEAF_H, LEAF_PAD, GAP_BRANCH, MARGIN = 34, 27, 14, 38, 70
FONT_SANS = "-apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif"
FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

def tw(text, size, mono=False):
    """估算文本宽度：CJK ≈ size，ASCII ≈ 0.62*size"""
    w = 0
    for ch in text:
        w += size if ord(ch) > 0x2E7F else size * 0.62
    return round(w)

def side_layout(branches, x_branch, x_leaf, dir_sign):
    """返回 (blocks, total_h)。block: (title, badge, leaves, y_center, leaf_pos[])"""
    blocks, y = [], MARGIN + 30
    for title, badge, leaves in branches:
        n = len(leaves)
        h = n * ROW_H
        y0 = y
        positions = []
        for i in range(n):
            ly = y0 + i * ROW_H + ROW_H / 2
            lw = tw(leaves[i], 12.5) + LEAF_PAD * 2
            lx = x_leaf if dir_sign > 0 else x_leaf - lw
            positions.append((lx, ly, lw, leaves[i]))
        blocks.append((title, badge, positions, y0 + h / 2, h))
        y += h + GAP_BRANCH
    return blocks, y - GAP_BRANCH + MARGIN

def bezier(x1, y1, x2, y2, sign):
    mx = (x1 + x2) / 2 if abs(x2 - x1) > 60 else x1 + sign * abs(x2 - x1) * 0.5
    return f"M {x1:.1f} {y1:.1f} C {mx:.1f} {y1:.1f}, {mx:.1f} {y2:.1f}, {x2:.1f} {y2:.1f}"

# ---------- 布局 ----------
# 几何：中心节点宽 190；分支胶囊中心 = cx ± 230；叶子内边缘 = cx ± 330
RIGHT_BX_OFF, RIGHT_LX_OFF = 230, 330
LEFT_BX_OFF, LEFT_LX_OFF = 230, 330
right_blocks, right_h = side_layout(RIGHT, 0, 0, +1)  # 占位，稍后平移
left_blocks, left_h = side_layout(LEFT, 0, 0, -1)

H = max(right_h, left_h)
cy = H / 2
leaf_w_max_r = max(p[2] for b in right_blocks for p in b[2])
leaf_w_max_l = max(p[2] for b in left_blocks for p in b[2])
W = 2 * max(RIGHT_LX_OFF + leaf_w_max_r, LEFT_LX_OFF + leaf_w_max_l) + 120
cx = W / 2

def shift_blocks(blocks, bx_off, lx_off, sign):
    out = []
    for title, badge, positions, y_center, bh in blocks:
        np_ = []
        for lx, ly, lw, leaf in positions:
            if sign > 0:
                np_.append((cx + lx_off, ly, lw, leaf))
            else:
                np_.append((cx - lx_off - lw, ly, lw, leaf))
        out.append((title, badge, np_, y_center, bh, cx + (bx_off if sign > 0 else -bx_off)))
    return out

right_blocks = shift_blocks(right_blocks, RIGHT_BX_OFF, RIGHT_LX_OFF, +1)
left_blocks = shift_blocks(left_blocks, LEFT_BX_OFF, LEFT_LX_OFF, -1)

svg = []
svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" '
           f'font-family="{FONT_SANS}">')
svg.append(f'<rect width="{W:.0f}" height="{H:.0f}" fill="#ffffff"/>')

cx, cy_node, cw, ch = W / 2, cy, 190, 92

# ---------- 连接线（先画线再画节点） ----------
for blocks, sign in ((right_blocks, +1), (left_blocks, -1)):
    edge_x = cx + (95 if sign > 0 else -95)
    for title, badge, positions, y_center, bh, branch_cx in blocks:
        svg.append(f'<path d="{bezier(edge_x, cy, branch_cx - (58 if sign > 0 else -58), y_center, sign)}" fill="none" stroke="{LINE}" stroke-width="1.8"/>')
        for lx, ly, lw, leaf in positions:
            lx_edge = lx if sign > 0 else lx + lw
            svg.append(f'<path d="{bezier(branch_cx + (52 if sign > 0 else -52), y_center, lx_edge, ly, sign)}" fill="none" stroke="{LINE}" stroke-width="1.4" opacity=".85"/>')

# ---------- 分支节点与叶子 ----------
for blocks, sign in ((right_blocks, +1), (left_blocks, -1)):
    for title, badge, positions, y_center, bh, branch_cx in blocks:
        tw_title = tw(title, 15) + 36
        bx = branch_cx - tw_title / 2
        by = y_center - 17
        svg.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{tw_title:.1f}" height="34" rx="9" fill="{BRANCH_BG}" stroke="{BRAND}" stroke-width="1.4"/>')
        tx = branch_cx - (12 if badge and sign > 0 else -12 if badge else 0)
        svg.append(f'<text x="{tx:.1f}" y="{y_center + 5.2:.1f}" text-anchor="middle" font-size="15" font-weight="700" fill="{BRAND_INK}">{html.escape(title)}</text>')
        if badge:
            # 徽标画在胶囊右上角
            bw = tw(badge, 10.5) + 14
            bxp = bx + tw_title - bw / 2 - 4 if sign > 0 else bx + bw / 2 + 4
            svg.append(f'<rect x="{bxp - bw/2:.1f}" y="{by - 9:.1f}" width="{bw}" height="17" rx="8.5" fill="{AMBER}"/>')
            svg.append(f'<text x="{bxp:.1f}" y="{by + 3:.1f}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">{html.escape(badge)}</text>')
        for lx, ly, lw, leaf in positions:
            svg.append(f'<rect x="{lx:.1f}" y="{ly - LEAF_H/2:.1f}" width="{lw:.1f}" height="{LEAF_H}" rx="7" fill="{LEAF_BG}" stroke="{LEAF_LINE}" stroke-width="1"/>')
            svg.append(f'<text x="{lx + lw/2:.1f}" y="{ly + 4.4:.1f}" text-anchor="middle" font-size="12.5" fill="{TEXT}">{html.escape(leaf)}</text>')

# ---------- 中心节点 ----------
rx, ry = cx - cw / 2, cy - ch / 2
svg.append(f'<rect x="{rx:.1f}" y="{ry:.1f}" width="{cw}" height="{ch}" rx="16" fill="{BRAND}" />')
svg.append(f'<rect x="{rx:.1f}" y="{ry:.1f}" width="{cw}" height="{ch}" rx="16" fill="none" stroke="{BRAND_INK}" stroke-width="1.5" opacity=".5"/>')
svg.append(f'<text x="{cx:.1f}" y="{cy - 4:.1f}" text-anchor="middle" font-size="26" font-weight="800" fill="#ffffff" letter-spacing=".5">Warm-Flow</text>')
svg.append(f'<text x="{cx:.1f}" y="{cy + 24:.1f}" text-anchor="middle" font-size="11.5" fill="#cfe4f5">上游二次开发 · 国产轻量级工作流引擎</text>')

svg.append("</svg>")
print("\n".join(svg))
