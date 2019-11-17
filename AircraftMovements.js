const distCheck = (plane) => {
	if ((plane.flightMode === 0) && (plane.distance < 3)) {
		destReset(plane);
		return;
	} else if ((plane.flightMode === 2) && (plane.distance <= 20)) {
		if (Math.abs(runways[plane.destination][1] - plane.heading) <= 20) {
			finalApproach(plane);
			return;
		} else {
			destReset(plane);
			plane.newAlt = 40;
			missedApproaches++;
			document.getElementById("console").value = plane.id + " missed approach!\n" + document.getElementById("console").value;
			return;
		}
	} else if ((plane.flightMode === 3) && (plane.distance <= 10)) {
		landing(plane);
		return;
	} else if ((plane.flightMode === 7) && (plane.distance <= 6)) {
		departing(plane);
		return;
	}
}

const heading = plane => {
	for (let i=0; i<planes.length; i++) {
		planes[i].curX = planes[i].curX + (Math.cos((planes[i].heading-90)*(Math.PI/180)) * (planes[i].speed/10));
		planes[i].curY = planes[i].curY + (Math.sin((planes[i].heading-90)*(Math.PI/180)) * (planes[i].speed/10));
	}
}
		
		const speedChange = plane => {
	    	if (plane.speed < plane.newSpeed) {
				plane.speed += plane.speedStep
			} else if (plane.speed > plane.newSpeed) {
				plane.speed -= plane.speedStep
			}
    	}
		  
	    const altChange = plane => {
			if (plane.altitude < plane.newAlt) {
                if (plane.altitude >= (plane.newAlt-1.5*plane.altStep))
                    { plane.altitude = plane.newAlt }
				else { plane.altitude += plane.altStep; }
            } else if (plane.altitude > plane.newAlt) {
                if (plane.altitude <= (plane.newAlt+1.5*plane.altStep))
                    { plane.altitude = plane.newAlt }
                else { plane.altitude -= plane.altStep; }
            }
		}
		
		const headingReset = plane => {
			if (plane.heading <= 0) {
			  plane.heading += 360;
			  return;
			} else if (plane.heading > 360) {
			  plane.heading -= 360;
			  return;
			}
		}

		const turning = plane => {
			headingReset(plane);
			// turning
			if ((plane.heading < plane.newHeading) && (plane.newHeading <= (plane.heading + 180))) {
			  if (plane.heading + 3 >= plane.newHeading) {
				plane.heading = plane.newHeading;
			  } else {
				plane.heading += plane.turnStep;
			  }
			} else if (plane.newHeading > (plane.heading + 180)) {
			  plane.heading -= plane.turnStep;
			} else if ((plane.heading > plane.newHeading) && (plane.newHeading >= (plane.heading - 180))) {
				if (plane.heading - 3 <= plane.newHeading) {
				  plane.heading = plane.newHeading;
				} else {
				  plane.heading -= plane.turnStep;
				}
			} else if (plane.newHeading < (plane.heading - 180)) {
			  plane.heading += plane.turnStep;
			}
		}
		
		const setHeading = plane => {
		    let subX = (plane.destX - plane.curX);
		    let subY = (plane.destY - plane.curY);
		    let courseAngle = Math.round(Math.atan2(subY,subX) * (180/Math.PI));
		    plane.newHeading = (0 < courseAngle) ? (courseAngle + 90) : ((courseAngle <= 0) && (-90 < courseAngle)) ? (90 + courseAngle) : (courseAngle <= -90) ? (courseAngle + 450) : courseAngle;
		}
		
		// plane distance from destination
		const distMeasure = plane => plane.distance = Math.round(Math.sqrt(Math.pow((plane.curX - plane.destX),2) + Math.pow((plane.curY - plane.destY),2)));
		
		const assignDest = plane => (plane.destination != -1) && setHeading(plane);
		
		const destReset = plane => {
			plane.destination = -1;
			plane.destX = 'undefined';
			plane.destY = 'undefined';
			plane.turnStep = 3;
			if ((plane.flightMode != 8) && (plane.flightMode != 9)){
				plane.flightMode = 0;
			}
			// ((plane.flightMode != 8) && (plane.flightMode != 9)) ? plane.flightMode = 0;		
		}
		
		// Separation check
		const fnSeparation = plane => {
			for (let i=0; i<planes.length; i++) {
				for (let j=0; j<planes.length; j++) {
					let sepDist = Math.round(Math.sqrt(Math.pow((planes[i].curX - planes[j].curX),2) + Math.pow((planes[i].curY - planes[j].curY),2)));
					let sepVert = Math.abs(planes[i].altitude - planes[j].altitude);
					if ((planes[i].id != planes[j].id) && (sepDist < 2) && (sepVert < 2)) {
						psFrame.removeChild(document.getElementById(planes[i].id));
						psFrame.removeChild(document.getElementById(planes[j].id));
						planes.splice(i,1);
						planes.splice(j,1);
						planeNR = planeNR-2;
						fnPausing();
						alert("Collision! - Game Over");
						return;
					} else if ((planes[i].id != planes[j].id) && (sepDist < 57) && (sepVert < 10) && ((([0,1,2,3,8].indexOf(planes[i].flightMode)) != -1) && (([0,1,2,3,8].indexOf(planes[j].flightMode)) != -1))) {
						drawSepCircle(planes[i].curX,planes[i].curY,context);
						drawSepCircle(planes[j].curX,planes[j].curY,context);
						sepViolation++;
					}
				}
			}
		}
		