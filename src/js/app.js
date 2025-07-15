const { crsList } = require("./crs");
const { stationsList } = require("./stations");
const UI = require('ui');
const ajax = require('ajax');

const mainMenuItems = [{
    title: 'Favourites',
    subtitle: 'Your saved stations'
}, {
    title: 'List',
    subtitle: 'Show all stations'
}, {
    title: 'About',
    subtitle: 'About this app'
}];

const mainMenu = new UI.Menu({
    sections: [{
        title: "Train Times",
        items: mainMenuItems
    }]
});

mainMenu.show();
mainMenu.on('select', function(e) {
    if (e.itemIndex === 0) showFavourites();
    if (e.itemIndex === 1) showAZList();
    if (e.itemIndex === 2) about();
});

function about() {
    const card = new UI.Card({
        title: "Train Times",
        scrollable: true,
        body: "© Kieron Quinn 2025\n\nData provided by National Rail, using realtime information from the Live Departure Information boards\n\nStation list from github.com/davwheat/uk-railway-stations under the ODbL License\n\n\Source available at github.com/KieronQuinn/pebble-train-times-gb",
        style: "small"
    });
    card.show();
}

function showFavourites() {
    const storage = localStorage.getItem('favourites');
    let favouriteStationCRS = "";
    if (storage !== null) favouriteStationCRS = storage.split(",");
    const stationList = [];
    for (let i = 0; i < favouriteStationCRS.length; i++) {
        if (crsList.indexOf(favouriteStationCRS[i]) > -1) {
            const stationName = getStationNameForCRS(favouriteStationCRS[i]);
            stationList.push({
                title: stationName,
                subtitle: favouriteStationCRS[i]
            });
        }
    }
    if (stationList.length > 0) {
        const stationMenu = new UI.Menu({
            sections: [{
                title: "Favourites",
                items: stationList
            }]
        });
        stationMenu.on('select', function(e) {
            showDepArr(favouriteStationCRS[e.itemIndex], e.item.title);
        });
        stationMenu.show();
    } else {
        const card = new UI.Card({
            scrollable: true,
            title: "Favourites",
            body: "No favourites yet, find your favourite station in the Station List and add it to your favourites for it to appear here",
            style: "small"
        });
        card.show();
    }
}

function showDepArr(crs, station) {
    let fav = "Add station to favourites";
    const storage = localStorage.getItem('favourites');
    let isFav = false;
    if (storage !== null && storage.indexOf(crs) != -1) {
        fav = "Remove station from favourites";
        isFav = true;
    }
    const depArr = new UI.Menu({
        sections: [{
            title: station,
            items: [{
                title: "Departures"
            }, {
                title: "Arrivals"
            }, {
                title: "Favourite",
                subtitle: fav
            }]
        }]
    });
    depArr.show();
    depArr.on('select', function(e) {
        if (e.itemIndex === 0) showDepartures(crs, station);
        if (e.itemIndex === 1) showArrivals(crs, station);
        if (e.itemIndex === 2) {
            if (!isFav) addFavourite(crs);
            else removeFavourite(crs);
            depArr.hide();
        }
    });
}

function addFavourite(crs) {
    let storage = localStorage.getItem('favourites');
    let favs = storage ? storage.split(',') : [];
    if (!favs.includes(crs)) {
        favs.push(crs);
    }
    localStorage.setItem('favourites', favs.join(','));
}

function removeFavourite(crs) {
    let storage = localStorage.getItem('favourites');
    let favs = storage ? storage.split(',') : [];
    favs = favs.filter(item => item !== crs);
    localStorage.setItem('favourites', favs.join(','));
}

function showDepartures(crs, station) {
    const url = 'https://realtime.nationalrail.co.uk/ldbcis/departures.aspx?u=039B1CD1-14D4-4CB9-83B1-A84CC3AEDF83&crs=' + crs + '&H=1080';
    ajax({
            url: url
        },
        function(data) {
            const trainInfo = parseBody(data);
            showList(trainInfo, station, 'Departures');
        },
        function(error) {
            console.log("Error loading " + url);
        }
    );
}

function showArrivals(crs, station) {
    const url = 'https://realtime.nationalrail.co.uk/ldbcis/arrivals.aspx?u=039B1CD1-14D4-4CB9-83B1-A84CC3AEDF83&crs=' + crs + '&H=1080';
    ajax({
            url: url
        },
        function(data) {
            const trainInfo = parseBody(data);
            trainInfo.name = getStationNameForCRS(crs);
            showList(trainInfo, station, 'Arrivals');
        },
        function(error) {
            console.log("Error loading " + url);
        }
    );
}

function formatTime(time) {
    if (time.length == 4) return time.substring(0, 2) + ":" + time.substring(2, 4);
    if (time.length == 3) return time.substring(0, 1) + ":" + time.substring(1, 3);
}

function showList(trainInfo, station, deparr) {
    const items = [];
    for (let i = 0; i < trainInfo.length; i++) {
        const info = trainInfo[i];
        let timeDesc = info.timeDesc;
        let platform = "";
        if (info.platform) {
            if (info.platform == "BUS" || info.platform == "Bus") {
                platform = "BUS" + " ";
                trainInfo[i].platform = "Rail Replacement Bus Service";
            } else {
                platform = "PL" + info.platform + " ";
                trainInfo[i].platform = "Platform " + info.platform;
            }
        }
        if (timeDesc != "On Time" && timeDesc != "Delayed" && timeDesc != "Cancelled") {
            timeDesc = "Exp " + formatTime(timeDesc);
            trainInfo[i].timeDesc = "Expected at " + formatTime(info.timeDesc);
        }
        if (timeDesc != "Cancelled") {
            trainInfo[i].calling = "Calling at: " + info.calling;
        }
        items.push({
            title: info.destination,
            subtitle: platform + formatTime(info.time) + " (" + timeDesc + ")"
        });
    }

    const trains = new UI.Menu({
        sections: [{
            title: deparr + " (" + station + ")",
            items: items
        }]
    });
    if (items.length === 0) {
        items.push({
            title: "No trains found"
        });
    } else {
        trains.on('select', function(e) {
            showDetails(trainInfo[e.itemIndex]);
        });
    }
    trains.show();
}

function showDetails(trainInfo) {
    let platform = "";
    if (trainInfo.platform) platform = trainInfo.platform + "\n";
    const card = new UI.Card({
        title: trainInfo.destination,
        subtitle: formatTime(trainInfo.time) + "\n" + trainInfo.timeDesc,
        scrollable: true,
        body: platform + trainInfo.calling,
        style: "small"
    });
    card.show();
}

function getStationNameForCRS(crs) {
    for (let i = 0; i < crsList.length; i++) {
        if (crsList[i] == crs) {
            return stationsList[i];
        }
    }
    return "";
}

function parseBody(body) {
    const trainInfo = [];
    const callingLists = body.split("calling_list");
    for (let i = 1; i < callingLists.length; i++) {
        let string = callingLists[i];
        if (string.indexOf("<div>") != -1) string = string.substring(0, string.indexOf("<div>"));
        if (string.indexOf("</div>") != -1) string = string.substring(0, string.indexOf("</div>"));
        string = string.substring(string.indexOf("<"), string.length);
        const regex = /(<([^>]+)>)/ig;
        string = string.replace(regex, "").replace(/\r?\n|\r/g, "").replace(/\(/g, " (").replace("Service from:", "").replace("Calling at:", "").replace(/&amp;/g, "&").replace(/  /g, "");
        if (callingLists[i].indexOf("LastReportLabel") > -1) {
            let lastReport = callingLists[i].substring(callingLists[i].indexOf("LastReportLabel"));
            lastReport = lastReport.substring(lastReport.indexOf(">") + 1);
            lastReport = lastReport.substring(0, lastReport.indexOf("</div>")).replace(regex, "").replace(/\r?\n|\r/g, " ").replace(/\s{2,}/g, " ").trim();
            string += "\n" + lastReport;
        }
        string = string.replace(/([0-9]{1,2})([0-9]{2})/g, "$1:$2");
        callingLists[i] = string;
    }
    const trainStation = body.split("<tr id=\"trainStation");
    for (let i = 1; i < trainStation.length; i++) {
        let string = trainStation[i];
        string = string.substring(0, string.indexOf("</tr>"));
        let destination = string.substring(string.indexOf("<td class=\"no_border\">") + 22, string.length).replace('<span class="via_text">', "").replace("</span>", "");
        destination = destination.substring(0, destination.indexOf("</td>"));
        let platform = "";
        if (string.indexOf('platform"/>') == -1) {
            platform = string.substring(string.indexOf("<td class=\"centre_col no_border platform\">") + 42, string.length);
            platform = platform.substring(0, platform.indexOf("</td>"));
        }
        let time = string.substring(string.indexOf("<td class=\"centre_col no_border\">") + 33, string.length);
        time = time.substring(0, time.indexOf("</td>"));
        let timeDesc = string.substring(string.indexOf("<td class=\"centre_col no_border\">") + 33, string.length);
        timeDesc = timeDesc.substring(timeDesc.indexOf("</td>"), timeDesc.length);
        const regex = /(<([^>]+)>)/ig;
        timeDesc = timeDesc.replace(regex, "").replace(/\r?\n|\r/g, "").replace(/  /g, "");
        trainInfo.push({
            "destination": destination,
            "platform": platform,
            "time": time,
            "timeDesc": timeDesc,
            "calling": callingLists[i]
        });
    }
    return trainInfo;
}

function showAZList() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const listItems = [];
    for (let i = 0; i < alphabet.length; i++) {
        if (doesContainLetter(alphabet[i])) {
            listItems.push({
                title: alphabet[i]
            });
        }
    }
    const items = new UI.Menu({
        sections: [{
            title: "A-Z List",
            items: listItems
        }]
    });
    items.on('select', function(e) {
        items.hide();
        showForLetter(alphabet[e.itemIndex]);
    });
    items.show();
}

function showForLetter(letter) {
    //Hacky workaround for bug that only exists once
    if (letter === "X") letter = "Y";
    const items = [];
    for (let i = 0; i < stationsList.length; i++) {
        if (stationsList[i].substring(0, 1) == letter) {
            items.push({
                title: stationsList[i],
                subtitle: crsList[i]
            });
        }
    }
    const stations = new UI.Menu({
        sections: [{
            title: letter,
            items: items
        }]
    });
    stations.on('select', function(e) {
        stations.hide();
        showDepArr(e.item.subtitle, e.item.title);
    });
    stations.show();
}

function doesContainLetter(letter) {
    for (let i = 0; i < stationsList.length; i++) {
        if (stationsList[i].substring(0, 1) == letter) {
            return true;
        }
    }
    return false;
}