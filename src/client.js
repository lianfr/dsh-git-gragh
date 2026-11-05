window.__ModuleLoader__.load({
  id: 'dsh-git-workbench',
  factory: (require) => {
    const React = require('react')
    const E = React.createElement
    const { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } = React

    const PKG = 'dsh-git-workbench'
    const API_BASE = PKG + '/api'
    const PAGE_SIZE = 100
    const UNCOMMITTED_HASH = '@uncommitted'
  const POLL_MS = 3000
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
.gw-group-actions { flex:none; display:flex; align-items:center; gap:2px; }
.gw-group-head { display:flex; align-items:center; gap:6px; padding:4px 10px; cursor:pointer;
  color:var(--dsw-alias-label-secondary); font-size:11px; letter-spacing:.02em; user-select:none; }
.gw-group-head:hover { background:var(--dsw-alias-interactive-bg-hover);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.gw-group-head .gw-tree-kids { border-left:1px solid var(--dsw-alias-border-l1);
  margin-left:13px; padding-left:4px; }
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
.gw-caret { width:10px; display:inline-block; text-align:center; opacity:.7; }
.gw-count { color:var(--dsw-alias-label-tertiary); }
.gw-group-actions { margin-left:auto; display:flex; gap:4px; }

.gw-file { display:flex; align-items:center; gap:6px; height:22px; padding:0 10px 0 24px; cursor:pointer;
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
.gw-act::after { content:attr(data-tip); position:absolute; top:calc(100% + 6px); right:-2px;
  padding:5px 8px; border-radius:6px; border-radius:var(--dsw-radius-sm, 8px);
  background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary);
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
.gw-icon:disabled { opacity:.4; cursor:default; background:transparent; }
.gw-icon { position:relative; }
.gw-icon::after { content:attr(data-tip); position:absolute; top:calc(100% + 6px); right:-2px;
  padding:3px 7px; border-radius:4px; border-radius:var(--dsw-radius-xs, 4px);
  background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary);
  border:1px solid var(--dsw-alias-border-l2); box-shadow:0 4px 14px rgba(0,0,0,.22);
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
.gw-diff-gutter { flex:none; width:40px; text-align:right; padding-right:8px; user-select:none;
  color:var(--dsw-alias-label-tertiary); }
.gw-diff-text { flex:1 1 auto; padding-right:12px; }
.gw-diff-add { background:var(--dsw-alias-file-diff-added-bg); }
.gw-diff-del { background:var(--dsw-alias-file-diff-deleted-bg); }
.gw-diff-hunk { color:var(--dsw-alias-label-tertiary); background:var(--dsw-alias-bg-layer-2); }
.gw-diff-add .gw-diff-text { color:var(--dsw-alias-state-success-primary); }
.gw-diff-del .gw-diff-text { color:var(--dsw-alias-state-error-primary); }

.gw-empty { padding:24px 12px; text-align:center; color:var(--dsw-alias-label-tertiary); }
/* 错误条浮在面板上方，不占布局空间——否则它一出现就把下面的提交框顶下去。 */
.gw-err { position:absolute; top:6px; left:10px; right:10px; z-index:60; padding:8px 12px;
  border-radius:12px; border-radius:var(--dsw-radius-md, 12px); font-size:11.5px;
  background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, var(--dsw-alias-bg-layer-2));
  color:var(--dsw-alias-state-error-primary);
  border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);
  box-shadow:0 6px 18px rgba(0,0,0,.16); pointer-events:auto;
  display:flex; align-items:center; gap:8px;
  animation:gw-err-in .2s cubic-bezier(.2,.8,.3,1) both, gw-err-out .42s ease 3.6s forwards; }
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
.gw-menu { position:fixed; z-index:9999; min-width:190px; padding:4px; border-radius:8px;
  background:var(--dsw-alias-bg-layer-3); border:1px solid var(--dsw-alias-border-l2);
  box-shadow:0 8px 24px rgba(0,0,0,.28); }
.gw-menu-item { display:flex; align-items:center; height:26px; padding:0 10px; border-radius:5px;
  cursor:pointer; white-space:nowrap; color:var(--dsw-alias-label-primary); }
.gw-menu-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-check { display:flex; align-items:center; gap:6px; margin-top:2px;
  font-size:11.5px; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.gw-check input { width:13px; height:13px; margin:0; accent-color:var(--dsw-alias-brand-primary); cursor:pointer; }
.gw-note { font-size:11.5px; line-height:1.6; color:var(--dsw-alias-label-secondary);
  margin-bottom:8px; white-space:pre-wrap; }
.gw-btn-danger { background:var(--dsw-alias-state-error-primary); color:#fff; border-color:transparent; }
.gw-btn-danger:hover { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, #000); }
.gw-menu-danger { color:var(--dsw-alias-state-error-primary); }
.gw-menu-danger:hover { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); }
.gw-menu-item { position:relative; }
.gw-menu-label { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gw-menu-parent > .gw-menu-arrow { flex:none; color:var(--dsw-alias-label-tertiary); font-size:12px; }
.gw-menu-off { opacity:.45; cursor:default; }
.gw-menu-sub { display:none; position:absolute; left:100%; top:-6px; min-width:150px;
  padding:4px 0; border-radius:8px; border:1px solid var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-3); box-shadow:0 12px 28px rgba(0,0,0,.3); z-index:20; }
.gw-menu-parent:hover > .gw-menu-sub { display:block; }
.gw-menu-sep { height:1px; margin:4px 6px; background:var(--dsw-alias-border-l1); }
.gw-scrim { position:fixed; inset:0; z-index:9998; background:rgba(0,0,0,.32);
  display:flex; align-items:center; justify-content:center; padding:24px; }
.gw-card { width:100%; max-width:380px; max-height:100%; display:flex; flex-direction:column;
  border-radius:12px; border-radius:var(--dsw-radius-md, 12px);
  background:var(--dsw-alias-bg-layer-3); border:1px solid var(--dsw-alias-border-l2);
  box-shadow:0 16px 40px rgba(0,0,0,.34); overflow:hidden; }
.gw-card-head { display:flex; align-items:center; gap:8px; padding:10px 12px;
  border-bottom:1px solid var(--dsw-alias-border-l1); font-size:12px; font-weight:600;
  color:var(--dsw-alias-label-primary); }
.gw-card-body { flex:1 1 auto; min-height:0; overflow:auto; padding:6px 0; }
.gw-card-foot { flex:none; padding:8px 12px; border-top:1px solid var(--dsw-alias-border-l1);
  display:flex; justify-content:flex-end; gap:6px; }
.gw-remote { display:flex; align-items:center; gap:8px; padding:6px 12px; }
.gw-remote:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-remote-name { flex:none; font-size:11.5px; font-weight:600; color:var(--dsw-alias-label-primary);
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
.gw-remote-url { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  font-size:10.5px; color:var(--dsw-alias-label-tertiary);
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
.gw-remote-actions { flex:none; display:flex; gap:2px; }
.gw-form { display:flex; flex-direction:column; gap:8px; padding:10px 12px; }
.gw-field { display:flex; flex-direction:column; gap:3px; }
.gw-field > span { font-size:10.5px; color:var(--dsw-alias-label-tertiary); }
.gw-input { height:26px; padding:0 8px; font-size:11.5px; box-sizing:border-box;
  border-radius:6px; border-radius:var(--dsw-radius-sm, 8px);
  border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1);
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
      for (let i = 0; i < entries.length; i++) {
        if (owner[i] >= 0) continue
        let hasTip = false
        for (const ref of refsOf(i)) {
          if (ref === null || ref === undefined) continue
          const type = ref.type
          if (type === 'branch' || type === 'remote' || type === 'head' || type === 'stash' || type === 'tag') {
            hasTip = true
            break
          }
        }
        if (hasTip) claim(i, -1)
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
      const laneColor = [0]
      let laneCount = 1
      for (let index = 0; index < branches.length; index++) {
        if (index === trunkBranch) continue
        const branch = branches[index]
        const parent = branch.parent
        const base = parent >= 0 ? branches[parent].lane : 0
        const parentColor = parent >= 0 ? branches[parent].color : -1
        let lane = base + 1
        while (laneLast[lane] !== undefined && laneLast[lane] >= branch.tip) lane += 1
        laneLast[lane] = branch.last
        branch.lane = lane
        if (lane + 1 > laneCount) laneCount = lane + 1

        // 四、配色跟着分支走：避开父分支那一色，也避开同一列上一条分支那一色。
        let color = index % LANE_COLORS.length
        let guard = 0
        while (guard < LANE_COLORS.length && (color === parentColor || color === laneColor[lane])) {
          color = (color + 1) % LANE_COLORS.length
          guard += 1
        }
        laneColor[lane] = color
        branch.color = color
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

    function splitDiff(text) {
      const rows = []
      const lines = String(text === null || text === undefined ? '' : text).split('\n')
      let oldNo = 0
      let newNo = 0
      let inHunk = false
      for (const line of lines) {
        if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') ||
            line.startsWith('+++ ') || line.startsWith('new file') || line.startsWith('deleted file') ||
            line.startsWith('old mode') || line.startsWith('new mode') || line.startsWith('similarity') ||
            line.startsWith('rename ') || line.startsWith('Binary files')) {
          if (line.startsWith('--- ')) continue
          if (line.startsWith('+++ ')) continue
          if (line.startsWith('diff --git')) rows.push({ type: 'meta', text: line })
          continue
        }
        if (line.startsWith('@@')) {
          const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
          if (match !== null) { oldNo = Number(match[1]); newNo = Number(match[2]) }
          inHunk = true
          rows.push({ type: 'hunk', text: line })
          continue
        }
        if (!inHunk) {
          if (line !== '') rows.push({ type: 'meta', text: line })
          continue
        }
        if (line.startsWith('+')) { rows.push({ type: 'add', text: line, no: String(newNo) }); newNo += 1; continue }
        if (line.startsWith('-')) { rows.push({ type: 'del', text: line, no: String(oldNo) }); oldNo += 1; continue }
        if (line.startsWith('\\')) { rows.push({ type: 'meta', text: line }); continue }
        rows.push({ type: 'ctx', text: line, no: String(newNo) })
        oldNo += 1
        newNo += 1
      }
      return rows
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

      const form = draft === null ? null : E('div', { className: 'gw-form' },
        E('label', { className: 'gw-field' }, E('span', null, t('remoteName')),
          E('input', {
            className: 'gw-input', value: draft.name, disabled: busy,
            onChange: (event) => setDraft({ ...draft, name: event.target.value }),
          })),
        E('label', { className: 'gw-field' }, E('span', null, t('remoteUrl')),
          E('input', {
            className: 'gw-input', value: draft.url, disabled: busy,
            onChange: (event) => setDraft({ ...draft, url: event.target.value }),
          })),
        E('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '6px' } },
          E('button', {
            className: 'gw-btn gw-btn-ghost gw-btn-sm', disabled: busy,
            onClick: () => setDraft(null),
          }, t('cancel')),
          E('button', {
            className: 'gw-btn gw-btn-primary gw-btn-sm', disabled: busy, onClick: submit,
          }, t('save'))))

      return E('div', {
        className: 'gw-scrim',
        onMouseDown: (event) => { if (event.target === event.currentTarget) props.onClose() },
      },
        E('div', { className: 'gw-card' },
          E('div', { className: 'gw-card-head' },
            t('remotes'),
            E('span', { className: 'gw-spacer' }),
            E('button', { className: 'gw-btn gw-btn-ghost gw-btn-sm', onClick: props.onClose }, '✕')),
          E('div', { className: 'gw-card-body' },
            list.length === 0 && draft === null
              ? E('div', { className: 'gw-empty' }, t('remoteEmpty'))
              : list.map((item) => E('div', { className: 'gw-remote', key: item.name },
                  E('span', { className: 'gw-remote-name' }, item.name),
                  E('span', { className: 'gw-remote-url', title: item.fetchUrl }, item.fetchUrl),
                  E('div', { className: 'gw-remote-actions' },
                    E('button', {
                      className: 'gw-btn gw-btn-ghost gw-btn-sm',
                      onClick: () => setDraft({ mode: 'edit', name: item.name, url: item.fetchUrl, original: item.name }),
                    }, t('remoteEdit')),
                    E('button', {
                      className: 'gw-btn gw-btn-ghost gw-btn-sm',
                      onClick: () => { void props.onRemove(item.name) },
                    }, t('remoteRemove'))))),
            form),
          E('div', { className: 'gw-card-foot' },
            E('button', {
              className: 'gw-btn gw-btn-sm', disabled: busy,
              onClick: () => setDraft({ mode: 'add', name: 'origin', url: '', original: '' }),
            }, t('remoteAdd')))))
    }

    function FileRow(props) {
      const item = props.item
      const extra = props.style === undefined ? null : props.style
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
        onClick: () => props.onOpen(item),
        title: item.path,
      },
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

        E('span', { className: 'gw-file-actions' },
          E(ActionIcon, { name: 'open', title: t('openFile'), onClick: () => props.onOpen(item) }),
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
      const pad = { paddingLeft: String(8 + (depth > 0 ? 2 : 0)) + 'px' }
      if (node.dir === false) {
        return E(FileRow, {
          item: node.item,
          t: props.t,
          style: { paddingLeft: '8px' },
          onOpen: props.onOpen,
          onStage: props.onStage,
          onUnstage: props.onUnstage,
          onDiscard: props.onDiscard,
        })
      }
      const open = props.collapsed.has(node.path) === false
      return E('div', null,
        E('div', {
          className: 'gw-file gw-tree-dir',
          style: pad,
          onClick: () => props.onToggleDir(node.path),
        },
          E('span', { className: 'gw-caret' }, open ? '▾' : '▸'),
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
                onStage: props.onStage,
                onUnstage: props.onUnstage,
                onDiscard: props.onDiscard,
              })))
          : null)
    }

    function ChangeGroup(props) {
      const t = props.t
      const items = props.items
      return E('div', null,
        E('div', { className: 'gw-group-head', onClick: props.onToggle },
          E('span', { className: 'gw-caret' }, props.open ? '▾' : '▸'),
          E('span', { className: 'gw-group-title' }, props.title),
          E('span', { className: 'gw-spacer' }),
          E('span', { className: 'gw-group-actions' },
            props.action === undefined || props.action === null ? null : props.action),
          E('span', { className: 'gw-badge' }, String(items.length))),
        props.open === false ? null : props.tree === true
          ? buildTree(items).map((node, index) => E(TreeRow, {
              key: 't' + String(index),
              node: node,
              depth: 0,
              t: t,
              collapsed: props.collapsed,
              onToggleDir: props.onToggleDir,
              onOpen: props.onOpen,
              onStage: props.onStage,
              onUnstage: props.onUnstage,
              onDiscard: props.onDiscard,
            }))
          : items.map((item, index) => E(FileRow, {
              key: item.path + ':' + String(index),
              item: item,
              group: props.group,
              t: t,
              onOpen: props.onOpen,
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

    function DiffPane(props) {
      const t = props.t
      const rows = useMemo(() => splitDiff(props.text), [props.text])
      return E('div', { className: 'gw-diff' },
        E('div', { className: 'gw-diff-head' },
          E('button', { className: 'gw-btn gw-btn-ghost gw-btn-sm', onClick: props.onBack }, '← ' + t('back')),
          E('span', { className: 'gw-diff-title' }, props.title)),
        E('div', { className: 'gw-diff-body' },
          props.loading
            ? E('div', { className: 'gw-empty' }, t('loading'))
            : rows.length === 0
              ? E('div', { className: 'gw-empty' }, t('diffEmpty'))
              : rows.map((row, index) => E('div', {
                  key: 'd' + String(index),
                  className: 'gw-diff-line' + (row.type === 'add' ? ' gw-diff-add'
                    : row.type === 'del' ? ' gw-diff-del'
                      : row.type === 'hunk' ? ' gw-diff-hunk' : ''),
                },
                  E('span', { className: 'gw-diff-gutter' }, row.no === undefined ? '' : row.no),
                  E('span', { className: 'gw-diff-text' }, row.text)))))
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
      const [error, setError] = useState(null)
      const [busy, setBusy] = useState(false)
      const [message, setMessage] = useState('')
      const [amend, setAmend] = useState(false)
      const [selected, setSelected] = useState(null)
      const [focus, setFocus] = useState(false)
      const [syncBusy, setSyncBusy] = useState('')
      const [moreOpen, setMoreOpen] = useState(false)
      const [morePos, setMorePos] = useState({ top: 0, right: 12 })
      const [remoteOpen, setRemoteOpen] = useState(false)
      const [remoteList, setRemoteList] = useState([])
      const [ask, setAsk] = useState(null)
      const [treeView, setTreeView] = useState(false)
      const [settingsOpen, setSettingsOpen] = useState(false)
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
      const offsetsRef = useRef({ list: [], total: 0 })
      useEffect(() => {
        aliveRef.current = true
        return () => { aliveRef.current = false }
      }, [])

      const refreshSummary = useCallback(async () => {
        if (cwd === '') return null
        try {
          const data = await api('summary', { cwd: cwd })
          if (aliveRef.current) {
            setSummary(data)
            setError(null)
          }
          return data
        } catch (failure) {
          if (aliveRef.current) setError(failure.message)
          return null
        }
      }, [cwd])

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
          const limit = Math.max(PAGE_SIZE, entriesRef.current.length)
          const anchor = captureAnchor()
          const data = await api('log', { cwd: cwd, limit: limit, skip: 0 })
          if (!aliveRef.current) return
          pendingAnchorRef.current = anchor
          setEntries(Array.isArray(data.entries) ? data.entries : [])
          setHasMore(data.hasMore === true)
          setError(null)
        } catch (failure) {
          if (aliveRef.current) setError(failure.message)
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
          const view = await refreshSummary()
          if (stopped || view === null) return
          const signature = signatureOf(view)
          if (signature === lastSigRef.current) return
          lastSigRef.current = signature
          await refreshLog()
        }, POLL_MS)
        return () => { stopped = true; clearInterval(timer) }
      }, [cwd, props.visible, refreshSummary, refreshLog])

      const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || cwd === '') return
        setLoadingMore(true)
        try {
          const data = await api('log', { cwd: cwd, limit: PAGE_SIZE, skip: entries.length })
          if (!aliveRef.current) return
          const next = Array.isArray(data.entries) ? data.entries : []
          setEntries((prev) => prev.concat(next))
          setHasMore(data.hasMore === true)
        } catch (failure) {
          if (aliveRef.current) setError(failure.message)
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
        setError(null)
        try {
          await fn()
        } catch (failure) {
          setError(failure.message)
        } finally {
          if (aliveRef.current) setBusy(false)
        }
      }, [])

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
          if (aliveRef.current) setError(failure.message)
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
          })
          if (aliveRef.current) setDiffView({ title: item.path, text: data.text, loading: false })
        } catch (failure) {
          if (aliveRef.current) setDiffView({ title: item.path, text: String(failure.message), loading: false })
        }
      }, [cwd])

      const openCommitDiff = useCallback(async (file) => {
        setDiffView({ title: file.path, text: '', loading: true })
        try {
          const data = await api('fileDiff', { cwd: cwd, hash: selected, path: file.path })
          if (aliveRef.current) setDiffView({ title: file.path + ' @ ' + String(selected).slice(0, 7), text: data.text, loading: false })
        } catch (failure) {
          if (aliveRef.current) setDiffView({ title: file.path, text: String(failure.message), loading: false })
        }
      }, [cwd, selected])

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
        const ok = window.confirm(t('discardConfirm', { path: item.path }))
        if (!ok) return
        void run(async () => {
          await api('discard', { cwd: cwd, paths: [item.path], confirm: true })
          await refreshSummary()
        })
      }, [cwd, run, refreshSummary, t])

      const doDiscardAll = useCallback((items) => {
        if (items.length === 0) return
        const ok = window.confirm(t('discardAllConfirm', { count: String(items.length) }))
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
      const groupActions = useCallback((group, items) => {
        const paths = items.map((item) => item.path)
        if (group === 'staged') {
          return E(ActionIcon, { name: 'unstage', title: t('unstageAll'), onClick: () => doUnstageAll(paths) })
        }
        if (group === 'unstaged') {
          return E('span', { style: { display: 'flex', gap: '1px' } },
            E(ActionIcon, { name: 'discard', title: t('discardAll'), onClick: () => doDiscardAll(items) }),
            E(ActionIcon, { name: 'stage', title: t('stageAll'), onClick: () => doStageAll(paths) }))
        }
        return E('span', { style: { display: 'flex', gap: '1px' } },
          E(ActionIcon, { name: 'ignore', title: t('ignoreAll'), onClick: () => doIgnore(paths) }),
          E(ActionIcon, { name: 'discard', title: t('discardAll'), onClick: () => doDiscardAll(items) }),
          E(ActionIcon, { name: 'stage', title: t('stageAll'), onClick: () => doStageAll(paths) }))
      }, [t, doUnstageAll, doStageAll, doDiscardAll, doIgnore])

      /* 错误提示自己退场：动画四秒，状态跟着清掉，免得下次误以为没消失。 */
      useEffect(() => {
        if (error === null) return undefined
        const timer = setTimeout(() => { if (aliveRef.current) setError(null) }, 4100)
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
        if (message.trim() === '' && amend === false) { setError(t('emptyMsg')); return }
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
        if (changeTotal === 0) return entries
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
      }, [entries, changeTotal, headHash, t])

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
      const subMenu = (label, children) => menuRow(label, null, children)

      if (cwd === '') {
        return E('div', { className: 'gw-root' }, E('div', { className: 'gw-empty' }, t('noRepo')))
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
          E('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'currentColor' },
            E('path', { d: 'M5 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 1.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zM5 6v4a2 2 0 1 0 .9 1.66V6H5zm0 6.4a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zM10.5 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 1.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zM10.5 6c1.4 0 2.5 1.1 2.5 2.5S11.9 11 10.5 11H8a1 1 0 0 0-1 1v1h1v-1h2.5C12.4 12 14 10.4 14 8.5S12.4 5 10.5 5V6z' })),
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
          error === null ? null : E('div', { className: 'gw-err', key: error },
            E('span', { className: 'gw-err-text' }, error),
            E('button', {
              className: 'gw-err-close',
              'aria-label': t('close'),
              onClick: () => setError(null),
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
                    group: 'conflicts', title: t('conflicts'), items: conflicted, open: openGroups.conflicts !== false, t: t,
                    action: null,
                    tree: treeView, collapsed: collapsedSet, onToggleDir: toggleDir,
                    onToggle: () => toggleGroup('conflicts'),
                    onOpen: openWorkDiff, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard, onIgnore: doIgnore,
                  }),
                  E(ChangeGroup, {
                    group: 'staged', title: t('staged'), items: staged, open: openGroups.staged !== false, t: t,
                    action: groupActions('staged', staged),
                    tree: treeView, collapsed: collapsedSet, onToggleDir: toggleDir,
                    onToggle: () => toggleGroup('staged'),
                    onOpen: openWorkDiff, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard, onIgnore: doIgnore,
                  }),
                  E(ChangeGroup, {
                    group: 'unstaged', title: t('changes'), items: unstaged, open: openGroups.changes !== false, t: t,
                    action: groupActions('unstaged', unstaged),
                    tree: treeView, collapsed: collapsedSet, onToggleDir: toggleDir,
                    onToggle: () => toggleGroup('changes'),
                    onOpen: openWorkDiff, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard, onIgnore: doIgnore,
                  }),
                  E(ChangeGroup, {
                    group: 'untracked', title: t('untracked'), items: untracked, open: openGroups.untracked !== false, t: t,
                    action: groupActions('untracked', untracked),
                    tree: treeView, collapsed: collapsedSet, onToggleDir: toggleDir,
                    onToggle: () => toggleGroup('untracked'),
                    onOpen: openWorkDiff, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard, onIgnore: doIgnore,
                  }))))

      // 有未提交行时空心圆归它，HEAD 就不再空心，保证整张图只有一个空心圆。
      const hasUncommitted = rowEntries.length > 0 && rowEntries[0].uncommitted === true

      const body = diffView !== null
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

      return E('div', { className: 'gw-root' },
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
            menuRow(t('fetchAll'), () => { setMoreOpen(false); doSync('fetchAll') }),
            E('div', { className: 'gw-menu-sep' }),
            menuRow(t('pull'), () => { setMoreOpen(false); doSync('pull') }),
            menuRow(t('push'), () => { setMoreOpen(false); doSync('push') }),
            menuRow(t('clone'), null, [t('cloneUrl'), t('cloneTo')]),
            menuRow(t('checkoutTo'), null, [t('checkoutBranch'), t('checkoutTag')]),
            menuRow(t('fetch'), () => { setMoreOpen(false); doSync('fetchAll') }),
            E('div', { className: 'gw-menu-sep' }),
            subMenu(t('commitGroup'), [t('commitStaged'), t('commitAll'), t('amendLast'), t('undoLastCommit')]),
            subMenu(t('changesGroup'), [t('stageAllChanges'), t('unstageAllChanges'), t('discardAllChanges')]),
            subMenu(t('syncGroup'), [t('pullThenPush')]),
            subMenu(t('branchesGroup'), [t('createBranchItem'), t('deleteBranchItem'), t('renameBranchItem')]),
            subMenu(t('remotesGroup'), [t('addRemoteItem'), t('removeRemoteItem'), t('editRemoteItem')]),
            subMenu(t('stashGroup'), [t('stashSaveItem'), t('stashApplyItem'), t('stashDropItem')]),
            subMenu(t('tagsGroup'), [t('tagCreateItem'), t('tagDeleteItem')]),
            E('div', { className: 'gw-menu-sep' }),
            menuRow(t('showOutput'), null, [t('openInTerminal')]))),
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

    function apply(ctx) {
      injectStyles()
      ctx.inject(['betterSidebar'], (tabCtx) => {
        const betterSidebar = tabCtx.get('betterSidebar')
        if (betterSidebar === undefined || betterSidebar === null || typeof betterSidebar.registerTab !== 'function') return
        tabCtx.effect(() => {
          const t = translatorOf(tabCtx)
          const off = betterSidebar.registerTab({
            id: 'git-workbench',
            title: () => t('title'),
            description: () => t('description'),
            icon: (size) => E(TabIcon, { size: size }),
            order: 60,
            single: true,
            component: (tabProps) => E(GitPanel, tabProps),
          })
          return () => { if (typeof off === 'function') off() }
        }, 'dsh-git-workbench: sidebar tab')
      })
    }

    return { name: PKG, inject: [], apply }
  },
})
