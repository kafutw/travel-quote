#!/bin/zsh
# 設定（或更換）密碼並推上 GitHub Pages。第一次跑會自動建 repo、開 Pages。
# 用法：在終端機打  zsh ~/Desktop/Claude/專案/travel-quote/publish.sh
set -e
cd "${0:A:h}"
REPO=kafutw/travel-quote

node build.mjs

[ -d .git ] || { git init -q -b main; }
printf 'src/\n*.log\n.DS_Store\n' > .gitignore
git add index.html .gitignore build.mjs publish.sh
git commit -qm "更新外縣市交通費試算" || echo "內容沒有變動"

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create "$REPO" --public --source=. --remote=origin --push
  gh api -X POST "repos/$REPO/pages" -f "source[branch]=main" -f "source[path]=/" >/dev/null && echo "已開啟 GitHub Pages"
else
  git push -q origin main
fi
echo "網址：https://kafutw.github.io/travel-quote/  （第一次大約 1 分鐘後才打得開）"
