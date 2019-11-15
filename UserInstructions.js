
// Transmit with 'enter' key
document.getElementById("instructionText").addEventListener("keyup", function(enterKey) {
	enterKey.preventDefault();
	if (enterKey.keyCode == 13) {
		document.getElementById("transmitBtn").click();
	}
});

const getUserCommand = () => userCommand = document.getElementById("instructionText").value.toUpperCase();

// splits user command at "space(S)" into tokens - creates an array of strings.
const splitUserCommand = () => {
	getUserCommand();
	splitCommand = userCommand.split(" ");
	return splitCommand;
}

const checkPausing = () => {
	getUserCommand();
	(userCommand == "P") ? fnPausing();
	return;
}

const checkEndSim = () => {
	getUserCommand();
	(userCommand == "EXIT") ? endSim();
	return;
}

const usercmdToConsole = (userCommand) => {
	document.getElementById("console").value = userCommand + "\n" + document.getElementById("console").value;
	document.getElementById('instructionText').value=''; // clearing the input field
}

const promptInvalidComm = () => {
	document.getElementById("console").value = "Invalid Command!\n" + document.getElementById("console").value;
	document.getElementById('instructionText').value='';
	resid = -1;
	return;
}

const fnCommandA = () => {
			checkHandover(resid);
			if ((20 <= parseInt(splitCommand[2])) && (parseInt(splitCommand[2]) < 400)) {
				planes[resid].newAlt = parseInt(splitCommand[2]);
				usercmdToConsole(userCommand);
				resid = -1;
				return;
			} else {
				document.getElementById("console").value = "Invalid altitude clearance!\n" + document.getElementById("console").value;
				document.getElementById('instructionText').value='';
				resid = -1;
				return;
			}
		}

		const fnCommandH = () => {
			checkHandover(resid);
			if ((0 < splitCommand[2]) && (splitCommand[2] <= 360)) {
				destReset(planes[resid]);
				planes[resid].newHeading = parseInt(splitCommand[2]);
				usercmdToConsole(userCommand);
				resid = -1;
				return;
			} else {
				for (let i=0; i<navObjects.length; i++) {
					if ((splitCommand[2] == navObjects[i][0]) && (splitCommand[3] != 'HP')) {
						planes[resid].destination = i;
						planes[resid].destX = navObjects[i][1];
						planes[resid].destY = navObjects[i][2];
						planes[resid].turnStep = 3;
							if  (planes[resid].flightMode != 8) {
								planes[resid].flightMode = 0;
							}
						usercmdToConsole(userCommand);
						resid = -1;
						return;
					} else if ((splitCommand[2] == navObjects[i][0]) && (splitCommand[3] == 'HP')) {
						if  (planes[resid].flightMode == 8) {
							promptInvalidComm();
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
		}

		const fnCommandL = () => {
			checkHandover(resid);
			for (let i=0; i<runways.length; i++) {
				//let distToRunway = Math.round(Math.sqrt(Math.pow((planes[resid].curX - runways[i][2]),2) + Math.pow((planes[resid].curY - runways[i][3]),2)));
				if ((splitCommand[2] == runways[i][0]) && (Math.abs(runways[i][1] - planes[resid].heading) <= 20) && (planes[resid].altitude <= 40)) {
					planes[resid].destination = i;
					planes[resid].destX = runways[i][2];
					planes[resid].destY = runways[i][3];
					planes[resid].newAlt = 20;
					planes[resid].altStep = .5;
					planes[resid].flightMode = 2;
					planes[resid].newSpeed = 20;
					planes[resid].speedStep = .5;
					planes[resid].destName = runways[i][0];
					usercmdToConsole(userCommand);
					document.getElementById("console").value = planes[resid].id + " cleared for landing\n" + document.getElementById("console").value;
					resid = -1;
					return;
				}
			}
		}

		const fnCommandS = () => {
			checkHandover(resid);
			if ((16 <= parseInt(splitCommand[2])) && (parseInt(splitCommand[2]) <= 30)) {
				planes[resid].newSpeed = parseInt(splitCommand[2]);
				usercmdToConsole(userCommand);
				resid = -1;
				return;
			} else {
				document.getElementById("console").value = "Invalid velocity clearance!\n" + document.getElementById("console").value;
				document.getElementById('instructionText').value='';
				resid = -1;
				return;
			}
		}

		const fnCommandT = () => {
			if (planes[resid].flightMode == 5){
				setTimeout(takeOff(resid),10000);	//Miert nem mukodik???????????
				usercmdToConsole(userCommand);
				document.getElementById("console").value = planes[resid].id + " cleared for take-off\n" + document.getElementById("console").value;
				resid = -1;
				return;
			} else if (planes[resid].flightMode == 6) {
				planes[resid].flightMode = 7;
				planes[resid].newSpeed = 16;
				usercmdToConsole(userCommand);
				document.getElementById("console").value = planes[resid].id + " cleared for take-off\n" + document.getElementById("console").value;
				resid = -1;
				return;
			} else {
				promptInvalidComm();
			}
		}

		const fnCommandW = () => {
			if (planes[resid].flightMode == 5){
				waiting(resid);
				usercmdToConsole(userCommand);
				resid = -1;
				return;
			} else {
				promptInvalidComm();
			}
        }
        
        const doInstruction = () => {
			checkPausing();	//Hogy lehet elerni, h ne fusson le a switch-default is?
			checkEndSim();	//-||-
			splitUserCommand();
			
			for (let i=0; i<planes.length; i++) {
				if (splitCommand[0] == planes[i].id) {
					resid = i;
				}
			};

			switch (splitCommand[1]) {
				case "A":
					fnCommandA();
					break;
				case "H":
					fnCommandH();
					break;
				case "L":
					fnCommandL();
					break;
				case "S":
					fnCommandS();
					break;
				case "T":
					fnCommandT();
					break;
				case "W":
					fnCommandW();
					break;
				default:
					//promptInvalidComm();
					promptInvalidCommTest();
			}
        }
        