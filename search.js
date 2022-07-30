let row = document.getElementById('PTS_RSLTS_LIST$0_row_0')
numberCourses = document.getElementsByClassName('ps_grid-row psc_rowact psc_display-inlineblock').length
var port = chrome.runtime.connect({name:"background"});


for (let i = 0; i < numberCourses; i++) {
    if (document.getElementById('PTS_LIST_TITLE$'+i)==null) {
        numberCourses++
        continue
    } 

    const classTitle = document.getElementById('PTS_LIST_TITLE$'+i).innerText.replaceAll(' ','').replaceAll('<b>', '').replaceAll('</b>', '')
    port.postMessage({className: classTitle})
}

var x = 0
port.onMessage.addListener(function(msg){

    if (msg.notice == '') {
        const newText = document.createElement('div')
        newText.innerHTML = msg.classPrereq
        document.getElementById('PTS_RSLTS_LIST$0_row_'+x).appendChild(newText)
        document.getElementById('PTS_RSLTS_LIST$0_row_'+x).style.background = msg.color
        x++
    }
    else {
        //figure out how to stop after one message is received.
        console.log(msg.notice)
        //chrome.runtime.port.disconnect()
    }
    
    



});
