# dsh-git-graph

[简体中文](README.md) | English

A Git panel for DSH: commit graph, changes, and commits, all in the right sidebar — no terminal needed.

## What it solves

- **History shouldn't be a flat list** — branches and merges are drawn as lines, and a branch keeps the same column from start to finish, so you can follow one line downward without losing it.
- **Commit details belong next to the commit** — click a row and it opens in place: message, author, date, parents, changed files, and a line-by-line diff. The drawer pushes the rows below it down instead of covering them.
- **Changes and commits live together** — four groups of changes, stage or discard one item or a whole group, write a message, commit.
- **Common operations without a terminal** — checkout, create branch or tag, cherry-pick, revert, merge, rebase, reset, fetch / pull / push, manage remotes, save and apply stashes.

## Where it lives

| Host | Requirement | What you get |
|---|---|---|
| **DSH native right sidebar** | default | A Git card on the right sidebar's start page; click it to open the panel |
| **[dsh-better-sidebar](https://www.npmjs.com/package/dsh-better-sidebar)** | if installed | A Git tab in its sidebar |

When better-sidebar is present it takes priority, so you never see two duplicate entries. Either way works on its own.

## Features

| Area | Capability |
|---|---|
| Commit graph | Newest on top, branches and merges drawn as lines; stashes and uncommitted changes each get their own row; switch between the current branch and everything; scroll to load more |
| Commit detail | A drawer with message, author, date, parents, changed files, and a line-by-line diff |
| Commit menu | Copy hash, checkout that commit, create a branch or tag there, cherry-pick, revert, merge into current, rebase, reset |
| Changes | Conflicts / staged / changed / untracked; stage, unstage, or discard one item; added and deleted line counts on hover; group actions too |
| Commit box | Multi-line message, `⌘/Ctrl + Enter` to commit, amend the previous commit |
| Sync | Fetch all remotes, pull, push; with no upstream the button reads "publish", which is `git push -u` |
| Remotes and stashes | Add, edit, and remove remotes; save, apply, and drop stashes |
| Also | Tree and flat views for the change list; view the raw Git output; open the repository in a terminal |

## Settings

Four options on the plugin page: refresh interval, page size, whether to show the uncommitted row, and whether to confirm before discarding.

The interface follows the host language, in Chinese and English.

## Install

```sh
dsh plugin install /path/to/dsh-git-graph
```

## License

MIT
