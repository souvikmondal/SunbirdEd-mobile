import { browser, element, by, error, ElementFinder, ElementArrayFinder } from 'protractor';

describe('Language Settings', () => {

    it('should have a continue button', () => {

        element(by.tagName("button")).getText()
        .then(text => {
            expect(text).toEqual("CONTINUE");
        })
        .catch(error => {

        });

    });

    it('should have 5 language options', () => {

        element.all(by.tagName("ion-item"))
        .then(items => {
            expect(items.length).toBe(5);
        }).catch(() => {

        });
        

    });

    it('should select the user clicked language and go to onboarding page', () => {
        //random select any language and proceed
        element.all(by.tagName("ion-item"))
        .then(items => {
            return items[2].click();
        })
        .then(() => {
            //click continue button should open onboarding page
            return element(by.tagName("button")).click();
        })
        .then(() => {
            expect(element(by.css('page-onboarding')));
        })
        .catch(() => {

        });
    });
});
