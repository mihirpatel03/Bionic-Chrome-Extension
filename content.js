function getEnrolled() {
    let numClass = document.getElementsByClassName('ps_grid-flex')
    const l = numClass.length
    classes = []
    for (var i = 0; i<l; i++) {
        if (numClass[i].getAttribute('title').includes('Component Details')) {
            let className = numClass[i].getAttribute('title').replaceAll('Component Details - ', '').replaceAll(' ', '')
            classes.push(className)
        }
    }
    checkedEnrolled = true
    return classes
}

//MUTATION OBSERVER
//we are targeting the page info element, looking specifically at its attributes
const targetNode = document.getElementById("pt_pageinfo");
const config = { attributes: true }; //const config = { attributes: true, childList: true, subtree: true };


// Callback function to execute when mutations are observed
const callback = function(mutationList, observer) {

    for (const mutation of mutationList) {
        //if one of the mutations is the attribute page of pt_pageinfo, then call the pastCourses function
        if (mutation.attributeName === "page") {
            if (document.getElementById("pt_pageinfo").getAttribute('page')=='SSR_VW_CLASS_FL') {
                var enrolledClasses = getEnrolled();
                console.log(enrolledClasses)

                // if (chrome.storage.local.get('enrolledClasses')!= enrolledClasses) {
                //     chrome.storage.local.set({enrolledClasses: enrolledClasses}, function() {
                //         console.log('stored enrolled classes');
                //     });
                chrome.storage.local.get(['enrolledClasses'], function(result) {
                    //console.log('Value currently is ' + result.enrolledClasses);
                    if (result.enrolledClasses != enrolledClasses) {
                        chrome.storage.local.set({enrolledClasses: enrolledClasses}, function() {
                            console.log('stored enrolled classes');
                        }); 
                    }
                });
                observer.disconnect()
                break
            }
        }
    }
};

const observer = new MutationObserver(callback);
observer.observe(targetNode, config);



