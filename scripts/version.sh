sed -i -E "s~https://unpkg\.com/deepslate@[0-9a-z\.-]+~https://unpkg.com/deepslate@"$npm_package_version"~" README.md
git add README.md
