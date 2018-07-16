import { Component } from '@angular/core';
import { ViewController, NavParams } from 'ionic-angular';
@Component({
    selector: 'upgrade-popover',
    templateUrl: 'upgrade-popover.html'
})

export class UpgradePopover {

    upgradeType: any;

    upgradeTitle: string;
    upgradeContent: string;
    isMandatoryUpgrade: boolean = false;

    constructor(private navParams: NavParams,
        private viewCtrl: ViewController) {
        this.upgradeType = this.navParams.get('type');

        console.log("Upgrade type in Popover  - type - " + JSON.stringify(this.upgradeType));

        if (this.upgradeType.optional === "forceful") {
            this.isMandatoryUpgrade = true;
        }

    }

    upgrade(link) {
        let appId = link.substring(link.indexOf("=") + 1, link.lenght);
        (<any>window).genieSdkUtil.openPlayStore(appId);
        this.viewCtrl.dismiss();
    }

    cancel() {
        this.viewCtrl.dismiss();
    }

}