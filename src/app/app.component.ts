import { ProfileSettingsPage } from './../pages/profile-settings/profile-settings';
import { Component, NgZone, ViewChild } from '@angular/core';
import { App, Events, Nav, Platform, PopoverController, ToastController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { GUEST_STUDENT_TABS, GUEST_TEACHER_TABS, initTabs, LOGIN_TEACHER_TABS } from './module.service';
import { LanguageSettingsPage } from '../pages/language-settings/language-settings';
import { ImageLoaderConfig } from 'ionic-image-loader';
import { TranslateService } from '@ngx-translate/core';
import { SearchPage } from '../pages/search/search';
import { CollectionDetailsPage } from '../pages/collection-details/collection-details';
import { ContentDetailsPage } from '../pages/content-details/content-details';
import { generateInteractTelemetry } from './telemetryutil';
import { ContentType, EventTopics, GenericAppConfig, MimeType, PreferenceKey, ProfileConstants } from './app.constant';
import { EnrolledCourseDetailsPage } from '../pages/enrolled-course-details/enrolled-course-details';
import { FormAndFrameworkUtilService } from '../pages/profile/formandframeworkutil.service';
import { AppGlobalService } from '../service/app-global.service';
import { UserTypeSelectionPage } from '../pages/user-type-selection/user-type-selection';
import { CommonUtilService } from '../service/common-util.service';
import { TelemetryGeneratorService } from '../service/telemetry-generator.service';
import { BroadcastComponent } from '../component/broadcast/broadcast';
import { CategoriesEditPage } from '@app/pages/categories-edit/categories-edit';
import { TncUpdateHandlerService } from '@app/service/handlers/tnc-update-handler.service';
import { SunbirdSdk, OauthSession, ProfileType, Profile, GenerateInteractTelemetryAfterMethod, TelemetryRequestFactory, Environment, PageId } from 'sunbird-sdk'
import { TabsService } from '@app/tabs/tabs.service';
import { AppConfig } from '@app/config/app.config';
import { TabsPage } from '@app/tabs/tabs';
import { Observable, Subject } from 'rxjs';

const KEY_SUNBIRD_SUPPORT_FILE_PATH = 'sunbird_support_file_path';

declare var cordova: {
  plugins: {
    permissions: {
      hasPermission(permission, successCallback, errorCallback);
      requestPermission(permission, successCallback, errorCallback);
      requestPermissions(permissions, successCallback, errorCallback);
    }
  }
}

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav;
  rootPage: any;
  permission = cordova.plugins.permissions;

  readonly pList = [
    this.permission.CAMERA,
    this.permission.WRITE_EXTERNAL_STORAGE,
    this.permission.ACCESS_FINE_LOCATION,
    this.permission.RECORD_AUDIO
  ];

  private backButtonEvent$: Subject<any>;

  constructor(
    private platform: Platform,
    statusBar: StatusBar,
    private toastCtrl: ToastController,
    private imageLoaderConfig: ImageLoaderConfig,
    public app: App,
    public translate: TranslateService,
    private events: Events,
    private zone: NgZone,
    private formAndFrameworkUtilService: FormAndFrameworkUtilService,
    private event: Events,
    private appGlobalService: AppGlobalService,
    private commonUtilService: CommonUtilService,
    private telemetryGeneratorService: TelemetryGeneratorService,
    public popoverCtrl: PopoverController,
    private tncUpdateHandlerService: TncUpdateHandlerService,
    private tabService: TabsService
  ) {

    const that = this;

    platform.ready().then(async () => {
      this.registerDeeplinks();
      this.openrapDiscovery();
      this.imageLoaderConfig.enableDebugMode();
      this.imageLoaderConfig.setMaximumCacheSize(100 * 1024 * 1024);
      this.subscribeEvents();
      this.saveDefaultSyncSetting();
      this.showAppWalkThroughScreen();

      // check if any new app version is available
      this.checkForUpgrade();


      //check permission
      this.permission.hasPermission(this.pList, status => {
        if (status.hasPermission) {
          this.makeEntryInSupportFolder();
        } else {
          this.permission.requestPermissions(this.pList, status => {
            if (status.hasPermission) {
              this.makeEntryInSupportFolder();
            }
          }, error => {

          })
        }
      }, error => {

      });

      let languageCode = localStorage.getItem(PreferenceKey.SELECTED_LANGUAGE_CODE)
      if (languageCode && languageCode.length) {
        this.translate.use(languageCode);
      }

      await this.tncUpdateHandlerService.checkForTncUpdate();

      const session: OauthSession = await SunbirdSdk.instance.authService.getSession().toPromise();
      const localProfile: Profile = await SunbirdSdk.instance.profileService.getCurrentProfile().toPromise();

      if (session === null) {

        let selectedUserType = localStorage.getItem(PreferenceKey.SELECTED_USER_TYPE);
        if (selectedUserType) {
          if (selectedUserType === ProfileType.TEACHER) {
            initTabs(this.tabService, GUEST_TEACHER_TABS);
          } else if (selectedUserType === ProfileType.STUDENT) {
            initTabs(this.tabService, GUEST_STUDENT_TABS);
          }

          if (!AppConfig.display_onboarding_category_page &&
            !AppConfig.display_onboarding_scan_page) {
            this.nav.setRoot(TabsPage);
          } else {
            if (this.isProfileSetup(localProfile)) {
              this.appGlobalService.isProfileSettingsCompleted = true;
              this.nav.setRoot(TabsPage);
            } else {
              this.appGlobalService.isProfileSettingsCompleted = false;
              const isOnboardingCompleted = localStorage.getItem(PreferenceKey.IS_ONBOARDING_COMPLETED);
              if (isOnboardingCompleted && isOnboardingCompleted === 'true') {
                this.getProfileSettingConfig(true);
              } else {
                this.nav.insertPages(0, [{ page: LanguageSettingsPage }, { page: UserTypeSelectionPage }]);
              }
            }
          }
        } else {
          this.appGlobalService.isProfileSettingsCompleted = false;
          that.rootPage = LanguageSettingsPage;
        }
      } else {
        if (this.isProfileSetup(localProfile)) {
          initTabs(that.tabService, LOGIN_TEACHER_TABS);
          const showWelcome = localStorage.getItem('SHOW_WELCOME_TOAST');

          if (showWelcome === 'true') {
            localStorage.setItem('SHOW_WELCOME_TOAST', 'false');
            const req = {
              userId: session.userToken,
              requiredFields: ProfileConstants.REQUIRED_FIELDS,
              refreshUserProfileDetails: true
            };

            SunbirdSdk.instance.profileService.getServerProfilesDetails(req).toPromise()
              .then(serverProfile => {
                setTimeout(() => {
                  this.commonUtilService
                    .showToast(this.commonUtilService.translateMessage('WELCOME_BACK', serverProfile.firstName));
                }, 2500);
              });
          }
          that.rootPage = TabsPage;
        } else {
          const req = {
            userId: session.userToken,
            requiredFields: ProfileConstants.REQUIRED_FIELDS,
            refreshUserProfileDetails: true
          };

          try {
            const serverProfile = await SunbirdSdk.instance.profileService.getServerProfilesDetails(req).toPromise();
            that.formAndFrameworkUtilService.updateLoggedInUser(serverProfile, localProfile)
              .then((value) => {
                if (value['status']) {
                  this.nav.setRoot(TabsPage);
                  initTabs(that.tabService, LOGIN_TEACHER_TABS);
                  // that.rootPage = TabsPage;
                } else {
                  that.nav.setRoot(CategoriesEditPage, { showOnlyMandatoryFields: true, profile: value['profile'] });
                }
              }).catch(() => {
                that.nav.setRoot(CategoriesEditPage, { showOnlyMandatoryFields: true });
              });
          } catch (error) {
            that.nav.setRoot(CategoriesEditPage, { showOnlyMandatoryFields: true });
          }
        }

      }

      (<any>window).splashscreen.hide();

      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();

      window['thisRef'] = this;
      // try {
      //   this.fetchUpdate();
      // } catch (error) {
      //   console.log(error);
      // }

      this.handleBackButton();
    });
  }

  private isProfileSetup(profile: Profile): boolean {
    return (profile && profile.syllabus && profile.syllabus[0]
      && profile.board && profile.board.length
      && profile.grade && profile.grade.length > 0
      && profile.medium && profile.medium.length > 0);
  }

  /**
   * It will read profile settings configuration and navigates to appropriate page
   * @param hideBackButton To hide the navigation back button in the profile settings page
   */
  getProfileSettingConfig(hideBackButton = false) {
    if (AppConfig.display_onboarding_scan_page) {
      this.nav.setRoot('ProfileSettingsPage', { hideBackButton: hideBackButton });
    } else {
      this.nav.setRoot(TabsPage);
    }
  }

  private checkForUpgrade() {
    this.formAndFrameworkUtilService.checkNewAppVersion()
      .then(result => {
        if (result !== undefined) {
          console.log('Force Optional Upgrade - ' + JSON.stringify(result));
          setTimeout(() => {
            this.events.publish('force_optional_upgrade', { upgrade: result });
          }, 5000);
        }
      })
      .catch(error => {
        console.log('Error - ' + error);
      });
  }

  makeEntryInSupportFolder() {
    (<any>window).supportfile.makeEntryInSunbirdSupportFile((result) => {
      console.log('Result - ' + JSON.parse(result));
      localStorage.setItem(KEY_SUNBIRD_SUPPORT_FILE_PATH, JSON.parse(result));
    }, (error) => {
      console.log('Error - ' + error);
    });
  }

  saveDefaultSyncSetting() {
    const syncConfig = localStorage.getItem('sync_config')
    if (!syncConfig) {
      localStorage.setItem('sync_config', 'ALWAYS_ON');
    }
  }

  handleBackButton() {
    const navObj = this.app.getActiveNavs()[0];

    this.backButtonEvent$ = this.backButtonEvent$ || new Subject();

    this.platform.registerBackButtonAction(() => {
      if (!navObj.canGoBack()) {
        this.showBackToExitToast();
        this.backButtonEvent$.next();

        Observable.combineLatest(
          Observable.timer(2500).do(() => this.backButtonEvent$.unsubscribe()),
          this.backButtonEvent$
        ).subscribe(() => {
          this.backButtonEvent$.unsubscribe();
          this.platform.exitApp();
        })
      } else {
        navObj.pop();
      }
    });

    // const navObj = this.app.getActiveNavs()[0];
    // this.platform.registerBackButtonAction(() => {
    //   if (navObj.canGoBack()) {
    //     navObj.pop();
    //   } else {
    //     if (this.counter === 0) {
    //       this.showBackToExitToast(currentPage);
    //     } else {
    //       this.telemetryGeneratorService.generateBackClickedTelemetry(this.computePageId(currentPage), Environment.HOME, false);
    //       self.platform.exitApp();
    //       this.telemetryGeneratorService.generateEndTelemetry('app', '', '', Environment.HOME);

    //     }
    //   }
    // });
  }

  @GenerateInteractTelemetryAfterMethod(
    TelemetryRequestFactory.generateBackClickedTelemetry(this.computePageId(this.app.getActiveNavs()[0]), Environment.HOME, false)
  )

  // TODO generate end telemetry
  private showBackToExitToast() {
    this.commonUtilService.showToast('BACK_TO_EXIT');
  }

  computePageId(): string {
    const navObj = this.app.getActiveNavs()[0];
    const currentPage = navObj.getActive().name;
    let pageId = '';
    switch (currentPage) {
      case 'ResourcesPage': {
        pageId = PageId.LIBRARY;
        break;
      }
      case 'CoursesPage': {
        pageId = PageId.COURSES;
        break;
      }
      case 'ProfilePage': {
        pageId = PageId.PROFILE;
        break;
      }
      case 'GuestProfilePage': {
        pageId = PageId.GUEST_PROFILE;
        break;
      }
    }
    return pageId;
  }


  /**
   * Ionic life cycle hook
   */
  ionViewWillLeave(): void {
    this.events.unsubscribe('tab.change');
  }

  subscribeEvents() {
    this.events.subscribe('tab.change', (data) => {
      this.zone.run(() => {
        this.generateInteractEvent(data);
      });
    });

    // this.events.subscribe('generic.event', (data) => {
    //   this.zone.run(() => {
    //     const response = JSON.parse(data);
    //     let action;
    //     try {
    //       action = JSON.parse(response.data.action);
    //     } catch (Error) { }
    //     if (response && response.data.action && response.data.action === 'logout') {
    //       this.authService.getSessionData((session) => {
    //         if (session) {
    //           this.authService.endSession();
    //           (<any>window).splashscreen.clearPrefs();
    //         }
    //         this.profileService.getCurrentUser().then((currentUser: any) => {
    //           const guestProfile = JSON.parse(currentUser);

    //           if (guestProfile.profileType === ProfileType.STUDENT) {
    //             initTabs(this.container, GUEST_STUDENT_TABS);
    //             this.preferences.putString(PreferenceKey.SELECTED_USER_TYPE, ProfileType.STUDENT);
    //           } else {
    //             initTabs(this.container, GUEST_TEACHER_TABS);
    //             this.preferences.putString(PreferenceKey.SELECTED_USER_TYPE, ProfileType.TEACHER);
    //           }

    //           this.event.publish('refresh:profile');
    //           this.event.publish(AppGlobalService.USER_INFO_UPDATED);

    //           this.app.getRootNav().setRoot(TabsPage);

    //         }).catch(() => {
    //         });

    //       });
    //     } else if (response && action && action.actionType === 'connected') {
    //       console.log('connected to openrap device with the IP ' + action.ip);
    //     } else if (response && action && action.actionType === 'disconnected') {
    //       console.log('disconnected from openrap device with the IP ' + action.ip);
    //     } else if (response && response.data.action && response.data.action === EventTopics.COURSE_STATUS_UPDATED_SUCCESSFULLY) {
    //       this.events.publish(EventTopics.COURSE_STATUS_UPDATED_SUCCESSFULLY, {
    //         update: true
    //       });
    //     }
    //   });
    // });

    this.translate.onLangChange.subscribe((params) => {
      if (params.lang === 'ur' && !this.platform.isRTL) {
        this.platform.setDir('rtl', true);
      } else if (this.platform.isRTL) {
        this.platform.setDir('ltr', true);
      }
    });
  }

  generateInteractEvent(pageid: string) {
    // this.telemetryService.interact(generateInteractTelemetry(
    //   InteractType.TOUCH,
    //   InteractSubtype.TAB_CLICKED,
    //   Environment.HOME,
    //   pageid.toLowerCase(),
    //   null,
    //   undefined,
    //   undefined
    // ));
  }

  registerDeeplinks() {
    (<any>window).splashscreen.onDeepLink(deepLinkResponse => {

      console.log('Deeplink : ' + deepLinkResponse);

      setTimeout(() => {
        const response = deepLinkResponse;

        if (response.type === 'dialcode') {
          const results = response.code.split('/');
          const dialCode = results[results.length - 1];
          this.nav.push(SearchPage, { dialCode: dialCode });
        } else if (response.type === 'contentDetails') {
          const hierarchyInfo = JSON.parse(response.hierarchyInfo);

          const content = {
            identifier: response.id,
            hierarchyInfo: hierarchyInfo
          };

          const navObj = this.app.getActiveNavs()[0];

          navObj.push(ContentDetailsPage, {
            content: content
          });
        } else if (response.result) {
          this.showContentDetails(response.result);
        }
      }, 300);
    });
  }

  showContentDetails(content) {
    if (content.contentData.contentType === ContentType.COURSE) {
      console.log('Calling course details page');
      this.nav.push(EnrolledCourseDetailsPage, {
        content: content
      });
    } else if (content.mimeType === MimeType.COLLECTION) {
      console.log('Calling collection details page');
      this.nav.push(CollectionDetailsPage, {
        content: content
      });
    } else {
      console.log('Calling content details page');
      this.nav.push(ContentDetailsPage, {
        content: content
      });
    }
  }

  showAppWalkThroughScreen() {
    // const walkthrough = localStorage.getItem('show_app_walkthrough_screen');
    //   .then(value => {
    //     const val = (value === '') ? 'true' : 'false';
    //     this.preference.putString('show_app_walkthrough_screen', val);
    //   });
    // console.log('open rap discovery enabled', this.appGlobalService.OPEN_RAPDISCOVERY_ENABLED);
  }

  showGreetingPopup() {
    const popover = this.popoverCtrl.create(BroadcastComponent,
      {
        'greetings': 'Diwali Greetings',
        'imageurl': 'https://t3.ftcdn.net/jpg/01/71/29/20/240_F_171292090_liVMi9liOzZaW0gjsmCIZzwVr2Qw7g4i.jpg',
        'customButton': 'custom button',
        'greetingText': 'this diwali may enlighten your dreams'
      },
      { cssClass: 'broadcast-popover' }
    );
    popover.present();
  }

  // TODO: this method will be used to communicate with the openrap device
  openrapDiscovery() {
    if (this.appGlobalService.OPEN_RAPDISCOVERY_ENABLED) {
      console.log('openrap called', this.appGlobalService.OPEN_RAPDISCOVERY_ENABLED);
      (<any>window).openrap.startDiscovery(
        (success) => {
          console.log(success);
        }, (error) => {
          console.log(error);
        }
      );
    }
  }
}
