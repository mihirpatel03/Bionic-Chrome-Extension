var enrolledClasses = []

//listener function in communication with the search.js content script
function setPage(prereqs, times, enrolledClasses, notice) {

    chrome.runtime.onConnect.addListener(function(port){
        console.assert(port.name === "background");
        //every time a message (object) is received from the port called background...
        port.onMessage.addListener(function(msg) {
            //req is equal to the prereq of the class we received
            req = prereqs[msg.className]



            //if undefined, set it to blank, instead of undefined (so it prints nothing instead of printing undefined on the content page)
            if (req == undefined) {
                req = ''
            }
            //similarly, t is the time of the class we received
            t = times[msg.className]

            // console.log(times['MATHH333A'].length)
            // c = 'white'

            //if undefined or empty (usually independent study), set color to green, because this most likely means that it works with schedule, 
            //otherwise, calculate the color of the row given the class time, and the list of class times of enrolled classes
            if (t == undefined || t == [] || t.length == 0) {
                c = 'lightgreen'
            }
            else {
                c = timeIntersect(t, enrolledClasses)
            }


            //return the msg with the prereq text, the color of the row, and a notice if we don't yet have the list of enrolled classes
            port.postMessage({classPrereq: req, color: c, notice: notice});
        });
    });
}

//helper function to calculate if 2 time intervals (4 bounds) have overlap
function has_overlap(a_start, a_end, b_start, b_end) {
    latest_start = Math.max(a_start, b_start)
    earliest_end = Math.min(a_end, b_end)
    return latest_start < earliest_end
}
    
//calculating if a given class time intersects a list of class times
function timeIntersect(class1, classList) {

    len = classList.length  //length of the entire list (which has been concatenated into the form [])
    if (class1==[] || class1==undefined || class1.length == 0) {
        return 'lightgreen'
    }
    else {
        len2 = class1[0].length //length of the class1 within first brackets (i.e. how many different weekdays the class meets)
    }

    //HAVE TO FIGURE OUT WAY FOR WHEN TWO CLASSES
    for (i=0; i<len; i++) { //looping through each class in classlist
        for (j=0; j<classList[i][0].length; j++) { //looping through each meeting time of i (will give us terms in the form [start, end])
            count = 0
            for (k=0; k<class1.length; k++) {
                overlap = false
                for (l=0; l<class1[k].length; l++) { //looping through every meeting time of class1 (will give us terms in the form [start, end])
                    if (has_overlap(class1[k][l][0], class1[k][l][1], classList[i][0][j][0], classList[i][0][j][1])) {
                        //if has overlap, return red. If none of these possible combinations have overlap, return green
                        overlap = true
                        //return 'indianred'
                    }
                }
                if (overlap==true) {
                    count = count+1
                }
            }
            // console.log(count)
            // console.log(class1.length)
            // console.log('--------------------')
            if (count == class1.length) {
                return 'indianred'
            }
            
            //have a loop in the innermost for looking at the class1 if multiple different class periods in search
        }

    }
    return 'lightgreen'
}

//helper function to change a list of classname strings into a list in our int list time format
function createTimeList(classList, timeList) {
    enrolledClassList = []
    l = classList.length
    //for every item at pos i in the classList, find that class' time and put that term at position i in the new list we are making
    for (i=0; i<l; i++) {
        enrolledClassList[i]= timeList[classList[i]]
    }
    return enrolledClassList
}

//async fetch function to get the json from a json file (used for our prereqs and times dictionaries)
async function getJSON(url) {
    let response = await fetch(url);
    let data = await response.json()
    return data;
}

//main function (async because we need to use await commands with the getJSON() function)
async function main() {
    //montioring what tab we are on, in order to launch certain content scripts
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status == 'complete') {
            if (tab.url.includes("vbm.brynmawr.edu")) {
                //if we are at bionic, and the specific tab url is that of the 'view my classes' tab, launch content.js
                if (tab.url.includes("SSR_STUDENT_FL.SSR_MD_SP_FL.GBL")) {
                    chrome.scripting.executeScript( {
                        files: ["content.js"],
                        target: {tabId: tab.id}
                    });
                }
                //similarly, if we are at the search page, launch search.js
                if (tab.url.includes('SSR_STUDENT_FL.SSR_CLSRCH_ES_FL.GBL')) {
                    chrome.scripting.executeScript( {
                        files: ["search.js"],
                        target: {tabId: tab.id}
                    });
                }
            }
        }
    });

    //use fetch commands to create dictionaries for prereqs and times
    prereqs = await getJSON(chrome.runtime.getURL('prereqs.json'));
    times = await getJSON(chrome.runtime.getURL('times.json'));
    //use chrome storage to get our enrolled classes that we uploaded from the 'view my classes' tab
    enrolled = await chrome.storage.local.get('enrolledClasses')
    //if we have not uploaded them yet, make a notice to please do that, which will get passed to the search page
    if (enrolled!='undefined') {
        notice = ''
    }
    else {
        notice = 'please visit the "View My Classes" tab first'
    }
    //create the timeList from list of class name strings and 
    enrolledClasses = createTimeList(enrolled.enrolledClasses, times)
    setPage(prereqs, times, enrolledClasses, notice)


}

main();