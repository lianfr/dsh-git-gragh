# dsh-git-workbench

侧边栏里的 Git 工作台：提交图、变更、提交都在一栏里完成，不用开终端。

## 它解决什么

DSH 的侧边栏插件通常只做文件浏览，Git 相关的操作要切到终端或外部工具。这个插件把三件事放进同一个面板：

- **上三分之一**：写提交信息、暂存/取消暂存/丢弃、提交（支持 amend）。
- **下三分之二**：提交图。当前分支的提交按时间从新到旧排列，分叉和合并画成连线。

## 提交图的一条硬规矩

主分支（`main` 或 `master`，依次按 `origin/HEAD` → `main` → `master` → 当前分支识别）**固定占最左一列**。

即使你在最新的 main 提交上新建 `dev`，dev 的提交也出现在右侧的独立列里，而不是看起来像 main 顺着往上长。分支在生命周期内保持同一列，不会因为提交穿插而左右跳动。

## 交互

- 单击提交：在这一行下面展开详情（提交信息、作者、文件列表、逐行 diff），再点收起。详情把后面的行推下去，其余提交仍可继续滚动。
- 右键提交：复制完整哈希、复制提交信息、检出到此提交、在此新建分支。
- 点击变更文件：面板切到 diff 视图，左上角返回。
- 提交框中 `⌘/Ctrl + Enter` 直接提交。

## 依赖

需要 [dsh-better-sidebar](https://www.npmjs.com/package/dsh-better-sidebar)（提供侧边栏标签页宿主）。没有它时插件不报错，只是不出现标签页。

## 安装

```bash
dsh plugin install /path/to/dsh-git-workbench
```

## 第一版没做的

merge / rebase / 重命名 / 删除分支、cherry-pick / revert / reset、stash、fetch / pull / push、worktree 管理、按作者或路径筛选、任意两提交对比、行级部分暂存、冲突解决编辑器。
