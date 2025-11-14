# Busbus

Ljubljana (Slovenia) public transport arrivals and bus tracker.

Made in Node.js (Express), NeDB database, self hosted on Raspberry Pi 5.

Demo: [Here](https://strojcek.ftp.sh/busbus/)

## Functionality

- Allows quick displaying bus arrivals with search history.
- Clicking the line number (i. e. "3G") displays a map of Ljubljana with live buse updates.
- Click on the bus icon displays additional information and bus ratings
- Users can rate buses and drivers and their reviews are published live on the map.

## Usage

1. Enter the station name into the search field (e.g. 'Drama')
2. Choose one of the directions (TO CENTER / OUT OF CENTER)
3. On the arrivals timetable, you can click on bus numbers to display the map of the buses
4. Clicking on the bus icon opens the bus details with links to \[share\] or \[rate\] the bus and driver.

## Disclaimer

The project was since its initial state later expanded to support custom user pages with special functionality, like custom backgrounds and other visual effects. Later I added a custom UI for sending messages to specific usres, to surprise my friends. For this to work without login, I experimented with grouping user requests into clusters or "profiles", which could be then interpreted as a user and the message could be sent to them. All users of this project (together with me there were 4, haha) were my good friends, familiar with its workings and together we used it daily for commuting.

The project was not intended to be published. It is currently still live and code is temporarily made public.
