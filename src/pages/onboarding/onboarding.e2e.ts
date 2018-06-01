import { browser, element, by } from "protractor";

describe("Onboarding Screen", () => {

    it('should have 2 buttons', () => {
        element.all(by.tagName("button"))
        .then(items => {
            expect(items.length).toBe(2);
        })
        .catch(() => {

        });
    });


});