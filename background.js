//setting global variables
var enrolledClasses = []
var inc = 0
var prereqs = []
var times = []

//setter functions
function setEnrolledClasses(e) {
    enrolledClasses = e
}

function setInc(x) {
    inc = x
}

function setPrereqs(p) {
    prereqs = p
}

function setTimes(t) {
    times = t
}


//async function that connects with the search.js script
chrome.runtime.onConnect.addListener(async function(port){
    //every time a message (object) is received from the port...
    console.assert(port.name === "background"); 
    port.onMessage.addListener(function(msg) { 

        //req is equal to the prereq of the class we received
        req = prereqs[msg.className]

        //if undefined, set it to blank, instead of undefined (so it prints nothing instead of printing undefined on the content page)
        if (req == undefined) {
            req = ''
        }
        //similarly, t is the time of the class we received
        t = times[msg.className]

        //if undefined or empty (usually independent study), set color to green, because this most likely means that it works with schedule, 
        //otherwise, calculate the color of the row given the class time, and the list of class times of enrolled classes
        if (t == undefined || t == [] || t.length == 0) {
            c = '#9af5b2'
        }
        else {
            c = timeIntersect(t, enrolledClasses)
        }

        //return the msg with the prereq text, the color of the row, and a notice if we don't yet have the list of enrolled classes
        port.postMessage({classPrereq: req, color: c, x:inc});
        //increment is so that the color is assigned to the correct row in the search menu 
        //(everytime we send a message, inc by one so the next message applies to the next box)
        inc++
    });
});


//helper function to calculate if 2 time intervals (4 bounds) have overlap
function has_overlap(a_start, a_end, b_start, b_end) {
    latest_start = Math.max(a_start, b_start)
    earliest_end = Math.min(a_end, b_end)
    return latest_start < earliest_end
}
    
//calculating if a given class time intersects a list of class times
function timeIntersect(class1, classList) {

    len = classList.length  //length of the entire list (which has been concatenated into the form [])
    //if the class time is empty or undefined (basically not a standard time), we can make it green 
    //because it is most likely an independent study or research
    if (class1==[] || class1==undefined || class1.length == 0) {
        return '#9af5b2' //green
    }
    else {
        len2 = class1[0].length //=(how many different weekdays the class meets)
    }


    for (i=0; i<len; i++) { //looping through each class in classlist
        //looping through each meeting time of i (will give us terms in the form [start, end], 
        //assuming we have only one section of the class)
        for (j=0; j<classList[i][0].length; j++) { 
            count = 0 //count of overlaps, i.e. checking for each possible section of class1, does it overlap?
            for (k=0; k<class1.length; k++) { //looping through every possible section the class meets
                overlap = false //set overlap to false for this specific section in the search tab
                //looping through every day of the week meeting time of class1 (will give us terms in the form [start, end])
                for (l=0; l<class1[k].length; l++) { 
                    //checking overlap between the two sets of times in enrolledClasses and search tab
                    if (has_overlap(class1[k][l][0], class1[k][l][1], classList[i][0][j][0], classList[i][0][j][1])) {
                        
                        overlap = true
                    }
                }
                //if out of all the possible time combinations between two class sections, there is overlap, increment count
                if (overlap==true) {
                    count = count+1
                }
            }

            //if the amount of overlaps = amount of possible sections, there is no way to make it work w/ schedule
            if (count == class1.length) {
                return '#ed9194' //red

            }
            
        }

    }
    //otherwise, the class works with our schedule, so return light green
    return '#9af5b2' //green
}

//helper function to change a list of classname strings into a list in our int list time format
function createTimeList(classList, timeList) {
    enrolledClassList = []
    if (classList) { //if classList exists, read its length
        l = classList.length
    }

    //for every item at pos i in the classList, find that class' time and put that term at position i in the new list we are making
    for (i=0; i<l; i++) {
        if (timeList[classList[i]].length!=1) { //if multiple sections of the enrolled class, just take the 1st one
            enrolledClassList[i]=[timeList[classList[i]][0]]
        }
        else {
            enrolledClassList[i]= timeList[classList[i]]
        }
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
    //setting global prereqs and times to the results of the await commands from the dicts
    p= await getJSON(chrome.runtime.getURL('prereqs.json'));
    t = await getJSON(chrome.runtime.getURL('times.json'));
    setPrereqs(p)
    setTimes(t)

    //montioring what tab we are on, in order to launch certain content scripts
    chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo, tab) {
        if (changeInfo.status == 'complete') {
            if (tab.url.includes("vbm.brynmawr.edu")) {
                //if we are at bionic, and the specific tab url is that of the 'view my classes' tab, launch content.js
                if (tab.url.includes("SSR_STUDENT_FL.SSR_MD_SP_FL.GBL")) {
                    chrome.scripting.executeScript( {
                        files: ["content.js"],
                        target: {tabId: tab.id}
                    });
                }
                //similarly, if we are at the search page...
                if (tab.url.includes('SSR_STUDENT_FL.SSR_CLSRCH_ES_FL.GBL')) {  
                    await chrome.storage.local.get('enrolledClasses', async function(result) { //finding enrolled classes from storage
                        ec = result.enrolledClasses
                        //if enrolled classes has been found...
                        if (ec !=undefined) {
                            setInc(0) //reset inc
                            //make ec into a timelist, set global variable enrolled classes to that result
                            eClass = createTimeList(ec, times) 
                            setEnrolledClasses(eClass)

                            chrome.scripting.executeScript( {    //execute search.js
                                files: ["search.js"],
                                target: {tabId: tab.id}
                            });
                        }
                        //if enrolled classes has not yet been found
                        else {
                            console.log('enrolled classes not found yet')
                            //still reset inc, but now execute upload instead of search
                            setInc(0)
                            chrome.scripting.executeScript( {
                                files: ["upload.js"],
                                target: {tabId: tab.id}
                            });
                        }
                    })
                }
            }
        }
    });
}

main();