from contextlib import nullcontext
from re import L
from tracemalloc import start
from bs4 import BeautifulSoup
import requests
import json
import math


# turning course description into prerequisite string
def reqHelper(s: str):
    if not 'requisite' in s:  # if there is no word requisite in the description, just return blank
        return ''
    else:
        # turn all of these words into periods, as we want to end the req string before these words
        s = s.replace('Enrollment', '.')
        s = s.replace('Lottery', '.')
        s = s.replace('Approach', '.')
        s = s.replace('Natural', '.')
        # get everything after the word requisite to the first period
        s_last = s.split('requisite')[1].split('.')[0]
        # get a few letters before that requisite instance (usually pre- or co-)
        s_first = s.split('requisite')[0][-4:]
        return s_first+'requisite'+s_last  # put it all together

# converting a string of time (12:34pm) into an integer


def hourConvertor(h: str):
    # split into minute time and hour time
    minuteTime = int(h[3:5])
    hourTime = int(h[0:2])
    # because we need to account for am and pm, make 12 into 0 (because 12pm happens before 1pm)
    if hourTime == 12:
        hourTime = 0
    # if am time, just multiply by 60 (60 min in a hour), but if pm, need to add 12 to the hours before multiplying
    if h[-2:] == 'am':
        hourTime = hourTime*60
    elif h[-2:] == 'pm':
        hourTime = (hourTime+12)*60
    # combine and return hourtime and minutetime
    hourTime = hourTime+minuteTime
    return hourTime


def timeHelper(hours: str):
    # splitting the time string into the start hour and end hour, putting it through time convertor to change the times into ints
    startHour = hourConvertor(hours[-15:-8])
    endHour = hourConvertor(hours[-7:])
    # finding the days of the week of the class by taking the beginning of the string
    weekDays = hours[:3].replace(' ' or '0', '')

    if len(weekDays) == 1:  # if only one day of the week, make days of the week list into that day
        days = [weekDays]
    elif len(weekDays) == 2:  # if two characters and not 'Th', make list have those two days
        if (weekDays[1] != 'h'):
            days = [weekDays[0], weekDays[1]]
        else:  # if two character but that characters are 'Th', just make the list thursday
            days = [weekDays]
    else:  # if 3 characters, same logic to find if thursday is in there or not
        if (weekDays[2] != 'h'):
            days = [weekDays[0], weekDays[1], weekDays[2]]
        else:
            days = [weekDays[0], weekDays[1:]]

    # looping through the days of the week list, turning the day of the week into the int of minute time
    for i in range(len(days)):
        if days[i] == 'M':
            days[i] = 0
        elif days[i] == 'T':
            days[i] = 1440
        elif days[i] == 'W':
            days[i] = 2880
        elif days[i] == 'Th':
            days[i] = 4320
        else:
            days[i] = 5760

        # adding the start hour and end hour to the list
        days[i] = days[i]+startHour, days[i]+endHour
    return [days]


# main try
try:
    # get first page of fall 2022 classes
    source = requests.get(
        'https://www.haverford.edu/academics/results?semester%5B0%5D=fall_2022&&page=1&per_page=50')

    source.raise_for_status()  # check for issues
    soup = BeautifulSoup(source.text, 'html.parser')
    # find the listed number of search pages at the bottom, getting rid of all the words in the bar
    pages = soup.find('p').text
    pages = pages.replace('Listed', '')
    pages = pages.replace('to', '')
    pages = pages.replace('of', '')
    # split accordingly so we get two ints (how many classes per page, how many classes total)
    divisor = int(pages.split(' ')[3])
    dividend = int(pages.split(' ')[5])
    # divide and round up so that we get the number of pages we need to loop through
    pageNumber = math.ceil(dividend/divisor)

    classTimes = {}  # instantiating empty dicts for times and reqs
    classPrereqs = {}

    for i in range(1, pageNumber):  # loop through all pages
        # get the results at that specific page, raise for status, apply beautiful soup
        source = requests.get(
            'https://www.haverford.edu/academics/results?semester%5B0%5D=fall_2022&&page='+str(i)+'&per_page=50')
        source.raise_for_status()
        soup = BeautifulSoup(source.text, 'html.parser')

        # get a list of the table rows within the search results table
        classes = soup.find('tbody').find_all('tr')
        # for each row, find the inner text of the first element (class title)
        for i in range(len(classes)):
            linkBox = classes[i].find('td').a
            # keep going if lab section (last character is a letter), or if the previous row has the same class title exactly
            if linkBox.text[-1] in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                continue
            if linkBox.text == classes[i-1].find('td').a.text:
                continue
            # create a list of the table columns within the row
            tableBox = classes[i].find_all('td')
            # if the time box has text within it, make it into time list format with helper function
            if tableBox[-2].find('span'):
                newTime = timeHelper(tableBox[-2].find('span').text)
            else:  # otherwise no time (meaning independent study usually)
                newTime = []

            # furthermore, go to the course catalog page of that specific class
            reqSource = requests.get(
                'https://www.haverford.edu' + linkBox['href'])
            soup2 = BeautifulSoup(reqSource.text, 'html.parser')
            # target the text of the course description box in the table, call req helper with it to turn it into req string
            classReqs = soup2.find_all('tr')[9].find_all('td')[1]
            reqs = reqHelper(classReqs.text)

            className = linkBox.text[0:-3]  # set className
            # if className not yet in dict and the req isn't blank, we can add it to our dict
            if className not in classPrereqs and reqs != []:
                classPrereqs[className] = reqs
            # if className not yet in times, we can add it
            if className not in classTimes:
                classTimes[className] = newTime
            # if className in times, but the time we have is not equal to the one currently there, we can combine the times
            elif className in classTimes and newTime != classTimes[className]:
                classTimes[className] += newTime

    print('done')  # print when done

    with open('times.json', 'w') as fp:  # export the two dictionaries into files
        json.dump(classTimes, fp)
    with open('prereqs.json', 'w') as fp:
        json.dump(classPrereqs, fp)


except Exception as e:  # catch exceptions
    print(e)
