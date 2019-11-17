// Runway
		const drawRunways = (context) => {
			for (let i=0; i<runways.length; i=(i+2)) {
				context.beginPath();
				context.moveTo(runways[i][4], runways[i][5]);
				context.lineTo(runways[i+1][4], runways[i+1][5]);
				context.lineWidth = 2;
				context.strokeStyle = 'rgba(150,190,190,1)';
				context.font="10px Arial";
				context.fillStyle = 'rgba(150,190,190,1)';
				context.fillText(runways[i][0], runways[i][8], runways[i][9]);
				context.fillText(runways[i+1][0], runways[i+1][8], runways[i+1][9]);
				context.stroke();
			}
		}

		const drawNavObj = (navObjects, context) => {
			context.beginPath();
			context.arc(navObjects[1], navObjects[2],5,0,2*Math.PI);
			context.moveTo(navObjects[1]-1, navObjects[2]-1);
			context.lineTo(navObjects[1]+1, navObjects[2]-1);
			context.lineTo(navObjects[1]+1, navObjects[2]+1);
			context.lineTo(navObjects[1]-1, navObjects[2]+1);
			context.lineTo(navObjects[1]-1, navObjects[2]-1);
			context.lineWidth = 1;
			context.strokeStyle = 'rgba(150,190,190,1)';
			context.font="10px Arial";
			context.fillStyle = 'rgba(150,190,190,1)';
			context.fillText(navObjects[0],navObjects[1]+10, navObjects[2]+2);
			context.stroke();
		}
	
		// square symbol of aircraft
		const drawPlane = (plane, context) => {
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
				context.moveTo(plane.curX-3, plane.curY-3);
				context.lineTo(plane.curX+3, plane.curY-3);
				context.lineTo(plane.curX+3, plane.curY+3);
				context.lineTo(plane.curX-3, plane.curY+3);
				context.lineTo(plane.curX-3, plane.curY-3);
				context.lineWidth = 1;
				context.strokeStyle = 'rgba(130,130,130,1)';
				context.font="12px Sans-serif";
				context.fillStyle = 'rgba(130,130,130,1)';
				context.fillText(plane.id, plane.curX, plane.curY-34);
				context.font="11px Sans-serif";
				context.fillText(leadingZeros(Math.floor(Math.round(plane.altitude)), 3), plane.curX, plane.curY-20);
				context.fillText(consArrow, plane.curX+20, plane.curY-20);
				context.fillText(leadingZeros(Math.floor(Math.round(plane.speed)), 2), plane.curX+30, plane.curY-20);
				context.stroke();
			} else if (plane.flightMode != 5) {
				context.beginPath();
				context.moveTo(plane.curX-3, plane.curY-3);
				context.lineTo(plane.curX+3, plane.curY-3);
				context.lineTo(plane.curX+3, plane.curY+3);
				context.lineTo(plane.curX-3, plane.curY+3);
				context.lineTo(plane.curX-3, plane.curY-3);
				context.lineWidth = 1;
				context.strokeStyle = 'white';
				context.font="12px Sans-serif";
				context.fillStyle = 'white';
				context.fillText(plane.id, plane.curX, plane.curY-34);
				context.font="11px Sans-serif";
				context.fillText(leadingZeros(Math.floor(Math.round(plane.altitude)), 3), plane.curX, plane.curY-20);
				context.fillText(consArrow, plane.curX+20, plane.curY-20);
				context.fillText(leadingZeros(Math.floor(Math.round(plane.speed)), 2), plane.curX+30, plane.curY-20);
				context.stroke();	
			}
		}
	  
		// plane trail line
		const drawTrail = (plane, context) => {
			for (let i=0; i<planes.length; i++) {
				context.beginPath();
				context.moveTo(planes[i].curX, planes[i].curY);
				context.lineTo(planes[i].curX - (Math.cos((planes[i].heading-90)*(Math.PI/180)) * planes[i].speed), planes[i].curY - (Math.sin((planes[i].heading-90)*(Math.PI/180)) * planes[i].speed));
				if (planes[i].flightMode === 9) {
					context.strokeStyle = 'rgba(110,110,110,1)'
				} else {context.strokeStyle = 'rgba(200,200,200,1)'};
				context.lineWidth = 1;
				context.stroke();
			}
		}
		
		const drawSepCircle = (x,y,context) => {
			context.beginPath();
			context.arc(x,y,57,0,2*Math.PI);
			context.linewidth = 1;
			context.strokeStyle = 'red';
			context.stroke();
		}