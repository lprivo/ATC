// { selDifficulty, selAirport, selMode } is called deconstructuring... look it up
//we're passing in an object in atc.js (gameOptions)
//but here we're already breaking it down into variables.
import { initLHBP } from "./init_Airports";
const createAirport = (innerHTML, titleDiv) => {
  const airportDiv = document.createElement("div");

  airportDiv.setAttribute("id", "titleAirport");
  airportDiv.appendChild(document.createElement("div"));
  airportDiv.childNodes[0].innerHTML = innerHTML;
  titleDiv.appendChild(airportDiv);

  return airportDiv;
};

export const startSim = ({ selectedDifficulty, selAirport, selectedMode }) => {
  const startTime = new Date().getTime();
  const titleDiv = document.getElementById("titleDiv");
  titleDiv.removeChild(document.getElementById("titleAirport"));
  titleDiv.removeChild(document.getElementById("titleCode"));
  titleDiv.removeChild(document.getElementById("titleElev"));
  switch (selectedDifficulty) {
    case "LHBP":
      initLHBP();
      //instead of this, you could make a "factory" like this
      createAirport(
        `<h5>Budapest Liszt F.</h5><h6 id="titleCode">ICAO:LHBP | IATA:BUD</h6><h6 id="titleElev">Elevation: 495ft</h6>`
      );
      break;
    case "EGLL":
      //just call the factory for each of your airports
      initEGLL();
      dButIReallyNeedToWorkOnMyVariableNames.setAttribute("id", "titleAirport");
      dButIReallyNeedToWorkOnMyVariableNames.appendChild(
        document.createElement("div")
      );
      dButIReallyNeedToWorkOnMyVariableNames.childNodes[0].innerHTML =
        '<h5>London Heathrow</h5><h6 id="titleCode">ICAO:EGLL | IATA:LHR</h6><h6 id="titleElev">Elevation: 83ft</h6>';
      titleDiv.appendChild(dButIReallyNeedToWorkOnMyVariableNames);
      break;
    case "EPWA":
      initEPWA();
      dButIReallyNeedToWorkOnMyVariableNames.setAttribute("id", "titleAirport");
      dButIReallyNeedToWorkOnMyVariableNames.appendChild(
        document.createElement("div")
      );
      dButIReallyNeedToWorkOnMyVariableNames.childNodes[0].innerHTML =
        '<h5>Warsaw Chopin</h5><h6 id="titleCode">ICAO:EPWA | IATA:WAW</h6><h6 id="titleElev">Elevation: 362ft</h6>';
      titleDiv.appendChild(dButIReallyNeedToWorkOnMyVariableNames);
      break;
    case "KSEA":
      initKSEA();
      dButIReallyNeedToWorkOnMyVariableNames.setAttribute("id", "titleAirport");
      dButIReallyNeedToWorkOnMyVariableNames.appendChild(
        document.createElement("div")
      );
      dButIReallyNeedToWorkOnMyVariableNames.childNodes[0].innerHTML =
        '<h5>Seattle-Tacoma I.</h5><h6 id="titleCode">ICAO:KSEA | IATA:SEA</h6><h6 id="titleElev">Elevation: 433ft</h6>';
      titleDiv.appendChild(dButIReallyNeedToWorkOnMyVariableNames);
      break;
    default:
      break;
  }
  animate(canvas, context, startTime);
  drawRunways(context);
  newPlane();
  setInterval(newPlane, planeFreq(20, 60) * selectedDifficulty); //Easy=4000, Normal=2000, Difficult=1000
};

// cH/cW=.583
// let cHW = cW * 0.6; //ez nem lehet resze a canvas objectnek?, de gondolom igen
// let planeNR = 0; // body canvas - style="background: #103848"
// let planes = [];
// let runways = [];
// let airlnrCode = []; //operating airliners' list
// let airlnrDistr = []; //operating airliners's distribution - main operator + 4 groups by no. of aircrafts
// let destName;
// let entryPts = [];
// //let consoleText = document.getElementById('console').value;
// let userCommand; // = document.getElementById("instructionText").value;
// let splitCommand = [];
// let pausing = false;
// let resid;
// let entryAlt = [50, 50, 60, 60, 60, 70, 70, 70, 70, 80, 80, 80];
// let navObjects = [];
// let successfulLandings = 0;
// let successfulHandoffs = 0;
// let improperExits = 0;
// let missedApproaches = 0;
// let sepViolation = 0;

// let context = canvas.getContext("2d"); //elvileg ez adja a radar kepernyo alapjat
//igen, megleltem. kozben google megy
// let psFrame = document.getElementById("psFrame");
let selMode; //ez az eleje, a modal-ban amikor valasztasz mode-ot

// import {initLHBP, initEGLL, initEPWA, initKSEA} from "./init_Airports";
const showInfoscreen = () => {
  let dispInfo = document.getElementById("infoScreen").style.display;
  let dispStat = document.getElementById("statScreen").style.display;
  if (dispInfo === "none") {
    if (dispStat != "none") {
      document.getElementById("statScreen").style.display = "none";
      document.getElementById("infoScreen").style.display = "block";
    } else {
      document.getElementById("infoScreen").style.display = "block";
    }
  } else {
    document.getElementById("infoScreen").style.display = "none";
  }
};

const showStatscreen = () => {
  let dispInfo = document.getElementById("infoScreen").style.display;
  let dispStat = document.getElementById("statScreen").style.display;
  if (dispStat === "none") {
    if (dispInfo != "none") {
      document.getElementById("infoScreen").style.display = "none";
      document.getElementById("statScreen").value =
        "<p>Successful landings: " +
        successfulLandings +
        "</p><p>Successful handoffs: " +
        successfulHandoffs +
        "</p><p>Missed approaches: " +
        missedApproaches +
        "</p><p>Improper exits: " +
        improperExits +
        "</p><p>Separation violation (sec): " +
        sepViolation +
        "</p>";
      document.getElementById("statScreen").style.display = "block";
    } else {
      document.getElementById("statScreen").value =
        "<p>Successful landings: " +
        successfulLandings +
        "</p><p>Successful handoffs: " +
        successfulHandoffs +
        "</p><p>Missed approaches: " +
        missedApproaches +
        "</p><p>Improper exits: " +
        improperExits +
        "</p><p>Separation violation (sec): " +
        sepViolation +
        "</p>";
      document.getElementById("statScreen").style.display = "block";
    }
  } else {
    document.getElementById("statScreen").style.display = "none";
  }
};

const updateStatScreen = () => {
  let dispStat = document.getElementById("statScreen").style.display;
  if (dispStat === "block") {
    for (i = 0; i < statScreen.childNodes.length; i++) {
      statScreen.childNodes[i].innerHTML = " ";
    }
    statScreen.appendChild(document.createElement("div"));
    statScreen.childNodes[0].innerHTML =
      "<p>Successful landings: " +
      successfulLandings +
      "</p><p>Successful handoffs: " +
      successfulHandoffs +
      "</p><p>Missed approaches: " +
      missedApproaches +
      "</p><p>Improper exits: " +
      improperExits +
      "</p><p>Separation violation (sec): " +
      sepViolation +
      "</p>";
    return;
  }
};

const planeFreq = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const aCGen = () => {
  let aCIndex = Math.floor(Math.random() * airlnrDistr[0]);
  if (aCIndex <= airlnrDistr[1]) {
    return 0;
  } else if (airlnrDistr[1] < aCIndex && aCIndex <= airlnrDistr[2]) {
    return Math.floor(Math.random() * airlnrDistr[3]) + 1;
  } else if (airlnrDistr[2] < aCIndex && aCIndex <= airlnrDistr[4]) {
    return Math.floor(Math.random() * airlnrDistr[5]) + (airlnrDistr[3] + 1);
  } else if (airlnrDistr[4] < aCIndex && aCIndex <= airlnrDistr[6]) {
    return (
      Math.floor(Math.random() * airlnrDistr[7]) +
      (airlnrDistr[3] + airlnrDistr[5] + 1)
    );
  } else {
    return (
      Math.floor(
        Math.random() *
          (airlnrCode.length -
            (airlnrDistr[3] + airlnrDistr[5] + airlnrDistr[7] + 1))
      ) +
      (airlnrDistr[3] + airlnrDistr[5] + airlnrDistr[7] + 1)
    );
  }
};

const leadingZeros = (number, length) => {
  let retVal = "";
  for (let i = number.toString().length; i < length; i++) {
    retVal += "0";
  }
  return retVal + number;
};

const newPlane = () => {
  let entryMode = Math.random();
  if (pausing != true) {
    let plane = new Object();
    let idIndex = aCGen();
    let flightNr =
      airlnrCode[idIndex] +
      leadingZeros(Math.abs(Math.floor(Math.random() * 1000 - 1)), 3);

    if (entryMode < selMode) {
      let index = Math.floor(Math.random() * entryPts.length);
      plane.curX = entryPts[index].coorX;
      plane.curY = entryPts[index].coorY;
      plane.id = flightNr.toString();
      plane.heading = entryPts[index].direction; // 0..360
      plane.newHeading = plane.heading;
      plane.turnStep = 3;
      plane.altitude = entryAlt[Math.floor(Math.random() * entryAlt.length)];
      plane.newAlt = plane.altitude;
      plane.altStep = 0.5;
      plane.speed = 24;
      plane.newSpeed = plane.speed;
      plane.speedStep = 0.5;
      plane.destination = -1;
      plane.destName = destName;
      plane.destX = navObjects[11][1];
      plane.destY = navObjects[11][2];
      plane.distance;
      plane.flightMode = 0; // 0-en route, 1-in holding pattern, 2-approach, 3-final, 4-landing, 5-ready to depart, 6-line up and wait, 7-taking-off, 8-departing, 9-departed;
      planes.push(plane);
      plane.label = "A";
      planeNR++;
    } else {
      let indexT = Math.floor(Math.random() * 7);
      plane.flightMode = 5;
      plane.id = flightNr.toString();
      plane.heading = "-";
      plane.newHeading = plane.heading;
      plane.turnStep = 3;
      plane.altitude = 0;
      plane.newAlt = 0;
      plane.altStep = 0.5;
      plane.speed = 0;
      plane.newSpeed = 0;
      plane.speedStep = 0.5;
      plane.destination = -1;
      plane.destName = navObjects[indexT][0];
      plane.distance;
      plane.label = "D";
      planes.push(plane);
      planeNR++;
    }
  }
};

const progressStrips = plane => {
  let pStrip = document.getElementById(plane.id);
  let psAltitude = leadingZeros(Math.round(plane.altitude) * 100, 5);
  let psSpeed = leadingZeros(Math.round(plane.speed) * 10, 3);
  let psHeading = leadingZeros(plane.heading, 3);
  let newPStrip = document.createElement("div");

  if (pStrip) {
    let found = false;
    for (let i = 0; i < planes.length; i++) {
      if (planes[i].id == plane.id && planes[i].flightMode != 9) {
        found = true;
        break;
      }
    }
    if (found == true) {
      let psArrow;
      if (plane.altitude < plane.newAlt) {
        psArrow = "\u2191";
      } else if (plane.altitude > plane.newAlt) {
        psArrow = "\u2193";
      } else {
        psArrow = "-";
      }
      pStrip.childNodes[0].setAttribute("class", "flightData");
      pStrip.childNodes[0].innerHTML =
        "<table><tr><td class='pstd'>" +
        plane.id +
        "</td><td class='pstd'>" +
        psAltitude +
        psArrow +
        "</td><td class='pstd'>" +
        psSpeed +
        "</td></tr><tr><td class='pstd'>" +
        plane.label +
        "</td><td class='pstd'>" +
        plane.destName +
        "</td><td class='pstd'>" +
        psHeading +
        "</td></tr></table>";
    }
  } else {
    if (plane.label === "A") {
      newPStrip.setAttribute("id", plane.id);
      newPStrip.setAttribute("name", plane.id);
      newPStrip.setAttribute("class", "psArrival");
      newPStrip.setAttribute("onClick", "getFlightID(this)");
      newPStrip.appendChild(document.createElement("div"));
      newPStrip.childNodes[0].setAttribute("class", "flightData");
      newPStrip.childNodes[0].innerHTML =
        "<table><tr><td class='pstd'>" +
        plane.id +
        "</td></tr><tr><td class='pstd'>" +
        plane.label +
        "</td></tr></table>";
      psFrame.appendChild(newPStrip);
    } else if (plane.label === "D" && plane.flightMode != 9) {
      newPStrip.setAttribute("id", plane.id);
      newPStrip.setAttribute("name", plane.id);
      newPStrip.setAttribute("class", "psDeparture");
      newPStrip.setAttribute("onClick", "getFlightID(this)");
      newPStrip.appendChild(document.createElement("div"));
      newPStrip.childNodes[0].setAttribute("class", "flightData");
      newPStrip.childNodes[0].innerHTML =
        "<table><tr><td class='pstd'>" +
        plane.id +
        "</td></tr><tr><td class='pstd'>" +
        plane.label +
        "</td></tr></table>";
      psFrame.appendChild(newPStrip);
    }
  }
};

const getFlightID = flightStrip => {
  document.getElementById("instructionText").value = flightStrip.id + " ";
  document.getElementById("instructionText").focus();
  return;
};

const removePlane = () => {
  for (let i = 0; i < planes.length; i++) {
    if (planes[i].flightMode === 4 && planes[i].speed == 0) {
      psFrame.removeChild(document.getElementById(planes[i].id));
      planes.splice(i, 1);
      planeNR--;
      successfulLandings++;
      return;
    } else if (planes[i].flightMode === 8 && planes[i].distance <= 3) {
      if (planes[i].destName == navObjects[planes[i].destination][0]) {
        psFrame.removeChild(document.getElementById(planes[i].id));
        planes[i].flightMode = 9;
        destReset(planes[i]);
        planeNR--;
        successfulHandoffs++;
        return;
      } else {
        psFrame.removeChild(document.getElementById(planes[i].id));
        planes[i].flightMode = 9;
        destReset(planes[i]);
        planeNR--;
        improperExits++;
        return;
      }
    } else if (
      planes[i].flightMode === 0 &&
      (planes[i].curX < -10 ||
        cW + 10 < planes[i].curX ||
        planes[i].curY < -10 ||
        cH + 10 < planes[i].curY)
    ) {
      psFrame.removeChild(document.getElementById(planes[i].id));
      planes.splice(i, 1);
      planeNR--;
      improperExits++;
      return;
    } else if (
      planes[i].flightMode === 9 &&
      (planes[i].curX < -10 ||
        cW + 10 < planes[i].curX ||
        planes[i].curY < -10 ||
        cH + 10 < planes[i].curY)
    ) {
      planes.splice(i, 1);
      return;
    }
  }
};

const fnPausing = () => {
  if (pausing == false) {
    pausing = true;
    document.getElementById("pauseBtn").value = "Resume";
    document.getElementById("console").value =
      "Landings: " +
      successfulLandings +
      "\n" +
      "Hand-offs: " +
      successfulHandoffs +
      "\n" +
      "Missed approaches: " +
      missedApproaches +
      "\n" +
      "Improper exits: " +
      improperExits +
      "\n" +
      "Separ. violation: " +
      sepViolation +
      "sec\n" +
      "Paused\n" +
      document.getElementById("console").value;
    document.getElementById("instructionText").value = "";
    return;
  } else {
    pausing = false;
    document.getElementById("pauseBtn").value = "Pause";
    document.getElementById("console").value =
      "Resumed\n" + document.getElementById("console").value;
    document.getElementById("instructionText").value = "";
    return;
  }
};

const endSim = () => {
  pausing = true;
  endModal.style.display = "block";
  document.getElementById("successfulLandings").innerHTML = successfulLandings;
  document.getElementById("successfulHandoffs").innerHTML = successfulHandoffs;
  document.getElementById("missedApproaches").innerHTML = missedApproaches;
  document.getElementById("improperExits").innerHTML = improperExits;
  document.getElementById("sepViolation").innerHTML = sepViolation;
  return;
};

const animate = (canvas, context, startTime, plane) => {
  // update
  let time = new Date().getTime() - startTime;
  if (time > 1000 && pausing != true) {
    startTime = new Date().getTime();

    // window refresh
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < navObjects.length; i++) {
      drawNavObj(navObjects[i], context);
    }

    updateStatScreen();
    drawRunways(context);
    heading(planes);
    drawTrail(planes, context);
    removePlane();
    fnSeparation(plane);
    document.getElementById("instructionText").focus();
    for (let i = 0; i < planes.length; i++) {
      drawPlane(planes[i], context);
      turning(planes[i]);
      speedChange(planes[i]);
      altChange(planes[i]);
      distMeasure(planes[i]);
      distCheck(planes[i]);
      assignDest(planes[i]);
      progressStrips(planes[i]);
    }
  }

  // request new frame
  requestAnimFrame(function() {
    animate(canvas, context, startTime);
  });
};
