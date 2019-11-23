//you need to export all your airport configs
//when that's done, you can think about transforming this into an object
//also, you probably would need to pass in cW and cHW from atc.js

import * from './Ariports.js';

const getNavobjects = selAirport => {
  let navObjects = [];
  for (let i = 0; i < selAirport.navObjects.length; i++) {
    navObjects.push(selAirport.navObjects[i]);
  }
  return navObjects;
};

const getRunways = (selAirport, canvas) => {
  let runways = [];
  let cW = canvas.width / 2;
  let cHW = canvas.heightWidthRatio / 2;
  for (let i = 0; i < selAirport.runways.length; i++) {
    runways.push(selAirport.runways[i]);
    
  }
  return runways;
};



const getEntryPoints = selAirport => {
  let entryPoints = [];
  for (let i = 0; i < selAirport.entryPoints.length; i++) {
    entryPoints.push(selAirport.entryPoints[i]);
  }
  return entryPoints;
};

const initAirport = selAirport => {
  getNavobjects(selAirport);
  getRunways(selAirport);
  getEntryPoints(selAirport);
  let airlnrCode = selAirport.airlnrCode;
  let airlnrDistr = selAirport.airlnrDistr;
  let destName = selAirport.destName;
  document.getElementById("myCanvas").style.backgroundImage =
    selAirport.backgroundImage;
};

export const initLHBP = () => {
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
    cHW / 2 - 17
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
    cHW / 2 + 34
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
    cHW / 2 - 23
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
    cHW / 2 + 21
  ];

  {
    let entryPt1 = new Object();
    entryPt1.coorX = Math.round(cW * 0.3);
    entryPt1.coorY = -7;
    entryPt1.direction = 150;
    entryPts.push(entryPt1);
  }

  {
    let entryPt2 = new Object();
    entryPt2.coorX = cW + 7;
    entryPt2.coorY = Math.round(cH * 0.08);
    entryPt2.direction = 248;
    entryPts.push(entryPt2);
  }

  {
    let entryPt3 = new Object();
    entryPt3.coorX = Math.round(cW * 0.85);
    entryPt3.coorY = cH + 7;
    entryPt3.direction = 353;
    entryPts.push(entryPt3);
  }

  {
    let entryPt4 = new Object();
    entryPt4.coorX = Math.round(cW * 0.15);
    entryPt4.coorY = cH + 7;
    entryPt4.direction = 18;
    entryPts.push(entryPt4);
  }

  {
    let entryPt5 = new Object();
    entryPt5.coorX = -7;
    entryPt5.coorY = Math.round(cH * 0.45);
    entryPt5.direction = 80;
    entryPts.push(entryPt5);
  }

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
    "LY"
  ];
  const airlnrDistr = [141, 37, 62, 2, 92, 7, 126, 12];
  destName = "BUD";
  document.getElementById("myCanvas").style.backgroundImage =
    'url("Images/LHBP_bgnd_map.png")';
};

const initEGLL = () => {
  navObjects[0] = ["BIG", Math.round(cW * 0.791), Math.round(cHW * 0.707)]; //(20NM from centre = 378 on-screen distance)
  navObjects[1] = ["BNN", Math.round(cW * 0.442), Math.round(cHW * 0.089)];
  navObjects[2] = ["BPK", Math.round(cW * 0.688), Math.round(cHW * 0.041)];
  navObjects[3] = ["WOD", Math.round(cW * 0.255), Math.round(cHW * 0.533)];
  navObjects[4] = ["HEN", Math.round(cW * 0.302), Math.round(cHW * 0.04)];
  navObjects[5] = ["BLK", Math.round(cW * 0.277), Math.round(cHW * 0.74)];
  navObjects[6] = ["LAM", Math.round(cW * 0.851), Math.round(cHW * 0.2)];
  navObjects[7] = ["OCK", Math.round(cW * 0.51), Math.round(cHW * 0.76)];
  navObjects[8] = ["CHT", Math.round(cW * 0.462), Math.round(cHW * 0.253)];
  navObjects[9] = ["EPM", Math.round(cW * 0.554), Math.round(cHW * 0.736)];
  navObjects[10] = ["BUR", Math.round(cW * 0.372), Math.round(cHW * 0.423)];
  navObjects[11] = ["LON", Math.round(cW * 0.494), Math.round(cHW * 0.469)];

  // 0-id, 1-rw angle, 2-navPointX, 3-navPointY, 4-startPointX, 5-startPointY, 6-centreX, 7-centreY, 8-idTagX, 9-idTagY;
  runways[0] = [
    "9L",
    90,
    cW / 2 - 104,
    cHW / 2 - 10,
    cW / 2 - 23,
    cHW / 2 - 10,
    cW / 2 - 4,
    cHW / 2 - 10,
    cW / 2 - 39,
    cHW / 2 - 7
  ];
  runways[1] = [
    "27R",
    270,
    cW / 2 + 96,
    cHW / 2 - 10,
    cW / 2 + 15,
    cHW / 2 - 10,
    cW / 2 - 4,
    cHW / 2 - 10,
    cW / 2 + 20,
    cHW / 2 - 7
  ];
  runways[2] = [
    "9R",
    90,
    cW / 2 - 103,
    cHW / 2 + 4,
    cW / 2 - 20,
    cHW / 2 + 4,
    cW / 2 - 3,
    cHW / 2 + 4,
    cW / 2 - 37,
    cHW / 2 + 7
  ];
  runways[3] = [
    "27L",
    270,
    cW / 2 + 97,
    cHW / 2 + 4,
    cW / 2 + 15,
    cHW / 2 + 4,
    cW / 2 - 3,
    cHW / 2 + 4,
    cW / 2 + 20,
    cHW / 2 + 7
  ];

  {
    let entryPt1 = new Object();
    entryPt1.coorX = 40;
    entryPt1.coorY = -7;
    entryPt1.direction = 125;
    entryPts.push(entryPt1);
  }

  {
    let entryPt2 = new Object();
    entryPt2.coorX = cW + 7;
    entryPt2.coorY = Math.round(cH * 0.08);
    entryPt2.direction = 245;
    entryPts.push(entryPt2);
  }

  {
    let entryPt3 = new Object();
    entryPt3.coorX = cW + 7;
    entryPt3.coorY = cH - 25;
    entryPt3.direction = 308;
    entryPts.push(entryPt3);
  }

  {
    let entryPt4 = new Object();
    entryPt4.coorX = Math.round(cW * 0.22);
    entryPt4.coorY = cH + 7;
    entryPt4.direction = 54;
    entryPts.push(entryPt4);
  }

  {
    let entryPt5 = new Object();
    entryPt5.coorX = -7;
    entryPt5.coorY = Math.round(cH * 0.68);
    entryPt5.direction = 64;
    entryPts.push(entryPt5);
  }

  airlnrCode = [
    "BA",
    "EI",
    "VS",
    "LH",
    "AA",
    "SK",
    "UA",
    "LX",
    "DL",
    "AC",
    "4U",
    "IB",
    "KL",
    "AF",
    "EK",
    "EW",
    "BE",
    "QR",
    "TP",
    "TK",
    "AZ",
    "CX",
    "AY",
    "BI",
    "A3",
    "OS",
    "SQ",
    "SU",
    "SN",
    "EY",
    "9W",
    "LO",
    "CA",
    "KM",
    "CZ",
    "QU",
    "MS",
    "LY",
    "GF",
    "FI",
    "KU",
    "MH",
    "ME",
    "WY",
    "QF",
    "SV",
    "SA",
    "TG",
    "AH",
    "BT",
    "MK",
    "NZ",
    "JU",
    "AM",
    "NH",
    "OZ",
    "AV",
    "J2",
    "BG",
    "FB",
    "MU",
    "ET",
    "BR",
    "JL",
    "KQ",
    "KE",
    "JJ",
    "PK",
    "PR",
    "AT",
    "BI",
    "RJ",
    "UL",
    "RO",
    "TS",
    "VN",
    "VY"
  ];
  airlnrDistr = [700, 360, 480, 6, 540, 6, 620, 14]; //for fn aCGen(): total no. of flights, main op. flightCount, group1-flightCount,group1-operatorCount, group2-fc, group2-op, g3-fc, g3-op, g4-fc, g4-op;
  destName = "LON";
  document.getElementById("myCanvas").style.backgroundImage =
    'url("Images/EGLL_bgnd_map.png")';
};

const initEPWA = () => {
  navObjects[0] = ["ULPAR", Math.round(cW * 0.515), Math.round(cHW * 0.08)];
  navObjects[1] = ["SIE", Math.round(cW * 0.967), Math.round(cHW * 0.493)];
  navObjects[2] = ["DEDOL", Math.round(cW * 0.32), Math.round(cHW * 0.992)];
  navObjects[3] = ["IBARA", Math.round(cW * 0.006), Math.round(cHW * 0.68)];
  navObjects[4] = ["IDAKO", Math.round(cW * 0.302), Math.round(cHW * 0.008)];
  navObjects[5] = ["DODEK", Math.round(cW * 0.009), Math.round(cHW * 0.25)];
  navObjects[6] = ["MARIA", Math.round(cW * 0.67), Math.round(cHW * 0.992)];
  navObjects[7] = ["VEKER", Math.round(cW * 0.585), Math.round(cHW * 0.22)];
  navObjects[8] = ["LDZ", Math.round(cW * 0.006), Math.round(cHW * 0.853)];
  navObjects[9] = ["LIN", Math.round(cW * 0.57), Math.round(cHW * 0.72)];
  navObjects[10] = ["KRN", Math.round(cW * 0.3), Math.round(cHW * 0.705)];
  navObjects[11] = ["WAR", Math.round(cW * 0.381), Math.round(cHW * 0.382)];
  navObjects[12] = ["ADLAR", Math.round(cW * 0.12), Math.round(cHW * 0.008)];
  navObjects[13] = ["WAW", Math.round(cW * 0.5), Math.round(cHW * 0.473)];

  // 0-id, 1-rw angle, 2-navPointX, 3-navPointY, 4-startPointX, 5-startPointY, 6-centreX, 7-centreY, 8-idTagX, 9-idTagY;
  runways[0] = [
    "15",
    150,
    cW / 2 - 54,
    cHW / 2 - 97,
    cW / 2 - 14,
    cHW / 2 - 30,
    cW / 2 - 4,
    cHW / 2 - 10,
    cW / 2 - 23,
    cHW / 2 - 40
  ];
  runways[1] = [
    "33",
    330,
    cW / 2 + 46,
    cHW / 2 + 77,
    cW / 2 + 7,
    cHW / 2 + 10,
    cW / 2 - 4,
    cHW / 2 - 10,
    cW / 2 + 8,
    cHW / 2 + 22
  ];
  runways[2] = [
    "11",
    110,
    cW / 2 - 101,
    cHW / 2 - 46,
    cW / 2 - 23,
    cHW / 2 - 21,
    cW / 2 - 7,
    cHW / 2 - 12,
    cW / 2 - 40,
    cHW / 2 - 21
  ];
  runways[3] = [
    "29",
    290,
    cW / 2 + 87,
    cHW / 2 + 22,
    cW / 2 + 9,
    cHW / 2 - 4,
    cW / 2 - 7,
    cHW / 2 - 12,
    cW / 2 + 15,
    cHW / 2 + 2
  ];

  {
    let entryPt1 = new Object();
    entryPt1.coorX = Math.round(cW * 0.51);
    entryPt1.coorY = cH + 7;
    entryPt1.direction = 20;
    entryPts.push(entryPt1);
  }

  {
    let entryPt2 = new Object();
    entryPt2.coorX = -7;
    entryPt2.coorY = Math.round(cH * 0.86);
    entryPt2.direction = 69;
    entryPts.push(entryPt2);
  }

  {
    let entryPt3 = new Object();
    entryPt3.coorX = Math.round(cW * 0.113);
    entryPt3.coorY = -7;
    entryPt3.direction = 149;
    entryPts.push(entryPt3);
  }

  {
    let entryPt4 = new Object();
    entryPt4.coorX = Math.round(cW * 0.67);
    entryPt4.coorY = -7;
    entryPt4.direction = 212;
    entryPts.push(entryPt4);
  }

  {
    let entryPt5 = new Object();
    entryPt5.coorX = cW + 7;
    entryPt5.coorY = Math.round(cH * 0.56);
    entryPt5.direction = 247;
    entryPts.push(entryPt5);
  }

  airlnrCode = [
    "LO",
    "W6",
    "LO",
    "LH",
    "SU",
    "AF",
    "OS",
    "SN",
    "OK",
    "LX",
    "KL",
    "SK",
    "3Z",
    "BT",
    "BA",
    "EW",
    "AY",
    "QS",
    "PS",
    "JP",
    "A3",
    "EI",
    "CA",
    "AZ",
    "B2",
    "LY",
    "EK",
    "DY",
    "QR",
    "FR",
    "P8",
    "P7",
    "TP",
    "TK",
    "VY"
  ];
  airlnrDistr = [219, 122, 158, 2, 164, 1, 203, 15]; //for fn aCGen(): total no. of flights, main op. flightCount, group1-flightCount, group1-operatorCount, group2-fc, group2-op, g3-fc, g3-op
  destName = "WAW";
  document.getElementById("myCanvas").style.backgroundImage =
    'url("Images/EPWA_bgnd_map.png")';
};

const initKSEA = () => {
  navObjects[0] = ["PAE", Math.round(cW * 0.507), Math.round(cHW * 0.008)];
  navObjects[1] = ["MODDA", Math.round(cW * 0.826), Math.round(cHW * 0.5)];
  navObjects[2] = ["RADDY", Math.round(cW * 0.827), Math.round(cHW * 0.862)];
  navObjects[3] = ["TAOMA", Math.round(cW * 0.55), Math.round(cHW * 0.982)];
  navObjects[4] = ["OLM", Math.round(cW * 0.246), Math.round(cHW * 0.969)];
  navObjects[5] = ["HAROB", Math.round(cW * 0.19), Math.round(cHW * 0.69)];
  navObjects[6] = ["ARRIE", Math.round(cW * 0.01), Math.round(cHW * 0.04)];
  navObjects[7] = ["LAC", Math.round(cW * 0.392), Math.round(cHW * 0.93)];
  navObjects[8] = ["HPK", Math.round(cW * 0.496), Math.round(cHW * 0.394)];
  navObjects[9] = ["RNT", Math.round(cW * 0.535), Math.round(cHW * 0.432)];
  navObjects[10] = ["GRF", Math.round(cW * 0.372), Math.round(cHW * 0.78)];
  navObjects[11] = ["PWT", Math.round(cW * 0.305), Math.round(cHW * 0.436)];
  navObjects[12] = ["VAMPS", Math.round(cW * 0.632), Math.round(cHW * 0.565)];
  navObjects[13] = ["SEA", Math.round(cW * 0.508), Math.round(cHW * 0.51)];

  // 0-id, 1-rw angle, 2-navPointX, 3-navPointY, 4-startPointX, 5-startPointY, 6-centreX, 7-centreY, 8-idTagX, 9-idTagY;
  runways[0] = [
    "18L",
    180,
    cW / 2 + 2,
    cHW / 2 - 109,
    cW / 2 + 2,
    cHW / 2 - 33,
    cW / 2 + 2,
    cHW / 2 - 9,
    cW / 2 + 7,
    cHW / 2 - 43
  ];
  runways[1] = [
    "36R",
    360,
    cW / 2 + 2,
    cHW / 2 + 91,
    cW / 2 + 2,
    cHW / 2 + 15,
    cW / 2 + 2,
    cHW / 2 - 9,
    cW / 2 + 7,
    cHW / 2 + 30
  ];
  runways[2] = [
    "18C",
    180,
    cW / 2 - 4,
    cHW / 2 - 113,
    cW / 2 - 4,
    cHW / 2 - 33,
    cW / 2 - 4,
    cHW / 2 - 13,
    cW / 2 - 12,
    cHW / 2 - 43
  ];
  runways[3] = [
    "36C",
    360,
    cW / 2 - 4,
    cHW / 2 + 87,
    cW / 2 - 4,
    cHW / 2 + 6,
    cW / 2 - 4,
    cHW / 2 - 13,
    cW / 2 - 12,
    cHW / 2 + 25
  ];
  runways[4] = [
    "18R",
    180,
    cW / 2 - 13,
    cHW / 2 - 111,
    cW / 2 - 13,
    cHW / 2 - 33,
    cW / 2 - 13,
    cHW / 2 - 15,
    cW / 2 - 31,
    cHW / 2 - 43
  ];
  runways[5] = [
    "36L",
    360,
    cW / 2 - 13,
    cHW / 2 + 89,
    cW / 2 - 13,
    cHW / 2 + 4,
    cW / 2 - 13,
    cHW / 2 - 15,
    cW / 2 - 31,
    cHW / 2 + 19
  ];

  {
    let entryPt1 = new Object();
    entryPt1.coorX = -7;
    entryPt1.coorY = Math.round(cH * 0.032);
    entryPt1.direction = 105;
    entryPts.push(entryPt1);
  }

  {
    let entryPt2 = new Object();
    entryPt2.coorX = cW + 7;
    entryPt2.coorY = Math.round(cH * 0.1);
    entryPt2.direction = 275;
    entryPts.push(entryPt2);
  }

  {
    let entryPt3 = new Object();
    entryPt3.coorX = Math.round(cW * 0.75);
    entryPt3.coorY = cH + 7;
    entryPt3.direction = 333;
    entryPts.push(entryPt3);
  }

  {
    let entryPt4 = new Object();
    entryPt4.coorX = Math.round(cW * 0.41);
    entryPt4.coorY = cH + 7;
    entryPt4.direction = 340;
    entryPts.push(entryPt4);
  }

  {
    let entryPt5 = new Object();
    entryPt5.coorX = Math.round(cW * 0.2);
    entryPt5.coorY = cH + 7;
    entryPt5.direction = 357;
    entryPts.push(entryPt5);
  }

  airlnrCode = [
    "AS",
    "DL",
    "WN",
    "UA",
    "AA",
    "FX",
    "B6",
    "AC",
    "8C",
    "NK",
    "VX",
    "BA",
    "CI",
    "HA",
    "HU",
    "NH",
    "1I",
    "A8",
    "AM",
    "BR",
    "DE",
    "EK",
    "F9",
    "FI",
    "GB",
    "KE",
    "LH",
    "OX",
    "SY",
    "VS",
    "Y4"
  ];
  airlnrDistr = [556, 282, 417, 1, 513, 4, 531, 5]; //for fn aCGen(): total no. of flights, main op. flightCount, group1-flightCount, group1-operatorCount, group2-fc, group2-op, g3-fc, g3-op
  destName = "SEA";
  document.getElementById("myCanvas").style.backgroundImage =
    'url("Images/KSEA_bgnd_map.png")';
};
