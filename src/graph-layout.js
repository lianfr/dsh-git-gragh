/**
 * 提交图的泳道布局。
 *
 * 这里只做一件事：给定一段按时间从新到旧排好的提交，算出每一行落在第几列、
 * 用第几种颜色，以及行与行之间的连线。
 *
 * 关键约束：结果只取决于提交图本身，与「这次显示多少行」无关。调用方必须传
 * 完整的历史前缀（后端从 HEAD 一路取到底），否则链尾的父提交找不到，列会退化。
 * 前端不做这份计算，只负责按算好的位置画。
 */

/** 找主分支的尖端：origin/HEAD 指向的本地分支 → main → master → 第一个有分支引用的行。 */
export function findTrunkTip(entries) {
  if (entries.length === 0) return null
  const names = []
  for (let i = 0; i < entries.length; i++) {
    const refs = Array.isArray(entries[i].refs) ? entries[i].refs : []
    for (let r = 0; r < refs.length; r++) {
      const ref = refs[r]
      if (ref === null || ref === undefined) continue
      if (ref.type === 'branch' || ref.type === 'head') names.push({ hash: entries[i].hash, name: String(ref.name) })
    }
  }
  if (names.length === 0) return null
  const pick = (target) => {
    for (const item of names) if (item.name === target) return item.hash
    return null
  }
  return pick('main') === null ? (pick('master') === null ? null : pick('master')) : pick('main')
}

/**
 * 算布局。entries 必须是从新到旧的完整前缀。
 * 返回 { rowLane, rowColor, laneCount, edges }。
 */
export function computeLayout(entries) {
  if (entries.length === 0) {
    return { rowLane: [], rowColor: [], laneCount: 1, edges: [] }
  }

  const rowOfHash = new Map()
  for (let i = 0; i < entries.length; i++) rowOfHash.set(entries[i].hash, i)

  let trunkTip = findTrunkTip(entries)
  if (trunkTip === null) trunkTip = entries[0].hash

  /* 分支尖端处链必须断开，否则从 main 新开的分支会顺着第一父并进主线，看着是一根直线。 */
  const isTip = new Array(entries.length).fill(false)
  for (let i = 0; i < entries.length; i++) {
    const refs = Array.isArray(entries[i].refs) ? entries[i].refs : []
    for (let r = 0; r < refs.length; r++) {
      const type = refs[r] && refs[r].type
      if (type === 'branch' || type === 'remote' || type === 'head') { isTip[i] = true; break }
    }
  }

  /* 一、切链：从起点沿第一父往下走，撞到已经有主的提交就停。 */
  const chainOf = new Array(entries.length).fill(-1)
  const chains = []
  const createChain = (startRow) => {
    const chain = { first: startRow, last: startRow, lane: 0, color: 0 }
    let row = startRow
    while (row >= 0 && chainOf[row] < 0) {
      chainOf[row] = chains.length
      chain.last = row
      const parents = Array.isArray(entries[row].parents) ? entries[row].parents : []
      if (parents.length === 0) break
      const next = rowOfHash.get(parents[0])
      if (next === undefined || next <= row) break
      row = next
    }
    chains.push(chain)
  }
  const trunkRow = rowOfHash.get(trunkTip)
  if (trunkRow !== undefined) createChain(trunkRow)
  for (let i = 0; i < entries.length; i++) if (isTip[i] && chainOf[i] < 0) createChain(i)
  for (let i = 0; i < entries.length; i++) if (chainOf[i] < 0) createChain(i)

  /* 二、分列。 */
  const trunkChain = trunkRow === undefined ? -1 : chainOf[trunkRow]

  const laneLast = []
  const laneOfRow = new Array(entries.length).fill(-1)

  const fillRows = (chainIndex) => {
    const chain = chains[chainIndex]
    for (let i = 0; i < entries.length; i++) {
      if (chainOf[i] === chainIndex) laneOfRow[i] = chain.lane
    }
  }

  /* 颜色与列解耦：每条链单独领一个颜色槽，不能领父链的和同列上一条链的。 */
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

  const tailFatherOf = (chain) => {
    const tailParents = Array.isArray(entries[chain.last].parents) ? entries[chain.last].parents : []
    const fatherRow = tailParents.length > 0 ? rowOfHash.get(tailParents[0]) : undefined
    return fatherRow === undefined ? -1 : chainOf[fatherRow]
  }

  const takeLane = (chainIndex) => {
    const chain = chains[chainIndex]
    if (chainIndex === trunkChain) {
      if (laneLast.length === 0) laneLast.push(chain.last)
      laneLast[0] = Math.max(laneLast[0], chain.last)
      chain.lane = 0
      chain.color = pickColour(chain.first, chain.last, 0, -1)
      fillRows(chainIndex)
      return
    }
    /* 分支一律向右分叉：取链尾的父提交——那才是它接回主线的位置。 */
    const fatherChain = tailFatherOf(chain)
    const tailParents = Array.isArray(entries[chain.last].parents) ? entries[chain.last].parents : []
    const fatherRow = tailParents.length > 0 ? rowOfHash.get(tailParents[0]) : undefined
    const fatherLane = fatherChain >= 0 && fatherChain !== chainIndex ? laneOfRow[fatherRow] : -1
    const fatherColor = fatherChain >= 0 && fatherChain !== chainIndex ? chains[fatherChain].color : -1
    const start = Math.max(1, fatherLane + 1)

    for (let j = start; j < laneLast.length; j++) {
      if (chain.first > laneLast[j]) {
        chain.lane = j
        chain.color = pickColour(chain.first, chain.last, chain.lane, fatherColor)
        laneLast[j] = chain.last
        fillRows(chainIndex)
        return
      }
    }
    while (laneLast.length < start) laneLast.push(-1)
    laneLast.push(chain.last)
    chain.lane = laneLast.length - 1
    chain.color = pickColour(chain.first, chain.last, chain.lane, fatherColor)
    fillRows(chainIndex)
  }

  /* 链的层级：主干 0，直接分叉 1，依次变深。浅的先分配，子链落位时父链列已定。 */
  const depth = new Array(chains.length).fill(0)
  for (let round = 0; round < chains.length; round++) {
    let changed = false
    for (let i = 0; i < chains.length; i++) {
      const fatherChain = tailFatherOf(chains[i])
      if (fatherChain < 0 || fatherChain === i) continue
      if (depth[i] < depth[fatherChain] + 1) {
        depth[i] = depth[fatherChain] + 1
        changed = true
      }
    }
    if (!changed) break
  }

  const rest = []
  for (let i = 0; i < chains.length; i++) if (i !== trunkChain) rest.push(i)
  rest.sort((a, b) => (depth[a] - depth[b]) || (chains[a].first - chains[b].first))
  const order = trunkChain >= 0 ? [trunkChain].concat(rest) : rest
  for (const index of order) takeLane(index)

  const rowLane = new Array(entries.length).fill(0)
  const rowColor = new Array(entries.length).fill(0)
  for (let i = 0; i < entries.length; i++) {
    const chain = chains[chainOf[i]]
    rowLane[i] = chain.lane
    rowColor[i] = chain.color
  }

  let laneCount = 1
  for (let i = 0; i < rowLane.length; i++) if (rowLane[i] + 1 > laneCount) laneCount = rowLane[i] + 1

  const edges = []
  for (let i = 0; i < entries.length; i++) {
    const parents = Array.isArray(entries[i].parents) ? entries[i].parents : []
    for (let p = 0; p < parents.length; p++) {
      const row = rowOfHash.get(parents[p])
      if (row === undefined) continue
      edges.push({
        from: i,
        to: row,
        fromLane: rowLane[i],
        toLane: rowLane[row],
        fromColor: rowColor[i],
        toColor: rowColor[row],
        primary: p === 0,
      })
    }
  }

  return { rowLane, rowColor, laneCount, edges }
}
