//finding the number of courses displayed on this search page
numberCourses = document.getElementsByClassName('ps_grid-row psc_rowact psc_display-inlineblock').length

var port = chrome.runtime.connect({name:"background"}); //instantiating the port to connect with background page

//looping through the courses on the search page
for (let i = 0; i < numberCourses; i++) {
    //the links don't count up in order (skip some numbers), so if no element exists at the increment, 
    //add one to the range of the loop, and continue to the next level of i
    if (document.getElementById('PTS_LIST_TITLE$'+i)==null) {
        numberCourses++
        continue
    } 
    //find the classtitle by getting the inner text, removing any tags or spaces
    const classTitle = document.getElementById('PTS_LIST_TITLE$'+i).innerText.replaceAll(' ','').replaceAll('<b>', '').replaceAll('</b>', '')
    port.postMessage({className: classTitle}) //send message to background script with class title
}

var stopLook = false //setting stopLook to false, variable the affects when we stop using the message listener
port.onMessage.addListener(function(msg){
    if (stopLook == false) { //given its false, look for the message from background
        //create a div element for the prereq string, display it within the box on search page
        const newText = document.createElement('div')
        newText.innerHTML = msg.classPrereq
        document.getElementById('PTS_RSLTS_LIST$0_row_'+msg.x).appendChild(newText)
        //make the color of the box whatever the message tells us
        document.getElementById('PTS_RSLTS_LIST$0_row_'+msg.x).style.background = msg.color

        //if the increment counter has reached the number of courses on the page, stop operating
        if (msg.x>=numberCourses) {
            console.log('done')
            stopLook = true
        }
    }
});


