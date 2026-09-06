FROM lscr.io/linuxserver/code-server:latest

USER root

ARG NODE_MAJOR=24

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        vim \
        gnupg \
        openjdk-21-jdk \
        maven \
    \
    # Install the NodeSource Node.js repository
    # 安装 NodeSource Node.js 仓库
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    \
    # Install Node.js
    # 安装 Node.js
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    \
    # Pre-install pnpm
    # 预装 pnpm
    && npm install -g pnpm \
    \
    # Clean up caches
    # 清理缓存
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
# Configure the terminal prompt
# 配置终端提示符
RUN mkdir -p /custom-cont-init.d \
    && printf '%s\n' \
       '#!/usr/bin/with-contenv bash' \
       'grep -qxF "PS1='\''\W\\$ '\''" /config/.bashrc 2>/dev/null || echo "PS1='\''\W\\$ '\''" >> /config/.bashrc' \
       > /custom-cont-init.d/10-bash-prompt \
    && chmod +x /custom-cont-init.d/10-bash-prompt
# Initialize git user name/email and defaults (reads GIT_USER_NAME / GIT_USER_EMAIL, configurable per user)
# 初始化 git 用户名与邮箱（读取环境变量 GIT_USER_NAME / GIT_USER_EMAIL，多用户各自配置）
RUN mkdir -p /custom-cont-init.d \
    && printf '%s\n' \
       '#!/usr/bin/with-contenv bash' \
       'export HOME=/config' \
       '# Only write if not already configured, so later user edits are preserved' \
       '# 仅在对应项尚未配置时写入，避免覆盖用户后续的自定义' \
       'if [ -n "${GIT_USER_NAME:-}" ] && ! git config --global --get user.name >/dev/null 2>&1; then' \
       '    git config --global user.name "${GIT_USER_NAME}"' \
       'fi' \
       'if [ -n "${GIT_USER_EMAIL:-}" ] && ! git config --global --get user.email >/dev/null 2>&1; then' \
       '    git config --global user.email "${GIT_USER_EMAIL}"' \
       'fi' \
       '# Default git pull behavior: merge, not rebase' \
       '# 默认 pull 使用 merge 而非 rebase（no rebase）' \
       'if ! git config --global --get pull.rebase >/dev/null 2>&1; then' \
       '    git config --global pull.rebase false' \
       'fi' \
       '# Default branch for new repositories: main' \
       '# 新建仓库默认分支设为 main' \
       'if ! git config --global --get init.defaultBranch >/dev/null 2>&1; then' \
       '    git config --global init.defaultBranch main' \
       'fi' \
       '# Fix config file ownership so the abc user can modify it later' \
       '# 修正配置文件属主，保证 abc 用户后续可自行修改' \
       'if [ -f /config/.gitconfig ]; then' \
       '    chown "$(id -u abc):$(id -g abc)" /config/.gitconfig' \
       'fi' \
       > /custom-cont-init.d/20-git-config \
    && chmod +x /custom-cont-init.d/20-git-config
# Verify installed tools
# 验证安装
RUN node --version \
    && npm --version \
    && pnpm --version \
    && java -version \
    && mvn -version
