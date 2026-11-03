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

import { existsSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'

import { GitError, gitText, gitTextQuiet, messageOf, runGit } from './git-run.js'
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

  const changes = await readChanges(root)
  return {
    isRepo: true,
    cwd,
    root,
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
  const args = ['log', '--date-order', '--format=' + LOG_FORMAT, '-n', String(limit + 1), '--skip', String(skip)]
  if (typeof payload.ref === 'string' && payload.ref !== '') args.push(refArg(payload.ref, 'ref'))
  else args.push('--all')

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
  const entries = parseLog(raw)
  const hasMore = entries.length > limit
  return { entries: hasMore ? entries.slice(0, limit) : entries, hasMore }
}

async function branches(payload) {
  const cwd = requireCwd(payload)
  const raw = await gitText(cwd, ['for-each-ref', '--format=' + BRANCH_FORMAT, 'refs/heads', 'refs/remotes'])
  return { branches: parseBranch(raw) }
}

async function commitDetail(payload) {
  const cwd = requireCwd(payload)
  const hash = hashArg(payload.hash)
  const metaRaw = await gitText(cwd, ['show', '--no-patch', '--format=' + DETAIL_FORMAT, hash])
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
  if (hash !== null) {
    args = ['show', '--format=', '--patch', '--no-color', hash, '--', filePath]
  } else if (payload.staged === true) {
    args = ['diff', '--cached', '--no-color', '--', filePath]
  } else if (payload.untracked === true) {
    args = ['diff', '--no-index', '--no-color', '--', '/dev/null', filePath]
  } else {
    args = ['diff', '--no-color', '--', filePath]
  }

  const result = await runGit(cwd, args, { allowNonZero: payload.untracked === true })
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

/* ============================== 方法表与 HTTP ============================== */

const READ_METHODS = { summary, log, branches, commitDetail, fileDiff }
const WRITE_METHODS = { stage, unstage, discard, commit, checkout, createBranch }
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
