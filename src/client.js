window.__ModuleLoader__.load({
  id: 'dsh-git-workbench',
  factory: (require) => {
    const React = require('react')
    const E = React.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = React

    const PKG = 'dsh-git-workbench'
    const API_BASE = PKG + '/api'
    const PAGE_SIZE = 100
  const POLL_MS = 3000
    const ROW_H = 24
    const LANE_W = 14
    const DRAWER_H = 300

    /* ------------------------------------------------------------------ */
    /* styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
.gw-root { display:flex; flex-direction:column; height:100%; min-height:0; font-size:12px; line-height:1.4;
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
.gw-btn:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-btn:disabled { opacity:.45; cursor:default; }
.gw-btn-primary { border-color:transparent; background:var(--dsw-alias-button-primary-fill);
  color:var(--dsw-alias-label-primary-inverted); }
.gw-btn-primary:hover { background:var(--dsw-alias-button-primary-hover); }
.gw-btn-ghost { border-color:transparent; background:transparent; color:var(--dsw-alias-label-secondary); }
.gw-btn-ghost:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-btn-sm { height:20px; padding:0 7px; font-size:11px; }

.gw-check { display:inline-flex; align-items:center; gap:5px; cursor:pointer; user-select:none;
  color:var(--dsw-alias-label-secondary); margin-left:auto; }
.gw-check input { margin:0; cursor:pointer; }

.gw-changes { flex:1 1 auto; min-height:0; overflow:auto; padding-bottom:4px; }
.gw-group-head { display:flex; align-items:center; gap:6px; padding:4px 10px; cursor:pointer;
  color:var(--dsw-alias-label-secondary); font-size:11px; letter-spacing:.02em; user-select:none; }
.gw-group-head:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-group-head .gw-caret { width:10px; display:inline-block; text-align:center; opacity:.7; }
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

.gw-graph-body { flex:1 1 auto; min-height:0; overflow:auto; position:relative; }
.gw-canvas { position:relative; }
.gw-row { position:absolute; left:0; right:0; display:flex; align-items:center; gap:6px;
  padding-right:8px; cursor:pointer; user-select:none; }
.gw-row:hover { background:var(--dsw-alias-interactive-bg-hover);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.gw-row-sel, .gw-row-sel:hover { background:var(--dsw-alias-interactive-bg-active);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); }
.gw-row-subject { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1 1 auto; }
.gw-row-meta { display:flex; align-items:center; gap:4px; flex:none; font-size:11px; padding:0 4px;
  color:var(--dsw-alias-label-tertiary);
  font-family:var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
.gw-row-sep { opacity:.5; }

.gw-ref { display:inline-flex; align-items:center; gap:2px; height:15px; padding:0 5px; border-radius:4px;
  font-size:10px; font-weight:500; flex:none; max-width:150px; overflow:hidden; }
.gw-ref-branch { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
  color:var(--dsw-alias-brand-primary); }
.gw-ref-head { background:var(--dsw-alias-brand-primary); color:var(--dsw-alias-label-primary-inverted); }
.gw-ref-tag { background:var(--dsw-alias-state-warn-primary); color:var(--dsw-alias-label-primary-inverted); }
.gw-ref-remote { background:color-mix(in srgb, var(--dsw-alias-label-tertiary) 22%, transparent);
  color:var(--dsw-alias-label-secondary); }

.gw-drawer { position:absolute; left:0; right:0; z-index:1;
  background:var(--dsw-alias-bg-layer-1);
  background:color-mix(in srgb, var(--dsw-alias-label-primary) 1.5%, var(--dsw-alias-bg-layer-1));
  border-bottom:1px solid var(--dsw-alias-border-l2);
  display:flex; flex-direction:column; overflow:hidden; box-sizing:border-box; }
.gw-drawer-divider { position:absolute; top:0; bottom:0; width:0;
  border-left:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
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
.gw-err { margin:6px 10px 0; padding:5px 8px; border-radius:5px; font-size:11.5px;
  background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent);
  color:var(--dsw-alias-state-error-primary); }
.gw-menu { position:fixed; z-index:9999; min-width:190px; padding:4px; border-radius:8px;
  background:var(--dsw-alias-bg-layer-3); border:1px solid var(--dsw-alias-border-l2);
  box-shadow:0 8px 24px rgba(0,0,0,.28); }
.gw-menu-item { display:flex; align-items:center; height:26px; padding:0 10px; border-radius:5px;
  cursor:pointer; white-space:nowrap; color:var(--dsw-alias-label-primary); }
.gw-menu-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
.gw-menu-sep { height:1px; margin:4px 6px; background:var(--dsw-alias-border-l1); }
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
        commitPlaceholder: '提交信息',
        commit: '提交',
        commitAmend: '修补上一次提交',
        staged: '已暂存',
        changes: '更改',
        untracked: '未跟踪',
        conflicts: '合并冲突',
        stageAll: '全部暂存',
        unstageAll: '全部取消暂存',
        stage: '暂存',
        unstage: '取消暂存',
        discard: '丢弃',
        discardConfirm: '确定丢弃对 {path} 的更改？此操作无法撤销。',
        discardAllConfirm: '确定丢弃全部未暂存更改？此操作无法撤销。',
        noChanges: '工作区干净',
        noCommits: '还没有提交',
        noRepo: '当前工作目录不是 Git 仓库',
        loading: '加载中…',
        files: '个文件',
        copyHash: '复制完整哈希',
        copySubject: '复制提交信息',
        checkoutHere: '检出到此提交',
        branchHere: '在此新建分支',
        branchPrompt: '新分支名称',
        detached: '分离 HEAD',
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
        unstageAll: 'Unstage all',
        stage: 'Stage',
        unstage: 'Unstage',
        discard: 'Discard',
        discardConfirm: 'Discard changes in {path}? This cannot be undone.',
        discardAllConfirm: 'Discard all unstaged changes? This cannot be undone.',
        noChanges: 'Working tree clean',
        noCommits: 'No commits yet',
        noRepo: 'Current directory is not a Git repository',
        loading: 'Loading…',
        files: 'files',
        copyHash: 'Copy full hash',
        copySubject: 'Copy commit message',
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

    function computeLayout(entries) {
      if (entries.length === 0) return { rowLane: [], laneCount: 1, edges: [], rowOfHash: new Map() }

      const rowOfHash = new Map()
      for (let i = 0; i < entries.length; i++) rowOfHash.set(entries[i].hash, i)

      let trunkTip = findTrunkTip(entries)
      if (trunkTip === null) trunkTip = entries[0].hash

      const TRUNK = -1
      const trunkSet = new Set()
      let cursor = trunkTip
      let guard = 0
      while (cursor !== null && cursor !== undefined && rowOfHash.has(cursor) && guard <= entries.length) {
        trunkSet.add(cursor)
        const idx = rowOfHash.get(cursor)
        const parents = Array.isArray(entries[idx].parents) ? entries[idx].parents : []
        cursor = parents.length > 0 ? parents[0] : null
        guard += 1
      }

      const active = new Map()
      const rowChain = new Array(entries.length)
      let nextChain = 0

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        let chain
        if (trunkSet.has(entry.hash)) {
          chain = TRUNK
          active.delete(entry.hash)
        } else {
          chain = active.get(entry.hash)
          if (chain === undefined) {
            chain = nextChain++
          } else {
            active.delete(entry.hash)
          }
        }
        rowChain[i] = chain
        const parents = Array.isArray(entry.parents) ? entry.parents : []
        const first = parents.length > 0 ? parents[0] : null
        if (first !== null && !trunkSet.has(first) && !active.has(first)) active.set(first, chain)
      }

      const laneOfChain = new Map()
      laneOfChain.set(TRUNK, 0)
      let nextLane = 1
      const rowLane = new Array(entries.length)
      let laneCount = 1
      for (let i = 0; i < entries.length; i++) {
        const chain = rowChain[i]
        let lane = laneOfChain.get(chain)
        if (lane === undefined) { lane = nextLane++; laneOfChain.set(chain, lane) }
        rowLane[i] = lane
        if (lane + 1 > laneCount) laneCount = lane + 1
      }

      const edges = []
      for (let i = 0; i < entries.length; i++) {
        const parents = Array.isArray(entries[i].parents) ? entries[i].parents : []
        for (let p = 0; p < parents.length; p++) {
          const row = rowOfHash.get(parents[p])
          if (row === undefined) continue
          edges.push({ from: i, to: row, fromLane: rowLane[i], toLane: rowLane[row], primary: p === 0 })
        }
      }

      return { rowLane, laneCount, edges, rowOfHash }
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

    function RefBadge(props) {
      // 注意：props 里不能叫 ref —— React 会把 ref 当特殊属性吞掉，值永远读到 undefined。
      const ref = props.item
      if (!ref || typeof ref !== 'object') return null
      let cls = 'gw-ref gw-ref-branch'
      let label = ref.name === undefined ? '' : ref.name
      if (ref.type === 'head') { cls = 'gw-ref gw-ref-head'; label = ref.name === '' || ref.name === undefined ? 'HEAD' : ref.name }
      else if (ref.type === 'tag') { cls = 'gw-ref gw-ref-tag'; label = 'tag ' + ref.name }
      else if (ref.type === 'remote') { cls = 'gw-ref gw-ref-remote' }
      return E('span', { className: cls, title: label }, label)
    }

    function FileRow(props) {
      const item = props.item
      const t = props.t
      const parts = dirAndName(item.path)
      const conflicted = item.conflicted === true
      const staged = item.staged === true
      const untracked = item.untracked === true
      let idxCode = item.index
      let workCode = item.worktree
      if (untracked) { idxCode = '?' }
      return E('div', { className: 'gw-file', onClick: () => props.onOpen(item), title: item.path },
        E('span', { className: codeClass(conflicted ? 'U' : idxCode === ' ' ? '.' : idxCode) }, conflicted ? 'U' : (idxCode === ' ' || idxCode === '' ? '·' : idxCode)),
        E('span', { className: codeClass(workCode === ' ' ? '.' : workCode) }, workCode === ' ' || workCode === '' || workCode === undefined ? '·' : workCode),
        E('span', { className: 'gw-file-name' },
          parts.dir === '' ? null : E('span', { className: 'gw-file-dir' }, parts.dir),
          parts.name),
        E('span', { className: 'gw-file-actions' },
          untracked || !staged
            ? E('button', {
                className: 'gw-btn gw-btn-ghost gw-btn-sm',
                title: t('stage'),
                onClick: (event) => { event.stopPropagation(); props.onStage(item) },
              }, '＋')
            : null,
          staged
            ? E('button', {
                className: 'gw-btn gw-btn-ghost gw-btn-sm',
                title: t('unstage'),
                onClick: (event) => { event.stopPropagation(); props.onUnstage(item) },
              }, '－')
            : null,
          E('button', {
            className: 'gw-btn gw-btn-ghost gw-btn-sm',
            title: t('discard'),
            onClick: (event) => { event.stopPropagation(); props.onDiscard(item) },
          }, '⤺')))
    }

    function ChangeGroup(props) {
      const t = props.t
      const items = props.items
      return E('div', null,
        E('div', { className: 'gw-group-head', onClick: props.onToggle },
          E('span', { className: 'gw-caret' }, props.open ? '▾' : '▸'),
          E('span', null, props.title),
          E('span', { className: 'gw-count' }, ' ' + items.length),
          props.action === undefined || props.action === null
            ? null
            : E('span', { className: 'gw-group-actions' }, props.action)),
        props.open
          ? items.map((item, index) => E(FileRow, {
              key: item.path + ':' + String(index),
              item: item,
              t: t,
              onOpen: props.onOpen,
              onStage: props.onStage,
              onUnstage: props.onUnstage,
              onDiscard: props.onDiscard,
            }))
          : null)
    }

    function GraphRow(props) {
      const entry = props.entry
      const y = props.y
      const t = props.t
      const refs = Array.isArray(entry.refs) ? entry.refs : []
      return E('div', {
        className: 'gw-row' + (props.selected ? ' gw-row-sel' : ''),
        style: { top: y + 'px', height: ROW_H + 'px', paddingLeft: props.laneWidth + 'px' },
        onClick: props.onClick,
        onContextMenu: props.onContextMenu,
        title: entry.subject,
      },
        refs.map((ref, index) => E(RefBadge, { key: 'r' + String(index), item: ref })),
        E('span', { className: 'gw-row-subject' }, entry.subject),
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

      return E('div', { ref: ref, className: 'gw-menu', style: { left: pos.left + 'px', top: pos.top + 'px' } },
        E('div', { className: 'gw-menu-item', onClick: () => copy(entry.hash) }, t('copyHash')),
        E('div', { className: 'gw-menu-item', onClick: () => copy(entry.subject) }, t('copySubject')),
        E('div', { className: 'gw-menu-sep' }),
        E('div', { className: 'gw-menu-item', onClick: () => { props.onClose(); props.onCheckout(entry) } }, t('checkoutHere')),
        E('div', { className: 'gw-menu-item', onClick: () => { props.onClose(); props.onBranch(entry) } }, t('branchHere')))
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
      const [detail, setDetail] = useState(null)
      const [diffView, setDiffView] = useState(null)
      const [menu, setMenu] = useState(null)
      const [openGroups, setOpenGroups] = useState({ conflicts: true, staged: true, changes: true, untracked: true })

      const aliveRef = useRef(true)
      const lastSigRef = useRef(null)
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

      const refreshLog = useCallback(async () => {
        if (cwd === '') return
        try {
          const data = await api('log', { cwd: cwd, limit: PAGE_SIZE, skip: 0 })
          if (!aliveRef.current) return
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
      const unstaged = changes.filter((item) => item.conflicted !== true && item.staged !== true && item.untracked !== true)
      const untracked = changes.filter((item) => item.untracked === true)

      const layout = useMemo(() => computeLayout(entries), [entries])
      const laneWidth = Math.max(24, layout.laneCount * LANE_W + 16)

      const offsets = useMemo(() => {
        const list = []
        let y = 0
        for (let i = 0; i < entries.length; i++) {
          list.push(y)
          y += ROW_H
          if (selected !== null && entries[i].hash === selected) y += DRAWER_H
        }
        return { list: list, total: y }
      }, [entries, selected])

      const svgHeight = offsets.total
      // 抽屉展开的那一行在列表里的下标，用于判断某条连线是否跨过抽屉区间
      const selectedIndex = useMemo(() => {
        if (selected === null) return -1
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].hash === selected) return i
        }
        return -1
      }, [selected, entries])
      const drawerTop = useMemo(() => {
        if (selected === null) return 0
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].hash === selected) return offsets.list[i] + ROW_H
        }
        return 0
      }, [selected, entries, offsets])

      const toggleGroup = useCallback((key) => {
        setOpenGroups((prev) => {
          const next = Object.assign({}, prev)
          next[key] = !prev[key]
          return next
        })
      }, [])

      const onCheckout = useCallback((entry) => {
        void run(async () => {
          await api('checkout', { cwd: cwd, ref: entry.hash, detach: true })
          await refreshAll()
        })
      }, [cwd, run, refreshAll])

      const onBranch = useCallback((entry) => {
        const name = window.prompt(t('branchPrompt'), '')
        if (name === null || name.trim() === '') return
        void run(async () => {
          await api('createBranch', { cwd: cwd, name: name.trim(), startPoint: entry.hash, checkout: true })
          await refreshAll()
        })
      }, [cwd, run, refreshAll, t])

      if (cwd === '') {
        return E('div', { className: 'gw-root' }, E('div', { className: 'gw-empty' }, t('noRepo')))
      }

      const isRepo = summary !== null && summary.isRepo === true

      const top = E('div', { className: 'gw-top' },
        E('div', { className: 'gw-pad' },
          error === null ? null : E('div', { className: 'gw-err' }, error),
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
              ? E('div', { className: 'gw-empty' }, t('noChanges'))
              : E('div', null,
                  E(ChangeGroup, {
                    title: t('conflicts'), items: conflicted, open: openGroups.conflicts !== false, t: t,
                    onToggle: () => toggleGroup('conflicts'),
                    onOpen: openWorkDiff, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard,
                  }),
                  E(ChangeGroup, {
                    title: t('staged'), items: staged, open: openGroups.staged !== false, t: t,
                    onToggle: () => toggleGroup('staged'),
                    onOpen: openWorkDiff, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard,
                    action: staged.length === 0 ? null : E('button', {
                      className: 'gw-btn gw-btn-ghost gw-btn-sm',
                      onClick: (event) => { event.stopPropagation(); doUnstageAll(staged.map((item) => item.path)) },
                    }, t('unstageAll')),
                  }),
                  E(ChangeGroup, {
                    title: t('changes'), items: unstaged, open: openGroups.changes !== false, t: t,
                    onToggle: () => toggleGroup('changes'),
                    onOpen: openWorkDiff, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard,
                    action: unstaged.length === 0 ? null : E('button', {
                      className: 'gw-btn gw-btn-ghost gw-btn-sm',
                      onClick: (event) => { event.stopPropagation(); doStageAll(unstaged.map((item) => item.path)) },
                    }, t('stageAll')),
                  }),
                  E(ChangeGroup, {
                    title: t('untracked'), items: untracked, open: openGroups.untracked !== false, t: t,
                    onToggle: () => toggleGroup('untracked'),
                    onOpen: openWorkDiff, onStage: doStage, onUnstage: doUnstage, onDiscard: doDiscard,
                    action: untracked.length === 0 ? null : E('button', {
                      className: 'gw-btn gw-btn-ghost gw-btn-sm',
                      onClick: (event) => { event.stopPropagation(); doStageAll(untracked.map((item) => item.path)) },
                    }, t('stageAll')),
                  }))))

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
        E('span', { className: 'gw-count' }, entries.length + ' / ' + (hasMore ? '…' : entries.length)),
        E('button', {
          className: 'gw-btn gw-btn-ghost gw-btn-sm',
          onClick: () => { void refreshAll() },
          title: 'refresh',
        }, '⟳'))

      const body = diffView !== null
        ? E(DiffPane, {
            t: t,
            title: diffView.title,
            text: diffView.text,
            loading: diffView.loading === true,
            onBack: () => setDiffView(null),
          })
        : E('div', { className: 'gw-graph-body', onScroll: onScroll },
            entries.length === 0
              ? E('div', { className: 'gw-empty' }, summary !== null && summary.empty === true ? t('noCommits') : t('noCommits'))
              : E('div', { className: 'gw-canvas', style: { height: svgHeight + 'px' } },
                  E('svg', {
                    width: '100%',
                    height: svgHeight,
                    style: { position: 'absolute', left: 0, top: 0, zIndex: 2, pointerEvents: 'none' },
                  },
                    layout.edges.map((edge, index) => {
                      const y1 = offsets.list[edge.from] + ROW_H / 2
                      const y2 = offsets.list[edge.to] + ROW_H / 2
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
                        const mid = (y1 + y2) / 2
                        d = 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + mid + ' ' + x2 + ',' + mid + ' ' + x2 + ',' + y2
                      }
                      return E('path', {
                        key: 'e' + String(index),
                        d: d,
                        fill: 'none',
                        stroke: laneColor(edge.fromLane),
                        strokeWidth: edge.primary ? 1.6 : 1.2,
                        strokeOpacity: edge.to === edge.from + 1 ? 1 : 0.85,
                      })
                    }),
                    entries.map((entry, index) => E('circle', {
                      key: 'c' + String(index),
                      cx: layout.rowLane[index] * LANE_W + 12,
                      cy: offsets.list[index] + ROW_H / 2,
                      r: 3.4,
                      fill: laneColor(layout.rowLane[index]),
                      stroke: 'var(--dsw-alias-bg-layer-1)',
                      strokeWidth: 1.2,
                    }))),
                  entries.map((entry, index) => E(GraphRow, {
                    key: entry.hash,
                    entry: entry,
                    y: offsets.list[index],
                    laneWidth: laneWidth,
                    t: t,
                    selected: selected === entry.hash,
                    onClick: () => { void selectCommit(entry) },
                    onContextMenu: (event) => {
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
          onCheckout: onCheckout,
          onBranch: onBranch,
        }))
    }

    /* ------------------------------------------------------------------ */
    /* registration                                                        */
    /* ------------------------------------------------------------------ */

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
