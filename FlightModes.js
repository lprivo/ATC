const checkHandover = resid => {
  if (planes[resid].flightMode === 9) {
    document.getElementById("console").value =
      planes[resid].id +
      " is not in your control anymore!\n" +
      document.getElementById("console").value;
    document.getElementById("instructionText").value = "";
    resid = -1;
    return;
  }
};

const finalApproach = plane => {
  plane.flightMode = 3;
  plane.destX = runways[plane.destination][4];
  plane.destY = runways[plane.destination][5];
  plane.newAlt = 0;
  plane.altStep = 0.25;
  plane.newSpeed = 16;
  plane.speedStep = 0.25;
};

const landing = plane => {
  plane.flightMode = 4;
  plane.newHeading = runways[plane.destination][1];
  plane.destination = -1;
  plane.altitude = Math.round(plane.altitude);
  plane.newAlt = 0;
  plane.altStep = 1;
  plane.newSpeed = 0;
  plane.speedStep = 0.5;
};

const waiting = resid => {
  //let userCommand = document.getElementById("instructionText").value;
  //getUserCommand();
  splitUserCommand();
  //let splitCommand = userCommand.split(" ");
  if (planes[resid].flightMode === 5) {
    for (let i = 0; i < runways.length; i++) {
      if (splitCommand[2] == runways[i][0]) {
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
            splitCommand[3] == navObjects[j][0] &&
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
  document.getElementById("console").value =
    planes[resid].id +
    " cleared for line-up\n" +
    document.getElementById("console").value;
};

const departing = plane => {
  plane.destX = navObjects[plane.destination][1];
  plane.destY = navObjects[plane.destination][2];
  plane.flightMode = 8;
  plane.newSpeed = 24;
  plane.speedStep = 0.5;
  plane.altStep = 0.5;
};

const takeOff = resid => {
  //getUserCommand();
  splitUserCommand();
  if (planes[resid].flightMode === 5) {
    for (let i = 0; i < runways.length; i++) {
      if (splitCommand[2] == runways[i][0]) {
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
            splitCommand[3] == navObjects[j][0] &&
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
