import { browser, element, by, error, ElementFinder, ElementArrayFinder, protractor } from 'protractor';

describe('Language Settings', () => {

    let continueBtn: ElementFinder, langugaeList: ElementFinder;

    beforeEach(done => {
        browser.get("/#page-language-settings")
        continueBtn = element(by.tagName("button"));
        langugaeList = element(by.tagName("ion-item"));
    });

    it('should have a continue button', done => {

        browser.waitForAngular();

        continueBtn.getText()
        .then(text => {
            expect(text).toEqual("CONTINUE");
            done();
        })
        .catch(error => {
            console.log(error);
        });

    }, 60000);

    it('should select the user clicked language and go to onboarding page', done => {

        browser.waitForAngular();

        browser.wait(protractor.ExpectedConditions.elementToBeClickable(langugaeList), 5000)
        .then(() => {
            return langugaeList.click();
        })
        .then(() => {
            return browser.wait(protractor.ExpectedConditions.elementToBeClickable(continueBtn), 5000);
        })
        .then(() => {
            return continueBtn.click();
        })
        .then(() => {
            expect(element(by.css('page-onboarding')));
            done();
        })
        .catch((error) => {
            console.log("souviksouviksouviksouviksouviksouviksouviksouviksouvik");
            console.log(error);
        });
    }, 60000);
});
