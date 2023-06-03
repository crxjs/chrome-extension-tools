#!/usr/bin/env bash
set -eux;

date=$(date +%Y-%m-%d)
branch="fix-$date";

if ! git remote -v | grep upstream > /dev/null; then
  git remote add upstream git@github.com:crxjs/chrome-extension-tools.git;
fi;

git checkout main;
git checkout -b "$branch";

git fetch upstream;
git merge upstream/main;

pnpm install;
pnpm build:vite-plugin;

git add .;
git commit -m "Update on $date";
git push origin "$branch";

open "$(git ls-remote --get-url | perl -pe 's|^git@|https://|' | perl -pe 's|com:|com/|g' | perl -pe 's/.git$//')";