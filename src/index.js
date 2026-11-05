/**
 * dsh-git-workbench — host 半（纯 JavaScript，无构建）。
 *
 * 一个 HTTP 面支撑浏览器面板：
 *
 *   POST /dsh-git-workbench/api/<method>  ->  { ok: true, data } | { ok: false, error }
 *
 * 每个方法都是对本地 git 的薄封装，参数走 argv 数组（永远不拼 shell 字符串），
 * 工作目录由客户端传入（会话 scope 的 cwd）并校验为绝对路径。
 *
 * 信任围栏：路由挂在 DSH 自己的 web server 上，天然同源。只有 Host 头是回环地址、
 * 或浏览器标记为同源（Sec-Fetch-Site）的请求才会被处理——跨站页面无法伪造这两个头。
 */

import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { GitError, gitExecutable, gitText, gitTextQuiet, messageOf, recentGit, runGit } from './git-run.js'
import { LOG_FIELD, LOG_RECORD, parseBranch, parseLog, parseNumstat, parseStatus } from './git-parse.js'

export const name = 'dsh-git-workbench'
export const inject = ['webServer']

const ROUTE_PREFIX = '/dsh-git-workbench/api'
const LOG_FORMAT = ['%H', '%h', '%P', '%an', '%ae', '%at', '%D', '%s'].join(LOG_FIELD) + LOG_RECORD
const DETAIL_FORMAT = ['%H', '%h', '%P', '%an', '%ae', '%at', '%cn', '%ce', '%ct', '%D', '%B'].join(LOG_FIELD)
const BRANCH_FORMAT = '%(refname)' + LOG_FIELD + '%(objectname)' + LOG_FIELD + '%(HEAD)' + LOG_FIELD + '%(upstream:short)'

/* ============================== 参数校验 ============================== */

function requireCwd(payload) {
  const cwd = payload.cwd
  if (typeof cwd !== 'string' || cwd === '') throw new GitError('缺少 cwd', 'bad-request', 400)
  if (!path.isAbsolute(cwd)) throw new GitError('cwd 必须是绝对路径', 'bad-request', 400)
  if (!existsSync(cwd)) throw new GitError('目录不存在：' + cwd, 'not-found', 404)
  if (!statSync(cwd).isDirectory()) throw new GitError('cwd 不是目录：' + cwd, 'bad-request', 400)
  return cwd
}

/** 分支名 / 提交 ref：不允许以 - 开头，否则可能被 git 当成选项。 */
function refArg(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new GitError('缺少' + label, 'bad-request', 400)
  const text = value.trim()
  if (text.startsWith('-')) throw new GitError(label + '不能以 - 开头', 'bad-request', 400)
  return text
}

function hashArg(value) {
  if (typeof value !== 'string' || !/^[0-9a-fA-F]{4,64}$/.test(value)) {
    throw new GitError('提交哈希不合法', 'bad-request', 400)
  }
  return value
}

function requireTagName(payload) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  if (name === '') throw new GitError('标签名不能为空', 'bad-request', 400)
  if (/^[-\s]/.test(name) || /[\s~^:?*[\\]/.test(name) || name.indexOf('..') >= 0) {
    throw new GitError('标签名不合法', 'bad-request', 400)
  }
  return name
}

function pathList(value) {
  if (!Array.isArray(value) || value.length === 0) throw new GitError('缺少文件路径', 'bad-request', 400)
  for (const item of value) {
    if (typeof item !== 'string' || item === '' || item.startsWith('-')) {
      throw new GitError('文件路径不合法：' + String(item), 'bad-request', 400)
    }
    if (path.isAbsolute(item) || item.split('/').includes('..')) {
      throw new GitError('文件路径必须是仓库内的相对路径：' + item, 'bad-request', 400)
    }
  }
  return value
}

function boundedNumber(value, fallback, min, max) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

/* ============================== 读方法 ============================== */

async function readChanges(cwd) {
  const raw = await gitText(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  return parseStatus(raw)
}

async function summary(payload) {
  const cwd = requireCwd(payload)
  const rootText = await gitTextQuiet(cwd, ['rev-parse', '--show-toplevel'])
  if (rootText === null) return { isRepo: false, cwd }
  const root = rootText.trim()

  const symbolic = await gitTextQuiet(root, ['symbolic-ref', '--short', '-q', 'HEAD'])
  const anyCommit = await gitTextQuiet(root, ['rev-list', '-n', '1', '--all'])
  const isEmpty = anyCommit === null || anyCommit.trim() === ''
  let branch = null
  if (symbolic !== null && symbolic.trim() !== '') {
    branch = symbolic.trim()
  } else if (!isEmpty) {
    const headText = await gitTextQuiet(root, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (headText !== null) branch = headText.trim()
  }

  let upstream = null
  if (!isEmpty) {
    const upstreamText = await gitTextQuiet(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])
    if (upstreamText !== null && upstreamText.trim() !== '') upstream = upstreamText.trim()
  }

  let ahead = 0
  let behind = 0
  if (upstream !== null) {
    const counts = await gitTextQuiet(root, ['rev-list', '--left-right', '--count', upstream + '...HEAD'])
    if (counts !== null) {
      const [left, right] = counts.trim().split(/\s+/)
      behind = Number.parseInt(left, 10) || 0
      ahead = Number.parseInt(right, 10) || 0
    }
  }

  let head = null
  if (!isEmpty) {
    const headText = await gitTextQuiet(root, ['rev-parse', 'HEAD'])
    if (headText !== null && headText.trim() !== '') head = headText.trim()
  }

  const changes = await readChanges(root)
  return {
    isRepo: true,
    cwd,
    root,
    head,
    branch,
    detached: branch === 'HEAD',
    empty: isEmpty,
    upstream,
    ahead,
    behind,
    changes,
    counts: {
      conflicted: changes.filter((entry) => entry.conflicted).length,
      staged: changes.filter((entry) => entry.staged).length,
      unstaged: changes.filter((entry) => entry.unstaged).length,
      untracked: changes.filter((entry) => entry.untracked).length,
    },
  }
}

async function log(payload) {
  const cwd = requireCwd(payload)
  const limit = boundedNumber(payload.limit, 100, 1, 500)
  const skip = boundedNumber(payload.skip, 0, 0, 100000)
  const args = ['log', '--date-order', '--decorate=full', '--format=' + LOG_FORMAT, '-n', String(limit + 1), '--skip', String(skip)]
  if (typeof payload.ref === 'string' && payload.ref !== '') args.push(refArg(payload.ref, 'ref'))
  else args.push('--branches', '--tags', '--remotes', 'HEAD')

  let raw = ''
  try {
    raw = await gitText(cwd, args)
  } catch (error) {
    /* 空仓库：没有提交不是错误，是一屏空列表。 */
    if (/does not have any commits|unknown revision|bad revision/i.test(messageOf(error))) {
      return { entries: [], hasMore: false }
    }
    throw error
  }
  const history = parseLog(raw)
  const hasMore = history.length > limit
  const page = hasMore ? history.slice(0, limit) : history

  /*
   * stash 单独取一条插进首屏，不放进上面那次遍历。
   * 它不在 branches/tags/remotes 里，挂在 rev 列表上会被顺着第二父带出
   * index 快照；那些快照解析出来还得丢掉，丢的时候条数就少，分页跟着错。
   * 只取 stash@{0} 这一个提交本身，父提交交给图去连。
   * 只在 skip 为 0 时插：翻页时它已经在上面，每页都插会出现好几行。
   */
  if (skip === 0 && (typeof payload.ref !== 'string' || payload.ref === '')) {
    const stashHash = await gitTextQuiet(cwd, ['rev-parse', '--verify', '-q', 'refs/stash'])
    if (stashHash !== null && stashHash.trim() !== '') {
      const stashRaw = await gitTextQuiet(cwd, [
        'log', '--no-walk=unsorted', '--decorate=full', '--format=' + LOG_FORMAT, stashHash.trim(),
      ])
      const stashEntry = stashRaw === null ? null : parseLog(stashRaw)[0]
      if (stashEntry !== undefined && stashEntry !== null && page.some((item) => item.hash === stashEntry.hash) === false) {
        // 按时间插回去，保证「新的在上、旧的在下」与父在子之后的次序不乱。
        let at = page.length
        for (let i = 0; i < page.length; i++) {
          if (page[i].time < stashEntry.time) { at = i; break }
        }
        page.splice(at, 0, stashEntry)
      }
    }
  }

  /* consumed 是这一页从历史里取走的条数，不含插进来的 stash；
     前端拿它当下一页的 skip，才不会因为多一行而错位。 */
  return { entries: page, hasMore: hasMore, consumed: skip + (hasMore ? limit : history.length) }
}

async function branches(payload) {
  const cwd = requireCwd(payload)
  const raw = await gitText(cwd, ['for-each-ref', '--format=' + BRANCH_FORMAT, 'refs/heads', 'refs/remotes'])
  return { branches: parseBranch(raw) }
}

async function commitDetail(payload) {
  const cwd = requireCwd(payload)
  const hash = hashArg(payload.hash)
  const metaRaw = await gitText(cwd, ['show', '--no-patch', '--decorate=full', '--format=' + DETAIL_FORMAT, hash])
  const fields = metaRaw.replace(/\n$/, '').split(LOG_FIELD)
  const [fullHash, short, parents, author, email, time, committer, committerEmail, committedAt, decorations, body] = fields
  const filesRaw = await gitText(cwd, ['show', '--numstat', '--format=', hash])
  return {
    hash: fullHash,
    short,
    parents: parents === '' ? [] : parents.split(' '),
    author,
    email,
    time: Number.parseInt(time, 10) || 0,
    committer,
    committerEmail,
    committedAt: Number.parseInt(committedAt, 10) || 0,
    decorations,
    message: body === undefined ? '' : body.replace(/\n$/, ''),
    files: parseNumstat(filesRaw),
  }
}

async function fileDiff(payload) {
  const cwd = requireCwd(payload)
  const filePath = refArg(payload.path, 'path')
  const hash = typeof payload.hash === 'string' && payload.hash !== '' ? hashArg(payload.hash) : null

  let args
  /* 未跟踪的文件在 git diff 里是隐形的，得跟 /dev/null 比。
     这里自己判断，不指望调用方一定记得传 untracked。 */
  let untracked = payload.untracked === true
  if (hash !== null) {
    args = ['show', '--format=', '--patch', '--no-color']
      .concat(payload.full === true ? ['-U999999'] : [], [hash, '--', filePath])
  } else if (payload.staged === true) {
    args = ['diff', '--cached', '--no-color']
      .concat(payload.full === true ? ['-U999999'] : [], ['--', filePath])
  } else {
    if (untracked === false) {
      const tracked = await gitTextQuiet(cwd, ['ls-files', '--error-unmatch', '--', filePath])
      untracked = tracked === null
    }
    /* full 表示要完整上下文：面板自己把没改的段落折起来，
       这样折叠条能真正展开，而不是只显示个数字。 */
    const context = payload.full === true ? ['-U999999'] : []
    args = untracked === true
      ? ['diff', '--no-index', '--no-color'].concat(context, ['--', '/dev/null', filePath])
      : ['diff', '--no-color'].concat(context, ['--', filePath])
  }

  const result = await runGit(cwd, args, { allowNonZero: untracked })
  return { path: filePath, text: result.stdout }
}

/* ============================== 写方法 ============================== */

async function stage(payload) {
  const cwd = requireCwd(payload)
  const paths = pathList(payload.paths)
  await runGit(cwd, ['add', '--', ...paths])
  return { staged: paths }
}

async function unstage(payload) {
  const cwd = requireCwd(payload)
  const paths = pathList(payload.paths)
  await runGit(cwd, ['restore', '--staged', '--', ...paths])
  return { unstaged: paths }
}

async function discard(payload) {
  if (payload.confirm !== true) throw new GitError('丢弃更改需要显式确认', 'confirm-required', 400)
  const cwd = requireCwd(payload)
  const paths = pathList(payload.paths)
  const changes = await readChanges(cwd)
  const byPath = new Map(changes.map((entry) => [entry.path, entry]))

  const tracked = []
  const untracked = []
  for (const item of paths) {
    const entry = byPath.get(item)
    if (entry !== undefined && entry.untracked) untracked.push(item)
    else tracked.push(item)
  }

  if (tracked.length > 0) {
    /* 已暂存过的新文件要先退回未跟踪态，restore 才不会报 "not in index"。 */
    await runGit(cwd, ['restore', '--staged', '--worktree', '--', ...tracked])
  }
  const removed = []
  for (const item of untracked) {
    const absolute = path.resolve(cwd, item)
    if (!absolute.startsWith(path.resolve(cwd) + path.sep)) {
      throw new GitError('拒绝删除仓库外的文件：' + item, 'bad-request', 400)
    }
    rmSync(absolute, { recursive: true, force: true })
    removed.push(item)
  }
  return { discarded: tracked, removed }
}

async function commit(payload) {
  const cwd = requireCwd(payload)
  const message = payload.message
  if (typeof message !== 'string' || message.trim() === '') {
    throw new GitError('提交信息不能为空', 'bad-request', 400)
  }
  const args = ['commit', '-F', '-']
  if (payload.amend === true) args.push('--amend')
  const result = await runGit(cwd, args, { input: message })
  const hashText = await gitTextQuiet(cwd, ['rev-parse', 'HEAD'])
  return { hash: hashText === null ? null : hashText.trim(), output: result.stdout.trim() }
}

async function checkout(payload) {
  const cwd = requireCwd(payload)
  const raw = payload.target !== undefined ? payload.target : payload.branch
  const target = refArg(raw, '分支名或提交')
  const detach = payload.detach === true
  await runGit(cwd, detach ? ['checkout', '--detach', target, '--'] : ['checkout', target, '--'])
  return { target, detach }
}

async function createBranch(payload) {
  const cwd = requireCwd(payload)
  const branch = refArg(payload.name, '分支名')
  const rawAt = payload.startPoint !== undefined ? payload.startPoint : payload.at
  const at = typeof rawAt === 'string' && rawAt !== '' ? hashArg(rawAt) : null
  if (payload.checkout === false) {
    await runGit(cwd, at === null ? ['branch', branch] : ['branch', branch, at])
    return { branch, checkedOut: false }
  }
  await runGit(cwd, at === null ? ['checkout', '-b', branch] : ['checkout', '-b', branch, at])
  return { branch, checkedOut: true }
}

/* ---------------------------- 远程仓库 ---------------------------- */

/** 远程名：git 允许的字符集里去掉可能被当成选项的形态。 */
function remoteNameArg(value) {
  if (typeof value !== 'string') throw new GitError('缺少远程名', 'bad-request', 400)
  const text = value.trim()
  if (!/^[A-Za-z0-9._-]+$/.test(text)) {
    throw new GitError('远程名只能用字母、数字、点、下划线、短横线', 'bad-request', 400)
  }
  return text
}

function remoteUrlArg(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new GitError('缺少远程地址', 'bad-request', 400)
  }
  const text = value.trim()
  if (text.startsWith('-')) throw new GitError('远程地址不能以 - 开头', 'bad-request', 400)
  return text
}

async function remotes(payload) {
  const cwd = requireCwd(payload)
  const raw = await gitTextQuiet(cwd, ['remote', '-v'])
  const list = []
  if (raw !== null) {
    for (const line of raw.split('\n')) {
      const match = /^(\S+)\t(.+) \((fetch|push)\)$/.exec(line.trim())
      if (match === null) continue
      const label = match[1]
      let item = null
      for (const candidate of list) { if (candidate.name === label) item = candidate }
      if (item === null) { item = { name: label, fetchUrl: '', pushUrl: '' }; list.push(item) }
      if (match[3] === 'fetch') item.fetchUrl = match[2]
      else item.pushUrl = match[2]
    }
  }
  return { remotes: list }
}

async function remoteAdd(payload) {
  const cwd = requireCwd(payload)
  const label = remoteNameArg(payload.name)
  const url = remoteUrlArg(payload.url)
  await runGit(cwd, ['remote', 'add', label, url])
  return { name: label, url }
}

async function remoteSetUrl(payload) {
  const cwd = requireCwd(payload)
  const label = remoteNameArg(payload.name)
  const url = remoteUrlArg(payload.url)
  await runGit(cwd, ['remote', 'set-url', label, url])
  return { name: label, url }
}

async function remoteRename(payload) {
  const cwd = requireCwd(payload)
  const from = remoteNameArg(payload.name)
  const to = remoteNameArg(payload.nextName)
  await runGit(cwd, ['remote', 'rename', from, to])
  return { from, to }
}

async function remoteRemove(payload) {
  const cwd = requireCwd(payload)
  const label = remoteNameArg(payload.name)
  await runGit(cwd, ['remote', 'remove', label])
  return { name: label }
}

/* ---------------------------- 提交级操作 ---------------------------- */

/** 会失败的操作一律把 git 的原话带回去，这类错误只有原文才说得清原因。 */
async function step(cwd, args, code, fallback) {
  const result = await runGit(cwd, args, { allowNonZero: true, timeoutMs: 60_000 })
  if (result.code !== 0) throw new GitError(failureText(result, fallback), code, 400)
  return result
}

async function tagCreate(payload) {
  const cwd = requireCwd(payload)
  const name = requireTagName(payload)
  const hash = hashArg(payload.hash)
  await runGit(cwd, ['tag', name, hash])
  return { name, hash }
}

async function cherryPick(payload) {
  const cwd = requireCwd(payload)
  const hash = hashArg(payload.hash)
  await step(cwd, ['cherry-pick', hash], 'cherry-pick-failed', '拣选失败')
  return { hash }
}

async function revertCommit(payload) {
  const cwd = requireCwd(payload)
  const hash = hashArg(payload.hash)
  await step(cwd, ['revert', '--no-edit', hash], 'revert-failed', '撤销失败')
  return { hash }
}

async function mergeCommit(payload) {
  const cwd = requireCwd(payload)
  const hash = hashArg(payload.hash)
  await step(cwd, ['merge', '--no-ff', '--no-edit', hash], 'merge-failed', '合并失败')
  return { hash }
}

async function rebaseOnto(payload) {
  const cwd = requireCwd(payload)
  const hash = hashArg(payload.hash)
  await step(cwd, ['rebase', hash], 'rebase-failed', '变基失败')
  return { hash }
}

const RESET_MODES = ['soft', 'mixed', 'hard']

async function resetTo(payload) {
  const cwd = requireCwd(payload)
  const hash = hashArg(payload.hash)
  const mode = RESET_MODES.indexOf(payload.mode) >= 0 ? payload.mode : 'mixed'
  if (mode === 'hard' && payload.confirm !== true) {
    throw new GitError('硬重置会丢弃工作区的改动，需要二次确认', 'confirm-required', 400)
  }
  await runGit(cwd, ['reset', '--' + mode, hash])
  return { hash, mode }
}

/** 丢一个提交：把它的父与子接到一起，历史会被改写。 */
async function dropCommit(payload) {
  const cwd = requireCwd(payload)
  const hash = hashArg(payload.hash)
  if (payload.confirm !== true) {
    throw new GitError('丢弃提交会改写历史，需要二次确认', 'confirm-required', 400)
  }
  const parents = (await gitText(cwd, ['rev-list', '--parents', '-n', '1', hash])).trim().split(' ')
  if (parents.length > 2) throw new GitError('合并提交不能直接丢弃', 'merge-commit', 400)
  if (parents.length < 2) throw new GitError('根提交不能丢弃', 'root-commit', 400)
  await step(cwd, ['rebase', '--onto', parents[1], hash, 'HEAD'], 'drop-failed', '丢弃提交失败')
  return { hash }
}

/* ---------------------------- 忽略规则 ---------------------------- */

/** 把路径追加进 .gitignore；已存在的规则不重复写。 */
async function ignore(payload) {
  const cwd = requireCwd(payload)
  const paths = pathList(payload.paths)
  const file = path.join(cwd, '.gitignore')
  let existing = ''
  try {
    existing = readFileSync(file, 'utf8')
  } catch (error) {
    if (error !== null && error !== undefined && error.code !== 'ENOENT') {
      throw new GitError('读取 .gitignore 失败：' + messageOf(error), 'ignore-failed', 500)
    }
    existing = ''
  }
  const known = new Set(existing.split('\n').map((line) => line.trim()))
  const added = []
  for (const path of paths) {
    const rule = '/' + path
    if (known.has(rule) || known.has(path)) continue
    known.add(rule)
    added.push(rule)
  }
  if (added.length === 0) return { added: [] }
  const tail = existing === '' || existing.endsWith('\n') ? '' : '\n'
  writeFileSync(file, existing + tail + added.join('\n') + '\n', 'utf8')
  return { added: added }
}

/* ---------------------------- 远程同步 ---------------------------- */

/** 网络类操作给足时间，但仍设上限：卡在认证提示时不该把面板吊死。 */
const NETWORK_TIMEOUT_MS = 120_000

async function currentBranchName(cwd) {
  const text = await gitTextQuiet(cwd, ['symbolic-ref', '--short', '-q', 'HEAD'])
  if (text === null) return null
  const value = text.trim()
  return value === '' ? null : value
}

async function upstreamOf(cwd) {
  const text = await gitTextQuiet(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])
  if (text === null) return null
  const value = text.trim()
  return value === '' ? null : value
}

function failureText(result, fallback) {
  const text = typeof result.stderr === 'string' ? result.stderr.trim() : ''
  return text === '' ? fallback : text
}

async function fetchAll(payload) {
  const cwd = requireCwd(payload)
  const result = await runGit(cwd, ['fetch', '--all', '--prune'], {
    timeoutMs: NETWORK_TIMEOUT_MS,
    allowNonZero: true,
  })
  if (result.code !== 0) throw new GitError(failureText(result, '拉取远程信息失败'), 'fetch-failed', 400)
  return { ok: true }
}

async function pull(payload) {
  const cwd = requireCwd(payload)
  const upstream = await upstreamOf(cwd)
  if (upstream === null) throw new GitError('当前分支还没有上游，先推送一次', 'no-upstream', 400)
  const result = await runGit(cwd, ['pull', '--ff-only'], {
    timeoutMs: NETWORK_TIMEOUT_MS,
    allowNonZero: true,
  })
  if (result.code !== 0) throw new GitError(failureText(result, '拉取失败'), 'pull-failed', 400)
  return { upstream }
}

async function push(payload) {
  const cwd = requireCwd(payload)
  const branch = await currentBranchName(cwd)
  if (branch === null) throw new GitError('当前不在任何分支上，无法推送', 'detached', 400)
  const upstream = await upstreamOf(cwd)
  const args = upstream === null ? ['push', '-u', 'origin', branch] : ['push']
  const result = await runGit(cwd, args, {
    timeoutMs: NETWORK_TIMEOUT_MS,
    allowNonZero: true,
  })
  if (result.code !== 0) throw new GitError(failureText(result, '推送失败'), 'push-failed', 400)
  return { branch, published: upstream === null, upstream: upstream === null ? 'origin/' + branch : upstream }
}

/* ============================== 方法表与 HTTP ============================== */

/** 面板里的「显示 Git 输出」：把最近执行过的命令原样倒出来。 */
function gitRecords(payload) {
  const limit = boundedNumber(payload.limit, 200, 1, 300)
  return { records: recentGit(limit), executable: gitExecutable() }
}

const READ_METHODS = { summary, log, branches, commitDetail, fileDiff, remotes, gitRecords }
const WRITE_METHODS = { stage, unstage, discard, commit, checkout, createBranch, remoteAdd, remoteSetUrl, remoteRename, remoteRemove, fetchAll, pull, push, tagCreate, cherryPick, revertCommit, mergeCommit, rebaseOnto, resetTo, dropCommit, ignore }
const METHODS = Object.assign({}, READ_METHODS, WRITE_METHODS)

function headerOf(req, nameOfHeader) {
  const value = req.headers[nameOfHeader]
  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}

function sameOriginOf(req, host) {
  const origin = headerOf(req, 'origin')
  if (origin === undefined || origin === '') return false
  try {
    return new URL(origin).host === host
  } catch (error) {
    void error
    return false
  }
}

/** 回环 authority，或浏览器标记的同源请求（桌面壳 / 远程 UI）。 */
function isTrusted(req) {
  const host = headerOf(req, 'host')
  if (host === undefined || host === '') return false
  const hostname = host.replace(/^\[/, '').replace(/\]:\d+$/, '').replace(/:\d+$/, '')
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') return true
  if (/^127\./.test(hostname)) return true
  const site = headerOf(req, 'sec-fetch-site')
  if (site === 'same-origin' || site === 'same-site') return true
  return sameOriginOf(req, host)
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  })
  res.end(text)
}

function readJsonBody(req, limit = 1 << 20) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new GitError('请求体过大', 'too-large', 413))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.trim() === '') {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(raw)
        resolve(parsed !== null && typeof parsed === 'object' ? parsed : {})
      } catch (error) {
        void error
        reject(new GitError('请求体必须是 JSON', 'bad-request', 400))
      }
    })
    req.on('error', (error) => {
      reject(new GitError('传输失败：' + messageOf(error), 'transport', 500))
    })
  })
}

async function handle(req, res) {
  if (!isTrusted(req)) {
    sendJson(res, 403, {
      ok: false,
      error: { code: 'forbidden', message: '只接受同源或回环请求' },
    })
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: { code: 'method-error', message: '需要 POST' } })
    return
  }
  const pathname = new URL(req.url === undefined ? '/' : req.url, 'http://dsh.internal').pathname
  const method = pathname.startsWith(ROUTE_PREFIX + '/') ? pathname.slice(ROUTE_PREFIX.length + 1) : ''
  const handler = Object.prototype.hasOwnProperty.call(METHODS, method) ? METHODS[method] : undefined
  if (handler === undefined || method.includes('/')) {
    sendJson(res, 404, { ok: false, error: { code: 'not-found', message: '未知方法 "' + method + '"' } })
    return
  }
  try {
    const payload = await readJsonBody(req)
    const data = await handler(payload)
    sendJson(res, 200, { ok: true, data })
  } catch (error) {
    if (error instanceof GitError) {
      sendJson(res, error.status, { ok: false, error: { code: error.code, message: error.message } })
      return
    }
    sendJson(res, 500, { ok: false, error: { code: 'internal', message: messageOf(error) } })
  }
}

export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler: handle }),
    'dsh-git-workbench: /dsh-git-workbench/api git 路由',
  )
}
