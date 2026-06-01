# Sienovo Marine — 项目规划 & 进度跟踪

> 打窝船遥控系统 — Android App 与 sienovo-marine 模拟器/真实硬件的实时遥控链路。
> 本文档是**每日开发循环的唯一事实来源**。每个工作日由自动化开发流程更新「进度日志」并发邮件至 sienovojay@gmail.com。
>
> **基线日期**：2026-06-01 · **维护者**：Claude（自动化）+ wlin（审核）

---

## 1. 目标（北极星）

让 **Android App（遥控器）** 能与 **sienovo-marine 模拟器**（以及未来真实硬件）通过 AWS IoT Core 建立稳定的实时遥控链路：

- App 实时显示船的遥测（位置/航向/速度/电量/信号/饵料/水深/水温/部件健康）
- App 通过摇杆/按钮控制船（油门、舵、抛饵、返航、灯光、夜视）
- App 实时显示船载摄像头画面
- 断线自动重连、弱网降级、超时自动停船等鲁棒性

## 2. 架构（现状已验证 ✅）

```
┌─────────────┐   X.509 cert / mqtts:8883    ┌──────────────────┐   Cognito 匿名 + SigV4 WSS   ┌─────────────┐
│ 模拟器/真船  │ ───── state/camera/event ──> │  AWS IoT Core     │ ──── state/camera/event ──> │ Android App  │
│ boat.mjs    │ <──────── control ────────── │  (ap-east-1 HK)   │ <──────── control ───────── │ Expo RN      │
└─────────────┘                              └──────────────────┘                              └─────────────┘
```

- **Topic 约定**：`sienovo/boats/{boatId}/{state|event|camera|control}`
- **控制协议**：`{type:'control', command:{throttle,rudder}}` · `release-bait` · `return-home` · `set-camera-mode` · `set-fault`
- **遥测频率**：state 5Hz · camera 2Hz · App 控制心跳 5Hz（船端 1s 无输入自动停）
- **关键资源**：endpoint `a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com` · Cognito pool `ap-east-1:94175a79-...` · unauth role `sienovo-marine-viewer-unauth` · 船端 policy `sienovo-boat-dev-policy`

技术栈说明：App 是 **Expo React Native**（非纯原生 Android）。`expo start --android` 可调试；出 APK/AAB 走 EAS Build 或 `expo prebuild`。

## 3. 现状盘点（2026-06-01）

| 组件 | 状态 | 备注 |
|---|---|---|
| 模拟器 `simulator/boat.mjs` | ✅ 可用 | 证书连 IoT 稳定在线，发 state/camera，收 control |
| Web dashboard（Next.js） | ✅ 已部署 | 用 AWS IoT |
| App IoT 接入层 `lib/iotMqtt.ts` | 🟡 成型未提交 | Cognito→SigV4→WSS 路径已写 |
| App 数据 hook `hooks/useBoatViewer.ts` | 🟡 成型未提交 | 订阅 state/camera，发 control |
| App UI `ControllerScreen` 等 | 🟡 改动未提交 | WebSocket→IoT 迁移中，旧 `ConnectionScreen`/`useWebSocket` 已删 |
| **端到端连通** | 🔴 **有 Bug** | viewer 连上后**立即掉线**（见 M1-T1）— App 当前用不了 |
| Android 出包流程 | ⬜ 未建 | 无 EAS / prebuild 配置 |
| i18n（URL 切换语言） | ⬜ 未做 | 见 CLAUDE.md 规范 |

## 4. 里程碑

### M1 — 打通端到端连接 & 落定 IoT 迁移 🔴 当前
- [ ] **T1【阻塞】** 修复 viewer「连上即掉线」：诊断 unauth role 的 IoT policy（疑似缺 `iot:Subscribe`/`iot:Receive` 或 clientId 约束过严）。**需要管理员 AWS 凭证**（`sienovo-iot` profile 无 IAM 权限）。
- [ ] T2 用 `scripts/test-iot-wss.mjs` 验证 viewer 能持续收到 state（模拟器同时在跑）
- [ ] T3 提交当前 IoT 迁移改动（App.tsx / iotMqtt / useBoatViewer / ControllerScreen / 删除 WS 文件）到分支并合并
- [ ] T4 在 Android 模拟器/真机上 `expo start --android`，验证摇杆→船端实际响应

### M2 — 控制器功能补全
- [ ] T1 摄像头夜视/灯光开关（App 发 `set-camera-mode`，船端已支持）
- [ ] T2 返航 / 抛饵 按钮端到端验证（含 event 回执：`bait-released` / `arrived-home`）
- [ ] T3 部件健康面板（`components` 8 项状态着色）
- [ ] T4 地图视图（react-native-maps，船位/航迹/home 点）
- [ ] T5 摄像头画面渲染（SVG dataUrl）与遥测 HUD 一致性

### M3 — Android 出包 & 真机验证
- [ ] T1 配置 EAS Build（或 `expo prebuild` 本地出包），生成可安装 APK
- [ ] T2 凭证/endpoint 改为 EAS secrets + expo-constants（移除 iotMqtt.ts 硬编码）
- [ ] T3 真机安装，对模拟器全流程跑通

### M4 — 鲁棒性 & 体验
- [ ] T1 断线自动重连（当前靠 remount hook，需更稳的退避策略）
- [ ] T2 弱网/离线降级 UI（state stale 5s→offline 已有，补提示与重连入口）
- [ ] T3 i18n + URL 语言切换（按 CLAUDE.md 规范）
- [ ] T4 响应式：横竖屏、手机/平板（摇杆尺寸已随屏幕，需复核）
- [ ] T5 电量/信号低阈值告警

### M5 — 发布候选
- [ ] T1 按 `docs/打窝船 App 测试验收手册.pdf` 跑验收
- [ ] T2 多船切换（BoatPicker 已有雏形，验证多 thing）
- [ ] T3 默认浏览器标题/App 名称/图标核对（CLAUDE.md 规范）
- [ ] T4 出 release 版 APK，提交验收报告

## 5. 风险 & 依赖

| 风险/依赖 | 影响 | 处置 |
|---|---|---|
| 修 IoT policy 需管理员 AWS 凭证 | 阻塞 M1 | 需 wlin 提供有 IAM 权限的 profile，或代为改 policy |
| 凭证硬编码在 `iotMqtt.ts` | 安全 | M3-T2 迁到 EAS secrets |
| 匿名 Cognito「谁都能连」 | v1 演示可接受，量产不可 | 后续加鉴权（M5 之后） |
| Expo SDK / RN 版本升级 | 出包失败 | 锁版本，CI 验证 |

## 6. 进度日志（自动追加，最新在上）

<!-- DAILY-LOG-START -->
### 2026-06-01 · 基线建立
- 完成项目盘点与端到端连通性验证：模拟器✅在线；viewer（App 路径）连上 IoT 后**立即掉线**，定位为 M1-T1 首要阻塞任务。
- 生成本规划文档作为跟踪基线。
- 下一步：M1-T1 诊断/修复 unauth IoT policy（待确认 AWS 管理员凭证）。
<!-- DAILY-LOG-END -->
