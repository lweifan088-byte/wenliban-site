# 文理伴校园生活服务平台

校园生活服务平台，包含校园助手、学生社区、社团资料、好友消息与管理工作台。

## 部署方式

- GitHub Pages 当前发布 `public/` 静态体验页，数据仅保存在当前浏览器，不能提供跨设备账号或校园管理服务。
- 跨设备服务端版本使用根目录 Node.js 应用和 PostgreSQL，Render 部署文件见 `render.yaml`。部署需要付费 Web Service 与数据库，并设置首位管理员账号和密码。
- 详细账号、权限、数据边界与学校接入要求见 [CAMPUS_OPERATIONS.md](CAMPUS_OPERATIONS.md)。

## 本机启动

需要 Node.js 20+ 和 PostgreSQL。复制 `.env.example` 为 `.env`，设置数据库连接；正式部署还须设置 `NODE_ENV=production`、`ADMIN_USERNAME` 和至少 12 位的 `ADMIN_PASSWORD`。运行 `npm install` 后执行 `npm start`，访问 `http://localhost:3000`。数据库迁移会在启动时自动执行。

当前不连接学校学籍库或统一认证，学号/工号仅作为账号名称，不代表校方核验。室友测评仍是习惯匹配建议；正式宿舍分配需要学校宿舍与床位数据、管理人员复核。

## 开源参考

权限和社团审核流程参考 [StudentSpot](https://github.com/pawelkwaczynski/student_spot)（MIT）与 [student-council](https://github.com/Hiba-Malkan/student-council)（MIT）的公开设计，本项目没有复制其源代码。
