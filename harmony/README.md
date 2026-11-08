# ReadyToGo · 鸿蒙（HarmonyOS）工程

这是「全球旅行风险地图」的 HarmonyOS 壳工程：ArkTS + ArkUI **Web 组件**加载打包在
`rawfile/web/` 里的现有 Web 应用，复用全部功能（地图、五国数据、应急电话、中英文、深浅色、
HarmonyOS Sans 字体），不需要重写地图逻辑。

> 已在 DevEco Studio 中构建成功（`entry-default-unsigned.hap`，仅少量 lint 警告）；
> 安装到真机 / 模拟器前需配置签名证书。

## 环境

- DevEco Studio **5.0 或更新**
- HarmonyOS SDK **API 12**（`5.0.0(12)`）
- 真机或模拟器；上架需要华为开发者账号与签名证书

## 运行

1. 用 DevEco Studio 打开本目录 `harmony/`（不是仓库根目录）。
2. 等待 Hvigor 同步；如提示 SDK 版本/工程模型升级，按提示确认。
3. `File > Project Structure > Signing Configs` 勾选自动签名（或配置自己的证书）。
4. 选择 `entry` 模块，点 Run。

包名默认为 `com.travelrisk.atlas`，上架前请改成你自己的 bundleName。

## 目录

```
harmony/
├─ AppScope/
│  ├─ app.json5                 # bundleName / 版本 / 图标
│  └─ resources/base/media/app_icon.png
├─ build-profile.json5          # API 12，HarmonyOS
├─ hvigorfile.ts
├─ oh-package.json5
└─ entry/
   ├─ build-profile.json5
   ├─ hvigorfile.ts
   ├─ oh-package.json5
   └─ src/main/
      ├─ module.json5           # EntryAbility、INTERNET 权限
      ├─ ets/
      │  ├─ entryability/EntryAbility.ets
      │  └─ pages/Index.ets     # Web({ src: $rawfile('web/index.html') })
      └─ resources/
         ├─ base/element/*.json
         ├─ base/media/startIcon.png
         ├─ base/profile/main_pages.json
         └─ rawfile/web/        # 由脚本从 ../../web 同步
```

## 更新网页内容

在仓库根目录：

```bash
python scripts/build_data.py           # 重新生成数据
python scripts/sync_harmony_assets.py  # 同步 web/ → rawfile/web
```

然后在 DevEco Studio 里重新 Run。

## 实现说明

- 页面用 `$rawfile('web/index.html')` 加载；脚本、样式、字体、GeoJSON 都相对引用 rawfile 内的文件。
- 数据改为 **`data/risk.js` / `data/geo.js` 脚本全局变量**（`window.__RISK__` / `window.__GEO__`），
  避免 WebView 对本地 `fetch()` 的限制；`app.js` 仍保留 fetch 回退，浏览器版不受影响。
- `domStorageAccess(true)` 让主题/语言偏好写入 localStorage。
- 定位使用 Web 的 `navigator.geolocation`，需 `ohos.permission.LOCATION` / `APPROXIMATELY_LOCATION`，
  并在 `Web` 上开启 `geolocationAccess(true)`、用 `onGeolocationShow` 授权；应用启动后会请求一次定位权限。
- `ohos.permission.INTERNET` 仅用于打开各国官方提示链接。
- 返回键 / 侧滑：网页通过 `window.__appBack()` 依次关闭搜索、详情、菜单；`Index.ets` 用
  `appBridge.setOverlay()` 同步“是否有弹窗”，`onBackPress` 有弹窗时调用 JS 返回，否则退出应用。
- **全屏**：`setWindowLayoutFullScreen(true)` + `setWindowSystemBarEnable([])` 隐藏状态栏与导航栏，
  `Column.expandSafeArea(...)` 让 WebView 铺满整屏；网页用 `env(safe-area-inset-*)` 给顶部控件和底部导航留出安全区。
  这样既没有底部小白条，也没有顶部白边。

## 可能遇到的问题

| 现象 | 处理 |
| --- | --- |
| 页面空白、资源 404 | 确认 `rawfile/web/` 已同步；确认 `$rawfile('web/index.html')` 路径大小写一致 |
| 字体未生效 | 确认 `rawfile/web/fonts/*.woff2` 存在；ArkWeb 支持 WOFF2 |
| 地图不能拖动 | WebView 需允许触摸事件；本工程未拦截 touch，正常情况下 Leaflet 手势可用 |
| 首次编译报 SDK 版本 | 在 DevEco 中把 `compileSdkVersion` / `compatibleSdkVersion` 改成你已安装的 API 版本 |

## 后续可做的原生化

当前是「WebView 壳」，优点是零重写、功能与 Web 完全一致；缺点是启动和手势不如原生顺滑。
若要进一步原生：

- **原生地图**：用 ArkUI `Canvas` 绘制 GeoJSON（或华为 Map Kit 叠加多边形），实现缩放/点击；
- **原生列表/详情**：ArkTS 组件替代 HTML；
- **数据层**：把 `risk.json` 转成 ArkTS 模型或本地数据库；
- **保留**：数据管线（`scripts/`）完全可复用。

建议先以 WebView 版本上架验证需求，再按性能瓶颈逐步原生化。
