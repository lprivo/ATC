//import { startSim } from "./SimControl";
//import { getLHBP } from "./init_Airports";

// const setCanvasAbbrev = (canvas) => {
//   const cW = canvas.width;
//   const cH = canvas.height;
//   const cHW = canvas.heightWidthRatio;
//   return { cW, cH, cHW };
// };

//const getLHBP = ({ width: cW, heightWidthRatio: cHW, height: cH }) => {
const getLHBP = (canvas) => {
  // setCanvasAbbrev(canvas);
  const cW = canvas.width;
  const cH = canvas.height;
  const cHW = canvas.heightWidthRatio;
  const navObjects = [];
  const runways = [];
  const entryPts = [];
  navObjects[0] = ["BADOV", Math.round(cW * 0.343), Math.round(cHW * 0.008)];
  navObjects[1] = ["NALAG", Math.round(cW * 0.64), Math.round(cHW * 0.008)];
  navObjects[2] = ["BABOX", Math.round(cW * 0.669), Math.round(cHW * 0.982)];
  navObjects[3] = ["ABONY", Math.round(cW * 0.824), Math.round(cHW * 0.666)];
  navObjects[4] = ["VEBOS", Math.round(cW * 0.224), Math.round(cHW * 0.625)];
  navObjects[5] = ["GILEP", Math.round(cW * 0.057), Math.round(cHW * 0.429)];
  navObjects[6] = ["NIPUR", Math.round(cW * 0.836), Math.round(cHW * 0.186)];
  navObjects[7] = ["JBR", Math.round(cW * 0.785), Math.round(cHW * 0.421)];
  navObjects[8] = ["TPS", Math.round(cW * 0.586), Math.round(cHW * 0.424)];
  navObjects[9] = ["MNR", Math.round(cW * 0.567), Math.round(cHW * 0.6)];
  navObjects[10] = ["BALUX", Math.round(cW * 0.443), Math.round(cHW * 0.591)];
  navObjects[11] = ["ETARO", Math.round(cW * 0.387), Math.round(cHW * 0.421)];
  navObjects[12] = ["EPARI", Math.round(cW * 0.378), Math.round(cHW * 0.21)];
  navObjects[13] = ["NORAH", Math.round(cW * 0.746), Math.round(cHW * 0.292)];
  navObjects[14] = ["ERLOS", Math.round(cW * 0.508), Math.round(cHW * 0.889)];
  navObjects[15] = ["ALAMU", Math.round(cW * 0.09), Math.round(cHW * 0.149)];
  navObjects[16] = ["BUD", Math.round(cW * 0.506), Math.round(cHW * 0.462)];

  // 0-id, 1-rw angle, 2-navPointX, 3-navPointY, 4-startPointX, 5-startPointY, 6-centreX, 7-centreY, 8-idTagX, 9-idTagY;
  runways[0] = [
    "13L",
    130,
    cW / 2 - 57,
    cHW / 2 - 59,
    cW / 2 + 3,
    cHW / 2 - 9,
    cW / 2 + 20,
    cHW / 2 + 5,
    cW / 2 - 20,
    cHW / 2 - 17,
  ];
  runways[1] = [
    "31R",
    310,
    cW / 2 + 97,
    cHW / 2 + 69,
    cW / 2 + 37,
    cHW / 2 + 19,
    cW / 2 + 20,
    cHW / 2 + 5,
    cW / 2 + 37,
    cHW / 2 + 34,
  ];
  runways[2] = [
    "13R",
    130,
    cW / 2 - 92,
    cHW / 2 - 66,
    cW / 2 - 29,
    cHW / 2 - 16,
    cW / 2 - 15,
    cHW / 2 - 5,
    cW / 2 - 52,
    cHW / 2 - 23,
  ];
  runways[3] = [
    "31L",
    310,
    cW / 2 + 62,
    cHW / 2 + 59,
    cW / 2 - 1,
    cHW / 2 + 6,
    cW / 2 - 15,
    cHW / 2 - 5,
    cW / 2 + 4,
    cHW / 2 + 21,
  ];

  const entryPt1 = {
    coorX: Math.round(cW * 0.3),
    coorY: -7,
    direction: 150,
  };
  entryPts.push(entryPt1);

  const entryPt2 = {
    coorX: cW + 7,
    coorY: Math.round(cH * 0.08),
    direction: 248,
  };
  entryPts.push(entryPt2);

  const entryPt3 = {
    coorX: Math.round(cW * 0.85),
    coorY: cH + 7,
    direction: 353,
  };
  entryPts.push(entryPt3);

  const entryPt4 = {
    coorX: Math.round(cW * 0.15),
    coorY: cH + 7,
    direction: 18,
  };
  entryPts.push(entryPt4);

  const entryPt5 = {
    coorX: -7,
    coorY: Math.round(cH * 0.45),
    direction: 80,
  };
  entryPts.push(entryPt5);

  const airlnrCode = [
    "W6",
    "FR",
    "LH",
    "U2",
    "AF",
    "BA",
    "4U",
    "LS",
    "KL",
    "LO",
    "OS",
    "SN",
    "OK",
    "DY",
    "RO",
    "TK",
    "AB",
    "AZ",
    "B2",
    "AY",
    "LX",
    "QR",
    "HV",
    "7O",
    "PC",
    "A3",
    "EI",
    "SU",
    "BT",
    "CA",
    "EK",
    "EW",
    "LX",
    "TP",
    "PS",
    "LY",
  ];
  // const airlnrDistr = [141, 37, 62, 2, 92, 7, 126, 12];
  // const destName = "BUD";
  const backgroundImage = `url("Images/LHBP_bgnd_map.png")`;
  console.log("LHBP");
  return {
    navObjects: navObjects, //array
    runways: runways, //array
    entryPts: entryPts, //array
    airlnrCode: airlnrCode, //array
    airlnrDistr: [141, 37, 62, 2, 92, 7, 126, 12],
    destName: "BUD",
    backgroundImage: backgroundImage,
    // addEntrypoint: (entryPoint)=>{entryPoints.push}
  };
  // document.getElementById("myCanvas").style.backgroundImage =
  //   'url("Images/LHBP_bgnd_map.png")';
};

let pausing = false;
let planeNr = 0; //-> SimControl.js/newPlane()
let successfulLandings = 0;
let successfulHandoffs = 0;
let improperExits = 0;
let missedApproaches = 0;
let sepViolation = 0;
// const canvas = document.getElementById("myCanvas");
// const context = canvas.getContext("2d");
// const heightWidthRatio = (window.innerWidth - 310) * 0.6;

const init = () => {
  window.requestAnimFrame = (function(callback) {
    return (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback) {
        window.setTimeout(callback, 1000);
      }
    );
  })();
};

init();

const setOpts = () => {
  const gameOptions = {
    selectedDifficulty: document.getElementById("Difficulty").value,
    selectedAirport: document.getElementById("Airports").value,
    selectedMode: document.getElementById("GameMode").value,
  };
  startSim(gameOptions);
  console.log("setOpts");
  //es ez a fajl egyenlore ennyi.
  //innen tovabb folyatod a munkat a simControlban
};

window.onload = () => {
  const instructionText = document.getElementById("instructionText");
  const consoleTextArea = document.getElementById("console");
  const modal = document.getElementById("startModal"); //it's style is set to block in css.
  const startButton = document.getElementById("startbutton");

  instructionText.focus();
  consoleTextArea.value = `Welcome to Privo-ATC! ${consoleTextArea.value}`; //ez az uj string epites modja. :)
  instructionText.value = "";

  startButton.addEventListener("click", () => {
    modal.style.display = "none"; //hiding the modal as soon as it's clicked
    setOpts(); //rading/setting options and starting game
  });
};

// body canvas - style="background: #103848"
// let planes = []; -> SimControl.js/newPlane()
// let runways = [];
// let airlnrCode = []; //operating airliners' list
// let airlnrDistr = []; //operating airliners's distribution - main operator + 4 groups by no. of aircrafts
// let destName;
// let entryPts = [];
// let consoleText = document.getElementById('console').value;
// let userCommand; // = document.getElementById("instructionText").value;
// let splitCommand = [];
// let resid;
// let entryAlt = [50, 50, 60, 60, 60, 70, 70, 70, 70, 80, 80, 80];
// let navObjects = [];
//  meg mindig nem latom, mi inditja be a dolgokat.... bocs ha ugralok, de keresem

// { selDifficulty, selAirport, selMode } is called destructuring... look it up
//we're passing in an object in atc.js (gameOptions)
//but here we're already breaking it down into variables.

//import { getLHBP } from "./init_Airports";
//import { drawRunways } from "./DrawObjects";

const getCanvas = () => {
  const canvas = document.getElementById("myCanvas");
  const context = canvas.getContext("2d");
  const heightWidthRatio = (window.innerWidth - 310) * 0.6;
  screenSize(canvas);
  console.log("getCanvas", canvas.width);
  return { canvas, context, heightWidthRatio };
};

const screenSize = (canvas) => {
  canvas.width = window.innerWidth - 310;
  canvas.height = window.innerHeight;
  //console.log("screenSize");
  return;
};

window.addEventListener("resize", screenSize);

const createAirport = (innerHTML) => {
  const airportDiv = document.createElement("div");
  const titleDiv = document.getElementById("titleDiv");
  airportDiv.setAttribute("id", "titleAirport");
  airportDiv.appendChild(document.createElement("div"));
  airportDiv.childNodes[0].innerHTML = innerHTML;
  titleDiv.appendChild(airportDiv);
  return airportDiv;
};

const startSim = (gameOptions) => {
  // const canvas = 0;
  // const context = 0;
  const { selectedDifficulty, selectedAirport, selectedMode } = gameOptions;
  const startTime = new Date().getTime();
  titleDiv.removeChild(document.getElementById("titleAirport"));
  titleDiv.removeChild(document.getElementById("titleCode"));
  titleDiv.removeChild(document.getElementById("titleElev"));
  // const canvasElement = document.getElementById("myCanvas");
  // const canvas = {
  //   width: window.innerWidth - 310, //Ez igy nem mukodik, a width and height parameterek nem allitjak be a canvas meretet
  //   height: window.innerHeight,
  //   heightWidthRatio: (window.innerWidth - 310) * 0.6,
  //   context: canvasElement.getContext("2d"),
  // };

  let airport;
  const plane = {};
  const planes = [];
  getCanvas();
  console.log("canvasWidth: ", canvas.width); //Miert nem ismeri a canvas-t, ha elotte fut le a getCanvas()??
  switch (selectedAirport) {
    case "LHBP":
      airport = getLHBP(canvas);
      createAirport(
        `<h5>Budapest Liszt F.</h5><h6 id="titleCode">ICAO:LHBP | IATA:BUD</h6><h6 id="titleElev">Elevation: 495ft</h6>`
      );
      console.log("LHBP - switch");
      break;
    // case "EGLL":
    //   initEGLL();
    //   createAirport(
    //     `<h5>London Heathrow</h5><h6 id="titleCode">ICAO:EGLL | IATA:LHR</h6><h6 id="titleElev">Elevation: 83ft</h6>`
    //   );
    //   break;
    // case "EPWA":
    //   initEPWA();
    //   createAirport(
    //     `<h5>Warsaw Chopin</h5><h6 id="titleCode">ICAO:EPWA | IATA:WAW</h6><h6 id="titleElev">Elevation: 362ft</h6>`
    //   );
    //   break;
    // case "KSEA":
    //   initKSEA();
    //   createAirport(
    //     `<h5>Seattle-Tacoma I.</h5><h6 id="titleCode">ICAO:KSEA | IATA:SEA</h6><h6 id="titleElev">Elevation: 433ft</h6>`
    //   );
    //   break;
    default:
      break;
  }

  //itt majd talan csinalunk valamit az airport objecttel
  //draw the background from airport

  animate(canvas, startTime, airport, plane, planes);
  drawRunways(context, airport);
  newPlane(selectedMode, airport, plane, planes);
  setInterval(newPlane, planeFreq(20, 60) * selectedDifficulty); //Easy=4000, Normal=2000, Difficult=1000
  return { pausing };
};

// Transmit with 'enter' key    -----   addEventListener of Undefined??
// const transmitWithEnterKey = () => {
//   document
//     .getElementById("instructionText")
//     .addEventListener("keyup", (enterKey) => {
//       enterKey.preventDefault();
//       if (enterKey.keyCode === 13) {
//         document.getElementById("transmitBtn").click();
//       }
//     });
// };

// transmitWithEnterKey();

// cH/cW=.583
// let cHW = cW * 0.6; //ez nem lehet resze a canvas objectnek?, de gondolom igen
// let planeNr = 0; // body canvas - style="background: #103848"
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
//let selMode;

// import {initLHBP, initEGLL, initEPWA, initKSEA} from "./init_Airports";
const showInfoscreen = () => {
  const dispInfo = document.getElementById("infoScreen").style.display;
  const dispStat = document.getElementById("statScreen").style.display;
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
  const dispInfo = document.getElementById("infoScreen").style.display;
  const dispStat = document.getElementById("statScreen").style.display;
  if (dispStat === "none") {
    if (dispInfo != "none") {
      document.getElementById("infoScreen").style.display = "none";
      document.getElementById(
        "statScreen"
      ).value = `<p>Successful landings: ${successfulLandings}
        </p><p>Successful handoffs: ${successfulHandoffs}
        </p><p>Missed approaches: ${missedApproaches}
        </p><p>Improper exits: ${improperExits}
        </p><p>Separation violation (sec): ${sepViolation}
        </p>`;
      document.getElementById("statScreen").style.display = "block";
    } else {
      document.getElementById(
        "statScreen"
      ).value = `<p>Successful landings: ${successfulLandings}
      </p><p>Successful handoffs: ${successfulHandoffs}
      </p><p>Missed approaches: ${missedApproaches}
      </p><p>Improper exits: ${improperExits}
      </p><p>Separation violation (sec): ${sepViolation}
      </p>`;
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
    statScreen.childNodes[0].innerHTML = `<p>Successful landings: ${successfulLandings}
    </p><p>Successful handoffs: ${successfulHandoffs}
    </p><p>Missed approaches: ${missedApproaches}
    </p><p>Improper exits: ${improperExits}
    </p><p>Separation violation (sec): ${sepViolation}
    </p>`;
    return;
  }
};

const planeFreq = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// eslint-disable-next-line complexity
const aCGen = ({ airlnrDistr, airlnrCode }) => {
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
  let returnedValue = "";
  for (let i = number.toString().length; i < length; i++) {
    returnedValue += "0";
  }
  // number.toString().map(returnedValue => {
  //   returnedValue += "0";
  // });
  return returnedValue + number;
};

// navObjects: navObjects, //array
//     runways: runways, //array
//     entryPts: entryPts, //array
//     airlnrCode: airlnrCode, //array
//     airlnrDistr: [141, 37, 62, 2, 92, 7, 126, 12],
//     destName: "BUD",
//     backgroundImage: backgroundImage,

const newPlane = (selectedMode, airport, plane, planes) => {
  const { airlnrDistr, airlnrCode, entryPts, navObjects, destName } = airport;
  const entryMode = Math.random();
  const entryAlt = [50, 50, 60, 60, 60, 70, 70, 70, 70, 80, 80, 80];
  // const plane = {};
  // const planes = [];
  if (pausing != true) {
    const idIndex = aCGen({ airlnrDistr, airlnrCode });
    const flightNr =
      airlnrCode[idIndex] +
      leadingZeros(Math.abs(Math.floor(Math.random() * 1000 - 1)), 3);

    if (entryMode < selectedMode) {
      const index = Math.floor(Math.random() * entryPts.length);
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
      //plane.distance;
      plane.flightMode = 0; // 0-en route, 1-in holding pattern, 2-approach, 3-final, 4-landing, 5-ready to depart, 6-line up and wait, 7-taking-off, 8-departing, 9-departed;
      planes.push(plane);
      plane.label = "A";
      planeNr++;
    } else {
      const indexT = Math.floor(Math.random() * 7);
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
      //plane.distance;
      plane.label = "D";
      planes.push(plane);
      planeNr++;
    }
  }
  return { plane, planes };
};

// eslint-disable-next-line complexity
const progressStrips = (plane, planes) => {
  const psFrame = document.getElementById("psFrame");
  const pStrip = document.getElementById(plane.id);
  const psAltitude = leadingZeros(Math.round(plane.altitude) * 100, 5);
  const psSpeed = leadingZeros(Math.round(plane.speed) * 10, 3);
  const psHeading = leadingZeros(plane.heading, 3);
  const newPStrip = document.createElement("div");

  if (pStrip) {
    let found = false;
    for (let i = 0; i < planes.length; i++) {
      if (planes[i].id === plane.id && planes[i].flightMode != 9) {
        found = true;
        break;
      }
    }
    if (found) {
      let psArrow;
      if (plane.altitude < plane.newAlt) {
        psArrow = "\u2191";
      } else if (plane.altitude > plane.newAlt) {
        psArrow = "\u2193";
      } else {
        psArrow = "-";
      }
      pStrip.childNodes[0].setAttribute("class", "flightData");
      pStrip.childNodes[0].innerHTML = `<table><tr><td class='pstd'> ${plane.id} </td><td class='pstd'> ${psAltitude} ${psArrow} </td><td class='pstd'> ${psSpeed}
        </td></tr><tr><td class='pstd'> ${plane.label} </td><td class='pstd'> ${plane.destName} </td><td class='pstd'> ${psHeading}</td></tr></table>`;
    }
  } else {
    if (plane.label === "A") {
      newPStrip.setAttribute("id", plane.id);
      newPStrip.setAttribute("name", plane.id);
      newPStrip.setAttribute("class", "psArrival");
      newPStrip.setAttribute("onClick", "getFlightID(this)");
      newPStrip.appendChild(document.createElement("div"));
      newPStrip.childNodes[0].setAttribute("class", "flightData");
      newPStrip.childNodes[0].innerHTML = `<table><tr><td class='pstd'> ${plane.id} </td></tr><tr><td class='pstd'> ${plane.label} </td></tr></table>`;
      psFrame.appendChild(newPStrip);
    } else if (plane.label === "D" && plane.flightMode != 9) {
      newPStrip.setAttribute("id", plane.id);
      newPStrip.setAttribute("name", plane.id);
      newPStrip.setAttribute("class", "psDeparture");
      newPStrip.setAttribute("onClick", "getFlightID(this)");
      newPStrip.appendChild(document.createElement("div"));
      newPStrip.childNodes[0].setAttribute("class", "flightData");
      newPStrip.childNodes[0].innerHTML = `<table><tr><td class='pstd'> ${plane.id} </td></tr><tr><td class='pstd'> ${plane.label} </td></tr></table>`;
      psFrame.appendChild(newPStrip);
    }
  }
};

const getFlightID = (flightStrip) => {
  document.getElementById("instructionText").value = `${flightStrip.id} `;
  document.getElementById("instructionText").focus();
  return;
};

// Runway
const drawRunways = (context, airport) => {
  // const { context } = canvas;
  const { runways } = airport;

  for (let i = 0; i < runways.length; i = i + 2) {
    context.beginPath();
    context.moveTo(runways[i][4], runways[i][5]);
    context.lineTo(runways[i + 1][4], runways[i + 1][5]);
    context.lineWidth = 2;
    context.strokeStyle = "rgba(150,190,190,1)";
    context.font = "10px Arial";
    context.fillStyle = "rgba(150,190,190,1)";
    context.fillText(runways[i][0], runways[i][8], runways[i][9]);
    context.fillText(runways[i + 1][0], runways[i + 1][8], runways[i + 1][9]);
    context.stroke();
  }
};

const drawNavObj = (navObjects, context) => {
  // const { context } = canvas;
  context.beginPath();
  context.arc(navObjects[1], navObjects[2], 5, 0, 2 * Math.PI);
  context.moveTo(navObjects[1] - 1, navObjects[2] - 1);
  context.lineTo(navObjects[1] + 1, navObjects[2] - 1);
  context.lineTo(navObjects[1] + 1, navObjects[2] + 1);
  context.lineTo(navObjects[1] - 1, navObjects[2] + 1);
  context.lineTo(navObjects[1] - 1, navObjects[2] - 1);
  context.lineWidth = 1;
  context.strokeStyle = "rgba(150,190,190,1)";
  context.font = "10px Arial";
  context.fillStyle = "rgba(150,190,190,1)";
  context.fillText(navObjects[0], navObjects[1] + 10, navObjects[2] + 2);
  context.stroke();
};

// square symbol of aircraft
const drawPlane = (plane, canvas) => {
  const { context } = canvas;
  let consArrow;
  if (plane.altitude < plane.newAlt) {
    consArrow = "\u2191";
  } else if (plane.altitude > plane.newAlt) {
    consArrow = "\u2193";
  } else {
    consArrow = "-";
  }
  if (plane.flightMode === 9) {
    context.beginPath();
    context.moveTo(plane.curX - 3, plane.curY - 3);
    context.lineTo(plane.curX + 3, plane.curY - 3);
    context.lineTo(plane.curX + 3, plane.curY + 3);
    context.lineTo(plane.curX - 3, plane.curY + 3);
    context.lineTo(plane.curX - 3, plane.curY - 3);
    context.lineWidth = 1;
    context.strokeStyle = "rgba(130,130,130,1)";
    context.font = "12px Sans-serif";
    context.fillStyle = "rgba(130,130,130,1)";
    context.fillText(plane.id, plane.curX, plane.curY - 34);
    context.font = "11px Sans-serif";
    context.fillText(
      leadingZeros(Math.floor(Math.round(plane.altitude)), 3),
      plane.curX,
      plane.curY - 20
    );
    context.fillText(consArrow, plane.curX + 20, plane.curY - 20);
    context.fillText(
      leadingZeros(Math.floor(Math.round(plane.speed)), 2),
      plane.curX + 30,
      plane.curY - 20
    );
    context.stroke();
  } else if (plane.flightMode != 5) {
    context.beginPath();
    context.moveTo(plane.curX - 3, plane.curY - 3);
    context.lineTo(plane.curX + 3, plane.curY - 3);
    context.lineTo(plane.curX + 3, plane.curY + 3);
    context.lineTo(plane.curX - 3, plane.curY + 3);
    context.lineTo(plane.curX - 3, plane.curY - 3);
    context.lineWidth = 1;
    context.strokeStyle = "white";
    context.font = "12px Sans-serif";
    context.fillStyle = "white";
    context.fillText(plane.id, plane.curX, plane.curY - 34);
    context.font = "11px Sans-serif";
    context.fillText(
      leadingZeros(Math.floor(Math.round(plane.altitude)), 3),
      plane.curX,
      plane.curY - 20
    );
    context.fillText(consArrow, plane.curX + 20, plane.curY - 20);
    context.fillText(
      leadingZeros(Math.floor(Math.round(plane.speed)), 2),
      plane.curX + 30,
      plane.curY - 20
    );
    context.stroke();
  }
};

// plane trail line
const drawTrail = (planes, context) => {
  for (let i = 0; i < planes.length; i++) {
    context.beginPath();
    context.moveTo(planes[i].curX, planes[i].curY);
    context.lineTo(
      planes[i].curX -
        Math.cos((planes[i].heading - 90) * (Math.PI / 180)) * planes[i].speed,
      planes[i].curY -
        Math.sin((planes[i].heading - 90) * (Math.PI / 180)) * planes[i].speed
    );
    if (planes[i].flightMode === 9) {
      context.strokeStyle = "rgba(110,110,110,1)";
    } else {
      context.strokeStyle = "rgba(200,200,200,1)";
    }
    context.lineWidth = 1;
    context.stroke();
  }
};

const drawSepCircle = (x, y, context) => {
  context.beginPath();
  context.arc(x, y, 57, 0, 2 * Math.PI);
  context.linewidth = 1;
  context.strokeStyle = "red";
  context.stroke();
};

const getUserCommand = () => {
  const userCommand = document
    .getElementById("instructionText")
    .value.toUpperCase();
  return userCommand;
};

//splits user command at "space(S)" into tokens - creates an array of strings.
const splitUserCommand = () => {
  getUserCommand();
  const splitCommand = userCommand.split(" "); //Miert nem ismeri, ha a getUserCommand lefut elotte??
  return splitCommand;
};

// const checkPausing = (userCommand, pausing) => {
//   //getUserCommand();
//   userCommand === "P" && fnPausing(pausing);
// };

// const checkEndSim = userCommand => {
//   //getUserCommand();
//   userCommand === "EXIT" && endSim();
//};

const usercmdToConsole = (userCommand) => {
  document.getElementById("console").value = `${userCommand}\n ${
    document.getElementById("console").value
  }`;
  document.getElementById("instructionText").value = ""; // clearing the input field
};

const promptInvalidComm = (resid) => {
  document.getElementById("console").value = `Invalid Command!\n ${
    document.getElementById("console").value
  }`;
  document.getElementById("instructionText").value = "";
  resid = -1;
  return;
};

//ignore this
const promptInvalidCommTest = (resid) => {
  document.getElementById("console").value = `TEST Invalid Command!\n ${
    document.getElementById("console").value
  }`;
  document.getElementById("instructionText").value = "";
  resid = -1;
  return;
};

const fnCommandA = (userCommand, splitCommand, planes, resid) => {
  checkHandover(resid);
  if (20 <= parseInt(splitCommand[2]) && parseInt(splitCommand[2]) < 400) {
    planes[resid].newAlt = parseInt(splitCommand[2]);
    usercmdToConsole(userCommand);
    resid = -1;
    return;
  } else {
    document.getElementById("console").value = `Invalid Altitude Clearance!\n ${
      document.getElementById("console").value
    }`;
    document.getElementById("instructionText").value = "";
    resid = -1;
    return;
  }
};

// eslint-disable-next-line complexity
const fnCommandH = (userCommand, splitCommand, planes, navObjects, resid) => {
  checkHandover(resid);
  if (0 < splitCommand[2] && splitCommand[2] <= 360) {
    destReset(planes[resid]);
    planes[resid].newHeading = parseInt(splitCommand[2]);
    usercmdToConsole(userCommand);
    resid = -1;
    return;
  } else {
    for (let i = 0; i < navObjects.length; i++) {
      if (splitCommand[2] === navObjects[i][0] && splitCommand[3] != "HP") {
        planes[resid].destination = i;
        planes[resid].destX = navObjects[i][1];
        planes[resid].destY = navObjects[i][2];
        planes[resid].turnStep = 3;
        if (planes[resid].flightMode != 8) {
          planes[resid].flightMode = 0;
        }
        usercmdToConsole(userCommand);
        resid = -1;
        return;
      } else if (
        splitCommand[2] === navObjects[i][0] &&
        splitCommand[3] === "HP"
      ) {
        if (planes[resid].flightMode === 8) {
          promptInvalidComm(resid);
          resid = -1;
          return;
        } else {
          planes[resid].destination = i;
          planes[resid].destX = navObjects[i][1];
          planes[resid].destY = navObjects[i][2];
          planes[resid].flightMode = 1;
          planes[resid].turnStep = 6;
          usercmdToConsole(userCommand);
          resid = -1;
          return;
        }
      }
    }
  }
};

const fnCommandL = (userCommand, splitCommand, planes, runways, resid) => {
  checkHandover(resid);
  for (let i = 0; i < runways.length; i++) {
    //let distToRunway = Math.round(Math.sqrt(Math.pow((planes[resid].curX - runways[i][2]),2) + Math.pow((planes[resid].curY - runways[i][3]),2)));
    if (
      splitCommand[2] == runways[i][0] &&
      Math.abs(runways[i][1] - planes[resid].heading) <= 20 &&
      planes[resid].altitude <= 40
    ) {
      planes[resid].destination = i;
      planes[resid].destX = runways[i][2];
      planes[resid].destY = runways[i][3];
      planes[resid].newAlt = 20;
      planes[resid].altStep = 0.5;
      planes[resid].flightMode = 2;
      planes[resid].newSpeed = 20;
      planes[resid].speedStep = 0.5;
      planes[resid].destName = runways[i][0];
      usercmdToConsole(userCommand);
      document.getElementById("console").value = `${
        planes[resid]
      } cleared for landing\n ${document.getElementById("console").value}`;
      resid = -1;
      return;
    }
  }
};

const fnCommandS = (userCommand, splitCommand, planes, resid) => {
  checkHandover(resid);
  if (16 <= parseInt(splitCommand[2]) && parseInt(splitCommand[2]) <= 30) {
    planes[resid].newSpeed = parseInt(splitCommand[2]);
    usercmdToConsole(userCommand);
    resid = -1;
    return;
  } else {
    document.getElementById("console").value = `Invalid velocity clearance!\n ${
      document.getElementById("console").value
    }`;
    document.getElementById("instructionText").value = "";
    resid = -1;
    return;
  }
};

const fnCommandT = (userCommand, planes, resid) => {
  if (planes[resid].flightMode === 5) {
    setTimeout(() => takeOff(resid), 4000);
    console.log("TCL: fnCommandT -> resid", resid);
    usercmdToConsole(userCommand);
    document.getElementById("console").value = `${
      planes[resid].id
    } cleared for take-off\n ${document.getElementById("console").value}`;
    resid = -1;
    return;
  } else if (planes[resid].flightMode === 6) {
    planes[resid].flightMode = 7;
    planes[resid].newSpeed = 16;
    usercmdToConsole(userCommand);
    document.getElementById("console").value = `${
      planes[resid].id
    } cleared for take-off\n ${document.getElementById("console").value}`;
    resid = -1;
    return;
  } else {
    promptInvalidComm();
  }
};

const fnCommandW = (userCommand, planes, resid) => {
  if (planes[resid].flightMode === 5) {
    setTimeout(() => waiting(resid), 4000);
    usercmdToConsole(userCommand);
    resid = -1;
    return;
  } else {
    promptInvalidComm();
  }
};

const doInstruction = (userCommand, planes) => {
  splitUserCommand(userCommand);

  switch (
    splitCommand[0] //Miert nem ismeri, ha a splituserCommand lefut elotte??
  ) {
    case "P":
      fnPausing(pausing);
      break;
    case "EXIT":
      endSim();
      break;
    default:
      aircraftCommands(userCommand, splitCommand, planes);
  }
};

// eslint-disable-next-line complexity
const aircraftCommands = (userCommand, splitCommand, planes) => {
  let resid;
  for (let i = 0; i < planes.length; i++) {
    //Hogy lehet planes.map()-el helyettesiteni, ha hasznalom az "i"-t?
    if (splitCommand[0] === planes[i].id) {
      return (resid = i);
    }
  }

  switch (splitCommand[1]) {
    case "A":
      fnCommandA(userCommand, splitCommand, planes, resid);
      break;
    case "H":
      fnCommandH(userCommand, splitCommand, planes, resid);
      break;
    case "L":
      fnCommandL(userCommand, splitCommand, planes, resid);
      break;
    case "S":
      fnCommandS(userCommand, splitCommand, planes, resid);
      break;
    case "T":
      fnCommandT(userCommand, splitCommand, planes, resid);
      break;
    case "W":
      fnCommandW(userCommand, splitCommand, planes, resid);
      break;
    default:
      promptInvalidComm(resid);
    //promptInvalidCommTest(resid);
  }
};

const checkHandover = (planes, resid) => {
  if (planes[resid].flightMode === 9) {
    document.getElementById("console").value = `${
      planes[resid].id
    } is not in your control anymore!\n ${
      document.getElementById("console").value
    }`;
    document.getElementById("instructionText").value = "";
    resid = -1;
    return;
  }
};

const departing = (plane, navObjects) => {
  plane.destX = navObjects[plane.destination][1];
  plane.destY = navObjects[plane.destination][2];
  plane.flightMode = 8;
  plane.newSpeed = 24;
  plane.speedStep = 0.5;
  plane.altStep = 0.5;
};

const finalApproach = (plane, runways) => {
  plane.flightMode = 3;
  plane.destX = runways[plane.destination][4];
  plane.destY = runways[plane.destination][5];
  plane.newAlt = 0;
  plane.altStep = 0.25;
  plane.newSpeed = 16;
  plane.speedStep = 0.25;
};

const landing = (plane, runways) => {
  plane.flightMode = 4;
  plane.newHeading = runways[plane.destination][1];
  plane.destination = -1;
  plane.altitude = Math.round(plane.altitude);
  plane.newAlt = 0;
  plane.altStep = 1;
  plane.newSpeed = 0;
  plane.speedStep = 0.5;
};

// eslint-disable-next-line complexity
const waiting = (planes, runways, navObjects, resid, splitCommand) => {
  //splitUserCommand();
  if (planes[resid].flightMode === 5) {
    for (let i = 0; i < runways.length; i++) {
      if (splitCommand[2] === runways[i][0]) {
        planes[resid].flightMode = 6;
        planes[resid].curX = runways[i][4];
        planes[resid].curY = runways[i][5];
        planes[resid].heading = runways[i][1];
        planes[resid].newHeading = runways[i][1];
        planes[resid].destX = runways[i][6] + (runways[i][6] - runways[i][4]);
        planes[resid].destY = runways[i][7] + (runways[i][7] - runways[i][5]);
        planes[resid].altStep = 0.01;
        planes[resid].speedStep = 1;
        for (let j = 0; j < navObjects.length; j++) {
          if (
            splitCommand[3] === navObjects[j][0] &&
            40 <= parseInt(splitCommand[4]) &&
            parseInt(splitCommand[4]) <= 400
          ) {
            planes[resid].destination = j;
            planes[resid].destName = navObjects[j][0];
            planes[resid].newAlt = splitCommand[4];
          }
        }
      }
    }
  }
  document.getElementById("console").value = `${
    planes[resid].id
  } cleared for line-up\n ${document.getElementById("console").value}`;
};

// eslint-disable-next-line complexity
const takeOff = (splitCommand, planes, runways, navObjects, resid) => {
  //splitUserCommand();
  if (planes[resid].flightMode === 5) {
    for (let i = 0; i < runways.length; i++) {
      if (splitCommand[2] === runways[i][0]) {
        planes[resid].flightMode = 7;
        planes[resid].curX = runways[i][4];
        planes[resid].curY = runways[i][5];
        planes[resid].heading = runways[i][1];
        planes[resid].newHeading = runways[i][1];
        planes[resid].destX = runways[i][6] + (runways[i][6] - runways[i][4]);
        planes[resid].destY = runways[i][7] + (runways[i][7] - runways[i][5]);
        planes[resid].altStep = 0.01;
        planes[resid].newSpeed = 16;
        planes[resid].speedStep = 1;
        for (let j = 0; j < navObjects.length; j++) {
          if (
            splitCommand[3] === navObjects[j][0] &&
            40 <= parseInt(splitCommand[4]) &&
            parseInt(splitCommand[4]) <= 400
          ) {
            planes[resid].destination = j;
            planes[resid].newAlt = splitCommand[4];
          }
        }
      }
    }
  }
};

// eslint-disable-next-line complexity
const removePlane = (planes, psFrame, navObjects, cW, cH) => {
  for (let i = 0; i < planes.length; i++) {
    if (planes[i].flightMode === 4 && planes[i].speed == 0) {
      psFrame.removeChild(document.getElementById(planes[i].id));
      planes.splice(i, 1);
      planeNr--;
      successfulLandings++;
      return planeNr, successfulLandings;
    } else if (planes[i].flightMode === 8 && planes[i].distance <= 3) {
      if (planes[i].destName == navObjects[planes[i].destination][0]) {
        psFrame.removeChild(document.getElementById(planes[i].id));
        planes[i].flightMode = 9;
        destReset(planes[i]);
        planeNr--;
        successfulHandoffs++;
        return planeNr, successfulHandoffs;
      } else {
        psFrame.removeChild(document.getElementById(planes[i].id));
        planes[i].flightMode = 9;
        destReset(planes[i]);
        planeNr--;
        improperExits++;
        return planeNr, improperExits;
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
      planeNr--;
      improperExits++;
      return planeNr, improperExits;
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
  if (pausing === false) {
    pausing = true;
    document.getElementById("pauseBtn").value = "Resume";
    document.getElementById(
      "console"
    ).value = `Landings: ${successfulLandings}\n Hand-offs: ${successfulHandoffs}\n
    Missed approaches: ${missedApproaches}\n Improper exits: ${improperExits}\n Separ. violation: ${sepViolation} sec\n Paused\n
    ${document.getElementById("console").value}`;
    document.getElementById("instructionText").value = " ";
    return;
  } else {
    pausing = false;
    document.getElementById("pauseBtn").value = "Pause";
    document.getElementById("console").value = `Resumed\n ${
      document.getElementById("console").value
    }`;
    document.getElementById("instructionText").value = "";
    return;
  }
};

const endSim = (endModal) => {
  pausing = true;
  endModal.style.display = "block";
  document.getElementById("successfulLandings").innerHTML = successfulLandings;
  document.getElementById("successfulHandoffs").innerHTML = successfulHandoffs;
  document.getElementById("missedApproaches").innerHTML = missedApproaches;
  document.getElementById("improperExits").innerHTML = improperExits;
  document.getElementById("sepViolation").innerHTML = sepViolation;
  return;
};

// eslint-disable-next-line complexity
const distCheck = (plane, runways) => {
  if (plane.flightMode === 0 && plane.distance < 3) {
    destReset(plane);
    return;
  }

  if (plane.flightMode === 2 && plane.distance <= 20) {
    if (Math.abs(runways[plane.destination][1] - plane.heading) <= 20) {
      finalApproach(plane);
      return;
    } else {
      destReset(plane);
      plane.newAlt = 40;
      missedApproaches++;
      document.getElementById("console").value = `${
        plane.id
      } missed approach!\n ${document.getElementById("console").value}`;
      return;
    }
  }
  if (plane.flightMode === 3 && plane.distance <= 10) {
    landing(plane);
    return;
  }
  if (plane.flightMode === 7 && plane.distance <= 6) {
    departing(plane);
    return;
  }
};

const heading = (planes) => {
  planes.map((plane) => {
    plane.curX =
      plane.curX +
      Math.cos((plane.heading - 90) * (Math.PI / 180)) * (plane.speed / 10);
    plane.curY =
      plane.curY +
      Math.sin((plane.heading - 90) * (Math.PI / 180)) * (plane.speed / 10);
  });
};

// const heading = planes => {
//   for (let i = 0; i < planes.length; i++) {
//     planes[i].curX =
//       planes[i].curX +
//       Math.cos((planes[i].heading - 90) * (Math.PI / 180)) *
//         (planes[i].speed / 10);
//     planes[i].curY =
//       planes[i].curY +
//       Math.sin((planes[i].heading - 90) * (Math.PI / 180)) *
//         (planes[i].speed / 10);
//   }
// };

const speedChange = (plane) => {
  if (plane.speed < plane.newSpeed) {
    plane.speed += plane.speedStep;
  } else if (plane.speed > plane.newSpeed) {
    plane.speed -= plane.speedStep;
  }
};

const altChange = (plane) => {
  if (plane.altitude < plane.newAlt) {
    if (plane.altitude >= plane.newAlt - 1.5 * plane.altStep) {
      plane.altitude = plane.newAlt;
    } else {
      plane.altitude += plane.altStep;
    }
  } else if (plane.altitude > plane.newAlt) {
    if (plane.altitude <= plane.newAlt + 1.5 * plane.altStep) {
      plane.altitude = plane.newAlt;
    } else {
      plane.altitude -= plane.altStep;
    }
  }
};

const headingReset = (plane) => {
  if (plane.heading <= 0) {
    plane.heading += 360;
    return plane;
  } else if (plane.heading > 360) {
    plane.heading -= 360;
    return plane;
  }
};

// eslint-disable-next-line complexity
const turning = (plane) => {
  headingReset(plane);
  // turning
  if (
    plane.heading < plane.newHeading &&
    plane.newHeading <= plane.heading + 180
  ) {
    if (plane.heading + 3 >= plane.newHeading) {
      plane.heading = plane.newHeading;
    } else {
      plane.heading += plane.turnStep;
    }
  } else if (plane.newHeading > plane.heading + 180) {
    plane.heading -= plane.turnStep;
  } else if (
    plane.heading > plane.newHeading &&
    plane.newHeading >= plane.heading - 180
  ) {
    if (plane.heading - 3 <= plane.newHeading) {
      plane.heading = plane.newHeading;
    } else {
      plane.heading -= plane.turnStep;
    }
  } else if (plane.newHeading < plane.heading - 180) {
    plane.heading += plane.turnStep;
  }
};

const setHeading = (plane) => {
  const subX = plane.destX - plane.curX;
  const subY = plane.destY - plane.curY;
  const courseAngle = Math.round(Math.atan2(subY, subX) * (180 / Math.PI));
  plane.newHeading =
    0 < courseAngle
      ? courseAngle + 90
      : courseAngle <= 0 && -90 < courseAngle
      ? 90 + courseAngle
      : courseAngle <= -90
      ? courseAngle + 450
      : courseAngle;
  return plane;
};

// plane distance from destination
const distMeasure = (plane) =>
  (plane.distance = Math.round(
    Math.sqrt(
      Math.pow(plane.curX - plane.destX, 2) +
        Math.pow(plane.curY - plane.destY, 2)
    )
  ));

const assignDest = (plane) => plane.destination !== -1 && setHeading(plane);

const destReset = (plane) => {
  plane.destination = -1;
  plane.destX = "undefined";
  plane.destY = "undefined";
  plane.turnStep = 3;
  if (plane.flightMode !== 8 && plane.flightMode != 9) {
    plane.flightMode = 0;
  }
  // ((plane.flightMode != 8) && (plane.flightMode != 9)) ? plane.flightMode = 0;
};

// Separation check
// eslint-disable-next-line complexity
const fnSeparation = (planes, context, psFrame) => {
  for (let i = 0; i < planes.length; i++) {
    for (let j = 0; j < planes.length; j++) {
      const sepDist = Math.round(
        Math.sqrt(
          Math.pow(planes[i].curX - planes[j].curX, 2) +
            Math.pow(planes[i].curY - planes[j].curY, 2)
        )
      );
      const sepVert = Math.abs(planes[i].altitude - planes[j].altitude);
      if (planes[i].id != planes[j].id && sepDist < 2 && sepVert < 2) {
        psFrame.removeChild(document.getElementById(planes[i].id));
        psFrame.removeChild(document.getElementById(planes[j].id));
        planes.splice(i, 1);
        planes.splice(j, 1);
        planeNr = planeNr - 2;
        fnPausing();
        alert("Collision! - Game Over");
        return planeNr;
      } else if (
        planes[i].id != planes[j].id &&
        sepDist < 57 &&
        sepVert < 10 &&
        [0, 1, 2, 3, 8].indexOf(planes[i].flightMode) != -1 &&
        [0, 1, 2, 3, 8].indexOf(planes[j].flightMode) != -1
      ) {
        drawSepCircle(planes[i].curX, planes[i].curY, context);
        drawSepCircle(planes[j].curX, planes[j].curY, context);
        sepViolation++;
        return;
      }
    }
  }
};

const animate = (context, startTime, airport, plane, planes) => {
  // const { context } = canvas;

  const {
    navObjects,
    runways,
    entryPts,
    airlnrCode,
    airlnrDistr,
    destName,
  } = airport;

  //console.log("airport: ", airport);
  // update

  let time = new Date().getTime() - startTime;
  if (time > 1000 && pausing != true) {
    startTime = new Date().getTime();

    // window refresh
    context.clearRect(0, 0, canvas.width, canvas.height);

    // for (let i = 0; i < navObjects.length; i++) {
    //   drawNavObj(navObjects[i], context);
    // }
    navObjects.map((navObject) => {
      drawNavObj(navObject, canvas);
    });

    updateStatScreen();
    drawRunways(canvas, airport);
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
  window.requestAnimFrame(() => {
    animate(canvas, startTime, airport, plane, planes);
  });
};
