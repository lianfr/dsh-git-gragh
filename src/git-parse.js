/**
 * git 输出的解析。所有解析器都是纯函数，输入是 runGit 拿到的原始字符串。
 */

/** git log 的记录分隔（%x1e）与字段分隔（%x1f）。 */
export const LOG_RECORD = '\x1e'
export const LOG_FIELD = '\x1f'

/** `git status --porcelain=v1 -z` → 变更条目。 */
export function parseStatus(raw) {
  const tokens = raw.split('\0')
  const entries = []
  let index = 0
  while (index < tokens.length) {
    const token = tokens[index]
    index += 1
    if (token === '') continue
    const x = token.slice(0, 1)
    const y = token.slice(1, 2)
    const filePath = token.slice(3)
    let origPath = null
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') {
      origPath = tokens[index] === undefined ? null : tokens[index]
      index += 1
    }
    const conflicted = x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')
    const untracked = x === '?' && y === '?'
    entries.push({
      path: filePath,
      origPath,
      index: x,
      worktree: y,
      conflicted,
      untracked,
      staged: !conflicted && !untracked && x !== ' ',
      unstaged: !conflicted && !untracked && y !== ' ',
    })
  }
  return entries
}

/**
 * `git log --format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s%x1e`
 * → 提交条目。parents 是完整哈希数组，refs 是装饰解析后的数组。
 */
export function parseLog(raw) {
  const entries = []
  for (const record of raw.split(LOG_RECORD)) {
    const line = record.replace(/^\n/, '')
    if (line === '') continue
    const fields = line.split(LOG_FIELD)
    if (fields.length < 8) continue
    entries.push({
      hash: fields[0],
      short: fields[1],
      parents: fields[2] === '' ? [] : fields[2].split(' '),
      author: fields[3],
      email: fields[4],
      time: Number.parseInt(fields[5], 10) || 0,
      refs: parseDecorations(fields[6]),
      subject: fields[7],
    })
  }
  return entries
}

/** `%D` 的装饰串（"HEAD -> main, origin/main, tag: v1"）→ 结构化引用。 */
export function parseDecorations(raw) {
  const text = raw.trim()
  if (text === '') return []
  const refs = []
  for (const piece of text.split(',')) {
    const item = piece.trim()
    if (item === '') continue
    if (item.startsWith('HEAD -> ')) {
      refs.push({ type: 'head', name: item.slice(8) })
      continue
    }
    if (item === 'HEAD') {
      refs.push({ type: 'head', name: 'HEAD' })
      continue
    }
    if (item.startsWith('tag: ')) {
      refs.push({ type: 'tag', name: item.slice(5) })
      continue
    }
    refs.push({ type: item.includes('/') ? 'remote' : 'branch', name: item })
  }
  return refs
}

/** `git show --numstat --format=` → 文件级增删统计。 */
export function parseNumstat(raw) {
  const files = []
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue
    const first = line.indexOf('\t')
    const second = first === -1 ? -1 : line.indexOf('\t', first + 1)
    if (first === -1 || second === -1) continue
    const added = line.slice(0, first)
    const deleted = line.slice(first + 1, second)
    files.push({
      path: line.slice(second + 1),
      added: added === '-' ? null : Number.parseInt(added, 10) || 0,
      deleted: deleted === '-' ? null : Number.parseInt(deleted, 10) || 0,
      binary: added === '-',
    })
  }
  return files
}

/** `git for-each-ref` 的一行（带 %(refname)|%(objectname)|%(HEAD)）。 */
export function parseBranch(raw) {
  const branches = []
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue
    const [ref, hash, head, upstream] = line.split('\x1f')
    if (ref === undefined || hash === undefined) continue
    const name = ref.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\//, '')
    branches.push({
      name,
      ref,
      hash,
      current: head === '*',
      remote: ref.startsWith('refs/remotes/'),
      upstream: upstream === undefined || upstream === '' ? null : upstream,
    })
  }
  return branches
}
