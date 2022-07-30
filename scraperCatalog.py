from contextlib import nullcontext
from re import L
from tracemalloc import start
from bs4 import BeautifulSoup
import requests
import json
import math


def reqHelper(s: str):
    if not 'requisite' in s:
        return ''
    else:
        s = s.replace('Enrollment', '.')
        s = s.replace('Lottery', '.')
        s = s.replace('Approach', '.')
        s = s.replace('Natural', '.')
        s_last = s.split('requisite')[1].split('.')[0]
        s_first = s.split('requisite')[0][-4:]
        return s_first+'requisite'+s_last


def hourConvertor(h: str):
    minuteTime = int(h[3:5])
    hourTime = int(h[0:2])
    if hourTime == 12:
        hourTime = 0
    if h[-2:] == 'am':
        hourTime = hourTime*60
    elif h[-2:] == 'pm':
        hourTime = (hourTime+12)*60
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


try:
    source = requests.get(
        'https://www.haverford.edu/academics/results?semester%5B0%5D=fall_2022&&page=1&per_page=50')
    # 'https://www.haverford.edu/academics/results?semester%5B0%5D=fall_2022&department%5B0%5D=Computer%20Science&&page=1&per_page=50')
    source.raise_for_status()

    soup = BeautifulSoup(source.text, 'html.parser')
    pages = soup.find('p').text
    pages = pages.replace('Listed', '')
    pages = pages.replace('to', '')
    pages = pages.replace('of', '')

    divisor = int(pages.split(' ')[3])
    dividend = int(pages.split(' ')[5])
    pageNumber = math.ceil(dividend/divisor)
    #pageNumber = 10

    classTimes = {}
    classPrereqs = {}

    for i in range(1, pageNumber):

        source = requests.get(
            'https://www.haverford.edu/academics/results?semester%5B0%5D=fall_2022&&page='+str(i)+'&per_page=50')
        # 'https://www.haverford.edu/academics/results?semester%5B0%5D=fall_2022&department%5B0%5D=Computer%20Science&&page=' + str(i) + '&per_page=50')
        source.raise_for_status()

        soup = BeautifulSoup(source.text, 'html.parser')

        classes = soup.find('tbody').find_all('tr')

        for i in range(len(classes)):
            linkBox = classes[i].find('td').a
            if linkBox.text[-1] in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                continue
            if linkBox.text == classes[i-1].find('td').a.text:
                continue
            tableBox = classes[i].find_all('td')
            # print(tableBox[4].find('span'))
            if tableBox[-2].find('span'):
                newTime = timeHelper(tableBox[-2].find('span').text)
            else:
                newTime = []

            reqSource = requests.get(
                'https://www.haverford.edu' + linkBox['href'])
            soup2 = BeautifulSoup(reqSource.text, 'html.parser')
            classReqs = soup2.find_all('tr')[9].find_all('td')[1]
            reqs = reqHelper(classReqs.text)

            className = linkBox.text[0:-3]
            if className not in classPrereqs and reqs != []:
                classPrereqs[className] = reqs
            if className not in classTimes:
                classTimes[className] = newTime
            elif className in classTimes and newTime != classTimes[className]:
                classTimes[className] += newTime

    # print(classPrereqs)
    # print(classTimes)
    print('done')

    with open('times.json', 'w') as fp:
        json.dump(classTimes, fp)
    with open('prereqs.json', 'w') as fp:
        json.dump(classPrereqs, fp)


except Exception as e:
    print(e)
