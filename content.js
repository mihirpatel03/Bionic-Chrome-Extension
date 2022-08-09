//scraping the classes the student is enrolled in from the webpage
function getEnrolled() { 
    //find the number of classes by checking for how many rows there are, setting length and empty class list
    let numClass = document.getElementsByClassName('ps_grid-flex')
    const l = numClass.length
    classes = []
    //looping through classes
    for (var i = 0; i<l; i++) {
        //if the title attribute has component details, 
        if (numClass[i].getAttribute('title').includes('Component Details')) {
            //strip it so its just the class title, add it to the classlist
            let className = numClass[i].getAttribute('title').replaceAll('Component Details - ', '').replaceAll(' ', '')
            classes.push(className)
        }
    }
    return classes //return the resulting list
}

//MUTATION OBSERVER
//we are targeting the page info element, looking specifically at its attributes
const target = document.getElementById("pt_pageinfo");
const config = { attributes: true }; //const config = { attributes: true, childList: true, subtree: true };


// Callback function to execute when mutations are observed
const callback = function(mutationList, observer) {

    for (const mutation of mutationList) {
        //if one of the mutations is the attribute page of pt_pageinfo, and we were on a certain page
        if (mutation.attributeName === "page") {
            if (document.getElementById("pt_pageinfo").getAttribute('page')=='SSR_VW_CLASS_FL') {
                //call enrolled classes function
                var enrolledClasses = getEnrolled();

                //push that to local storage, and confirm on the console
                chrome.storage.local.set({enrolledClasses: enrolledClasses}, function() {
                    console.log('stored enrolled classes');
                }); 
                //stop observing for changes to the page, break out of the loop
                observer.disconnect()
                break
            }
        }
    }
};
//calling the mutation observer on the specified node.
const observer = new MutationObserver(callback);
observer.observe(target, config);



