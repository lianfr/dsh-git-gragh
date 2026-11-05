window.__ModuleLoader__.load({
  id: 'dsh-git-graph',
  factory: (require) => {
    const React = require('react')
    const E = React.createElement
    const { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } = React

    const PKG = 'dsh-git-graph'
    const API_BASE = PKG + '/api'
    const PAGE_SIZE = 100
/* Git 输出页的筛选档位，与 VSCode 的日志级别对齐。 */
const POLL_LEVELS = ['all', 'error', 'warning', 'info', 'debug', 'trace']
const OUTPUT_KINDS = ['all', 'git', 'repository']
    const UNCOMMITTED_HASH = '@uncommitted'
  const POLL_MS = 3000

  /* 面板偏好按仓库路径分开存：同一个人在不同仓库上可能想要不同的刷新频率。 */
  const PREFS_POLL = [0, 3000, 10000]
  const PREFS_PAGE = [50, 100, 200]

  function loadPrefs(key) {
    const fallback = { poll: 3000, page: 100, showUncommitted: true, confirmDiscard: true }
    try {
      const raw = globalThis.localStorage === undefined ? null : globalThis.localStorage.getItem('gw-prefs:' + key)
      if (raw === null) return fallback
      const parsed = JSON.parse(raw)
      return {
        poll: PREFS_POLL.indexOf(parsed.poll) >= 0 ? parsed.poll : fallback.poll,
        page: PREFS_PAGE.indexOf(parsed.page) >= 0 ? parsed.page : fallback.page,
        showUncommitted: parsed.showUncommitted !== false,
        confirmDiscard: parsed.confirmDiscard !== false,
      }
    } catch (error) {
      void error
      return fallback
    }
  }

  function savePrefs(key, value) {
    try {
      if (globalThis.localStorage !== undefined) globalThis.localStorage.setItem('gw-prefs:' + key, JSON.stringify(value))
    } catch (error) {
      void error
    }
  }
    const ROW_H = 24
    const LANE_W = 14
    const DRAWER_H = 300

    /* ------------------------------------------------------------------ */
    /* styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
.gw-root { position:relative; display:flex; flex-direction:column; height:100%; min-height:0; font-size:12px; line-height:1.4;
  color:var(--dsw-alias-label-primary); background:transparent; }
.gw-top { flex:1 1 33%; min-height:110px; display:flex; flex-direction:column; min-height:0;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.gw-bottom { flex:2 1 67%; min-height:0; display:flex; flex-direction:column; }
.gw-pad { padding:8px 10px; }

.gw-textarea { width:100%; box-sizing:border-box; min-height:54px; max-height:160px; resize:vertical;
  font:inherit; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-1);
  border:1px solid var(--dsw-alias-border-l2); border-radius:16px;
  border-radius:var(--dsw-radius-lg); padding:6px 10px;
  outline:none; }
.gw-textarea:focus { border-color:var(--dsw-alias-brand-primary); }
.gw-textarea::placeholder { color:var(--dsw-alias-label-tertiary); }

.gw-compose-actions { display:flex; align-items:center; gap:8px; margin-top:6px; }
.gw-btn { display:inline-flex; align-items:center; justify-content:center; gap:4px; height:24px; padding:0 10px;
  font:inherit; font-size:12px; border-radius:6px; cursor:pointer; white-space:nowrap;
  border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2);
  color:var(--dsw-alias-label-primary); }
.gw-btn:hover { background:var(--dsw-alias-interactive-bg-hover);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.gw-btn:disabled { opacity:.45; cursor:default; }
.gw-btn-primary { border-color:transparent; background:var(--dsw-alias-button-primary-fill);
  color:var(--dsw-alias-label-primary-inverted); }
.gw-btn-primary:hover { background:var(--dsw-alias-button-primary-hover); }
.gw-btn-ghost { border-color:transparent; background:transparent; color:var(--dsw-alias-label-secondary); }
.gw-btn-ghost:hover { background:var(--dsw-alias-interactive-bg-hover);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.gw-btn-sm { height:20px; padding:0 7px; font-size:11px; }

.gw-check { display:inline-flex; align-items:center; gap:5px; cursor:pointer; user-select:none;
  color:var(--dsw-alias-label-secondary); margin-left:auto; }
.gw-check input { margin:0; cursor:pointer; }

.gw-changes { flex:1 1 auto; min-height:0; overflow:auto; padding-bottom:4px; }
.gw-badge { flex:none; min-width:16px; height:16px; padding:0 5px; box-sizing:border-box;
  display:flex; align-items:center; justify-content:center; border-radius:8px;
  font-size:10px; font-weight:600; line-height:1;
  background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-secondary); }
.gw-group-title { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* 增删行数：平时不占视觉，悬停这一行才露出来 */
/* 文本 → 一段留白 → 「+n −m」，平时不显示，悬停这一行才浮现 */
.gw-file-stats { flex:none; display:inline-flex; align-items:center; gap:8px; margin-left:10px;
  font-size:10.5px; line-height:1; font-variant-numeric:tabular-nums;
  opacity:0; transition:opacity .1s ease; }
.gw-file:hover .gw-file-stats, .gw-group-head:hover .gw-file-stats { opacity:1; }
.gw-stat-add { color:var(--dsw-alias-state-success-primary); }
.gw-stat-del { color:var(--dsw-alias-state-error-primary); }
.gw-group-actions { flex:none; display:flex; align-items:center; gap:2px; }
.gw-group-head { display:flex; align-items:center; gap:4px; padding:4px 10px; cursor:pointer;
  color:var(--dsw-alias-label-secondary); font-size:11px; letter-spacing:.02em; user-select:none; }
.gw-group-head:hover { background:var(--dsw-alias-interactive-bg-hover);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
/* 缩进只认一条规则：下一级的折叠三角，对齐上一级图标所在的位置。
   三角宽 12px、间距 4px，所以每层固定 16px。分组标题行内距 10px，
   它的文字落在 26px，顶层目录的三角也放在 26px，正好压在「未」字下面。 */
.gw-tree-root { padding-left:26px; }
.gw-tree-kids { margin-left:16px; }
.gw-file-lead { width:12px; flex:none; }
.gw-dir-icon { flex:none; color:var(--dsw-alias-state-warn-primary); }
.gw-file-icon { flex:none; color:var(--dsw-alias-label-tertiary); }
.gw-file.gw-tone-new .gw-file-name { color:var(--dsw-alias-state-success-primary); }
.gw-file.gw-tone-new .gw-file-icon { color:var(--dsw-alias-state-success-primary); }
.gw-file.gw-tone-mod .gw-file-name { color:var(--dsw-alias-state-warn-primary); }
.gw-file.gw-tone-mod .gw-file-icon { color:var(--dsw-alias-state-warn-primary); }
.gw-file.gw-tone-danger .gw-file-name { color:var(--dsw-alias-state-error-primary); }
.gw-file.gw-tone-danger .gw-file-icon { color:var(--dsw-alias-state-error-primary); }
.gw-file.gw-tone-danger .gw-file-name { text-decoration:line-through; }
.gw-tree-dir { cursor:pointer; color:var(--dsw-alias-label-secondary); }
.gw-tree-name { flex:0 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  font-size:11.5px; }
.gw-tree-dir:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-caret { width:12px; flex:none; color:var(--dsw-alias-label-tertiary); opacity:.9;
  transition:transform .12s ease; }
.gw-caret-open { transform:rotate(90deg); }
.gw-output-bar { display:flex; align-items:center; gap:6px; padding:4px 10px; flex:none;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.gw-output-exe { font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size:10.5px; color:var(--dsw-alias-label-tertiary); overflow:hidden; text-overflow:ellipsis;
  white-space:nowrap; max-width:45%; }
/* 原生 select 的下拉由浏览器画，位置和外溢都管不住，这里改成自己画一层。 */
.gw-dd { position:relative; display:inline-flex; }
.gw-dd-btn { height:22px; box-sizing:border-box; padding:0 6px; border-radius:var(--dsw-radius-sm, 8px);
  border:none; background:color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
  color:var(--dsw-alias-label-secondary);
  font-size:11px; cursor:pointer; white-space:nowrap; }
.gw-dd-btn:hover { background:color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); }
.gw-dd-scrim { position:fixed; inset:0; z-index:70; }
.gw-dd-menu { position:absolute; top:calc(100% + 4px); right:0; z-index:71; min-width:100%;
  box-sizing:border-box; padding:4px; border-radius:var(--dsw-radius-lg, 16px);
  border:none; background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, var(--dsw-alias-bg-base, #ffffff));
  box-shadow:0 12px 32px rgba(0, 0, 0, .18); }
.gw-dd-item { display:flex; align-items:center; justify-content:space-between; gap:10px;
  width:100%; box-sizing:border-box; text-align:left; padding:5px 8px;
  border:none; background:transparent; border-radius:var(--dsw-radius-sm, 8px);
  font-size:11px; color:var(--dsw-alias-label-secondary); cursor:pointer; white-space:nowrap; }
.gw-dd-text { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; }
.gw-dd-check { flex:none; color:var(--dsw-alias-label-primary); }
.gw-dd-value { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; }
.gw-dd-caret { flex:none; opacity:.75; }
.gw-dd-item:hover { background:color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent); }
.gw-dd-item-on { color:var(--dsw-alias-label-primary); font-weight:600; }
.gw-output-search { height:22px; width:120px; box-sizing:border-box; padding:0 6px;
  border-radius:var(--dsw-radius-xs, 4px); border:1px solid var(--dsw-alias-border-l2);
  background:transparent; color:var(--dsw-alias-label-primary); font-size:11px; outline:none; }
.gw-output-search::placeholder { color:var(--dsw-alias-label-tertiary); }
.gw-output-quiet .gw-output-cmd { color:var(--dsw-alias-label-secondary); }
.gw-output-scroll { flex:1 1 auto; min-height:0; overflow:auto; padding:8px 14px 16px; }
.gw-output { display:flex; flex-direction:column;
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size:11.5px; line-height:1.65; }
/* 每条占一段而不是一行：命令完整换行显示，不省略，便于逐条核对。 */
.gw-output-item { display:flex; align-items:flex-start; gap:12px; padding:8px 2px;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.gw-output-item:hover { background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.gw-output-meta { flex:none; width:64px; color:var(--dsw-alias-label-tertiary);
  font-variant-numeric:tabular-nums; }
.gw-output-body { flex:1 1 auto; min-width:0; }
.gw-output-cmd { white-space:pre-wrap; word-break:break-all; color:var(--dsw-alias-label-primary); }
.gw-output-note { color:var(--dsw-alias-label-tertiary); }
.gw-output-fail .gw-output-cmd { color:var(--dsw-alias-state-error-primary); }
.gw-output-fail .gw-output-note { color:var(--dsw-alias-state-error-primary); }
/* 设置面板：一行一项，名字与说明在左，控件在右，行间一条细线。 */
.gw-set-list { display:flex; flex-direction:column; }
/* 每行：左边标题加说明，右边控件，底部一条极淡的分隔线。 */
.gw-set-item { display:flex; align-items:center; gap:20px; padding:18px 0;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.gw-set-item:last-child { border-bottom:none; }
.gw-set-text { display:flex; flex-direction:column; gap:5px; min-width:0; flex:1 1 auto; }
.gw-set-name { font-size:15px; font-weight:500; line-height:1.3; color:var(--dsw-alias-label-primary); }
.gw-set-desc { font-size:13px; line-height:1.5; color:var(--dsw-alias-label-tertiary); }
/* 设置行里的下拉是浅灰圆角块，跟宿主设置页右侧控件同形 */
.gw-set-item .gw-dd { min-width:0; }
/* 宽度跟内容走，箭头紧贴文字右侧，不推到最右边 */
.gw-set-item .gw-dd-btn { height:38px; padding:0 14px; border:none;
  border-radius:16px; font-size:15px; line-height:1; color:var(--dsw-alias-label-primary);
  display:inline-flex; align-items:center; justify-content:flex-start; gap:8px;
  font-family:inherit;
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
.gw-set-item .gw-dd-btn:hover { background:color-mix(in srgb, var(--dsw-alias-label-primary) 13%, transparent); }
/* 菜单是白卡：大圆角、无描边、柔和投影，项高固定，选中项右侧打勾 */
/* 菜单宽度只由最长的那一项决定，不撑满、也不小于按钮 */
.gw-set-item .gw-dd-menu { padding:6px; border-radius:26px;
  background:var(--dsw-alias-bg-layer-1);
  box-shadow:0 16px 40px rgba(0, 0, 0, .16), 0 2px 8px rgba(0, 0, 0, .06);
  min-width:100%; width:max-content; max-width:min(260px, 88vw); }
.gw-set-item .gw-dd-item { padding:0 14px; height:40px; box-sizing:border-box;
  font-size:15px; border-radius:20px;
  font-family:inherit; }
.gw-set-item .gw-dd-item:hover { background:color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); }
/* 开关：深色实心轨道，白点撑满高度 */
/* 开关照宿主那套来：36×20、padding 2、圆角 999px，白点 16 撑满内区 */
.gw-switch { position:relative; flex:none; width:36px; height:20px; padding:2px;
  box-sizing:border-box; border:none; border-radius:999px;
  cursor:pointer; transition:background .12s ease;
  background:var(--dsw-alias-border-l3); }
.gw-switch-on { background:var(--dsw-alias-brand-primary); }
.gw-switch-knob { display:block; width:16px; height:16px; border-radius:50%;
  background:var(--dsw-alias-switch-thumb, #fff);
  transition:transform .12s ease; }
.gw-switch-on .gw-switch-knob { transform:translateX(16px); }
.gw-set-row { display:flex; align-items:center; gap:10px; padding:6px 0; }
.gw-set-label { flex:0 0 84px; font-size:11px; color:var(--dsw-alias-label-secondary); }
.gw-set-opts { display:flex; gap:4px; }
.gw-set-opt { padding:3px 9px; font-size:11px; border-radius:6px; cursor:pointer;
  border:1px solid var(--dsw-alias-border-l2); background:transparent;
  color:var(--dsw-alias-label-secondary); }
.gw-set-opt:hover { background:color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); }
.gw-set-opt-on { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); }
.gw-files-tab { display:flex; flex-direction:column; height:100%; min-height:0; overflow:auto; }
.gw-files-tab-bar { display:flex; align-items:center; gap:6px; padding:4px 8px 4px 10px;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.gw-files-tab-title { display:inline-flex; align-items:center; gap:4px;
  font-size:11px; color:var(--dsw-alias-label-tertiary); }
.gw-files-tab-add { color:var(--dsw-alias-state-success-primary); }
.gw-files-tab-del { color:var(--dsw-alias-state-error-primary); }
.gw-files-tab-head { display:flex; align-items:center; gap:6px; padding:6px 10px; cursor:pointer;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.gw-files-tab-head:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-files-tab-path { font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gw-files-tab-count { font-size:10.5px; color:var(--dsw-alias-label-tertiary);
  font-family:var(--ds-font-family-code, ui-monospace, monospace); }
.gw-count { color:var(--dsw-alias-label-tertiary); }
.gw-group-actions { margin-left:auto; display:flex; gap:4px; }

.gw-file { display:flex; align-items:center; gap:4px; height:22px; padding:0 10px 0 24px; cursor:pointer;
  white-space:nowrap; }
.gw-file:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-file-name { overflow:hidden; text-overflow:ellipsis; flex:1 1 auto; direction:rtl; text-align:left; }
.gw-file-dir { color:var(--dsw-alias-label-tertiary); }
.gw-code { width:15px; text-align:center; font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:11px; flex:none; }
.gw-code-idx { color:var(--dsw-alias-state-success-primary); }
.gw-code-work { color:var(--dsw-alias-state-warn-primary); }
.gw-code-conflict { color:var(--dsw-alias-state-error-primary); }
.gw-file-actions { display:none; gap:2px; flex:none; }
.gw-file:hover .gw-file-actions { display:flex; }

.gw-graph-head { display:flex; align-items:center; gap:8px; padding:5px 10px; flex:none;
  border-bottom:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); font-size:11px; }
.gw-branch { display:inline-flex; align-items:center; gap:4px; color:var(--dsw-alias-label-primary);
  font-weight:500; font-size:11.5px; }
.gw-ahead { color:var(--dsw-alias-state-success-primary); }
.gw-behind { color:var(--dsw-alias-state-warn-primary); }
.gw-spacer { flex:1 1 auto; }
.gw-bar { display:flex; flex-direction:row; align-items:center; gap:6px;
  padding:0 0 8px 0; min-height:30px; flex:none; }
.gw-bar-title { font-size:14px; font-weight:600; color:var(--dsw-alias-label-primary);
  margin-right:1px; }
.gw-act { display:flex; align-items:center; justify-content:center; flex:none;
  width:20px; height:20px; padding:0; border:none; border-radius:4px; background:transparent;
  color:var(--dsw-alias-label-tertiary); cursor:pointer; opacity:0; }
.gw-row:hover .gw-act, .gw-file:hover .gw-act, .gw-group-head:hover .gw-act { opacity:1; }
.gw-act { position:relative; }
/* 提示框用不透明色：宿主的底色变量带透明度，浮在提交行上会透出底下的字。
   深浅两套直接写死，由面板根据主题挂 gw-dark 切换。 */
.gw-dark .gw-act::after, .gw-dark .gw-icon::after {
  background:#2b2d31; color:#f2f3f5; border-color:rgba(255,255,255,.14); }
.gw-act::after { content:attr(data-tip); position:absolute; top:calc(100% + 6px); right:-2px;
  padding:5px 8px; border-radius:6px; border-radius:var(--dsw-radius-sm, 8px);
  background:#ffffff; color:#1b1c1f;
  border:1px solid rgba(0,0,0,.12);
  font-size:11px; line-height:1.3; white-space:nowrap; pointer-events:none;
  box-shadow:0 2px 8px rgba(0,0,0,.28); opacity:0; visibility:hidden;
  transition:opacity .12s ease, visibility .12s ease; z-index:10000; }
.gw-act:hover::after { opacity:1; visibility:visible; }
.gw-act:hover { background:var(--dsw-alias-interactive-bg-hover);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); color:var(--dsw-alias-label-primary); }
.gw-icon { display:flex; align-items:center; justify-content:center; flex:none;
  width:24px; height:24px; padding:0; border:none; border-radius:5px; background:transparent;
  color:var(--dsw-alias-label-tertiary); cursor:pointer; }
.gw-icon:hover { background:var(--dsw-alias-interactive-bg-hover);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); color:var(--dsw-alias-label-primary); }
/* 不用 opacity 表示禁用：父元素的透明度会连 ::after 的提示框一起变半透明。 */
.gw-icon:disabled { color:color-mix(in srgb, var(--dsw-alias-label-tertiary) 42%, transparent); cursor:default; background:transparent; }
.gw-icon { position:relative; }
.gw-icon::after { content:attr(data-tip); position:absolute; top:calc(100% + 6px); right:-2px;
  padding:3px 7px; border-radius:4px; border-radius:var(--dsw-radius-xs, 4px);
  background:#ffffff; color:#1b1c1f;
  border:1px solid rgba(0,0,0,.12); box-shadow:0 4px 14px rgba(0,0,0,.22);
  font-size:11px; font-weight:400; line-height:1.4; white-space:nowrap;
  opacity:0; visibility:hidden; pointer-events:none; transition:opacity .12s ease; z-index:10000; }
.gw-icon:hover::after { opacity:1; visibility:visible; }
.gw-icon-on { color:var(--dsw-alias-brand-primary); }
.gw-icon-on:hover { color:var(--dsw-alias-brand-primary); }

.gw-graph-body { flex:1 1 auto; min-height:0; overflow:auto; position:relative; }
.gw-canvas { position:relative; }
.gw-row { position:absolute; left:0; right:0; display:flex; align-items:center; gap:6px;
  padding-right:8px; cursor:pointer; user-select:none; }
.gw-row:hover { background:var(--dsw-alias-interactive-bg-hover);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.gw-row-sel, .gw-row-sel:hover { background:var(--dsw-alias-interactive-bg-active);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); }
.gw-row-subject { overflow:hidden; white-space:nowrap; flex:1 1 auto; }
.gw-row-text { display:block; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.gw-row-ghost { cursor: default; }
.gw-row-ghost .gw-row-subject { color: var(--dsw-alias-label-secondary); }
.gw-row-meta { display:flex; align-items:center; gap:4px; flex:none; font-size:11px; padding:0 4px;
  color:var(--dsw-alias-label-tertiary);
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
.gw-row-sep { opacity:.5; }

/* 拼接式：左格自带一圈链色边，右格自带一圈中性边，两格共一条分界线。 */
.gw-ref { display:inline-flex; align-items:stretch; height:15px; flex:none; max-width:150px;
  overflow:hidden; box-sizing:border-box; }
.gw-ref-flag { width:7px; flex:none; box-sizing:border-box;
  border-radius:4px 0 0 4px; border-radius:var(--dsw-radius-xs, 4px) 0 0 var(--dsw-radius-xs, 4px);
  border:1px solid transparent;
  background:var(--gw-ref-fill, var(--dsw-alias-brand-primary)); }
.gw-ref-remote .gw-ref-flag {
  background:color-mix(in srgb, var(--gw-ref-fill, var(--dsw-alias-brand-primary)) 40%, transparent); }
/* 标签与 stash 是特殊类型：整块用四成透明的链色描边，内部照常是中性文字与统一底色。 */
.gw-ref-tag, .gw-ref-stash {
  --gw-ref-edge:color-mix(in srgb, var(--gw-ref-fill, var(--dsw-alias-brand-primary)) 40%, transparent); }
.gw-ref-tag .gw-ref-flag, .gw-ref-stash .gw-ref-flag {
  background:transparent;
  border-color:var(--gw-ref-edge); }
.gw-ref-tag .gw-ref-label, .gw-ref-stash .gw-ref-label,
.gw-ref-tag .gw-ref-kind, .gw-ref-stash .gw-ref-kind,
.gw-ref-tag .gw-ref-remotes, .gw-ref-stash .gw-ref-remotes { border-color:var(--gw-ref-edge); }

.gw-ref-label { display:block; flex:1 1 auto; min-width:0; padding:0; overflow:hidden;
  box-sizing:border-box; border:1px solid var(--dsw-alias-border-l2); border-left:none;
  border-radius:0 4px 4px 0; border-radius:0 var(--dsw-radius-xs, 4px) var(--dsw-radius-xs, 4px) 0;
  background:color-mix(in srgb, var(--gw-ref-fill, var(--dsw-alias-brand-primary)) 10%, transparent);
  font-size:10px; line-height:13px; font-weight:500; color:var(--dsw-alias-label-secondary);
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
.gw-ref-view { display:block; padding:0 5px; overflow:hidden; }
.gw-ref-text { display:block; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* 悬停时匀速滑到结尾停住；羽化作用在文字区内部，不会糊到边框上。 */
.gw-ref:hover .gw-ref-view {
  mask-image:linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent); }
.gw-ref:hover .gw-ref-text { width:max-content; text-overflow:clip;
  animation-name:gw-ref-slide; animation-timing-function:linear;
  animation-delay:.15s; animation-fill-mode:forwards; }
@keyframes gw-ref-slide {
  from { transform:translateX(0); }
  to { transform:translateX(var(--gw-ref-shift, 0px)); }
}
.gw-ref-head .gw-ref-label { font-weight:600; color:var(--dsw-alias-label-primary); }
.gw-ref-kind { position:relative; display:flex; align-items:center; justify-content:center; flex:none;
  padding:0 3px; box-sizing:border-box;
  border:1px solid var(--dsw-alias-border-l2); border-left:none; border-right:none;
  background:color-mix(in srgb, var(--gw-ref-fill, var(--dsw-alias-brand-primary)) 10%, transparent);
  font-size:10px; line-height:13px; color:var(--dsw-alias-label-secondary); }
/* 旗子右侧那条分隔不满高，上下各留两像素，弱化成一处分隔暗示。 */
.gw-ref-kind::after { content:''; position:absolute; right:0; top:2px; bottom:2px; width:1px;
  background:color-mix(in srgb, var(--gw-ref-fill, var(--dsw-alias-brand-primary)) 20%, transparent); }
.gw-ref-remotes { display:flex; align-items:center; flex:none; padding:0 5px; box-sizing:border-box;
  border:1px solid var(--dsw-alias-border-l2); border-left:none;
  border-radius:0 4px 4px 0; border-radius:0 var(--dsw-radius-xs, 4px) var(--dsw-radius-xs, 4px) 0;
  background:color-mix(in srgb, var(--gw-ref-fill, var(--dsw-alias-brand-primary)) 10%, transparent);
  font-size:9px; color:var(--dsw-alias-label-tertiary); white-space:nowrap; }
.gw-ref-remote .gw-ref-label { font-style:italic; }
/* 后面还接着远程那格时，文字格的右边不再是外沿，圆角与右边框都让给它。 */
.gw-ref-linked .gw-ref-label { border-radius:0; border-right:none; }
.gw-ref-linked .gw-ref-remotes { border-left:1px solid var(--dsw-alias-border-l2); }

.gw-drawer { position:absolute; left:0; right:0; z-index:1;
  background:var(--dsw-alias-bg-layer-1);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 1.5%, var(--dsw-alias-bg-layer-1));
  border-bottom:1px solid var(--dsw-alias-border-l2);
  display:flex; flex-direction:column; overflow:hidden; box-sizing:border-box; }
.gw-drawer-divider { position:absolute; top:8px; bottom:8px; width:0;
  border-left:1px solid var(--dsw-alias-border-l1);
  pointer-events:none; }
.gw-drawer-scroll { flex:1 1 auto; min-height:0; overflow:auto; padding:8px 12px; }
.gw-detail-msg { white-space:pre-wrap; font-size:12px; margin:0 0 8px; color:var(--dsw-alias-label-primary); }
.gw-kv { display:grid; grid-template-columns:auto 1fr; gap:2px 10px; font-size:11.5px; margin-bottom:8px; }
.gw-kv-k { color:var(--dsw-alias-label-tertiary); }
.gw-kv-v { color:var(--dsw-alias-label-secondary); font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  overflow:hidden; text-overflow:ellipsis; }
.gw-detail-files { border-top:1px solid var(--dsw-alias-border-l1); padding-top:6px; }
.gw-detail-file { display:flex; align-items:center; gap:8px; height:22px; padding:0 4px; cursor:pointer;
  border-radius:4px; }
.gw-detail-file:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-add { color:var(--dsw-alias-state-success-primary); }
.gw-del { color:var(--dsw-alias-state-error-primary); }

.gw-diff { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
.gw-diff-head { display:flex; align-items:center; gap:8px; padding:5px 10px; flex:none;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.gw-diff-title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-primary); }
.gw-diff-body { flex:1 1 auto; min-height:0; overflow:auto; font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:11px; line-height:1.5; }
.gw-diff-line { display:flex; white-space:pre; }
.gw-diff-fold { display:flex; align-items:center; height:22px; padding:0 10px;
  cursor:pointer; background:color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent);
  border-top:1px solid var(--dsw-alias-border-l1);
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.gw-diff-fold:hover { background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
.gw-diff-fold-text { font-size:11px; color:var(--dsw-alias-label-tertiary); }
.gw-diff-sign { flex:none; width:12px; margin-right:8px; text-align:center; user-select:none;
  color:var(--dsw-alias-label-tertiary); }
.gw-diff-add .gw-diff-sign { color:var(--dsw-alias-state-success-primary); }
.gw-diff-del .gw-diff-sign { color:var(--dsw-alias-state-error-primary); }
.gw-diff-gutter { flex:none; width:40px; text-align:right; padding-right:8px; user-select:none;
  color:var(--dsw-alias-label-tertiary); }
.gw-diff-text { flex:1 1 auto; padding-right:12px; }
/* 底色压到很淡、文字保持默认前景色，向 VSCode 那种柔和观感靠拢 */
.gw-diff-add { background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 7%, transparent); }
.gw-diff-del { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent); }
.gw-diff-hunk { color:var(--dsw-alias-label-tertiary); background:var(--dsw-alias-bg-layer-2); }
.gw-diff-add .gw-diff-text, .gw-diff-del .gw-diff-text { color:var(--dsw-alias-label-primary); }
/* 语法着色：每类各占一个色相，饱和度由主题语义色本身决定，混合比例只留一点点底色避免与正文完全脱开。 */
.gw-tok-com { color:color-mix(in srgb, var(--dsw-alias-label-tertiary) 92%, var(--dsw-alias-state-success-primary)); font-style:italic; }
.gw-tok-str { color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 88%, var(--dsw-alias-label-primary)); }
.gw-tok-num { color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 85%, var(--dsw-alias-label-primary)); }
.gw-tok-key { color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 88%, var(--dsw-alias-label-primary)); }
.gw-tok-fn { color:color-mix(in srgb, var(--dsw-alias-brand-primary) 85%, var(--dsw-alias-label-primary)); }

.gw-empty { padding:24px 12px; text-align:center; color:var(--dsw-alias-label-tertiary); }
/* 错误条浮在面板上方，不占布局空间——否则它一出现就把下面的提交框顶下去。 */
.gw-err { position:absolute; top:6px; left:10px; right:10px; z-index:60; padding:8px 12px;
  border-radius:12px; border-radius:var(--dsw-radius-md, 12px); font-size:11.5px;
  background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, var(--dsw-alias-bg-layer-2));
  color:var(--dsw-alias-state-error-primary);
  border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);
  box-shadow:0 6px 18px rgba(0,0,0,.16); pointer-events:auto;
  display:flex; align-items:center; gap:8px;
  animation:gw-err-in .2s cubic-bezier(.2,.8,.3,1) both, gw-err-out .42s ease 9.5s forwards; }
.gw-err-text { flex:1 1 auto; min-width:0; }
.gw-err-close { flex:none; display:flex; align-items:center; justify-content:center;
  width:16px; height:16px; padding:0; border:none; border-radius:50%; background:transparent;
  color:inherit; cursor:pointer; font-size:13px; line-height:1; opacity:.65; }
.gw-err-close:hover { opacity:1;
  background:color-mix(in srgb, currentColor 16%, transparent); }
@keyframes gw-err-in {
  from { opacity:0; transform:translateY(-6px) scale(.985); }
  to { opacity:1; transform:none; }
}
@keyframes gw-err-out {
  from { opacity:1; transform:none; }
  to { opacity:0; transform:translateY(-4px) scale(.99); }
}
/* 浮层尺寸照宿主的菜单与对话框来：菜单四像素内距、项四乘七、圆角用中号；
   对话框用面板级圆角、无边框、二十像素横向内距。 */
.gw-menu { position:fixed; z-index:9999; min-width:156px; padding:4px;
  border-radius:var(--dsw-radius-xl, 20px);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, var(--dsw-alias-bg-base, #ffffff));
  border:.5px solid var(--dsw-alias-border-l2);
  box-shadow:var(--dsw-elevation-prominent, 0 8px 24px rgba(0,0,0,.24)); }
.gw-menu-item { display:flex; align-items:center; padding:6px 8px; line-height:18px;
  border-radius:var(--dsw-radius-md, 12px);
  font-size:calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  cursor:pointer; white-space:nowrap; color:var(--dsw-alias-label-primary); }
.gw-menu-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-check { display:flex; align-items:center; gap:6px; margin-top:2px;
  font-size:13px; line-height:20px; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.gw-check input { width:15px; height:15px; margin:0; accent-color:var(--dsw-alias-brand-primary); cursor:pointer; }
.gw-note { font-size:14px; line-height:22px; color:var(--dsw-alias-label-secondary);
  margin-bottom:8px; white-space:pre-wrap; }
.gw-btn-danger { background:var(--dsw-alias-state-error-primary); color:#fff; border-color:transparent; }
.gw-btn-danger:hover { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, #000); }
.gw-menu-danger { color:var(--dsw-alias-state-error-primary); }
.gw-menu-danger:hover { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); }
.gw-menu-item { position:relative; }
.gw-menu-label { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gw-menu-parent > .gw-menu-arrow { flex:none; color:var(--dsw-alias-label-tertiary); font-size:12px; }
.gw-menu-off { opacity:.45; cursor:default; }
.gw-menu-sub { display:none; position:absolute; left:calc(100% + 10px); bottom:-4px; min-width:163px;
  padding:4px; border-radius:var(--dsw-radius-xl, 20px); border:.5px solid var(--dsw-alias-border-l2);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, var(--dsw-alias-bg-base, #ffffff));
  box-shadow:var(--dsw-elevation-prominent, 0 12px 28px rgba(0,0,0,.3)); z-index:20; }
.gw-menu-parent:hover > .gw-menu-sub { display:block; }
.gw-menu-sep { height:1px; margin:4px 7px; background:var(--dsw-alias-border-l1); }
.gw-scrim { position:fixed; inset:0; z-index:9998; background:var(--dsw-alias-bg-mask-1, rgba(0,0,0,.32));
  backdrop-filter:var(--dsw-mask-blur); display:flex; align-items:center; justify-content:center; padding:24px; }
.gw-card { width:100%; max-width:min(380px, 100%); max-height:100%; box-sizing:border-box;
  display:flex; flex-direction:column; overflow:hidden; padding:0 0 24px;
  border-radius:var(--dsw-radius-panel, 28px); border:none;
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, var(--dsw-alias-bg-base, #ffffff)); box-shadow:var(--dsw-elevation-prominent); }
/* 设置页要多放几项，单独放宽 */
.gw-card.gw-card-wide { max-width:min(560px, 100%); }
.gw-card-head { display:flex; align-items:center; gap:8px; padding:22px 14px 12px 24px;
  font-size:16px; line-height:24px; font-weight:500; color:var(--dsw-alias-label-primary); }
.gw-card-title { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gw-card-close { flex:none; display:flex; align-items:center; justify-content:center;
  width:28px; height:28px; padding:0; border:none; border-radius:var(--dsw-radius-sm, 8px);
  background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer;
  font-size:16px; line-height:1; }
.gw-card-close:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.gw-card-body { flex:1 1 auto; min-height:0; overflow:auto; margin-top:8px; padding:0 24px;
  font-size:14px; line-height:22px; color:var(--dsw-alias-label-primary); }
.gw-card-foot { flex:none; padding:0 24px; margin-top:20px;
  display:flex; justify-content:flex-end; gap:8px; }
/* 对话框里的按钮单独放大：外壳上的按钮要跟着列表条走，不能一起吃这套尺寸。 */
.gw-card .gw-btn { height:32px; padding:0 14px; font-size:13px; border-radius:var(--dsw-radius-md, 12px); }
.gw-card .gw-btn-primary { border:1px solid transparent; }
.gw-remote { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:var(--dsw-radius-md, 12px); }
.gw-remote:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-remote-name { flex:none; font-size:11.5px; font-weight:600; color:var(--dsw-alias-label-primary);
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
.gw-remote-url { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  font-size:10.5px; color:var(--dsw-alias-label-tertiary);
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
.gw-remote-actions { flex:none; display:flex; gap:2px; }
.gw-form { display:flex; flex-direction:column; gap:14px; }
.gw-remote-list { display:flex; flex-direction:column; gap:2px; }
.gw-remote-main { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1 1 auto; }
.gw-card-actions { display:flex; gap:8px; }
.gw-field { display:flex; flex-direction:column; gap:3px; }
.gw-field > span { font-size:13px; line-height:20px; color:var(--dsw-alias-label-secondary); }
.gw-input { height:34px; padding:0 12px; font-size:13px; line-height:1.5; box-sizing:border-box;
  border-radius:var(--dsw-radius-md, 12px);
  border:.5px solid var(--dsw-alias-border-l4); background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, var(--dsw-alias-bg-base, #ffffff));
  color:var(--dsw-alias-label-primary); outline:none;
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
.gw-input:focus { border-color:var(--dsw-alias-brand-primary); }
`

    function injectStyles() {
      if (typeof document === 'undefined') return
      if (document.getElementById('gw-styles') !== null) return
      const el = document.createElement('style')
      el.id = 'gw-styles'
      el.textContent = CSS
      document.head.appendChild(el)
    }

    /* ------------------------------------------------------------------ */
    /* i18n                                                                */
    /* ------------------------------------------------------------------ */

    const DICT = {
      zh: {
        title: 'Git',
        description: '提交图与变更管理',
        commitPlaceholder: '写点提交信息…',
        commit: '提交',
        commitAmend: '修补上一次提交',
        staged: '已暂存',
        changes: '更改',
        untracked: '未跟踪',
        conflicts: '合并冲突',
        stageAll: '全部暂存',
        moreActions: '更多操作',
        refresh: '刷新',
        viewAll: '全览',
        viewFocus: '聚焦当前分支',
        locate: '定位到当前提交',
        fetchAll: '获取全部远程更新',
        pull: '拉取',
        push: '推送',
        publish: '发布分支',
        syncRunning: '正在执行…',
        treeView: '以树形式查看',
        flatView: '以列表形式查看',
        settings: '设置',
        openPluginSettings: '打开插件设置',
        pollLabel: '自动刷新',
        pollDesc: '面板在后台检查仓库变化的间隔，设为关闭就不再自动刷新。',
        pageDesc: '提交图一次拉取多少条，翻到底再加载下一页。',
        uncommittedLabel: '显示未提交的更改',
        uncommittedDesc: '工作区有改动时，在提交图最上面单独画一行。',
        confirmDiscardLabel: '撤销前确认',
        confirmDiscardDesc: '撤销更改、重置这类不可撤销的操作，执行前先问一次。',
    showUncommitted: '显示未提交的更改',
        seconds: '{n} 秒',
        pageLabel: '每页条数',
        off: '关闭',
        clone: '克隆…',
        cloneUrl: '从远程地址克隆',
        cloneTo: '克隆到当前工作区',
        checkoutTo: '签出到…',
        checkoutBranch: '切换到分支…',
        checkoutTag: '切换到标签…',
        fetch: '抓取',
        commitGroup: '提交',
        commitStaged: '提交已暂存的更改',
        commitAll: '提交全部更改',
        amendLast: '修补上一次提交',
        undoLastCommit: '撤销上一次提交',
        changesGroup: '更改',
        filesTabTitle: '差异',
        openAllDiffs: '打开全部差异',
        filesUnit: '个文件',
        unmodifiedLines: '行未改动',
    allLevels: '全部级别',
    allKinds: '全部类别',
    searchOutput: '搜索命令或输出',
        stageAllChanges: '暂存全部更改',
        unstageAllChanges: '取消暂存全部',
        discardAllChanges: '撤销所有更改',
        syncGroup: '拉取、推送',
        pullThenPush: '先拉取再推送',
        branchesGroup: '分支',
        createBranchItem: '新建分支…',
        deleteBranchItem: '删除分支…',
        renameBranchItem: '重命名分支…',
        remotesGroup: '远程',
        addRemoteItem: '添加远程…',
        removeRemoteItem: '移除远程…',
        editRemoteItem: '编辑远程…',
        stashGroup: '存储',
        stashSaveItem: '保存当前更改为存储',
        stashApplyItem: '应用最近的存储',
        stashDropItem: '丢弃最近的存储',
        tagsGroup: '标记',
        tagCreateItem: '新建标签…',
        tagDeleteItem: '删除标签…',
        showOutput: '显示 Git 输出',
        remotes: '远程仓库',
        openInTerminal: '在终端打开仓库',
        outputEmpty: '还没有执行过命令',
        checkoutHint: '填分支名、标签名或提交哈希',
        refLabel: '目标',
        tagHint: '标记会打在最新一次提交上',
        openFile: '打开文件',
        ignoreFile: '加入忽略',
        ignoreAll: '全部加入忽略',
        remoteEmpty: '还没有配置远程仓库',
        remoteAdd: '添加远程',
        remoteEdit: '编辑',
        remoteRemove: '删除',
        remoteRemoveConfirm: '确定删除远程「{name}」？本地分支不会被动，只是不再跟踪它。',
        remoteName: '名称',
        remoteUrl: '地址',
        save: '保存',
        cancel: '取消',
        close: '关闭',
        unstageAll: '全部取消暂存',
        stage: '暂存',
        unstage: '取消暂存',
        discard: '撤销更改',
        discardConfirm: '确定放弃对 {path} 的更改？此操作无法撤销。',
        discardAllConfirm: '确定撤销全部未暂存的更改？此操作无法撤销。',
        noChanges: '工作区干净',
        uncommitted: '未提交的更改',
        noCommits: '还没有提交',
        noRepo: '当前工作目录不是 Git 仓库',
        loading: '加载中…',
        files: '个文件',
        createBranchAt: '在提交 {hash} 上新建分支',
        addTagAt: '在提交 {hash} 上新建标签',
        nameLabel: '名称',
        checkoutAfter: '创建后切换过去',
        createBranch: '创建分支',
        createTag: '创建标签',
        addTag: '新建标签…',
        cherryPickHere: '拣选此提交…',
        revertHere: '还原此提交…',
        dropHere: '删除此提交…',
        mergeIntoCurrent: '合并到当前分支…',
        rebaseOntoHere: '把当前分支变基到此提交…',
        resetToHere: '把当前分支重置到此提交…',
        pickHint: '双击检出',
        copyHash: '复制完整哈希',
        copySubject: '复制提交信息',
        save: '保存',
        ok: '确定',
        resetTitle: '把当前分支重置到提交 {hash}？',
        resetKind: '重置方式',
        resetSoft: 'Soft — 保留全部改动，只移动 HEAD',
        resetMixed: 'Mixed — 保留工作区，重置暂存区',
        resetHard: 'Hard — 丢弃全部改动',
        confirmReset: '重置',
        revertTitle: '还原提交 {hash}？',
        dropTitle: '永久删除提交 {hash}？',
        rebaseTitle: '把当前分支变基到提交 {hash}？',
        confirmRevert: '还原',
        confirmDrop: '删除',
        confirmRebase: '变基',
        revertNote: '会新建一个提交来抵消「{subject}」的改动。',
        dropNote: '「{subject}」将从历史里移除，之后所有提交的哈希都会变。',
        rebaseNote: '当前分支的提交会接到这个提交之后，历史会被改写。',
        resetNote: '当前分支会退到这个提交，工作区与暂存区的改动都会丢失。',
        checkoutHere: '检出到此提交',
        branchHere: '在此新建分支',
        branchPrompt: '新分支名称',
        detached: '游离 HEAD',
        notRepo: '不是仓库',
        back: '返回',
        error: '出错了',
        more: '加载更多',
        unknown: '未知',
        emptyMsg: '提交信息不能为空',
        diffEmpty: '没有差异',
        ago: '前',
      },
      en: {
        title: 'Git',
        description: 'Commit graph and changes',
        commitPlaceholder: 'Commit message',
        commit: 'Commit',
        commitAmend: 'Amend last commit',
        staged: 'Staged',
        changes: 'Changes',
        untracked: 'Untracked',
        conflicts: 'Conflicts',
        stageAll: 'Stage all',
        moreActions: 'More actions',
        refresh: 'Refresh',
        viewAll: 'Show all branches',
        viewFocus: 'Focus current branch',
        locate: 'Go to current commit',
        fetchAll: 'Fetch from all remotes',
        pull: 'Pull',
        push: 'Push',
        publish: 'Publish branch',
        syncRunning: 'Running…',
        treeView: 'View as tree',
        flatView: 'View as list',
        settings: 'Settings',
        openPluginSettings: 'Open plugin settings',
        pollLabel: 'Auto refresh',
        pollDesc: 'How often the panel checks the repository in the background. Turn it off to stop polling.',
        pageDesc: 'How many commits to load at a time; scrolling to the end loads the next page.',
        uncommittedLabel: 'Show uncommitted changes',
        uncommittedDesc: 'Draw uncommitted work as its own row above the graph.',
        confirmDiscardLabel: 'Confirm before discarding',
        confirmDiscardDesc: 'Ask before discarding changes or resetting, since those cannot be undone.',
      showUncommitted: 'Show uncommitted changes',
        seconds: '{n} seconds',
        pageLabel: 'Rows per page',
        off: 'Off',
        clone: 'Clone…',
        cloneUrl: 'Clone from URL',
        cloneTo: 'Clone into workspace',
        checkoutTo: 'Checkout to…',
        checkoutBranch: 'Checkout branch…',
        checkoutTag: 'Checkout tag…',
        fetch: 'Fetch',
        commitGroup: 'Commit',
        commitStaged: 'Commit staged',
        commitAll: 'Commit all',
        amendLast: 'Amend last commit',
        undoLastCommit: 'Undo last commit',
        changesGroup: 'Changes',
        filesTabTitle: 'Diffs',
        openAllDiffs: 'Open all diffs',
        filesUnit: 'files',
        unmodifiedLines: 'unmodified lines',
    allLevels: 'All levels',
    allKinds: 'All kinds',
    searchOutput: 'Search command or output',
        stageAllChanges: 'Stage all changes',
        unstageAllChanges: 'Unstage all changes',
        discardAllChanges: 'Discard all changes',
        syncGroup: 'Pull, Push',
        pullThenPush: 'Pull then push',
        branchesGroup: 'Branch',
        createBranchItem: 'Create branch…',
        deleteBranchItem: 'Delete branch…',
        renameBranchItem: 'Rename branch…',
        remotesGroup: 'Remote',
        addRemoteItem: 'Add remote…',
        removeRemoteItem: 'Remove remote…',
        editRemoteItem: 'Edit remote…',
        stashGroup: 'Stash',
        stashSaveItem: 'Stash changes',
        stashApplyItem: 'Apply latest stash',
        stashDropItem: 'Drop latest stash',
        tagsGroup: 'Tag',
        tagCreateItem: 'Create tag…',
        tagDeleteItem: 'Delete tag…',
        showOutput: 'Show Git output',
        remotes: 'Remotes',
        openInTerminal: 'Open repository in terminal',
        outputEmpty: 'No commands yet',
        checkoutHint: 'Branch, tag, or commit hash',
        refLabel: 'Target',
        tagHint: 'The tag is created on the latest commit',
        openFile: 'Open file',
        ignoreFile: 'Add to .gitignore',
        ignoreAll: 'Add all to .gitignore',
        remoteEmpty: 'No remotes configured',
        remoteAdd: 'Add remote',
        remoteEdit: 'Edit',
        remoteRemove: 'Remove',
        remoteRemoveConfirm: 'Remove remote "{name}"? Local branches stay; they just stop tracking it.',
        remoteName: 'Name',
        remoteUrl: 'URL',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        unstageAll: 'Unstage all',
        stage: 'Stage',
        unstage: 'Unstage',
        discard: 'Discard',
        discardConfirm: 'Discard changes in {path}? This cannot be undone.',
        discardAllConfirm: 'Discard all unstaged changes? This cannot be undone.',
        noChanges: 'Working tree clean',
        uncommitted: 'Uncommitted changes',
        noCommits: 'No commits yet',
        noRepo: 'Current directory is not a Git repository',
        loading: 'Loading…',
        files: 'files',
        createBranchAt: 'Create branch at commit {hash}',
        addTagAt: 'Add tag at commit {hash}',
        nameLabel: 'Name',
        checkoutAfter: 'Check out',
        createBranch: 'Create Branch',
        createTag: 'Create Tag',
        addTag: 'Add tag…',
        cherryPickHere: 'Cherry-pick this commit…',
        revertHere: 'Revert this commit…',
        dropHere: 'Drop this commit…',
        mergeIntoCurrent: 'Merge into current branch…',
        rebaseOntoHere: 'Rebase current branch onto this…',
        resetToHere: 'Reset current branch to this…',
        pickHint: 'double-click to check out',
        copyHash: 'Copy full hash',
        copySubject: 'Copy commit message',
        save: 'Save',
        ok: 'OK',
        resetTitle: 'Reset current branch to {hash}?',
        resetKind: 'Reset mode',
        resetSoft: 'Soft — keep all changes, only move HEAD',
        resetMixed: 'Mixed — keep working tree, reset the index',
        resetHard: 'Hard — discard all changes',
        confirmReset: 'Reset',
        revertTitle: 'Revert commit {hash}?',
        dropTitle: 'Permanently drop commit {hash}?',
        rebaseTitle: 'Rebase current branch onto {hash}?',
        confirmRevert: 'Revert',
        confirmDrop: 'Drop',
        confirmRebase: 'Rebase',
        revertNote: 'Creates a new commit undoing "{subject}".',
        dropNote: '"{subject}" will be removed from history; later hashes change.',
        rebaseNote: 'Current branch commits will be replayed onto this commit.',
        resetNote: 'Current branch moves to this commit; local changes are lost.',
        checkoutHere: 'Checkout this commit',
        branchHere: 'New branch here',
        branchPrompt: 'New branch name',
        detached: 'detached HEAD',
        notRepo: 'not a repository',
        back: 'Back',
        error: 'Something went wrong',
        more: 'Load more',
        unknown: 'unknown',
        emptyMsg: 'Commit message is required',
        diffEmpty: 'No differences',
        ago: 'ago',
      },
    }

    function localeTagOf(ctx) {
      let tag = ''
      try {
        const locale = ctx === undefined || ctx === null ? undefined : ctx.get('locale')
        if (locale !== undefined && locale !== null && typeof locale.getSnapshot === 'function') {
          const snap = locale.getSnapshot()
          if (snap !== null && typeof snap === 'object' && typeof snap.active === 'string') tag = snap.active
        }
      } catch (error) { void error }
      if (tag === '' && typeof navigator === 'object' && navigator !== null) tag = String(navigator.language || '')
      return tag
    }

    function translatorOf(ctx) {
      return (key, values) => {
        const tag = localeTagOf(ctx).toLowerCase()
        const dict = tag.startsWith('zh') ? DICT.zh : DICT.en
        let text = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : DICT.en[key]
        if (typeof text !== 'string') return key
        if (values !== undefined && values !== null) {
          text = text.replace(/\{(\w+)\}/g, (match, name) => {
            const value = values[name]
            return value === undefined ? match : String(value)
          })
        }
        return text
      }
    }

    /* 语言一变就重渲染：locale 服务的 subscribe 在切换语言和注册字典时都会回调。 */
    function useLocaleRevision(ctx) {
      const [revision, setRevision] = useState(0)
      useEffect(() => {
        const locale = ctx === undefined || ctx === null ? undefined : ctx.get('locale')
        if (locale === undefined || locale === null || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => setRevision((value) => value + 1))
      }, [ctx])
      return revision
    }

    /* ------------------------------------------------------------------ */
    /* api                                                                 */
    /* ------------------------------------------------------------------ */

    async function api(method, payload) {
      let response
      try {
        response = await fetch(API_BASE + '/' + method, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload === undefined ? {} : payload),
        })
      } catch (error) {
        throw new Error(method + ': ' + String(error && error.message ? error.message : error))
      }
      let body = null
      try { body = await response.json() } catch (error) { void error; body = null }
      if (body === null || typeof body !== 'object') {
        throw new Error(method + ': HTTP ' + response.status)
      }
      if (body.ok !== true) {
        const info = body.error !== null && typeof body.error === 'object' ? body.error : {}
        const failure = new Error(typeof info.message === 'string' && info.message !== '' ? info.message : 'HTTP ' + response.status)
        failure.code = typeof info.code === 'string' ? info.code : 'failed'
        throw failure
      }
      return body.data
    }

    /* ------------------------------------------------------------------ */
    /* graph layout                                                        */
    /* ------------------------------------------------------------------ */

    const LANE_COLORS = ['#4c9aff', '#f0a742', '#59c98a', '#c07fd8', '#e2686f', '#49b8c8', '#d18f5c', '#8fbf5a']

    function laneColor(lane) {
      return LANE_COLORS[lane % LANE_COLORS.length]
    }



    function findTrunkTip(entries) {
      const names = ['main', 'master']
      for (const name of names) {
        for (const entry of entries) {
          if (!Array.isArray(entry.refs)) continue
          for (const ref of entry.refs) {
            if (ref.type === 'head' && ref.name === name) return entry.hash
            if (ref.type === 'branch' && ref.name === name) return entry.hash
          }
        }
      }
      return null
    }

    function signatureOf(view) {
      if (view === null) return ''
      const counts = view.counts || {}
      const list = Array.isArray(view.changes) ? view.changes : []
      return [
        view.branch, view.head, view.ahead, view.behind,
        counts.staged, counts.unstaged, counts.untracked, counts.conflicted,
        list.map((item) => item.path + item.index + item.worktree).join('\u0001'),
      ].join('\u0000')
    }

    /**
     * 图上每一行的列与颜色。
     *
     * 规则来自需求本身：
     * - 主分支独占第 0 列。
     * - 一条分支从它的尖端沿第一父一路往下走，撞到已经属于别人的提交就停。
     *   分出来的那一刻就定下了自己站哪一列，不需要看下面还有什么，所以
     *   只加载最近一百条和加载全部历史算出来的列完全一致。
     * - 分叉一律向右：新分支的列总在父分支的右边。
     * - 每条分支独占一列，因此不会出现两段线接成一条直线的错觉。
     * - 颜色跟着分支走，并且和父分支不同色。
     */
    function computeLayout(entries) {
      if (entries.length === 0) {
        return { rowLane: [], rowColor: [], laneCount: 1, edges: [], rowOfHash: new Map() }
      }

      const rowOfHash = new Map()
      for (let i = 0; i < entries.length; i++) rowOfHash.set(entries[i].hash, i)

      const refsOf = (index) => (Array.isArray(entries[index].refs) ? entries[index].refs : [])
      const parentsOf = (index) => (Array.isArray(entries[index].parents) ? entries[index].parents : [])

      // 主干：main / master 优先，其次是当前检出的分支，都没有就取第一行。
      const trunkTip = findTrunkTip(entries)
      let trunkRow = trunkTip === null ? undefined : rowOfHash.get(trunkTip)
      if (trunkRow === undefined) {
        for (let i = 0; i < entries.length; i++) {
          let hit = false
          for (const ref of refsOf(i)) {
            if (ref !== null && ref !== undefined && ref.type === 'head') { hit = true; break }
          }
          if (hit) { trunkRow = i; break }
        }
      }
      if (trunkRow === undefined) trunkRow = 0

      // 一、认领分支。每条分支从自己的尖端往下走，撞上有主的提交就停；
      // 停下时脚踩的那一行属于父分支，这就是「从哪儿分出来的」。
      const owner = new Array(entries.length).fill(-1)
      const branches = []

      const claim = (tipRow, parentBranch) => {
        const index = branches.length
        branches.push({ tip: tipRow, last: tipRow, parent: parentBranch, lane: 0, color: 0 })
        let row = tipRow
        let stop = -1
        while (row >= 0 && row < entries.length && owner[row] < 0) {
          owner[row] = index
          branches[index].last = row
          const parents = parentsOf(row)
          if (parents.length === 0) break
          const next = rowOfHash.get(parents[0])
          if (next === undefined || next <= row) break
          row = next
        }
        // 撞上别人的那一行，就是这条分支的父分支
        if (row >= 0 && row < entries.length && owner[row] >= 0 && owner[row] !== index) stop = owner[row]
        if (stop >= 0) branches[index].parent = stop
        return index
      }

      const trunkBranch = claim(trunkRow, -1)
      branches[trunkBranch].lane = 0

      // 尖端按行号从上到下处理：上面的分支先占位，下面的只能往右让，所以分叉永远向右。
      // 真分支先认领，stash 与标签后认领——否则 stash 会顺着第一父一路往下，
      // 把它所属分支的提交全吞进自己这条链里。
      const tipRank = (row) => {
        let rank = -1
        for (const ref of refsOf(row)) {
          if (ref === null || ref === undefined) continue
          const type = ref.type
          if (type === 'branch' || type === 'remote' || type === 'head') return 0
          if (type === 'stash' || type === 'tag') rank = 1
        }
        return rank
      }
      for (const pass of [0, 1]) {
        for (let i = 0; i < entries.length; i++) {
          if (owner[i] >= 0) continue
          if (tipRank(i) === pass) claim(i, -1)
        }
      }

      // 二、还没归属的提交：跟着它的第一父；父也没有就并进主干。
      // 从下往上补，保证父先有主。
      for (let i = entries.length - 1; i >= 0; i--) {
        if (owner[i] >= 0) continue
        const parents = parentsOf(i)
        const parentRow = parents.length > 0 ? rowOfHash.get(parents[0]) : undefined
        owner[i] = parentRow !== undefined && owner[parentRow] >= 0 ? owner[parentRow] : trunkBranch
      }

      // 三、分列。从父分支右边一格起往右找：这一列上一条分支已经在自己上方收尾，
      // 就说明两段线不会连在一起，可以复用；否则再往右让一格。
      const laneLast = [branches[trunkBranch].last]
      let laneCount = 1

      /* 配色用颜色槽：每种颜色记着它上次用到哪一行，选色时找第一个与新区间
         不重叠的槽。于是只在图上占行重叠的两条分支才必然不同色，隔得远但行
         区间交叉的也不会撞。再排除父分支那一色与同一列上一条分支那一色。 */
      const colourLast = []
      const laneColour = []
      const pickColour = (firstRow, lastRow, lane, fatherSlot) => {
        const free = (from) => {
          let slot = from
          while (slot < colourLast.length && colourLast[slot] >= firstRow) slot += 1
          return slot
        }
        const taken = (slot) => slot === fatherSlot || slot === laneColour[lane]
        let slot = free(0)
        while (taken(slot)) slot = free(slot + 1)
        if (slot >= colourLast.length) colourLast.push(-1)
        colourLast[slot] = lastRow
        laneColour[lane] = slot
        return slot
      }

      branches[trunkBranch].color = pickColour(branches[trunkBranch].tip, branches[trunkBranch].last, 0, -1)

      for (let index = 0; index < branches.length; index++) {
        if (index === trunkBranch) continue
        const branch = branches[index]
        const parent = branch.parent
        const base = parent >= 0 ? branches[parent].lane : 0
        let lane = base + 1
        while (laneLast[lane] !== undefined && laneLast[lane] >= branch.tip) lane += 1
        laneLast[lane] = branch.last
        branch.lane = lane
        if (lane + 1 > laneCount) laneCount = lane + 1
        branch.color = pickColour(branch.tip, branch.last, lane, parent >= 0 ? branches[parent].color : -1)
      }

      const rowLane = new Array(entries.length).fill(0)
      const rowColor = new Array(entries.length).fill(0)
      for (let i = 0; i < entries.length; i++) {
        const branch = branches[owner[i]]
        rowLane[i] = branch.lane
        rowColor[i] = branch.color
      }

      // 五、连线。
      const edges = []
      for (let i = 0; i < entries.length; i++) {
        const parents = parentsOf(i)
        for (let p = 0; p < parents.length; p++) {
          const target = rowOfHash.get(parents[p])
          if (target === undefined) {
            // 父提交还没加载进来：把线一路画到窗口末尾，别让它凭空断掉。
            // 只画第一父，第二父断了会误导主线。
            if (p === 0) {
              edges.push({
                from: i,
                to: entries.length,
                fromLane: rowLane[i],
                toLane: rowLane[i],
                fromColor: rowColor[i],
                toColor: rowColor[i],
                primary: true,
                dangling: true,
              })
            }
            continue
          }
          edges.push({
            from: i,
            to: target,
            fromLane: rowLane[i],
            toLane: rowLane[target],
            fromColor: rowColor[i],
            toColor: rowColor[target],
            primary: p === 0,
          })
        }
      }

      return { rowLane, rowColor, laneCount, edges, rowOfHash }
    }

    /* ------------------------------------------------------------------ */
    /* small helpers                                                       */
    /* ------------------------------------------------------------------ */

    /* 会话工作目录：better-sidebar 的 scope 通常直接给 cwd；拿不到时退到
       sessions 服务的会话列表——和 side bar 座位解析的是同一条信息。 */
    function sessionCwdOf(ctx, sessionId) {
      if (typeof sessionId !== 'string' || sessionId === '') return undefined
      try {
        const sessions = ctx.get('sessions')
        const list = sessions === undefined || sessions === null ? undefined : sessions.list
        if (list === undefined || typeof list.getSnapshot !== 'function') return undefined
        const snapshot = list.getSnapshot()
        const entry = snapshot !== null && typeof snapshot === 'object' && snapshot.byId !== undefined
          && snapshot.byId[sessionId] !== undefined && snapshot.byId[sessionId] !== null
          ? snapshot.byId[sessionId] : undefined
        if (entry !== undefined && typeof entry.cwd === 'string' && entry.cwd !== '') return entry.cwd
      } catch (error) { void error }
      return undefined
    }

    function dirAndName(path) {
      const idx = path.lastIndexOf('/')
      if (idx < 0) return { dir: '', name: path }
      return { dir: path.slice(0, idx + 1), name: path.slice(idx + 1) }
    }

    function relativeTime(seconds, t) {
      const now = Math.floor(Date.now() / 1000)
      const diff = Math.max(0, now - seconds)
      if (diff < 60) return Math.floor(diff) + 's'
      if (diff < 3600) return Math.floor(diff / 60) + 'm'
      if (diff < 86400) return Math.floor(diff / 3600) + 'h'
      if (diff < 86400 * 30) return Math.floor(diff / 86400) + 'd'
      const date = new Date(seconds * 1000)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return date.getFullYear() + '-' + month + '-' + day
    }

    function codeClass(code) {
      if (code === '?' || code === 'A') return 'gw-code gw-code-work'
      if (code === 'U' || code === 'D' || code === 'R' || code === 'C') return 'gw-code gw-code-conflict'
      return 'gw-code gw-code-idx'
    }

    /* 轻量着色：只认注释、字符串、数字、关键字、函数名，够分辨就行，不做真正的语法解析。 */
    const HL_KEYWORDS = new Set([
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
      'class', 'new', 'import', 'export', 'from', 'await', 'async', 'try', 'catch',
      'finally', 'throw', 'typeof', 'instanceof', 'extends', 'implements', 'interface',
      'type', 'enum', 'public', 'private', 'protected', 'static', 'readonly', 'def',
      'null', 'undefined', 'true', 'false', 'this', 'super', 'in', 'of', 'do',
      'switch', 'case', 'default', 'break', 'continue', 'delete', 'void', 'yield',
      'as', 'is', 'and', 'or', 'not', 'elif', 'lambda', 'pass', 'raise', 'with',
    ])

    function highlightLine(text, state) {
      const parts = []
      let plain = ''
      let index = 0
      const flush = () => {
        if (plain !== '') { parts.push({ text: plain, cls: '' }); plain = '' }
      }
      const push = (value, cls) => { flush(); parts.push({ text: value, cls: cls }) }

      while (index < text.length) {
        if (state.block === true) {
          const end = text.indexOf('*/', index)
          if (end < 0) { push(text.slice(index), 'gw-tok-com'); index = text.length; break }
          push(text.slice(index, end + 2), 'gw-tok-com')
          index = end + 2
          state.block = false
          continue
        }
        const rest = text.slice(index)
        if (rest.startsWith('//') || (rest.startsWith('#') && (index === 0 || /\s/.test(text[index - 1])))) {
          push(rest, 'gw-tok-com')
          break
        }
        if (rest.startsWith('/*')) {
          const end = text.indexOf('*/', index + 2)
          if (end < 0) { push(rest, 'gw-tok-com'); state.block = true; break }
          push(text.slice(index, end + 2), 'gw-tok-com')
          index = end + 2
          continue
        }
        const first = text[index]
        if (first === '"' || first === "'" || first === '`') {
          let cursor = index + 1
          while (cursor < text.length) {
            if (text[cursor] === '\\') { cursor += 2; continue }
            if (text[cursor] === first) { cursor += 1; break }
            cursor += 1
          }
          push(text.slice(index, cursor), 'gw-tok-str')
          index = cursor
          continue
        }
        if (/[0-9]/.test(first) && (index === 0 || /[^A-Za-z0-9_$]/.test(text[index - 1]))) {
          const match = /^[0-9][0-9a-zA-Z_.]*/.exec(rest)
          push(match[0], 'gw-tok-num')
          index += match[0].length
          continue
        }
        if (/[A-Za-z_$]/.test(first)) {
          const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(rest)
          const word = match[0]
          const after = text[index + word.length]
          if (HL_KEYWORDS.has(word)) push(word, 'gw-tok-key')
          else if (after === '(') push(word, 'gw-tok-fn')
          else plain += word
          index += word.length
          continue
        }
        plain += first
        index += 1
      }
      flush()
      return parts
    }

    function splitDiff(text) {
      const rows = []
      const lines = String(text === null || text === undefined ? '' : text).split('\n')
      let oldNo = 0
      let newNo = 0
      let inHunk = false
      /* 跨行注释要连续着色，所以状态在整篇里共用一份。 */
      const hlState = { block: false }
      for (const line of lines) {
        /* 文件头那一堆（diff --git、index、---、+++、mode 之类）在单文件视图里
           是重复信息，文件路径已经在标签页标题上了，全部丢掉。 */
        if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') ||
            line.startsWith('+++ ') || line.startsWith('new file') || line.startsWith('deleted file') ||
            line.startsWith('old mode') || line.startsWith('new mode') || line.startsWith('similarity') ||
            line.startsWith('rename ') || line.startsWith('Binary files')) {
          continue
        }
        /* 分节标记只用来对齐行号，本身不显示。 */
        if (line.startsWith('@@')) {
          const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
          if (match !== null) { oldNo = Number(match[1]); newNo = Number(match[2]) }
          inHunk = true
          continue
        }
        if (!inHunk) {
          if (line !== '') rows.push({ type: 'meta', sign: '', text: line })
          continue
        }
        /* 增删符号单独成列，正文从第二个字符开始，不再挤在内容里。 */
        if (line.startsWith('+')) { const body = line.slice(1); rows.push({ type: 'add', sign: '+', text: body, tokens: highlightLine(body, hlState), no: String(newNo) }); newNo += 1; continue }
        if (line.startsWith('-')) { const body = line.slice(1); rows.push({ type: 'del', sign: '−', text: body, tokens: highlightLine(body, hlState), no: String(oldNo) }); oldNo += 1; continue }
        if (line.startsWith('\\')) { rows.push({ type: 'meta', sign: '', text: line }); continue }
        const body = line.slice(1)
        rows.push({ type: 'ctx', sign: '', text: body, tokens: highlightLine(body, hlState), no: String(newNo) })
        oldNo += 1
        newNo += 1
      }
      return rows
    }

    /**
     * 把连续的未改动行折起来，只在改动前后各留三行。
     * 展开状态按「这段起点在整篇里的下标」记，所以折叠/展开是纯前端的事，
     * 不用重新请求——这也是后端要 full 上下文的原因。
     */
    function foldRows(rows, unfolded) {
      const out = []
      let i = 0
      while (i < rows.length) {
        if (rows[i].type !== 'ctx') { out.push(rows[i]); i += 1; continue }
        let j = i
        while (j < rows.length && rows[j].type === 'ctx') j += 1
        const run = j - i
        const head = Math.min(3, run)
        const tail = Math.min(3, Math.max(0, run - head))
        const hidden = run - head - tail
        for (let k = 0; k < head; k++) out.push(rows[i + k])
        if (hidden > 0) {
          const key = 'f' + String(i)
          if (unfolded[key] === true) {
            for (let k = 0; k < hidden; k++) out.push(rows[i + head + k])
          } else {
            out.push({ type: 'fold', count: hidden, key: key })
          }
        }
        for (let k = Math.max(head, run - tail); k < run; k++) out.push(rows[i + k])
        i = j
      }
      return out
    }

    /* ------------------------------------------------------------------ */
    /* pieces                                                              */
    /* ------------------------------------------------------------------ */

    function groupRefs(refs) {
      // 同一提交上，远程分支去掉远程名后若能与本地同名分支对上，就并进那个标签，
      // 对不上的远程才单独成标签。判断方式与 VSCode Git Graph 一致。
      const heads = []
      const rest = []
      const byName = new Map()
      for (const ref of refs) {
        if (ref.type === 'head' || ref.type === 'branch') {
          const item = { ref: ref, remotes: [] }
          heads.push(item)
          if (typeof ref.name === 'string') byName.set(ref.name, item)
        } else {
          rest.push(ref)
        }
      }
      const pending = []
      for (const ref of rest) {
        if (ref.type === 'remote' && typeof ref.name === 'string') {
          const slash = ref.name.indexOf('/')
          if (slash > 0) {
            const remoteName = ref.name.slice(0, slash)
            const target = byName.get(ref.name.slice(slash + 1))
            if (target !== undefined) {
              target.remotes.push(remoteName)
              continue
            }
          }
        }
        pending.push(ref)
      }
      heads.sort((a, b) => (a.ref.type === 'head' ? -1 : 0) - (b.ref.type === 'head' ? -1 : 0))
      return { heads: heads, rest: pending }
    }

    function RefBadge(props) {
      // 注意：props 里不能叫 ref —— React 会把 ref 当特殊属性吞掉，值永远读到 undefined。
      const ref = props.item
      if (!ref || typeof ref !== 'object') return null
      const chain = typeof props.color === 'string' && props.color !== '' ? props.color : '#4c9aff'
      let cls = 'gw-ref'
      let label = ref.name === undefined || ref.name === null ? '' : String(ref.name)
      if (ref.type === 'head') { cls += ' gw-ref-head'; if (label === '') label = 'HEAD' }
      else if (ref.type === 'tag') { cls += ' gw-ref-tag' }
      else if (ref.type === 'remote') { cls += ' gw-ref-remote' }
      else if (ref.type === 'stash') { cls += ' gw-ref-stash' }
      else { cls += ' gw-ref-branch' }
      const hasRemotes = Array.isArray(props.remotes) && props.remotes.length > 0
      // 等宽字体十号字，一个字符约六像素；按可见宽度算出要滑多远、滑多久（每秒四字符）。
      const textWidth = label.length * 6
      const visible = hasRemotes ? 96 : 130
      const shift = Math.max(0, textWidth - visible)
      const seconds = shift === 0 ? 0 : Math.max(0.8, shift / 24)
      if (hasRemotes) cls += ' gw-ref-linked'
      const pick = typeof props.onPick === 'function' && (ref.type === 'branch' || ref.type === 'remote' || ref.type === 'tag')
        ? (event) => { event.stopPropagation(); props.onPick(ref) }
        : undefined
      return E('span', {
        className: cls,
        style: { '--gw-ref-fill': chain },
        title: pick === undefined ? label : label + ' · ' + props.pickHint,
        /* 标签自己吃掉单击，否则会冒泡到行上把详情抽屉打开；双击仍然检出。 */
        onClick: (event) => event.stopPropagation(),
        onDoubleClick: pick,
      },
        E('span', { className: 'gw-ref-flag' }),
        ref.type === 'tag' ? E('span', { className: 'gw-ref-kind' }, '⚑') : null,
        E('span', { className: 'gw-ref-label' },
          E('span', { className: 'gw-ref-view' },
            E('span', {
              className: 'gw-ref-text',
              style: { animationDuration: seconds + 's', '--gw-ref-shift': '-' + shift + 'px' },
            }, label))),
        hasRemotes
          ? E('span', { className: 'gw-ref-remotes' }, props.remotes.join(' '))
          : null)
    }



    /** 远程仓库管理：列出、编辑、删除、新增。地址只做长度与破折号校验，不做可达性探测。 */
    /** 下半区的「显示 Git 输出」：最近执行过的命令，最新的在前，和差异页同一个位置。 */
    /* 菜单贴着按钮往下展开，右边缘对齐，不会往左压到内容上。 */
    function DropDown(props) {
      const [open, setOpen] = useState(false)
      const current = props.options.find((option) => option.value === props.value)
      return E('span', { className: 'gw-dd' },
        E('button', {
          className: 'gw-dd-btn',
          onClick: () => setOpen(open === false),
        },
          E('span', { className: 'gw-dd-value' }, current === undefined ? props.value : current.label),
          E('svg', {
            className: 'gw-dd-caret', width: 11, height: 11, viewBox: '0 0 16 16',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
            strokeLinecap: 'round', strokeLinejoin: 'round',
          }, E('path', { d: 'M4 6.4 8 10.4 12 6.4' }))),
        open === false ? null : E('div', { className: 'gw-dd-scrim', onClick: () => setOpen(false) }),
        open === false ? null : E('div', { className: 'gw-dd-menu' },
          props.options.map((option) => E('button', {
            key: option.value,
            className: 'gw-dd-item' + (option.value === props.value ? ' gw-dd-item-on' : ''),
            onClick: () => {
              setOpen(false)
              props.onPick(option.value)
            },
          },
            E('span', { className: 'gw-dd-text' }, option.label),
            option.value === props.value ? E('svg', {
              className: 'gw-dd-check', width: 12, height: 12, viewBox: '0 0 16 16',
              fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
              strokeLinecap: 'round', strokeLinejoin: 'round',
            }, E('path', { d: 'M3.2 8.4 6.2 11.4 12.8 4.8' })) : null))))
    }

    function OutputPane(props) {
      const t = props.t
      const at = (ms) => {
        const date = new Date(ms)
        const pad = (value) => (value < 10 ? '0' + String(value) : String(value))
        return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
      }
      const [level, setLevel] = useState('all')
      const [kind, setKind] = useState('all')
      const [query, setQuery] = useState('')
      /* 筛选留在这里而不是父层：它只关心这一屏的记录，没必要污染上面那堆状态。 */
      const visible = useMemo(() => {
        const needle = query.trim()
        let pattern = null
        if (needle !== '') {
          try {
            pattern = new RegExp(needle, 'i')
          } catch (failure) {
            void failure
            pattern = null
          }
        }
        return props.records.filter((item) => {
          if (level !== 'all' && item.level !== level) return false
          if (kind !== 'all' && item.category !== kind) return false
          if (needle === '') return true
          const hay = String(item.command) + ' ' + String(item.message === undefined ? '' : item.message) + ' ' + String(item.stderr === undefined ? '' : item.stderr)
          if (pattern !== null) return pattern.test(hay)
          return hay.toLowerCase().indexOf(needle.toLowerCase()) >= 0
        })
      }, [props.records, level, kind, query])
      const pick = (values, current, onPick, labelOf) => E(DropDown, {
        value: current,
        options: values.map((value) => ({ value: value, label: labelOf(value) })),
        onPick: onPick,
      })
      return E('div', { className: 'gw-diff' },
        E('div', { className: 'gw-diff-head' },
          E('button', { className: 'gw-btn gw-btn-ghost gw-btn-sm', onClick: props.onBack }, '\u2190 ' + t('back')),
          E('span', { className: 'gw-diff-title' }, t('showOutput')),
          E('span', { className: 'gw-spacer' }),
          E('button', { className: 'gw-icon', 'data-tip': t('refresh'), onClick: props.onRefresh },
            E('svg', {
              width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none',
              stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
            }, E('path', { d: 'M13 8a5 5 0 1 1-1.6-3.7M13 2.4V5.4H10' })))),
        E('div', { className: 'gw-output-bar' },
          E('span', {
            className: 'gw-output-exe',
            title: props.executable === undefined ? 'git' : props.executable,
          }, 'git: ' + String(props.executable === undefined ? 'git' : props.executable)),
          E('span', { className: 'gw-spacer' }),
          pick(POLL_LEVELS, level, setLevel, (value) => (value === 'all' ? t('allLevels') : value)),
          pick(OUTPUT_KINDS, kind, setKind, (value) => (value === 'all' ? t('allKinds') : value)),
          E('input', {
            className: 'gw-output-search',
            value: query,
            placeholder: t('searchOutput'),
            onChange: (event) => setQuery(event.target.value),
          })),
        visible.length === 0
          ? E('div', { className: 'gw-empty' }, t('outputEmpty'))
          : E('div', { className: 'gw-output-scroll' }, E('div', { className: 'gw-output' }, visible.map((item, index) => E('div', {
            key: 'o' + String(index),
            className: 'gw-output-item'
              + (item.failed === true ? ' gw-output-fail' : '')
              + (item.level === 'debug' ? ' gw-output-quiet' : ''),
          },
            E('div', { className: 'gw-output-meta' },
              E('div', { className: 'gw-output-time' }, at(item.at)),
              E('div', { className: 'gw-output-ms' }, String(item.ms) + ' ms')),
            E('div', { className: 'gw-output-body' },
              E('div', { className: 'gw-output-cmd' }, item.command),
              E('div', { className: 'gw-output-note' },
                item.failed === true
                  ? item.message
                  : 'exit ' + String(item.code) + ' · ' + String(item.stdoutBytes) + ' B')))))))
    }

    /** 面板偏好：刷新频率与每页条数，改完立即生效并记住。 */
    /* 开关：与宿主设置页同形的胶囊滑块。 */
    function SettingSwitch(props) {
      return E('button', {
        type: 'button',
        className: 'gw-switch' + (props.on === true ? ' gw-switch-on' : ''),
        role: 'switch',
        'aria-checked': props.on === true ? 'true' : 'false',
        onClick: () => props.onFlip(props.on !== true),
      }, E('span', { className: 'gw-switch-knob' }))
    }

    /* 设置面板：一行一项，左边名字与一行说明，右边一个控件——与宿主设置页同一套排法。 */
    function SettingsDialog(props) {
      const t = props.t
      const [poll, setPoll] = useState(props.prefs.poll)
      const [page, setPage] = useState(props.prefs.page)
      const [showUncommitted, setShowUncommitted] = useState(props.prefs.showUncommitted !== false)
      const [confirmDiscard, setConfirmDiscard] = useState(props.prefs.confirmDiscard !== false)

      const item = (key, name, desc, control) => E('div', { key: key, className: 'gw-set-item' },
        E('div', { className: 'gw-set-text' },
          E('span', { className: 'gw-set-name' }, name),
          E('span', { className: 'gw-set-desc' }, desc)),
        control)

      const pick = (key, name, desc, options, current, onPick) => item(key, name, desc,
        E(DropDown, {
          value: String(current),
          options: options,
          onPick: (value) => onPick(Number(value)),
        }))

      return E('div', {
        className: 'gw-scrim',
        onMouseDown: (event) => { if (event.target === event.currentTarget) props.onClose() },
      },
        E('div', { className: 'gw-card gw-card-wide' },
          E('div', { className: 'gw-card-head' },
            E('span', { className: 'gw-card-title' }, t('settings')),
            E('button', { className: 'gw-card-close', onClick: props.onClose }, '×')),
          E('div', { className: 'gw-card-body' },
            E('div', { className: 'gw-set-list' },
              pick('poll', t('pollLabel'), t('pollDesc'), PREFS_POLL.map((value) => ({
                value: String(value),
                label: value === 0 ? t('off') : t('seconds', { n: value / 1000 }),
              })), poll, setPoll),
              pick('page', t('pageLabel'), t('pageDesc'), PREFS_PAGE.map((value) => ({
                value: String(value),
                label: String(value),
              })), page, setPage),
              item('uncommitted', t('uncommittedLabel'), t('uncommittedDesc'),
                E(SettingSwitch, { on: showUncommitted, onFlip: setShowUncommitted })),
              item('discard', t('confirmDiscardLabel'), t('confirmDiscardDesc'),
                E(SettingSwitch, { on: confirmDiscard, onFlip: setConfirmDiscard })))),
          E('div', { className: 'gw-card-foot' },
            E('span', { className: 'gw-spacer' }),
            E('button', { className: 'gw-btn gw-btn-ghost gw-btn-sm', onClick: props.onClose }, t('cancel')),
            E('button', {
              className: 'gw-btn gw-btn-primary gw-btn-sm',
              onClick: () => props.onSave({
                poll: poll, page: page,
                showUncommitted: showUncommitted, confirmDiscard: confirmDiscard,
              }),
            }, t('save')))))
    }

    /* 列表和表单不并排：表单打开时它就是正文，底部只留取消与保存；
       表单关着时正文是远程列表，底部只留「添加远程」。两个动作区不同时出现。 */
    function RemoteDialog(props) {
      const t = props.t
      const list = Array.isArray(props.list) ? props.list : []
      const [draft, setDraft] = useState(null)
      const [busy, setBusy] = useState(false)

      function submit() {
        if (draft === null || busy) return
        if (draft.name.trim() === '' || draft.url.trim() === '') return
        setBusy(true)
        Promise.resolve(props.onSave(draft)).then(
          () => { setBusy(false); setDraft(null) },
          () => { setBusy(false) },
        )
      }

      let body = null
      if (draft !== null) {
        body = E('div', { className: 'gw-form' },
          E('label', { className: 'gw-field' }, E('span', null, t('remoteName')),
            E('input', {
              className: 'gw-input', value: draft.name, disabled: busy,
              placeholder: 'origin',
              onChange: (event) => setDraft({ ...draft, name: event.target.value }),
            })),
          E('label', { className: 'gw-field' }, E('span', null, t('remoteUrl')),
            E('input', {
              className: 'gw-input', value: draft.url, disabled: busy,
              placeholder: 'git@github.com:owner/repo.git',
              onChange: (event) => setDraft({ ...draft, url: event.target.value }),
            })))
      } else if (list.length === 0) {
        body = E('div', { className: 'gw-empty' }, t('remoteEmpty'))
      } else {
        body = E('div', { className: 'gw-remote-list' }, list.map((item) => E('div', {
          className: 'gw-remote', key: item.name,
        },
          E('div', { className: 'gw-remote-main' },
            E('span', { className: 'gw-remote-name' }, item.name),
            E('span', { className: 'gw-remote-url', title: item.fetchUrl }, item.fetchUrl)),
          E('div', { className: 'gw-remote-actions' },
            E('button', {
              className: 'gw-btn gw-btn-ghost gw-btn-sm',
              onClick: () => setDraft({ mode: 'edit', name: item.name, url: item.fetchUrl, original: item.name }),
            }, t('remoteEdit')),
            E('button', {
              className: 'gw-btn gw-btn-ghost gw-btn-sm',
              onClick: () => { void props.onRemove(item.name) },
            }, t('remoteRemove'))))))
      }

      const foot = draft === null
        ? E('button', {
          className: 'gw-btn gw-btn-primary', disabled: busy,
          onClick: () => setDraft({ mode: 'add', name: 'origin', url: '', original: '' }),
        }, t('remoteAdd'))
        : E('div', { className: 'gw-card-actions' },
          E('button', { className: 'gw-btn gw-btn-ghost', disabled: busy, onClick: () => setDraft(null) }, t('cancel')),
          E('button', { className: 'gw-btn gw-btn-primary', disabled: busy, onClick: submit }, t('save')))

      return E('div', {
        className: 'gw-scrim',
        onMouseDown: (event) => { if (event.target === event.currentTarget) props.onClose() },
      },
        E('div', { className: 'gw-card' },
          E('div', { className: 'gw-card-head' },
            E('span', { className: 'gw-card-title' }, t('remotes')),
            E('button', { className: 'gw-card-close', onClick: props.onClose }, '\u2715')),
          E('div', { className: 'gw-card-body' }, body),
          E('div', { className: 'gw-card-foot' }, foot)))
    }

    function FileRow(props) {
      const item = props.item
      const extra = props.style === undefined ? {} : props.style
      const t = props.t
      const parts = dirAndName(item.path)
      const conflicted = item.conflicted === true
      const staged = item.staged === true
      const untracked = item.untracked === true
      let idxCode = item.index
      let workCode = item.worktree
      if (untracked) { idxCode = '?' }
      /* 不用状态字母，靠分区（分组）+ 颜色表达：待提交与新文件偏绿、改动偏黄、删除与冲突偏红。 */
      let tone = 'gw-tone-mod'
      if (conflicted) tone = 'gw-tone-danger'
      else if (workCode === 'D' || idxCode === 'D') tone = 'gw-tone-danger'
      else if (props.group === 'staged') tone = 'gw-tone-new'
      else if (props.group === 'untracked') tone = 'gw-tone-new'
      else if (props.group === 'unstaged') tone = 'gw-tone-mod'

      return E('div', {
        className: 'gw-file ' + tone,
        style: extra,
        onClick: () => props.onOpenEditor(item),
        title: item.path,
      },
        props.indent === true ? E('span', { className: 'gw-file-lead' }) : null,
        E('svg', {
          className: 'gw-file-icon', width: 13, height: 13, viewBox: '0 0 16 16',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.2,
          strokeLinejoin: 'round', strokeLinecap: 'round',
        },
          E('path', { d: 'M4 1.8h4.6L12 5.2v9H4z' }),
          E('path', { d: 'M8.6 1.8v3.4H12' })),
        E('span', { className: 'gw-file-name' },
          parts.dir === '' ? null : E('span', { className: 'gw-file-dir' }, parts.dir),
          parts.name),
        E('span', { className: 'gw-file-stats' },
          E('span', { className: 'gw-stat-add' }, '+' + String(item.added === undefined ? 0 : item.added)),
          E('span', { className: 'gw-stat-del' }, '−' + String(item.deleted === undefined ? 0 : item.deleted))),

        E('span', { className: 'gw-file-actions' },
          E(ActionIcon, { name: 'open', title: t('openFile'), onClick: () => props.onOpenEditor(item) }),
          props.group === 'staged'
            ? E(ActionIcon, { name: 'unstage', title: t('unstage'), onClick: () => props.onUnstage(item) })
            : null,
          props.group === 'untracked'
            ? E(ActionIcon, { name: 'ignore', title: t('ignoreFile'), onClick: () => props.onIgnore([item.path]) })
            : null,
          props.group === 'untracked' || props.group === 'unstaged'
            ? E(ActionIcon, { name: 'discard', title: t('discard'), onClick: () => props.onDiscard(item) })
            : null,
          props.group === 'untracked' || props.group === 'unstaged'
            ? E(ActionIcon, { name: 'stage', title: t('stage'), onClick: () => props.onStage(item) })
            : null))
    }

    /** 把扁平的路径表折成树：中间节点是目录，叶子才是真的文件。 */
    function buildTree(items) {
      const root = { name: '', path: '', dir: true, children: [], item: null }
      const dirs = new Map()
      dirs.set('', root)
      for (const item of items) {
        const parts = String(item.path).split('/')
        let parent = root
        let acc = ''
        for (let i = 0; i < parts.length - 1; i++) {
          acc = acc === '' ? parts[i] : acc + '/' + parts[i]
          if (!dirs.has(acc)) {
            const node = { name: parts[i], path: acc, dir: true, children: [], item: null }
            dirs.set(acc, node)
            parent.children.push(node)
          }
          parent = dirs.get(acc)
        }
        parent.children.push({
          name: parts[parts.length - 1], path: item.path, dir: false, children: [], item: item,
        })
      }
      const sort = (node) => {
        node.children.sort((a, b) => {
          if (a.dir !== b.dir) return a.dir ? -1 : 1
          return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
        })
        for (const child of node.children) if (child.dir) sort(child)
      }
      sort(root)
      return root.children
    }

    /** 树形视图里的一行：目录只显示名字和计数，文件沿用 FileRow。 */
    function TreeRow(props) {
      const node = props.node
      const depth = props.depth
      if (node.dir === false) {
        return E(FileRow, {
          item: node.item,
          t: props.t,
          indent: true,
          style: { paddingLeft: '0px' },
          onOpen: props.onOpen,
          onOpenEditor: props.onOpenEditor,
          onStage: props.onStage,
          onUnstage: props.onUnstage,
          onDiscard: props.onDiscard,
        })
      }
      const open = props.collapsed.has(node.path) === false
      return E('div', null,
        E('div', {
          className: 'gw-file gw-tree-dir',
          style: { paddingLeft: '0px' },
          onClick: () => props.onToggleDir(node.path),
        },
          E(Caret, { open: open }),
          E('svg', {
            className: 'gw-dir-icon', width: 13, height: 13, viewBox: '0 0 16 16',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round',
          },
            E('path', { d: open ? 'M1.8 4.2h4l1.4 1.6h7v6.4H1.8z' : 'M1.8 4.2h4l1.4 1.6h7v6.4H1.8z' })),
          E('span', { className: 'gw-tree-name' }, node.name)),
        open
          ? E('div', { className: 'gw-tree-kids' },
              node.children.map((child, index) => E(TreeRow, {
                key: child.path + ':' + String(index),
                node: child,
                depth: depth + 1,
                t: props.t,
                collapsed: props.collapsed,
                onToggleDir: props.onToggleDir,
                onOpen: props.onOpen,
                onOpenEditor: props.onOpenEditor,
                onStage: props.onStage,
                onUnstage: props.onUnstage,
                onDiscard: props.onDiscard,
              })))
          : null)
    }

    function ChangeGroup(props) {
      const items = props.items === undefined || props.items === null ? [] : props.items
      const total = items.reduce((acc, item) => {
        acc.added += item.added === undefined ? 0 : item.added
        acc.deleted += item.deleted === undefined ? 0 : item.deleted
        return acc
      }, { added: 0, deleted: 0 })
      const t = props.t
      return E('div', null,
        E('div', { className: 'gw-group-head', onClick: props.onToggle },
          E(Caret, { open: props.open === true }),
          E('span', { className: 'gw-group-title' }, props.title),
          E('span', { className: 'gw-spacer' }),
          E('span', { className: 'gw-file-stats' },
            E('span', { className: 'gw-stat-add' }, '+' + String(total.added)),
            E('span', { className: 'gw-stat-del' }, '−' + String(total.deleted))),
          E('span', { className: 'gw-group-actions' },
            props.action === undefined || props.action === null ? null : props.action),
          E('span', { className: 'gw-badge' }, String(items.length))),
        props.open === false ? null : props.tree === true
          ? E('div', { className: 'gw-tree-root' }, buildTree(items).map((node, index) => E(TreeRow, {
              key: 't' + String(index),
              node: node,
              depth: 0,
              t: t,
              collapsed: props.collapsed,
              onToggleDir: props.onToggleDir,
              onOpen: props.onOpen,
              onOpenEditor: props.onOpenEditor,
              onStage: props.onStage,
              onUnstage: props.onUnstage,
              onDiscard: props.onDiscard,
            })))
          : items.map((item, index) => E(FileRow, {
              key: item.path + ':' + String(index),
              item: item,
              group: props.group,
              t: t,
              onOpen: props.onOpen,
              onOpenEditor: props.onOpenEditor,
              onStage: props.onStage,
              onUnstage: props.onUnstage,
              onDiscard: props.onDiscard,
              onIgnore: props.onIgnore,
            })))
    }

    function GraphRow(props) {
      const entry = props.entry
      const y = props.y
      const t = props.t
      const refs = Array.isArray(entry.refs) ? entry.refs : []
      const grouped = groupRefs(refs)
      if (entry.uncommitted === true) {
        return E('div', {
          className: 'gw-row gw-row-ghost',
          style: { top: y + 'px', height: ROW_H + 'px', paddingLeft: props.laneWidth + 'px' },
          title: entry.subject,
        },
          E('span', { className: 'gw-row-subject' }, E('span', { className: 'gw-row-text' }, entry.subject)))
      }
      return E('div', {
        className: 'gw-row' + (props.selected ? ' gw-row-sel' : ''),
        style: { top: y + 'px', height: ROW_H + 'px', paddingLeft: props.laneWidth + 'px' },
        onClick: props.onClick,
        onContextMenu: props.onContextMenu,
        title: entry.subject,
      },
        grouped.heads.map((head, index) => E(RefBadge, {
          key: 'h' + String(index), item: head.ref, color: props.color, remotes: head.remotes,
          onPick: props.onRefPick, pickHint: props.pickHint,
        })),
        grouped.rest.map((ref, index) => E(RefBadge, {
          key: 'o' + String(index), item: ref, color: props.color,
          onPick: props.onRefPick, pickHint: props.pickHint,
        })),
        E('span', { className: 'gw-row-subject' }, E('span', { className: 'gw-row-text' }, entry.subject)),
        E('span', { className: 'gw-row-meta' },
          E('span', null, entry.author),
          E('span', { className: 'gw-row-sep' }, '·'),
          E('span', null, relativeTime(entry.time, t)),
          E('span', { className: 'gw-row-sep' }, '·'),
          E('span', null, entry.short)))
    }

    /** 只要逐行着色那一段，供批量标签页复用；未改动的长段折起来，点一下就地展开。 */
    function DiffBody(props) {
      const t = props.t
      const [unfolded, setUnfolded] = useState({})
      const rows = useMemo(
        () => foldRows(splitDiff(props.text === undefined ? '' : props.text), unfolded),
        [props.text, unfolded],
      )
      if (rows.length === 0) return E('div', { className: 'gw-empty' }, '—')
      return E('div', { className: 'gw-diff-body' },
        rows.map((row, index) => {
          if (row.type === 'fold') {
            return E('div', {
              key: 'd' + String(index),
              className: 'gw-diff-fold',
              onClick: () => setUnfolded(Object.assign({}, unfolded, { [row.key]: true })),
            },
              E('span', { className: 'gw-diff-fold-text' }, String(row.count) + ' ' + t('unmodifiedLines')))
          }
          return E('div', {
            key: 'd' + String(index),
            className: 'gw-diff-line' + (row.type === 'add' ? ' gw-diff-add'
              : row.type === 'del' ? ' gw-diff-del'
                : row.type === 'hunk' ? ' gw-diff-hunk' : ''),
          },
            E('span', { className: 'gw-diff-gutter' }, row.no === undefined ? '' : row.no),
            E('span', { className: 'gw-diff-sign' }, row.sign === undefined ? '' : row.sign),
            E('span', { className: 'gw-diff-text' },
              row.tokens === undefined
                ? row.text
                : row.tokens.map((part, index2) => part.cls === ''
                  ? part.text
                  : E('span', { key: 't' + String(index2), className: part.cls }, part.text))))
        }))
    }

    function DiffPane(props) {
      const t = props.t
      const rows = useMemo(() => splitDiff(props.text), [props.text])
      return E('div', { className: 'gw-diff' },
        E('div', { className: 'gw-diff-head' },
          E('button', { className: 'gw-btn gw-btn-ghost gw-btn-sm', onClick: props.onBack }, '← ' + t('back')),
          E('span', { className: 'gw-diff-title' }, props.title)),
        props.loading
          ? E('div', { className: 'gw-empty' }, t('loading'))
          : rows.length === 0
            ? E('div', { className: 'gw-empty' }, t('diffEmpty'))
            : E(DiffBody, { t: t, text: props.text }))
    }

    function CommitDrawer(props) {
      const t = props.t
      const detail = props.detail
      return E('div', {
        className: 'gw-drawer',
        style: { top: props.top + 'px', height: props.height + 'px' },
        onClick: (event) => event.stopPropagation(),
      },
        E('div', {
          className: 'gw-drawer-divider',
          style: { left: String(props.indent) + 'px' },
        }),
        E('div', {
          className: 'gw-drawer-scroll',
          style: { paddingLeft: String(props.indent + 12) + 'px' },
        },
          detail === null || detail === undefined
            ? E('div', { className: 'gw-empty' }, t('loading'))
            : E('div', null,
                E('div', { className: 'gw-detail-msg' }, detail.message),
                E('div', { className: 'gw-kv' },
                  E('span', { className: 'gw-kv-k' }, 'commit'),
                  E('span', { className: 'gw-kv-v' }, detail.hash),
                  E('span', { className: 'gw-kv-k' }, 'author'),
                  E('span', { className: 'gw-kv-v' }, detail.author + ' <' + detail.email + '>'),
                  E('span', { className: 'gw-kv-k' }, 'date'),
                  E('span', { className: 'gw-kv-v' }, new Date(detail.time * 1000).toLocaleString()),
                  E('span', { className: 'gw-kv-k' }, 'parents'),
                  E('span', { className: 'gw-kv-v' }, (detail.parents || []).join(' ') || '—')),
                E('div', { className: 'gw-detail-files' },
                  (detail.files || []).map((file, index) => E('div', {
                    key: file.path + ':' + String(index),
                    className: 'gw-detail-file',
                    onClick: () => props.onOpenFile(file),
                  },
                    E('span', { className: 'gw-file-name', title: file.path }, file.path),
                    E('span', { className: 'gw-add' }, '+' + String(file.added)),
                    E('span', { className: 'gw-del' }, '-' + String(file.deleted))))))))
    }

    /* ------------------------------------------------------------------ */
    /* context menu                                                        */
    /* ------------------------------------------------------------------ */

    /** 右键菜单里那些需要补一句或确认一次的动作，共用这一个对话框。 */
    function AskDialog(props) {
      const t = props.t
      const [value, setValue] = useState(props.initial === undefined ? '' : props.initial)
      const [checked, setChecked] = useState(props.checked === true)
      const options = Array.isArray(props.options) ? props.options : []
      const [picked, setPicked] = useState(
        options.length === 0 ? '' : String(props.selectValue === undefined ? options[0].value : props.selectValue),
      )
      const hasInput = props.input === true

      const confirm = () => {
        if (hasInput && value.trim() === '') return
        props.onOk({ text: value.trim(), checked: checked, select: picked })
      }

      return E('div', {
        className: 'gw-scrim',
        onMouseDown: (event) => { if (event.target === event.currentTarget) props.onCancel() },
      },
        E('div', { className: 'gw-card' },
          E('div', { className: 'gw-card-head' }, E('span', { className: 'gw-card-title' }, props.title)),
          E('div', { className: 'gw-card-body gw-pad' },
            props.note === undefined ? null : E('div', { className: 'gw-note' }, props.note),
            hasInput ? E('label', { className: 'gw-field' },
              E('span', null, props.inputLabel === undefined ? '' : props.inputLabel),
              E('input', {
                className: 'gw-input',
                autoFocus: true,
                value: value,
                onChange: (event) => setValue(event.target.value),
                onKeyDown: (event) => { if (event.key === 'Enter') confirm() },
              })) : null,
            options.length === 0 ? null : E('label', { className: 'gw-field' },
              E('span', null, props.selectLabel === undefined ? '' : props.selectLabel),
              E('select', {
                className: 'gw-input',
                value: picked,
                onChange: (event) => setPicked(event.target.value),
              }, options.map((option) => E('option', { key: option.value, value: option.value }, option.name)))),
            props.check === true ? E('label', { className: 'gw-check' },
              E('input', {
                type: 'checkbox',
                checked: checked,
                onChange: (event) => setChecked(event.target.checked),
              }),
              E('span', null, props.checkLabel === undefined ? '' : props.checkLabel)) : null),
          E('div', { className: 'gw-card-foot' },
            E('button', {
              className: 'gw-btn gw-btn-ghost gw-btn-sm',
              onClick: props.onCancel,
            }, t('cancel')),
            E('button', {
              className: 'gw-btn gw-btn-sm' + (props.danger === true ? ' gw-btn-danger' : ' gw-btn-primary'),
              disabled: hasInput && value.trim() === '',
              onClick: confirm,
            }, props.confirmLabel === undefined ? t('ok') : props.confirmLabel))))
    }

    function ContextMenu(props) {
      const t = props.t
      const entry = props.entry
      const ref = useRef(null)
      const [pos, setPos] = useState({ left: props.x, top: props.y })

      useEffect(() => {
        const node = ref.current
        if (node === null) return undefined
        const rect = node.getBoundingClientRect()
        const left = Math.min(props.x, window.innerWidth - rect.width - 8)
        const top = Math.min(props.y, window.innerHeight - rect.height - 8)
        setPos({ left: Math.max(4, left), top: Math.max(4, top) })
        return undefined
      }, [props.x, props.y])

      useEffect(() => {
        function onDown(event) {
          if (ref.current !== null && ref.current.contains(event.target)) return
          props.onClose()
        }
        function onKey(event) { if (event.key === 'Escape') props.onClose() }
        window.addEventListener('mousedown', onDown, true)
        window.addEventListener('keydown', onKey)
        return () => {
          window.removeEventListener('mousedown', onDown, true)
          window.removeEventListener('keydown', onKey)
        }
      }, [props])

      function copy(text) {
        try {
          if (navigator.clipboard !== undefined && navigator.clipboard !== null) {
            navigator.clipboard.writeText(text).catch(() => { void 0 })
          }
        } catch (error) { void error }
        props.onClose()
      }

      const item = (label, run, tone) => E('div', {
        className: 'gw-menu-item' + (tone === undefined ? '' : ' gw-menu-' + tone),
        onClick: run,
      }, label)
      const act = (kind) => () => { props.onClose(); props.onAction(kind, entry) }

      return E('div', { ref: ref, className: 'gw-menu gw-menu-ctx', style: { left: pos.left + 'px', top: pos.top + 'px' } },
        item(t('addTag'), act('tag')),
        item(t('branchHere'), act('branch')),
        E('div', { className: 'gw-menu-sep' }),
        item(t('checkoutHere'), act('checkout')),
        item(t('cherryPickHere'), act('cherryPick')),
        item(t('revertHere'), act('revert')),
        item(t('dropHere'), act('drop'), 'danger'),
        E('div', { className: 'gw-menu-sep' }),
        item(t('mergeIntoCurrent'), act('merge')),
        item(t('rebaseOntoHere'), act('rebase')),
        item(t('resetToHere'), act('reset')),
        E('div', { className: 'gw-menu-sep' }),
        item(t('copyHash'), () => copy(entry.hash)),
        item(t('copySubject'), () => copy(entry.subject)))
    }

    /* ------------------------------------------------------------------ */
    /* main panel                                                          */
    /* ------------------------------------------------------------------ */

    function GitPanel(props) {
      useLocaleRevision(props.ctx)
      const ctx = props.ctx
      const t = translatorOf(ctx)
      const scope = props.scope !== undefined && props.scope !== null ? props.scope : {}
      const sessionId = typeof scope.sessionId === 'string' ? scope.sessionId : ''
      const scopeCwd = typeof scope.cwd === 'string' ? scope.cwd : ''
      const [fallbackCwd, setFallbackCwd] = useState('')
      useEffect(() => {
        if (scopeCwd !== '') { setFallbackCwd(''); return }
        const found = sessionCwdOf(ctx, sessionId)
        setFallbackCwd(found === undefined ? '' : found)
      }, [ctx, sessionId, scopeCwd])
      const cwd = scopeCwd !== '' ? scopeCwd : fallbackCwd

      const [summary, setSummary] = useState(null)
      const [entries, setEntries] = useState([])
      const [hasMore, setHasMore] = useState(false)
      const [loadingMore, setLoadingMore] = useState(false)
      /* 宿主的主题变量是透明色，提示框没法直接拿来当底；这里探一次当前明暗，
         挂个类名给提示框选不透明色。切主题时根元素会变，顺便重探。 */
      const [dark, setDark] = useState(() => window.matchMedia !== undefined && window.matchMedia('(prefers-color-scheme: dark)').matches)
      useEffect(() => {
        const read = () => {
          const probe = document.createElement('span')
          probe.style.cssText = 'position:absolute;left:-9999px;top:0;color:var(--dsw-alias-label-primary)'
          document.body.appendChild(probe)
          const rgb = window.getComputedStyle(probe).color
          probe.remove()
          const parts = rgb.match(/\d+(\.\d+)?/g)
          if (parts === null || parts.length < 3) return
          const lum = Number(parts[0]) * 0.299 + Number(parts[1]) * 0.587 + Number(parts[2]) * 0.114
          setDark(lum > 140)
        }
        read()
        const watcher = new MutationObserver(read)
        watcher.observe(document.documentElement, { attributes: true })
        return () => watcher.disconnect()
      }, [])

      const [error, setError] = useState(null)
      const errorSeq = useRef(0)
      const errorTimer = useRef(null)
      const [busy, setBusy] = useState(false)
      const [message, setMessage] = useState('')
      const [amend, setAmend] = useState(false)
      const [selected, setSelected] = useState(null)
      const [focus, setFocus] = useState(false)
      const [syncBusy, setSyncBusy] = useState('')
      const [moreOpen, setMoreOpen] = useState(false)
      const [prefs, setPrefs] = useState(() => loadPrefs(cwd))
      /* 插件详情页里的设置是权威值；本地那份只当会话级覆盖。用户没在本地改过，
         就用插件设置里的每页条数与刷新间隔。 */
      useEffect(() => {
        if (cwd === '') return undefined
        let alive = true
        void (async () => {
          try {
            const data = await api('settings', {})
            if (alive === false || data === null || data === undefined) return
            let stored = false
            let seen = -1
            try {
              if (globalThis.localStorage !== undefined) {
                stored = globalThis.localStorage.getItem('gw-prefs:' + cwd) !== null
                const raw = globalThis.localStorage.getItem('gw-cfg-rev:' + cwd)
                seen = raw === null ? -1 : Number(raw)
              }
            } catch (error) {
              void error
            }
            const revision = typeof data.revision === 'number' ? data.revision : -1
            /* 详情页的设置刚被改过就把本地的临时覆盖让掉，否则改了看不到反应。 */
            const changed = revision !== -1 && revision !== seen
            try {
              if (globalThis.localStorage !== undefined && revision !== -1) {
                globalThis.localStorage.setItem('gw-cfg-rev:' + cwd, String(revision))
              }
            } catch (error) {
              void error
            }
            if (stored === true && changed === false) return
            setPrefs({
              poll: typeof data.pollMs === 'number' ? data.pollMs : 3000,
              page: typeof data.pageSize === 'number' ? data.pageSize : 100,
              showUncommitted: data.showUncommitted !== false,
              confirmDiscard: data.confirmDiscard !== false,
            })
          } catch (failure) {
            void failure
          }
        })()
        return () => { alive = false }
      }, [cwd])
      const [morePos, setMorePos] = useState({ top: 0, right: 12 })
      const [remoteOpen, setRemoteOpen] = useState(false)
      const [remoteList, setRemoteList] = useState([])
      const [ask, setAsk] = useState(null)
      const [treeView, setTreeView] = useState(false)
      const [settingsOpen, setSettingsOpen] = useState(false)
      const [outputOpen, setOutputOpen] = useState(false)
      const [outputList, setOutputList] = useState([])
      const [outputExe, setOutputExe] = useState('')
      const [collapsedDirs, setCollapsedDirs] = useState(() => [])
      const [detail, setDetail] = useState(null)
      const [diffView, setDiffView] = useState(null)
      const [menu, setMenu] = useState(null)
      const [openGroups, setOpenGroups] = useState({ conflicts: true, staged: true, changes: true, untracked: true })

      const aliveRef = useRef(true)
      const lastSigRef = useRef(null)
      const bodyRef = useRef(null)
      // 刷新会替换整个历史列表，先把用户正在看的那一行记下来，落库后再对回去
      const pendingAnchorRef = useRef(null)
      const entriesRef = useRef([])
      const consumedRef = useRef(0)
      const offsetsRef = useRef({ list: [], total: 0 })
      useEffect(() => {
        aliveRef.current = true
        return () => { aliveRef.current = false }
      }, [])

      /* 错误只留一条：新错误直接顶掉旧的，并且统一由这里管计时退场，
         免得轮询每几秒重设一次、把计时器一直往后推，看起来就永远不消失。 */
      const showError = useCallback((text) => {
        errorSeq.current += 1
        setError({ id: errorSeq.current, text: text })
        if (errorTimer.current !== null) clearTimeout(errorTimer.current)
        errorTimer.current = setTimeout(() => {
          errorTimer.current = null
          if (aliveRef.current) clearError()
        }, 10000)
      }, [])

      const clearError = useCallback(() => {
        if (errorTimer.current !== null) {
          clearTimeout(errorTimer.current)
          errorTimer.current = null
        }
        setError(null)
      }, [])

      useEffect(() => () => {
        if (errorTimer.current !== null) clearTimeout(errorTimer.current)
      }, [])

      const refreshSummary = useCallback(async (quiet) => {
        if (cwd === '') return null
        try {
          const data = await api('summary', { cwd: cwd })
          if (aliveRef.current) {
            setSummary(data)
            if (quiet !== true) clearError()
          }
          return data
        } catch (failure) {
          /* 后台轮询失败保持安静：用户没动手，就别反复往他眼前推提示。 */
          if (aliveRef.current && quiet !== true) showError(failure.message)
          return null
        }
      }, [cwd, clearError, showError])

      const captureAnchor = () => {
        const node = bodyRef.current
        if (node === null || node.scrollTop <= 0) return null
        const top = node.scrollTop
        const list = offsetsRef.current.list
        const items = entriesRef.current
        for (let i = 0; i < items.length; i++) {
          if (list[i] + ROW_H > top) return { hash: items[i].hash, delta: top - list[i] }
        }
        return null
      }

      const refreshLog = useCallback(async () => {
        if (cwd === '') return
        try {
          // 已经往下翻过的部分要一起取回来，否则刷新会把列表截回第一页
          const limit = Math.max(prefs.page, entriesRef.current.length)
          const anchor = captureAnchor()
          const data = await api('log', { cwd: cwd, limit: limit, skip: 0 })
          if (!aliveRef.current) return
          pendingAnchorRef.current = anchor
          consumedRef.current = typeof data.consumed === 'number' ? data.consumed : 0
          setEntries(Array.isArray(data.entries) ? data.entries : [])
          setHasMore(data.hasMore === true)
        } catch (failure) {
          if (aliveRef.current) showError(failure.message)
        }
      }, [cwd])

      const refreshAll = useCallback(async () => {
        const [view] = await Promise.all([refreshSummary(), refreshLog()])
        lastSigRef.current = signatureOf(view)
      }, [refreshSummary, refreshLog])

      // 只在切换仓库时清空视图；可见性变化只负责重新拉取，避免同一次挂载发起两轮请求。
      useEffect(() => {
        setSummary(null)
        setEntries([])
        setSelected(null)
        setDetail(null)
        setDiffView(null)
      }, [cwd])

      useEffect(() => {
        if (props.visible === false) return
        void refreshAll()
      }, [cwd, props.visible, refreshAll])

      // 外部操作（终端、编辑器、其他 agent）不会通知面板，靠轮询 summary 的签名变化触发重拉。
      useEffect(() => {
        if (props.visible === false || cwd === '') return undefined
        let stopped = false
        const timer = setInterval(async () => {
          if (stopped) return
          const view = await refreshSummary(true)
          if (stopped || view === null) return
          const signature = signatureOf(view)
          if (signature === lastSigRef.current) return
          lastSigRef.current = signature
          await refreshLog()
        }, prefs.poll)
        return () => { stopped = true; clearInterval(timer) }
      }, [cwd, props.visible, refreshSummary, refreshLog])

      const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || cwd === '') return
        setLoadingMore(true)
        try {
          /* 用后端回传的 consumed 当游标：它只数历史里取走的条数，
             不含首屏额外插进来的 stash 行，翻页才不会错位或重复。 */
          const data = await api('log', { cwd: cwd, limit: prefs.page, skip: consumedRef.current })
          if (!aliveRef.current) return
          const next = Array.isArray(data.entries) ? data.entries : []
          consumedRef.current = typeof data.consumed === 'number' ? data.consumed : consumedRef.current + next.length
          setEntries((prev) => prev.concat(next))
          setHasMore(data.hasMore === true)
        } catch (failure) {
          if (aliveRef.current) showError(failure.message)
        } finally {
          if (aliveRef.current) setLoadingMore(false)
        }
      }, [loadingMore, hasMore, cwd, entries.length])

      const onScroll = useCallback((event) => {
        const node = event.currentTarget
        if (node.scrollTop + node.clientHeight >= node.scrollHeight - 120) void loadMore()
      }, [loadMore])

      const run = useCallback(async (fn) => {
        setBusy(true)
        clearError()
        try {
          await fn()
        } catch (failure) {
          showError(failure.message)
        } finally {
          if (aliveRef.current) setBusy(false)
        }
      }, [clearError, showError])

      const selectCommit = useCallback(async (entry) => {
        if (selected === entry.hash) {
          setSelected(null)
          setDetail(null)
          return
        }
        setSelected(entry.hash)
        setDetail(null)
        try {
          const data = await api('commitDetail', { cwd: cwd, hash: entry.hash })
          if (aliveRef.current && data !== null) setDetail(data)
        } catch (failure) {
          if (aliveRef.current) showError(failure.message)
        }
      }, [selected, cwd])

      const openWorkDiff = useCallback(async (item) => {
        setDiffView({ title: item.path, text: '', loading: true })
        try {
          const data = await api('fileDiff', {
            cwd: cwd,
            path: item.path,
            staged: item.staged === true,
            untracked: item.untracked === true,
            full: true,
          })
          if (aliveRef.current) setDiffView({ title: item.path, text: data.text, loading: false })
        } catch (failure) {
          if (aliveRef.current) setDiffView({ title: item.path, text: String(failure.message), loading: false })
        }
      }, [cwd])

      /* 侧边栏自带一个隐藏的 diff 标签，给它一个 SidebarDiffRef 就能在新标签页里
         画出红绿行号的那种视图。优先用它，拿不到服务才退回下半区的内联预览。 */
      const openDiffTab = useCallback((ref, title) => {
        const service = ctx === undefined || ctx === null ? undefined : ctx.get('betterSidebar')
        if (service === undefined || service === null || typeof service.openTab !== 'function') return false
        /* 统一走我们自己的批量差异标签：单文件也是它，
           这样符号只有 + 和 −，不会出现那个修饰行的 ~。 */
        const meta = ref.kind === 'worktree'
          ? { cwd: cwd, paths: [ref.path], staged: ref.staged === true }
          : { cwd: cwd, paths: [ref.path], hash: ref.hashFull }
        const key = ref.kind === 'worktree'
          ? 'files:worktree:' + ref.path + ':' + String(ref.staged)
          : 'files:commit:' + ref.hashFull + ':' + ref.path
        try {
          service.openTab({ type: 'git-graph-files', id: key, title: title, meta: meta }, scope)
          return true
        } catch (failure) {
          void failure
          return false
        }
      }, [ctx, scope, cwd])

      /* 工作区的文件：单文件 diff，未暂存与已暂存各看各的那一侧。 */
      const openInEditor = useCallback((item) => {
        const staged = item !== null && item !== undefined && item.staged === true && item.unstaged !== true
        const ref = {
          kind: 'worktree',
          path: item.path,
          staged: staged,
          untracked: item.untracked === true,
        }
        if (openDiffTab(ref, item.path) === true) return
        void openWorkDiff(item)
      }, [openDiffTab, openWorkDiff])

      /* 提交详情里的文件：侧边栏的 diff 标签只认「整个提交」，here 就打开该提交。 */
      const openCommitDiff = useCallback(async (file) => {
        const ref = {
          kind: 'commit',
          path: file.path,
          hash: String(selected).slice(0, 7),
          hashFull: String(selected),
          subject: '',
        }
        if (openDiffTab(ref, file.path) === true) return
        setDiffView({ title: file.path, text: '', loading: true })
        try {
          const data = await api('fileDiff', { cwd: cwd, hash: selected, path: file.path, full: true })
          if (aliveRef.current) setDiffView({ title: file.path + ' @ ' + String(selected).slice(0, 7), text: data.text, loading: false })
        } catch (failure) {
          if (aliveRef.current) setDiffView({ title: file.path, text: String(failure.message), loading: false })
        }
      }, [cwd, selected, detail, openDiffTab])

      const doStage = useCallback((item) => {
        void run(async () => {
          await api('stage', { cwd: cwd, paths: [item.path] })
          await refreshSummary()
        })
      }, [cwd, run, refreshSummary])

      const doUnstage = useCallback((item) => {
        void run(async () => {
          await api('unstage', { cwd: cwd, paths: [item.path] })
          await refreshSummary()
        })
      }, [cwd, run, refreshSummary])

      const doDiscard = useCallback((item) => {
        const ok = prefs.confirmDiscard === false || window.confirm(t('discardConfirm', { path: item.path }))
        if (!ok) return
        void run(async () => {
          await api('discard', { cwd: cwd, paths: [item.path], confirm: true })
          await refreshSummary()
        })
      }, [cwd, run, refreshSummary, t])

      const doDiscardAll = useCallback((items) => {
        if (items.length === 0) return
        const ok = prefs.confirmDiscard === false || window.confirm(t('discardAllConfirm', { count: String(items.length) }))
        if (!ok) return
        void run(async () => {
          await api('discard', { cwd: cwd, paths: items.map((item) => item.path), confirm: true })
          await refreshSummary()
        })
      }, [cwd, run, refreshSummary, t])

      const doIgnore = useCallback((paths) => {
        if (paths.length === 0) return
        void run(async () => {
          await api('ignore', { cwd: cwd, paths: paths })
          await refreshSummary()
        })
      }, [cwd, run, refreshSummary])

      const doStageAll = useCallback((paths) => {
        void run(async () => {
          await api('stage', { cwd: cwd, paths: paths })
          await refreshSummary()
        })
      }, [cwd, run, refreshSummary])

      const doUnstageAll = useCallback((paths) => {
        void run(async () => {
          await api('unstage', { cwd: cwd, paths: paths })
          await refreshSummary()
        })
      }, [cwd, run, refreshSummary])

      /** 每组标题上的批量动作，悬停才出现；冲突组没有批量操作。 */
      /* 一个分组的所有文件放进同一个差异标签页，省得一个一个点。 */
      const openGroupDiff = useCallback((group, items) => {
        const paths = items.map((item) => item.path)
        if (paths.length === 0) return
        const service = ctx === undefined || ctx === null ? undefined : ctx.get('betterSidebar')
        if (service === undefined || service === null || typeof service.openTab !== 'function') return
        try {
          service.openTab({
            type: 'git-graph-files',
            id: 'files:' + group,
            title: t('filesTabTitle') + ' · ' + String(paths.length),
            meta: { cwd: cwd, paths: paths, staged: group === 'staged' },
          }, scope)
        } catch (failure) {
          void failure
        }
      }, [ctx, scope, cwd, t])

      const groupActions = useCallback((group, items) => {
        const paths = items.map((item) => item.path)
        const openAll = E(ActionIcon, { name: 'openAll', title: t('openAllDiffs'), onClick: () => openGroupDiff(group, items) })
        if (group === 'staged') {
          return E('span', { style: { display: 'flex', gap: '1px' } },
            openAll,
            E(ActionIcon, { name: 'unstage', title: t('unstageAll'), onClick: () => doUnstageAll(paths) }))
        }
        if (group === 'unstaged') {
          return E('span', { style: { display: 'flex', gap: '1px' } },
            openAll,
            E(ActionIcon, { name: 'discard', title: t('discardAllChanges'), onClick: () => doDiscardAll(items) }),
            E(ActionIcon, { name: 'stage', title: t('stageAll'), onClick: () => doStageAll(paths) }))
        }
        return E('span', { style: { display: 'flex', gap: '1px' } },
          openAll,
          E(ActionIcon, { name: 'ignore', title: t('ignoreAll'), onClick: () => doIgnore(paths) }),
          E(ActionIcon, { name: 'discard', title: t('discardAllChanges'), onClick: () => doDiscardAll(items) }),
          E(ActionIcon, { name: 'stage', title: t('stageAll'), onClick: () => doStageAll(paths) }))
      }, [t, doUnstageAll, doStageAll, doDiscardAll, doIgnore, openGroupDiff])

      /* 错误提示自己退场：动画四秒，状态跟着清掉，免得下次误以为没消失。 */
      useEffect(() => {
        if (error === null) return undefined
        const timer = setTimeout(() => { if (aliveRef.current) clearError() }, 10000)
        return () => clearTimeout(timer)
      }, [error])

      const loadRemotes = useCallback(async () => {
        try {
          const data = await api('remotes', { cwd: cwd })
          if (aliveRef.current) setRemoteList(Array.isArray(data.remotes) ? data.remotes : [])
        } catch (failure) {
          if (aliveRef.current) setRemoteList([])
        }
      }, [cwd])

      useEffect(() => {
        if (remoteOpen === false) return undefined
        void loadRemotes()
        return undefined
      }, [remoteOpen, loadRemotes])

      const onRemoteSave = useCallback((draft) => run(async () => {
        if (draft.mode === 'add') {
          await api('remoteAdd', { cwd: cwd, name: draft.name, url: draft.url })
        } else {
          if (draft.name !== draft.original) {
            await api('remoteRename', { cwd: cwd, name: draft.original, nextName: draft.name })
          }
          await api('remoteSetUrl', { cwd: cwd, name: draft.name, url: draft.url })
        }
        await loadRemotes()
        await refreshSummary()
      }), [cwd, run, loadRemotes, refreshSummary])

      const onRemoteRemove = useCallback((name) => run(async () => {
        await api('remoteRemove', { cwd: cwd, name: name })
        await loadRemotes()
        await refreshSummary()
      }), [cwd, run, loadRemotes, refreshSummary])

      /** 网络操作单独记忙标记，避免把整块面板的其它按钮一起锁住。 */
      const toggleDir = useCallback((path) => {
        setCollapsedDirs((previous) => (
          previous.indexOf(path) >= 0 ? previous.filter((item) => item !== path) : previous.concat([path])
        ))
      }, [])

      const collapsedSet = useMemo(() => new Set(collapsedDirs), [collapsedDirs])

      const doSync = useCallback((method) => {
        if (syncBusy !== '') return
        void run(async () => {
          setSyncBusy(method)
          try {
            await api(method, { cwd: cwd })
            await refreshAll()
          } finally {
            if (aliveRef.current) setSyncBusy('')
          }
        })
      }, [cwd, run, refreshAll, syncBusy])


      const doCommit = useCallback(() => {
        if (message.trim() === '' && amend === false) { showError(t('emptyMsg')); return }
        void run(async () => {
          await api('commit', { cwd: cwd, message: message, amend: amend })
          setMessage('')
          setAmend(false)
          await refreshAll()
        })
      }, [cwd, message, amend, run, refreshAll, t])

      const onKeyDown = useCallback((event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          doCommit()
        }
      }, [doCommit])

      const changes = summary !== null && Array.isArray(summary.changes) ? summary.changes : []
      const conflicted = changes.filter((item) => item.conflicted === true)
      const staged = changes.filter((item) => item.conflicted !== true && item.staged === true)
      const unstaged = changes.filter((item) => item.conflicted !== true && item.unstaged === true)
      const untracked = changes.filter((item) => item.untracked === true)

      // 未提交的改动单独占一行，形状与提交一致，但不指向任何对象
      const changeTotal = conflicted.length + staged.length + unstaged.length + untracked.length
      const headHash = summary === null || summary.head === undefined ? null : summary.head
      const allEntries = useMemo(() => {
        if (changeTotal === 0 || prefs.showUncommitted === false) return entries
        return [{
          hash: UNCOMMITTED_HASH,
          short: '',
          parents: headHash === null ? [] : [headHash],
          author: '',
          time: 0,
          refs: [],
          subject: t('uncommitted') + ' (' + String(changeTotal) + ')',
          uncommitted: true,
        }].concat(entries)
      }, [entries, changeTotal, headHash, t, prefs.showUncommitted])

      /* 聚焦只留当前分支这一条第一父链，其余提交收起来；全览原样显示。 */
      const rowEntries = useMemo(() => {
        if (focus === false || headHash === null) return allEntries
        const indexed = new Map()
        for (const item of allEntries) indexed.set(item.hash, item)
        const keep = new Set()
        let cursor = headHash
        while (cursor !== null && indexed.has(cursor) && keep.has(cursor) === false) {
          keep.add(cursor)
          const item = indexed.get(cursor)
          cursor = item.parents === undefined || item.parents.length === 0 ? null : item.parents[0]
        }
        if (allEntries[0] !== undefined && allEntries[0].uncommitted === true) keep.add(allEntries[0].hash)
        const filtered = allEntries.filter((item) => keep.has(item.hash))
        return filtered.length === 0 ? allEntries : filtered
      }, [focus, allEntries, headHash])

      const layout = useMemo(() => computeLayout(rowEntries), [rowEntries])
      const laneWidth = Math.max(24, layout.laneCount * LANE_W + 16)


      const offsets = useMemo(() => {
        const list = []
        let y = 0
        for (let i = 0; i < rowEntries.length; i++) {
          list.push(y)
          y += ROW_H
          if (selected !== null && rowEntries[i].hash === selected) y += DRAWER_H
        }
        return { list: list, total: y }
      }, [rowEntries, selected])

      entriesRef.current = rowEntries
      offsetsRef.current = offsets

      const locateHead = useCallback(() => {
        const node = bodyRef.current
        if (node === null) return
        let index = -1
        for (let i = 0; i < rowEntries.length; i++) {
          const item = rowEntries[i]
          if (item.uncommitted === true || (headHash !== null && item.hash === headHash)) { index = i; break }
        }
        if (index < 0) return
        node.scrollTop = Math.max(0, offsets.list[index] - 8)
      }, [rowEntries, headHash, offsets])

      // 列表替换后把锚点那一行对回原来的滚动位置；用户停在顶部时不干预
      useLayoutEffect(() => {
        const anchor = pendingAnchorRef.current
        if (anchor === null) return
        pendingAnchorRef.current = null
        const node = bodyRef.current
        if (node === null) return
        const index = rowEntries.findIndex((item) => item.hash === anchor.hash)
        if (index < 0) return
        node.scrollTop = offsets.list[index] + anchor.delta
      }, [rowEntries, offsets])

      const svgHeight = offsets.total
      // 抽屉展开的那一行在列表里的下标，用于判断某条连线是否跨过抽屉区间
      const selectedIndex = useMemo(() => {
        if (selected === null) return -1
        for (let i = 0; i < rowEntries.length; i++) {
          if (rowEntries[i].hash === selected) return i
        }
        return -1
      }, [selected, rowEntries])
      const drawerTop = useMemo(() => {
        if (selected === null) return 0
        for (let i = 0; i < rowEntries.length; i++) {
          if (rowEntries[i].hash === selected) return offsets.list[i] + ROW_H
        }
        return 0
      }, [selected, rowEntries, offsets])

      const toggleGroup = useCallback((key) => {
        setOpenGroups((prev) => {
          const next = Object.assign({}, prev)
          next[key] = !prev[key]
          return next
        })
      }, [])

      const onCheckout = useCallback((entry) => {
        void run(async () => {
          await api('checkout', { cwd: cwd, target: entry.hash, detach: true })
          await refreshAll()
        })
      }, [cwd, run, refreshAll])

      const onBranch = useCallback((entry) => {
        setAsk({
          title: t('createBranchAt', { hash: entry.short }),
          input: true,
          inputLabel: t('nameLabel'),
          check: true,
          checkLabel: t('checkoutAfter'),
          checked: true,
          confirmLabel: t('createBranch'),
          run: (values) => {
            void run(async () => {
              await api('createBranch', {
                cwd: cwd, name: values.text, startPoint: entry.hash, checkout: values.checked,
              })
              await refreshAll()
            })
          },
        })
      }, [cwd, run, refreshAll, t])

      /** 双击标签检出：分支直接切，远程取同名的本地分支，标签走分离头。 */
      const onRefPick = useCallback((ref) => {
        let target = null
        let detach = false
        if (ref.type === 'branch') target = ref.name
        else if (ref.type === 'tag') { target = ref.name; detach = true }
        else if (ref.type === 'remote') target = ref.name.split('/').slice(1).join('/')
        if (target === null || target === '') return
        void run(async () => {
          await api('checkout', { cwd: cwd, target: target, detach: detach })
          await refreshAll()
        })
      }, [cwd, run, refreshAll])

      /** 提交行的右键动作：需要补参数的先弹一句，需要确认的先问一次。 */
      const onCommitAction = useCallback((kind, entry) => {
        const perform = (method, extra) => () => {
          void run(async () => {
            await api(method, Object.assign({ cwd: cwd, hash: entry.hash }, extra))
            await refreshAll()
          })
        }
        if (kind === 'tag') {
          setAsk({
            title: t('addTagAt', { hash: entry.short }),
            input: true,
            inputLabel: t('nameLabel'),
            confirmLabel: t('createTag'),
            run: (values) => perform('tagCreate', { name: values.text })(),
          })
          return
        }
        if (kind === 'branch') { onBranch(entry); return }
        if (kind === 'checkout') { onCheckout(entry); return }
        if (kind === 'cherryPick') { perform('cherryPick')(); return }
        if (kind === 'merge') { perform('mergeCommit')(); return }
        if (kind === 'revert') {
          setAsk({
            title: t('revertTitle', { hash: entry.short }),
            note: t('revertNote', { subject: entry.subject }),
            confirmLabel: t('confirmRevert'),
            run: perform('revertCommit'),
          })
          return
        }
        if (kind === 'drop') {
          setAsk({
            title: t('dropTitle', { hash: entry.short }),
            note: t('dropNote', { subject: entry.subject }),
            danger: true,
            confirmLabel: t('confirmDrop'),
            run: perform('dropCommit', { confirm: true }),
          })
          return
        }
        if (kind === 'rebase') {
          setAsk({
            title: t('rebaseTitle', { hash: entry.short }),
            note: t('rebaseNote'),
            confirmLabel: t('confirmRebase'),
            run: perform('rebaseOnto'),
          })
          return
        }
        if (kind === 'reset') {
          setAsk({
            title: t('resetTitle', { hash: entry.short }),
            note: t('resetNote'),
            selectLabel: t('resetKind'),
            options: [
              { name: t('resetSoft'), value: 'soft' },
              { name: t('resetMixed'), value: 'mixed' },
              { name: t('resetHard'), value: 'hard' },
            ],
            selectValue: 'mixed',
            confirmLabel: t('confirmReset'),
            run: (values) => perform('resetTo', { mode: values.select, confirm: values.select === 'hard' })(),
          })
        }
      }, [cwd, run, refreshAll, t, onBranch, onCheckout])

      /** 菜单行：给了 action 就能点，给了 children 就在右侧展开下一级。 */
      const menuRow = (label, action, children) => {
        const kids = Array.isArray(children) ? children : []
        const leaf = kids.length === 0
        return E('div', {
          className: 'gw-menu-item' + (leaf ? '' : ' gw-menu-parent') + (leaf && action === null ? ' gw-menu-off' : ''),
          onClick: action === null ? undefined : action,
        },
          E('span', { className: 'gw-menu-label' }, label),
          leaf ? null : E('div', { className: 'gw-menu-sub' },
            kids.map((kid, index) => E('div', { key: 's' + String(index), className: 'gw-menu-item' }, kid))))
      }

      if (cwd === '') {
        return E('div', { className: 'gw-root' + (dark ? ' gw-dark' : '') }, E('div', { className: 'gw-empty' }, t('noRepo')))
      }

      const isRepo = summary !== null && summary.isRepo === true

      const changeBar = E('div', { className: 'gw-bar' },
        E('span', { className: 'gw-bar-title' }, t('changes')),
        E('span', { className: 'gw-count' }, String(changes.length)),
        E('span', { className: 'gw-spacer' }),
        iconButton({
          title: treeView === true ? t('flatView') : t('treeView'),
          active: treeView === true,
          onClick: () => setTreeView(treeView === false),
          path: treeView === true
            ? 'M3 4h10M3 8h10M3 12h10'
            : 'M2.6 3h1.8M6.4 3h7M5.2 8h1.8M9 8h4.4M7.8 13h1.8M11.6 13h1.8',
        }),
        iconButton({
          title: t('remotes'),
          onClick: () => setRemoteOpen(true),
          path: 'M5.5 12.5a3 3 0 0 1 .3-6 3.8 3.8 0 0 1 7.2 .8 2.6 2.6 0 0 1-.5 5.2H5.5z',
        }),
        iconButton({
          title: t('settings'),
          /* 小齿轮开面板内的设置；宿主那个插件详情页从设置里的按钮进。 */
          onClick: () => setSettingsOpen(true),
          path: 'M6.58 3.31L6.87 1.70L9.13 1.70L9.42 3.31L11.35 4.43L12.89 3.87L14.02 5.83'
            + 'L12.77 6.88L12.77 9.12L14.02 10.17L12.89 12.13L11.35 11.57L9.42 12.69L9.13 14.30'
            + 'L6.87 14.30L6.58 12.69L4.65 11.57L3.11 12.13L1.98 10.17L3.23 9.12L3.23 6.88'
            + 'L1.98 5.83L3.11 3.87L4.65 4.43Z',
          extra: E('circle', { cx: 8, cy: 8, r: 2.4 }),
        }),
        iconButton({
          title: t('moreActions'),
          onClick: (event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setMorePos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) })
            setMoreOpen(true)
          },
          path: '',
          extra: [
            E('circle', { key: '1', cx: 8, cy: 3.4, r: 1.1, fill: 'currentColor' }),
            E('circle', { key: '2', cx: 8, cy: 8, r: 1.1, fill: 'currentColor' }),
            E('circle', { key: '3', cx: 8, cy: 12.6, r: 1.1, fill: 'currentColor' }),
          ],
        }))

      const head = E('div', { className: 'gw-graph-head' },
        E('span', { className: 'gw-branch' },
          E('svg', {
            width: 12, height: 12, viewBox: '0 0 16 16',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.3,
            strokeLinecap: 'round', strokeLinejoin: 'round',
          },
            E('path', { key: 'trunk', d: 'M4.6 5.2v5.6' }),
            E('path', { key: 'fork', d: 'M4.6 10.8h4.2a1.6 1.6 0 0 0 1.6-1.6V7.4' }),
            E('circle', { key: 'a', cx: 4.6, cy: 3.6, r: 1.5 }),
            E('circle', { key: 'b', cx: 4.6, cy: 12.4, r: 1.5 }),
            E('circle', { key: 'c', cx: 10.4, cy: 6, r: 1.5 })),
          summary === null || summary.branch === null || summary.branch === undefined
            ? (summary !== null && summary.empty === true ? t('noCommits') : t('unknown'))
            : (summary.detached === true ? 'HEAD@' + String(summary.branch).slice(0, 7) : summary.branch)),
        summary !== null && summary.ahead > 0 ? E('span', { className: 'gw-ahead' }, '↑' + String(summary.ahead)) : null,
        summary !== null && summary.behind > 0 ? E('span', { className: 'gw-behind' }, '↓' + String(summary.behind)) : null,
        E('span', { className: 'gw-spacer' }),
        iconButton({
          title: focus === true ? t('viewAll') : t('viewFocus'),
          active: focus === true,
          onClick: () => setFocus(focus === false),
          path: focus === true ? 'M8 3v10' : 'M4.5 3v10M8 3v10M11.5 3v10',
        }),
        iconButton({
          title: t('locate'),
          onClick: locateHead,
          path: '',
          extra: [
            E('circle', { key: 'o', cx: 8, cy: 8, r: 5.2 }),
            E('circle', { key: 'i', cx: 8, cy: 8, r: 1.6 }),
          ],
        }),
        iconButton({
          title: t('fetchAll'),
          busy: syncBusy === 'fetchAll',
          disabled: isRepo === false || syncBusy !== '',
          onClick: () => doSync('fetchAll'),
          path: 'M8 2.5v4',
          dash: '2 1.8',
          extra: [
            E('path', { key: 'a', d: 'M8 6.6v3.6M5.2 7.4L8 10.2l2.8-2.8' }),
            E('path', { key: 'b', d: 'M3.2 13.4h9.6' }),
          ],
        }),
        iconButton({
          title: t('pull'),
          busy: syncBusy === 'pull',
          disabled: isRepo === false || syncBusy !== '',
          onClick: () => doSync('pull'),
          path: 'M8 2.2v7.8M5.2 7.2L8 10l2.8-2.8',
          extra: E('path', { d: 'M3.2 13.4h9.6' }),
        }),
        iconButton({
          title: summary !== null && summary.upstream === null ? t('publish') : t('push'),
          busy: syncBusy === 'push',
          disabled: isRepo === false || syncBusy !== '',
          onClick: () => doSync('push'),
          path: 'M8 13.4V5.6M5.2 8.4L8 5.6l2.8 2.8',
          extra: E('path', { d: 'M3.2 2.6h9.6' }),
        }),
        iconButton({
          title: t('refresh'),
          onClick: () => { void refreshAll() },
          path: 'M13 8a5 5 0 1 1-1.5-3.6M13.2 2.6v3.2h-3.2',
        }))

      const top = E('div', { className: 'gw-top' },
        E('div', { className: 'gw-pad' },
          error === null ? null : E('div', { className: 'gw-err', key: error.id },
            E('span', { className: 'gw-err-text' }, error.text),
            E('button', {
              className: 'gw-err-close',
              'aria-label': t('close'),
              onClick: () => clearError(),
            }, '×')),
          changeBar,
          E('textarea', {
            className: 'gw-textarea',
            placeholder: t('commitPlaceholder'),
            value: message,
            spellCheck: false,
            onChange: (event) => setMessage(event.target.value),
            onKeyDown: onKeyDown,
          }),
          E('div', { className: 'gw-compose-actions' },
            E('button', {
              className: 'gw-btn gw-btn-primary',
              disabled: busy || (!isRepo),
              onClick: doCommit,
              title: '⌘/Ctrl + Enter',
            }, t('commit')),
            E('label', { className: 'gw-check' },
              E('input', { type: 'checkbox', checked: amend, onChange: (event) => setAmend(event.target.checked) }),
              t('commitAmend')))),
        E('div', { className: 'gw-changes' },
          summary === null
            ? E('div', { className: 'gw-empty' }, t('loading'))
            : changes.length === 0
              ? null
              : E('div', null,
                  E(ChangeGroup, {
                    group: 'unstaged', title: t('changes'), items: unstaged, open: openGroups.changes !== false, t: t,
                    action: groupActions('unstaged', unstaged),
                    tree: treeView, collapsed: collapsedSet, onToggleDir: toggleDir,
                    onToggle: () => toggleGroup('changes'),
                    onOpen: openWorkDiff, onOpenEditor: openInEditor, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard, onIgnore: doIgnore,
                  }),
                  E(ChangeGroup, {
                    group: 'untracked', title: t('untracked'), items: untracked, open: openGroups.untracked !== false, t: t,
                    action: groupActions('untracked', untracked),
                    tree: treeView, collapsed: collapsedSet, onToggleDir: toggleDir,
                    onToggle: () => toggleGroup('untracked'),
                    onOpen: openWorkDiff, onOpenEditor: openInEditor, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard, onIgnore: doIgnore,
                  }),
                  E(ChangeGroup, {
                    group: 'staged', title: t('staged'), items: staged, open: openGroups.staged !== false, t: t,
                    action: groupActions('staged', staged),
                    tree: treeView, collapsed: collapsedSet, onToggleDir: toggleDir,
                    onToggle: () => toggleGroup('staged'),
                    onOpen: openWorkDiff, onOpenEditor: openInEditor, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard, onIgnore: doIgnore,
                  }),
                  E(ChangeGroup, {
                    group: 'conflicts', title: t('conflicts'), items: conflicted, open: openGroups.conflicts !== false, t: t,
                    action: null,
                    tree: treeView, collapsed: collapsedSet, onToggleDir: toggleDir,
                    onToggle: () => toggleGroup('conflicts'),
                    onOpen: openWorkDiff, onOpenEditor: openInEditor, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard, onIgnore: doIgnore,
                  }))))

      // 有未提交行时空心圆归它，HEAD 就不再空心，保证整张图只有一个空心圆。
      const hasUncommitted = rowEntries.length > 0 && rowEntries[0].uncommitted === true

      const body = outputOpen === true
        ? E(OutputPane, {
            t: t,
            records: outputList,
            executable: outputExe,
            onBack: () => setOutputOpen(false),
            onRefresh: () => {
              void run(async () => {
                const data = await api('gitRecords', { limit: 200 })
                if (aliveRef.current === false) return
                setOutputList(Array.isArray(data.records) ? data.records : [])
                setOutputExe(typeof data.executable === 'string' ? data.executable : '')
              })
            },
          })
        : diffView !== null
        ? E(DiffPane, {
            t: t,
            title: diffView.title,
            text: diffView.text,
            loading: diffView.loading === true,
            onBack: () => setDiffView(null),
          })
        : E('div', { className: 'gw-graph-body', onScroll: onScroll, ref: bodyRef },
            rowEntries.length === 0
              ? E('div', { className: 'gw-empty' }, summary !== null && summary.empty === true ? t('noCommits') : t('noCommits'))
              : E('div', { className: 'gw-canvas', style: { height: svgHeight + 'px' } },
                  E('svg', {
                    width: '100%',
                    height: svgHeight,
                    style: { position: 'absolute', left: 0, top: 0, zIndex: 2, pointerEvents: 'none' },
                  },
                    layout.edges.map((edge, index) => {
                      const y1 = offsets.list[edge.from] + ROW_H / 2
                      // 悬空的边走到最后一行下沿就停，不延伸出画布。
                      const y2 = edge.dangling === true
                        ? offsets.list[rowEntries.length - 1] + ROW_H
                        : offsets.list[edge.to] + ROW_H / 2
                      const x1 = edge.fromLane * LANE_W + 12
                      const x2 = edge.toLane * LANE_W + 12
                      let d
                      if (Math.abs(x1 - x2) < 0.5) {
                        d = 'M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2
                      } else if (selectedIndex >= 0 && edge.from <= selectedIndex && edge.to > selectedIndex) {
                        // 跨抽屉的边：抽屉区间内保持竖直，换道收在抽屉下沿之后完成，
                        // 避免长距离缓坡斜穿整个详情块
                        const bottom = drawerTop + DRAWER_H
                        const mid = (bottom + y2) / 2
                        d = 'M' + x1 + ',' + y1 + ' L' + x1 + ',' + bottom
                          + ' C' + x1 + ',' + mid + ' ' + x2 + ',' + mid + ' ' + x2 + ',' + y2
                      } else {
                        // 换道收在起点下方一行之内，之后竖直跑到父提交。
                        // 全程渐变会让长边斜穿中间好几行，看着像一根歪线。
                        const span = y2 - y1
                        const gap = Math.min(ROW_H * 0.7, span * 0.45)
                        d = 'M' + x1 + ',' + y1
                          + ' L' + x1 + ',' + (y1 + gap * 0.35)
                          + ' C' + x1 + ',' + (y1 + gap * 0.85) + ' ' + x2 + ',' + (y1 + gap * 0.85) + ' ' + x2 + ',' + (y1 + gap * 1.35)
                          + ' L' + x2 + ',' + y2
                      }
                      // 未提交那一行不属于任何分支，它连下来的线跟着用中性灰
                      const ghost = rowEntries[edge.from] !== undefined && rowEntries[edge.from].uncommitted === true
                      return E('path', {
                        key: 'e' + String(index),
                        d: d,
                        fill: 'none',
                        stroke: ghost ? 'var(--dsw-alias-label-tertiary)' : laneColor(edge.primary ? edge.fromColor : edge.toColor),
                        strokeWidth: edge.primary ? 1.6 : 1.2,
                        strokeOpacity: edge.to === edge.from + 1 ? 1 : 0.85,
                      })
                    }),
                    rowEntries.map((entry, index) => {
                      // 只有一个空心圆：有未提交行时空心归它，否则归当前 HEAD。
                      const hollow = entry.uncommitted === true
                        || (hasUncommitted === false && headHash !== null && entry.hash === headHash)
                      return E('circle', {
                        key: 'c' + String(index),
                        cx: layout.rowLane[index] * LANE_W + 12,
                        cy: offsets.list[index] + ROW_H / 2,
                        r: hollow ? 3.6 : 3.4,
                        fill: hollow ? 'var(--dsw-alias-bg-layer-1)' : laneColor(layout.rowColor[index]),
                        stroke: hollow === false
                          ? 'var(--dsw-alias-bg-layer-1)'
                          : (entry.uncommitted === true ? 'var(--dsw-alias-label-tertiary)' : laneColor(layout.rowColor[index])),
                        strokeWidth: hollow ? 1.6 : 1.2,
                      })
                    })),
                  rowEntries.map((entry, index) => E(GraphRow, {
                    key: entry.hash,
                    entry: entry,
                    y: offsets.list[index],
                    laneWidth: laneWidth,
                    color: laneColor(layout.rowColor[index]),
                    t: t,
                    onRefPick: onRefPick,
                    pickHint: t('pickHint'),
                    selected: selected === entry.hash,
                    onClick: entry.uncommitted === true ? null : () => { void selectCommit(entry) },
                    onContextMenu: entry.uncommitted === true ? null : (event) => {
                      event.preventDefault()
                      setMenu({ x: event.clientX, y: event.clientY, entry: entry })
                    },
                  })),
                  selected === null
                    ? null
                    : E(CommitDrawer, {
                        t: t,
                        detail: detail,
                        top: drawerTop,
                        indent: laneWidth,
                        height: DRAWER_H,
                        onOpenFile: openCommitDiff,
                      })))

      return E('div', { className: 'gw-root' + (dark ? ' gw-dark' : '') },
        isRepo === false
          ? E('div', { className: 'gw-empty' }, t('noRepo'))
          : E('div', { style: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 } },
              top,
              E('div', { className: 'gw-bottom' }, head, body)),
        menu === null ? null : E(ContextMenu, {
          t: t,
          x: menu.x,
          y: menu.y,
          entry: menu.entry,
          onClose: () => setMenu(null),
          onAction: onCommitAction,
        }),
        moreOpen === false ? null : E('div', {
          className: 'gw-scrim',
          style: { background: 'transparent' },
          onMouseDown: (event) => { if (event.target === event.currentTarget) setMoreOpen(false) },
        },
          E('div', {
            className: 'gw-menu',
            style: { top: morePos.top + 'px', right: morePos.right + 'px' },
          },
            menuRow(t('checkoutTo') + '…', () => {
              setMoreOpen(false)
              setAsk({
                title: t('checkoutTo'),
                note: t('checkoutHint'),
                input: true,
                inputLabel: t('refLabel'),
                confirmLabel: t('checkoutTo'),
                onOk: (values) => { if (values.text !== '') void run(async () => { await api('checkout', { cwd: cwd, target: values.text }); await refreshAll() }) },
              })
            }),
            menuRow(t('createBranchItem') + '…', () => {
              setMoreOpen(false)
              setAsk({
                title: t('createBranchItem'),
                input: true,
                inputLabel: t('nameLabel'),
                check: true,
                checkLabel: t('checkoutAfter'),
                checked: true,
                confirmLabel: t('createBranch'),
                onOk: (values) => { if (values.text !== '') void run(async () => { await api('createBranch', { cwd: cwd, name: values.text, checkout: values.checked }); await refreshAll() }) },
              })
            }),
            menuRow(t('tagCreateItem') + '…', () => {
              setMoreOpen(false)
              setAsk({
                title: t('tagCreateItem'),
                note: t('tagHint'),
                input: true,
                inputLabel: t('nameLabel'),
                confirmLabel: t('createTag'),
                onOk: (values) => { if (values.text !== '') void run(async () => { await api('tagCreate', { cwd: cwd, name: values.text, hash: headHash === null ? 'HEAD' : headHash }); await refreshAll() }) },
              })
            }),
            menuRow(t('remotes') + '…', () => { setMoreOpen(false); setRemoteOpen(true) }),
            E('div', { key: 'sep-output', className: 'gw-menu-sep' }),
            menuRow(t('showOutput'), () => {
              setMoreOpen(false)
              setDiffView(null)
              setOutputOpen(true)
              void run(async () => {
                const data = await api('gitRecords', { limit: 200 })
                if (aliveRef.current === false) return
                setOutputList(Array.isArray(data.records) ? data.records : [])
                setOutputExe(typeof data.executable === 'string' ? data.executable : '')
              })
            }))),
        settingsOpen === false ? null : E(SettingsDialog, {
          t: t,
          prefs: prefs,
          onClose: () => setSettingsOpen(false),
          onSave: (next) => {
            setPrefs(next)
            savePrefs(cwd, next)
            setSettingsOpen(false)
          },
        }),
        ask === null ? null : E(AskDialog, {
          t: t,
          title: ask.title,
          message: ask.message,
          input: ask.input === true,
          inputLabel: ask.inputLabel,
          check: ask.check === true,
          options: ask.options,
          selectLabel: ask.selectLabel,
          selectValue: ask.selectValue,
          checkLabel: ask.checkLabel,
          checked: ask.checked === true,
          note: ask.note,
          initial: ask.initial,
          danger: ask.danger === true,
          confirmLabel: ask.confirmLabel,
          onCancel: () => setAsk(null),
          onOk: (values) => { const run = ask.run; setAsk(null); run(values) },
        }),
        remoteOpen === false ? null : E(RemoteDialog, {
          t: t,
          list: remoteList,
          onClose: () => setRemoteOpen(false),
          onSave: onRemoteSave,
          onRemove: onRemoteRemove,
        }))
    }

    /* ------------------------------------------------------------------ */
    /* registration                                                        */
    /* ------------------------------------------------------------------ */

    /** 行内动作图标：细线风格，跟图头那排一致，只在悬停时出现。 */
    const ACTION_PATHS = {
      open: ['M4 1.8h5.2L12 4.6v9.6H4z', 'M9.2 1.8v2.8H12', 'M6.2 7.4L6.2 7.4'],
      // 暂存是加号，取消暂存是减号，一眼能分开。
      stage: ['M8 3.4v9.2M3.4 8h9.2'],
      unstage: ['M3.4 8h9.2'],
      // 撤销：一个从右下折回左上的回转箭头，与 VSCode 的那个同形。
      discard: ['M4 4.4H9.4a4.3 4.3 0 0 1 0 8.6H5.6', 'M7.6 10.8 5.4 13 7.6 15.2'],
      ignore: ['M8 2.4a5.6 5.6 0 1 0 0 11.2A5.6 5.6 0 0 0 8 2.4z', 'M4.2 11.8 11.8 4.2'],
      // 打开全部差异：两张叠起来的纸。
      openAll: ['M5.8 1.8h4.6L13 4.4v7.6a1.1 1.1 0 0 1-1.1 1.1H5.8a1.1 1.1 0 0 1-1.1-1.1V2.9a1.1 1.1 0 0 1 1.1-1.1z', 'M9.6 1.9v2.6h2.6', 'M3 4.6v8.6a1.1 1.1 0 0 0 1.1 1.1h6.5'],
    }

    function ActionIcon(props) {
      const paths = ACTION_PATHS[props.name] === undefined ? ACTION_PATHS.open : ACTION_PATHS[props.name]
      return E('button', {
        className: 'gw-act',
        'data-tip': props.title,
        onClick: (event) => { event.stopPropagation(); props.onClick(event) },
      },
        E('svg', {
          width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
          strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round',
        },
          paths.map((d, index) => E('path', { key: 'p' + String(index), d: d }))))
    }

    /**
     * 批量差异标签页：一个分组下所有文件并排展开，点标题折叠。
     * 侧边栏自带的 diff 标签只认单个文件或整次提交，这一组得自己画。
     */
    function FilesTab(props) {
      const ctx = props.ctx
      const t = translatorOf(ctx)
      useLocaleRevision(ctx)
      const scope = props.scope
      const tab = props.tab
      const meta = tab === undefined || tab === null || tab.meta === undefined || tab.meta === null ? {} : tab.meta
      const cwd = typeof meta.cwd === 'string' ? meta.cwd : (ctx === undefined || ctx === null ? '' : sessionCwdOf(ctx, scope === undefined ? undefined : scope.sessionId))
      const paths = Array.isArray(meta.paths) ? meta.paths : []
      const staged = meta.staged === true
      const hash = typeof meta.hash === 'string' ? meta.hash : ''
      const [state, setState] = useState({ loading: true, items: [], error: null })
      const [open, setOpen] = useState({})
      const [token, setToken] = useState(0)
      const alive = useRef(true)

      useEffect(() => {
        alive.current = true
        void (async () => {
          try {
            const loaded = []
            for (const item of paths) {
              try {
                const ask = hash === ''
                  ? { cwd: cwd, path: item, staged: staged, full: true }
                  : { cwd: cwd, hash: hash, path: item, full: true }
                const data = await api('fileDiff', ask)
                loaded.push({ path: item, text: typeof data.text === 'string' ? data.text : '' })
              } catch (failure) {
                loaded.push({ path: item, text: String(failure.message), failed: true })
              }
            }
            if (alive.current) setState({ loading: false, items: loaded, error: null })
          } catch (failure) {
            if (alive.current) setState({ loading: false, items: [], error: String(failure.message) })
          }
        })()
        return () => { alive.current = false }
      }, [cwd, staged, hash, token])

      const head = E('div', { className: 'gw-files-tab-bar' },
        E('span', { className: 'gw-files-tab-title' },
          E('svg', {
            width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none',
            stroke: 'currentColor', strokeWidth: 1.3,
            strokeLinecap: 'round', strokeLinejoin: 'round',
          },
            E('rect', { x: 2.2, y: 2.2, width: 11.6, height: 11.6, rx: 2.8 }),
            E('path', { d: 'M8 5.1v3.1M6.45 6.65h3.1' }),
            E('path', { d: 'M6.45 10.6h3.1' })),
          String(paths.length) + ' ' + t('filesUnit')),
        E('span', { className: 'gw-spacer' }),
        E('button', {
          className: 'gw-icon',
          'data-tip': t('refresh'),
          onClick: () => setToken(token + 1),
        }, E('svg', {
          width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.2,
          strokeLinecap: 'round', strokeLinejoin: 'round',
        }, E('path', { d: 'M13.4 8a5.4 5.4 0 1 1-1.7-3.9M13.4 2.2V6H9.6' }))))

      if (state.loading === true) return E('div', { className: 'gw-files-tab' }, head, E('div', { className: 'gw-pad' }, t('loading')))
      if (state.error !== null) return E('div', { className: 'gw-files-tab' }, head, E('div', { className: 'gw-pad' }, state.error))

      return E('div', { className: 'gw-files-tab' },
        head,
        state.items.map((item, index) => {
          const openNow = open[item.path] !== false
          const rows = splitDiff(item.text === undefined ? '' : item.text)
          const added = rows.filter((line) => line.type === 'add').length
          const removed = rows.filter((line) => line.type === 'del').length
          return E('div', { key: 'f' + String(index), className: 'gw-files-tab-item' },
            E('div', {
              className: 'gw-files-tab-head',
              onClick: () => setOpen(Object.assign({}, open, { [item.path]: openNow === false })),
            },
              E(Caret, { open: openNow }),
              E('span', { className: 'gw-files-tab-path' }, item.path),
              E('span', { className: 'gw-spacer' }),
              E('span', { className: 'gw-files-tab-count' },
                item.failed === true
                  ? t('diffLoadError')
                  : E('span', null,
                      E('span', { className: 'gw-files-tab-add' }, '+' + String(added)),
                      ' ',
                      E('span', { className: 'gw-files-tab-del' }, '−' + String(removed))))),
            openNow === false ? null : E(DiffBody, { t: t, text: item.text }))
        }))
    }

    /** 图头那一排小图标按钮：统一 22px 热区、14px 图形，忙时换成省略号。 */
    function iconButton(props) {
      const extras = props.extra === undefined
        ? []
        : (Array.isArray(props.extra) ? props.extra : [props.extra])
      const children = props.busy === true
        ? E('span', { style: { fontSize: '11px' } }, '···')
        : E('svg', {
            width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none',
            stroke: 'currentColor', strokeWidth: 1.2,
            strokeLinecap: 'round', strokeLinejoin: 'round',
          },
            props.path === '' ? null : E('path', { d: props.path, strokeDasharray: props.dash }),
            extras)
      return E('button', {
        className: 'gw-icon' + (props.active === true ? ' gw-icon-on' : ''),
        'data-tip': props.title,
        'aria-label': props.title,
        disabled: props.disabled === true,
        onClick: props.onClick,
      }, children)
    }

    /** 折叠箭头：与 diff 视图里那个一致，展开时转 90 度。 */
    function Caret(props) {
      return E('span', {
        className: 'gw-caret' + (props.open === true ? ' gw-caret-open' : ''),
        style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
      }, E('svg', {
        width: 12, height: 12, viewBox: '0 0 16 16',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
        strokeLinecap: 'round', strokeLinejoin: 'round',
      }, E('path', { d: 'M6 3.5 10.5 8 6 12.5' })))
    }

    function TabIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 16
      return E('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
      },
        E('circle', { cx: 7, cy: 5, r: 2.1 }),
        E('circle', { cx: 7, cy: 19, r: 2.1 }),
        E('circle', { cx: 17, cy: 9, r: 2.1 }),
        E('path', { d: 'M7 7.1v9.8' }),
        E('path', { d: 'M17 11.1v.9a3.2 3.2 0 0 1-3.2 3.2H9.2' }))
    }

    /* 原生 main 面板不绑会话，目录跟着最近活跃的那个会话走。 */
    function NativePanel(props) {
      const ctx = props.ctx === undefined || props.ctx === null ? undefined : props.ctx
      const [cwd, setCwd] = useState('')

      useEffect(() => {
        if (ctx === undefined) return undefined
        const read = () => {
          const sessions = ctx.get('sessions')
          const list = sessions === undefined || sessions === null ? undefined : sessions.list
          if (list === undefined || typeof list.getSnapshot !== 'function') return
          let snapshot = null
          try {
            snapshot = list.getSnapshot()
          } catch (error) {
            void error
          }
          const ids = snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.ids) ? snapshot.ids : []
          for (let i = 0; i < ids.length; i += 1) {
            const found = sessionCwdOf(ctx, ids[i])
            if (found !== undefined) {
              setCwd(found)
              return
            }
          }
          setCwd('')
        }
        read()
        const sessions = ctx.get('sessions')
        const handle = sessions !== undefined && sessions !== null && sessions.list !== undefined
          && typeof sessions.list.subscribe === 'function'
          ? sessions.list.subscribe(read) : undefined
        return () => {
          if (typeof handle === 'function') handle()
        }
      }, [ctx])

      if (cwd !== '') return E(GitPanel, { ctx: ctx, scope: { sessionId: '', cwd: cwd }, visible: true })
      const t = ctx === undefined ? (key) => key : translatorOf(ctx)
      return E('div', { className: 'gw-root' },
        E('div', { className: 'gw-empty' }, t('noRepo')))
    }

    function apply(ctx) {
      injectStyles()
      ctx.inject(['betterSidebar'], (tabCtx) => {
        const betterSidebar = tabCtx.get('betterSidebar')
        if (betterSidebar === undefined || betterSidebar === null || typeof betterSidebar.registerTab !== 'function') return
        tabCtx.effect(() => {
          const t = translatorOf(tabCtx)
          const off = betterSidebar.registerTab({
            id: 'git-graph',
            title: () => t('title'),
            description: () => t('description'),
            icon: (size) => E(TabIcon, { size: size }),
            order: 60,
            single: true,
            component: (tabProps) => E(GitPanel, tabProps),
          })
          /* 批量差异标签：一个分组下所有文件放一起看，从分组标题打开，
             所以不出现在新建标签的菜单里，也可以同时开好几个。 */
          const offFiles = betterSidebar.registerTab({
            id: 'git-graph-files',
            title: () => t('filesTabTitle'),
            icon: (size) => E('svg', {
              width: size === undefined ? 14 : size,
              height: size === undefined ? 14 : size,
              viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
              strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
            },
              E('rect', { x: 2.2, y: 2.2, width: 11.6, height: 11.6, rx: 2.8 }),
              E('path', { d: 'M8 5.1v3.1M6.45 6.65h3.1' }),
              E('path', { d: 'M6.45 10.6h3.1' })),
            hidden: true,
            single: false,
            dedupeKey: (tab) => (tab === undefined || tab === null ? undefined : tab.id),
            component: (tabProps) => E(FilesTab, {
              t: t,
              ctx: tabProps.ctx,
              scope: tabProps.scope,
              tab: tabProps.tab,
            }),
          })
          return () => {
            if (typeof off === 'function') off()
            if (typeof offFiles === 'function') offFiles()
            if (typeof offOutput === 'function') offOutput()
          }
        }, 'dsh-git-graph: sidebar tab')
      })

      /* 原生侧边栏：图标挂在 sidebar.panellist，面板挂在 main，两者同一个 id。
         原生面板不绑会话，所以目录跟着最近活跃的那个会话走。 */
      ctx.inject(['slots'], (slotCtx) => {
        slotCtx.effect(() => {
          const t = translatorOf(slotCtx)
          const offIcon = slotCtx.slots.inject('sidebar.panellist', () => slotCtx.slots.register({
            name: 'sidebar.panellist',
            id: 'git-graph',
            order: 60,
            label: () => t('title'),
          }, (iconProps) => E(TabIcon, { size: iconProps.size })))
          const offPanel = slotCtx.slots.inject('main', () => slotCtx.slots.register({
            name: 'main',
            key: 'git-graph',
            inject: () => ({ ctx: slotCtx }),
          }, NativePanel))
          return () => {
            if (typeof offIcon === 'function') offIcon()
            if (typeof offPanel === 'function') offPanel()
          }
        }, 'dsh-git-graph: 原生侧边栏')
      })
    }

    return { name: PKG, inject: [], apply }
  },
})
