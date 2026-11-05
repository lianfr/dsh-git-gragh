/**
 * 唯一执行 git 的地方：argv 数组，绝不拼 shell 字符串。
 *
 * 输出用 Buffer 收集后再按 utf8 解码（提交信息和路径都可能是中文），
 * 超过上限直接掐断，避免一个巨型 diff 把进程撑爆。
 */

import { execFileSync, spawn } from 'node:child_process'

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024

/* 最近执行过的 git 命令，环形保留。用于面板里的「显示 Git 输出」。 */
const MAX_RECORDS = 300
const records = []

/* 只读查询归到 repository，写操作与网络操作归到 git。
   轮询会不停发 status 和 log，级别按 debug 记，默认视图里不喧宾夺主。 */
const READ_ONLY = new Set([
  'status', 'log', 'diff', 'show', 'for-each-ref', 'rev-parse', 'ls-files',
  'symbolic-ref', 'rev-list', 'cat-file', 'blame', 'describe', 'merge-base', 'diff-tree',
])

let gitPath = null

/** git 可执行文件的实际位置，用于在输出页顶部显示。 */
export function gitExecutable() {
  if (gitPath !== null) return gitPath
  try {
    gitPath = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim()
  } catch (failure) {
    void failure
    gitPath = 'git'
  }
  if (gitPath === '') gitPath = 'git'
  return gitPath
}

function remember(args, startedAt, value, quiet) {
  const first = typeof args[0] === 'string' ? args[0] : ''
  const category = READ_ONLY.has(first) ? 'repository' : 'git'
  const entry = {
    at: startedAt,
    ms: Date.now() - startedAt,
    command: 'git ' + args.join(' '),
    category: category,
    level: category === 'repository' ? 'debug' : 'info',
  }
  if (value instanceof Error) {
    /* 「有没有上游」这类探测失败是预期之内的，不该在列表里飘红。 */
    if (quiet === true) {
      entry.level = 'debug'
      entry.message = String(value.message).slice(0, 400)
    } else {
      entry.level = 'error'
      entry.failed = true
      entry.message = String(value.message).slice(0, 400)
    }
  } else {
    entry.code = value.code
    entry.stdoutBytes = value.stdout.length
    entry.stderr = value.stderr.slice(0, 400)
    /* 只有出错时才把 stdout 正文留下来，正常结果只记字节数。 */
    if (value.code !== 0) {
      entry.level = 'error'
      entry.stdout = value.stdout.slice(0, 800)
    }
  }
  records.push(entry)
  if (records.length > MAX_RECORDS) records.shift()
}

/** 最近的命令，最新的在前。 */
export function recentGit(limit) {
  const size = typeof limit === 'number' && limit > 0 ? limit : MAX_RECORDS
  return records.slice(-size).reverse()
}

export class GitError extends Error {
  constructor(message, code = 'git-failed', status = 400) {
    super(message)
    this.name = 'GitError'
    this.code = code
    this.status = status
  }
}

/** 执行 git 并等待结束；非零退出码会以 GitError 抛出，stderr 作为消息。 */
export function runGit(cwd, args, options = {}) {
  const timeoutMs = options.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : options.timeoutMs
  const wantsStdin = typeof options.input === 'string'
  return new Promise((resolve, reject) => {
    let child = null
    try {
      child = spawn('git', args, {
        cwd,
        env: Object.assign({}, process.env, {
          GIT_TERMINAL_PROMPT: '0',
          LC_ALL: 'C',
          LANG: 'C',
        }),
        stdio: [wantsStdin ? 'pipe' : 'ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      reject(new GitError('无法启动 git：' + messageOf(error), 'spawn-failed', 500))
      return
    }

    const chunks = []
    const errors = []
    let outBytes = 0
    let settled = false
    let timer = null

    const startedAt = Date.now()
    const finish = (handler, value) => {
      if (settled) return
      settled = true
      if (timer !== null) clearTimeout(timer)
      remember(args, startedAt, value, options.quiet === true)
      handler(value)
    }
    const kill = () => {
      try { child.kill('SIGKILL') } catch (error) { void error }
    }

    timer = setTimeout(() => {
      kill()
      finish(reject, new GitError('git ' + args[0] + ' 超时（' + timeoutMs + 'ms）', 'timeout', 504))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      outBytes += chunk.length
      if (outBytes > MAX_OUTPUT_BYTES) {
        kill()
        finish(reject, new GitError('git 输出超过上限（16 MiB），已中止', 'output-too-large', 413))
        return
      }
      chunks.push(chunk)
    })
    child.stderr.on('data', (chunk) => { errors.push(chunk) })
    child.on('error', (error) => {
      finish(reject, new GitError('无法执行 git：' + messageOf(error), 'spawn-failed', 500))
    })
    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks).toString('utf8')
      const stderr = Buffer.concat(errors).toString('utf8').trim()
      /* --no-index 这类"有差异就算失败"的调用需要读出内容，退出码不算错。 */
      if (code === 0 || options.allowNonZero === true) {
        finish(resolve, { code, stdout, stderr })
        return
      }
      finish(reject, new GitError(stderr === '' ? 'git ' + args[0] + ' 退出码 ' + code : stderr, 'git-exit', 400))
    })

    if (wantsStdin) {
      child.stdin.on('error', (error) => { void error })
      child.stdin.end(options.input, 'utf8')
    }
  })
}

export async function gitText(cwd, args, options) {
  const result = await runGit(cwd, args, options)
  return result.stdout
}

/** 执行 git，失败时返回 null 而不是抛出——用于"有更好，没有也行"的信息。 */
export async function gitTextQuiet(cwd, args, options) {
  const quiet = Object.assign({}, options, { quiet: true })
  try {
    return await gitText(cwd, quiet)
  } catch (error) {
    void error
    return null
  }
}

export function messageOf(error) {
  if (error === null || error === undefined) return 'unknown error'
  if (typeof error === 'string') return error
  return typeof error.message === 'string' ? error.message : String(error)
}
