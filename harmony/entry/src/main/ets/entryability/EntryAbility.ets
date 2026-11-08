import { AbilityConstant, ConfigurationConstant, UIAbility, Want, abilityAccessCtrl } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';

const DOMAIN = 0x0000;
const TAG = 'TravelRisk';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(DOMAIN, TAG, 'onCreate');
  }

  onDestroy(): void {
    hilog.info(DOMAIN, TAG, 'onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // Edge-to-edge: draw behind both system bars and hide them, so the map
    // fills the whole screen (no white strip at the top or bottom).
    const mainWindow = windowStage.getMainWindowSync();
    const dark = this.context.config.colorMode === ConfigurationConstant.ColorMode.COLOR_MODE_DARK;
    mainWindow.setWindowLayoutFullScreen(true).catch((err: BusinessError) => {
      hilog.warn(DOMAIN, TAG, 'setWindowLayoutFullScreen failed: %{public}s', err.message);
    });
    mainWindow.setWindowSystemBarEnable([]).catch((err: BusinessError) => {
      hilog.warn(DOMAIN, TAG, 'setWindowSystemBarEnable failed: %{public}s', err.message);
    });
    mainWindow.setWindowSystemBarProperties({
      statusBarColor: '#00000000',
      statusBarContentColor: dark ? '#FFFFFF' : '#1B2530',
      navigationBarColor: '#00000000'
    }).catch((err: BusinessError) => {
      hilog.warn(DOMAIN, TAG, 'setWindowSystemBarProperties failed: %{public}s', err.message);
    });

    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(DOMAIN, TAG, 'Failed to load page: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, TAG, 'Page loaded');
      this.requestLocationPermission();
    });
  }

  private requestLocationPermission(): void {
    const atManager = abilityAccessCtrl.createAtManager();
    atManager.requestPermissionsFromUser(this.context, [
      'ohos.permission.APPROXIMATELY_LOCATION',
      'ohos.permission.LOCATION'
    ]).catch((err: BusinessError) => {
      hilog.warn(DOMAIN, TAG, 'location permission request failed: %{public}s', err.message);
    });
  }
}
