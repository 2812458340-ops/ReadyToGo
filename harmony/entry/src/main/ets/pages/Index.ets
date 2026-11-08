import { webview } from '@kit.ArkWeb';
import { common } from '@kit.AbilityKit';

class AppBridge {
  hasOverlay: boolean = false;
  private context: common.UIAbilityContext | undefined = undefined;

  setContext(context: common.UIAbilityContext): void {
    this.context = context;
  }

  setOverlay(open: boolean): void {
    this.hasOverlay = open;
  }

  openUrl(url: string): void {
    if (!this.context) {
      return;
    }
    this.context.startAbility({ action: 'ohos.want.action.viewData', uri: url });
  }
}

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();
  bridge: AppBridge = new AppBridge();

  aboutToAppear(): void {
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    this.bridge.setContext(context);
  }

  build() {
    Column() {
      Web({ src: $rawfile('web/index.html'), controller: this.controller })
        .javaScriptAccess(true)
        .fileAccess(true)
        .domStorageAccess(true)
        .databaseAccess(true)
        .geolocationAccess(true)
        .onGeolocationShow((event: OnGeolocationShowEvent) => {
          event.geolocation.invoke(event.origin, true, false);
        })
        .javaScriptProxy({
          object: this.bridge,
          name: 'appBridge',
          methodList: ['setOverlay', 'openUrl'],
          controller: this.controller
        })
        // Official advisory links open in the system browser instead of
        // replacing the app page, so pressing back always returns to the map.
        .onLoadIntercept((event: OnLoadInterceptEvent) => {
          const url = event.data.getRequestUrl();
          if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            context.startAbility({ action: 'ohos.want.action.viewData', uri: url });
            return true;
          }
          return false;
        })
        .zoomAccess(false)
        .horizontalScrollBarAccess(false)
        .verticalScrollBarAccess(false)
        .width('100%')
        .height('100%')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#0D1722')
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])
  }

  onBackPress(): boolean {
    // If the WebView is showing an external page, go back in its history
    // first — otherwise the user would be stuck on the advisory site.
    const current = this.controller.getUrl();
    if (current && (current.indexOf('http://') === 0 || current.indexOf('https://') === 0) &&
      this.controller.accessBackward()) {
      this.controller.backward();
      return true;
    }
    // Otherwise close the topmost in-app overlay.
    if (this.bridge.hasOverlay) {
      try {
        this.controller.runJavaScript('window.__appBack && window.__appBack()');
      } catch (e) {
        return false;
      }
      return true;
    }
    return false;
  }
}
