// Shortcuts
function clickElementById(elementId) {
    var element = document.getElementById(elementId);
    if (element) {
        element.click();
        console.log('Element clicked:', elementId);
        return true;
    } else {
        console.log('Element not found:', elementId);
        return false;
    }
}

function clickElementByOnclick(onclickValue) {
    var element = document.querySelector(`[onclick*="${onclickValue}"]`);
    console.log('Element:', element);
    if (element) {
        console.log('Clicking element onclickvalue', onclickValue);
        element.click();
        return true;
    } else {
        console.log('Element not found onclickvalue', onclickValue);
        return false;
    }
}

function clickFirstPrinter() {
    // print the element with onclick containing ctl00$ContentPlaceHolder1$MenuPrint and class popout-dynamic level2 dynamic
    var element = document.querySelector('[onclick*="ctl00$ContentPlaceHolder1$MenuPrint"][class="popout-dynamic level2 dynamic"]');
    if (element) {
        element.click();
        return true;
    } else {
        return false;
    }
}

function clickElementByClass(className) {
    var elements = document.getElementsByClassName(className);
    if (elements.length > 0) {
        var lastElement = elements[elements.length - 1]; // Get the last element
        lastElement.click(); // Click the last element with the class
        console.log('Element clicked class', className);
        console.dir(lastElement); // Log all properties of the clicked element
        return true;
    }
    else {
        console.log('no Element clicked class', className);
        return false;
    }
}

function GenericClicker(valueName, value) {
    var elements = document.querySelectorAll(`[${valueName}="${value}"]`);
    if (elements.length > 0) {
        var element = elements[0]
        console.log('Clicking element', valueName, value);
        element.click();
        return true;
    } else {
        console.log('Element not found', valueName, value);
        return false;
    }
}



// Click element based on this sequence : must be in the subtree of the first element with 'class=level1 dynamic'.
// Then look for the first element with 'class=level3 dynamic' and 'description=description'.
// If there's none, click the first element with 'class=level2 dynamic' and 'description=description'
function submenuW(description) {
    var level1Element = document.getElementsByClassName('level1 static')[0];
    console.log('level1Element', level1Element);
    if (level1Element) {
        var level3Element = Array.from(level1Element.getElementsByClassName('level3 dynamic')).find(function (element) {
            return element.innerText.includes(description) && element.hasAttribute('tabindex');
        });
        console.log('level3Element', level3Element);
        if (level3Element) {
            level3Element.click();
            console.log('Element clicked:', level3Element);
            return true;
        } else {
            var level2Element = Array.from(level1Element.getElementsByClassName('level2 dynamic')).find(function (element) {
                return element.innerText.includes(description) && element.hasAttribute('tabindex');
            });
            console.log('level2Element', level2Element);
            if (level2Element) {
                level2Element.click();
                console.log('Element clicked:', level2Element);
                return true;
            }
        }
    }
    console.log('No elements found', description);
    return false;
}



// Click element based on this sequence : must be in the subtree of the first element with 'class=level1 dynamic'.
function clickElementByChildtextContent(childtextContent) {
    var elements = document.querySelectorAll('span.mat-button-wrapper');
    console.log('click element by child context clicking first one in list', elements);
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].textContent === childtextContent) {
            elements[i].parentNode.click();
            return true
        }
    }
    console.log('No elements found', childtextContent);
    return false
}
