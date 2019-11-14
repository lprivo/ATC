function initLHBP() {
			
    navObjects[0] = ["BADOV", Math.round(cW*.343), Math.round(cHW*.008)];
    navObjects[1] = ["NALAG", Math.round(cW*.640), Math.round(cHW*.008)];
    navObjects[2] = ["BABOX", Math.round(cW*.669), Math.round(cHW*.982)];
    navObjects[3] = ["ABONY", Math.round(cW*.824), Math.round(cHW*.666)];
    navObjects[4] = ["VEBOS", Math.round(cW*.224), Math.round(cHW*.625)];
    navObjects[5] = ["GILEP", Math.round(cW*.057), Math.round(cHW*.429)];
    navObjects[6] = ["NIPUR", Math.round(cW*.836), Math.round(cHW*.186)];
    navObjects[7] = ["JBR", Math.round(cW*.785), Math.round(cHW*.421)];
    navObjects[8] = ["TPS", Math.round(cW*.586), Math.round(cHW*.424)];
    navObjects[9] = ["MNR", Math.round(cW*.567), Math.round(cHW*.600)];
    navObjects[10] = ["BALUX", Math.round(cW*.443), Math.round(cHW*.591)];
    navObjects[11] = ["ETARO", Math.round(cW*.387), Math.round(cHW*.421)];
    navObjects[12] = ["EPARI", Math.round(cW*.378), Math.round(cHW*.210)];
    navObjects[13] = ["NORAH", Math.round(cW*.746), Math.round(cHW*.292)];
    navObjects[14] = ["ERLOS", Math.round(cW*.508), Math.round(cHW*.889)];
    navObjects[15] = ["ALAMU", Math.round(cW*.090), Math.round(cHW*.149)];
    navObjects[16] = ["BUD", Math.round(cW*.506), Math.round(cHW*.462)];
    
    // 0-id, 1-rw angle, 2-navPointX, 3-navPointY, 4-startPointX, 5-startPointY, 6-centreX, 7-centreY, 8-idTagX, 9-idTagY;
    runways[0] = ["13L", 130, ((cW/2)-57), ((cHW/2)-59), ((cW/2)+3), ((cHW/2)-9), ((cW/2)+20), ((cHW/2)+5), ((cW/2)-20), ((cHW/2)-17)];
    runways[1] = ["31R", 310, ((cW/2)+97), ((cHW/2)+69), ((cW/2)+37), ((cHW/2)+19), ((cW/2)+20), ((cHW/2)+5), ((cW/2)+37), ((cHW/2)+34)];
    runways[2] = ["13R", 130, ((cW/2)-92), ((cHW/2)-66), ((cW/2)-29), ((cHW/2)-16), ((cW/2)-15), ((cHW/2)-5), ((cW/2)-52), ((cHW/2)-23)];
    runways[3] = ["31L", 310, ((cW/2)+62), ((cHW/2)+59), ((cW/2)-1), ((cHW/2)+6), ((cW/2)-15), ((cHW/2)-5), ((cW/2)+4), ((cHW/2)+21)];
    
    {
    let entryPt1 = new Object();
    entryPt1.coorX = Math.round(cW*.3);
    entryPt1.coorY = -7;
    entryPt1.direction = 150;
    entryPts.push(entryPt1);
    }
      
    {
    let entryPt2 = new Object();
    entryPt2.coorX = cW+7;
    entryPt2.coorY = Math.round(cH*.08);
    entryPt2.direction = 248;
    entryPts.push(entryPt2);
    }
      
    {
    let entryPt3 = new Object();
    entryPt3.coorX = Math.round(cW*.85);
    entryPt3.coorY = cH+7;
    entryPt3.direction = 353;
    entryPts.push(entryPt3);
    }
      
    {
    let entryPt4 = new Object();
    entryPt4.coorX = Math.round(cW*.15);
    entryPt4.coorY = cH+7;
    entryPt4.direction = 18;
    entryPts.push(entryPt4);
    }
    
    {
    let entryPt5 = new Object();
    entryPt5.coorX = -7;
    entryPt5.coorY = Math.round(cH*.45);
    entryPt5.direction = 80;
    entryPts.push(entryPt5);
    }
    
    airlnrCode = ["W6","FR","LH","U2","AF","BA","4U","LS","KL","LO","OS","SN","OK","DY","RO","TK","AB","AZ","B2","AY","LX","QR","HV","7O","PC","A3","EI","SU","BT","CA","EK","EW","LX","TP","PS","LY"];
    airlnrDistr = [141,37,62,2,92,7,126,12];
    destName = "BUD";
    document.getElementById("myCanvas").style.backgroundImage = 'url("Images/LHBP_bgnd_map.png")';
}

function initEGLL() {
    
    navObjects[0] = ["BIG", Math.round(cW*.791), Math.round(cHW*.707)];	//(20NM from centre = 378 on-screen distance)
    navObjects[1] = ["BNN", Math.round(cW*.442), Math.round(cHW*.089)];
    navObjects[2] = ["BPK", Math.round(cW*.688), Math.round(cHW*.041)];
    navObjects[3] = ["WOD", Math.round(cW*.255), Math.round(cHW*.533)];
    navObjects[4] = ["HEN", Math.round(cW*.302), Math.round(cHW*.040)];
    navObjects[5] = ["BLK", Math.round(cW*.277), Math.round(cHW*.740)];
    navObjects[6] = ["LAM", Math.round(cW*.851), Math.round(cHW*.200)];
    navObjects[7] = ["OCK", Math.round(cW*.510), Math.round(cHW*.760)];
    navObjects[8] = ["CHT", Math.round(cW*.462), Math.round(cHW*.253)];
    navObjects[9] = ["EPM", Math.round(cW*.554), Math.round(cHW*.736)];
    navObjects[10] = ["BUR", Math.round(cW*.372), Math.round(cHW*.423)];
    navObjects[11] = ["LON", Math.round(cW*.494), Math.round(cHW*.469)];
    
    // 0-id, 1-rw angle, 2-navPointX, 3-navPointY, 4-startPointX, 5-startPointY, 6-centreX, 7-centreY, 8-idTagX, 9-idTagY;
    runways[0] = ["9L", 90, ((cW/2)-104), ((cHW/2)-10), ((cW/2)-23), ((cHW/2)-10), ((cW/2)-4), ((cHW/2)-10), ((cW/2)-39), ((cHW/2)-7)];
    runways[1] = ["27R", 270, ((cW/2)+96), ((cHW/2)-10), ((cW/2)+15), ((cHW/2)-10), ((cW/2)-4), ((cHW/2)-10), ((cW/2)+20), ((cHW/2)-7)];
    runways[2] = ["9R", 90, ((cW/2)-103), ((cHW/2)+4), ((cW/2)-20), ((cHW/2)+4), ((cW/2)-3), ((cHW/2)+4), ((cW/2)-37), ((cHW/2)+7)];
    runways[3] = ["27L", 270, ((cW/2)+97), ((cHW/2)+4), ((cW/2)+15), ((cHW/2)+4), ((cW/2)-3), ((cHW/2)+4), ((cW/2)+20), ((cHW/2)+7)];
    
    {
    let entryPt1 = new Object();
    entryPt1.coorX = 40;
    entryPt1.coorY = -7;
    entryPt1.direction = 125;
    entryPts.push(entryPt1);
    }
      
    {
    let entryPt2 = new Object();
    entryPt2.coorX = cW+7;
    entryPt2.coorY = Math.round(cH*.08);
    entryPt2.direction = 245;
    entryPts.push(entryPt2);
    }
      
    {
    let entryPt3 = new Object();
    entryPt3.coorX = cW+7;
    entryPt3.coorY = cH-25;
    entryPt3.direction = 308;
    entryPts.push(entryPt3);
    }
      
    {
    let entryPt4 = new Object();
    entryPt4.coorX = Math.round(cW*.22);
    entryPt4.coorY = cH+7;
    entryPt4.direction = 54;
    entryPts.push(entryPt4);
    }
    
    {
    let entryPt5 = new Object();
    entryPt5.coorX = -7;
    entryPt5.coorY = Math.round(cH*.68);
    entryPt5.direction = 64;
    entryPts.push(entryPt5);
    }
    
    airlnrCode = ["BA","EI","VS","LH","AA","SK","UA","LX","DL","AC","4U","IB","KL","AF","EK","EW","BE","QR","TP","TK","AZ","CX","AY","BI","A3","OS","SQ","SU","SN","EY","9W","LO","CA","KM","CZ","QU","MS","LY","GF","FI","KU","MH","ME","WY","QF","SV","SA","TG","AH","BT","MK","NZ","JU","AM","NH","OZ","AV","J2","BG","FB","MU","ET","BR","JL","KQ","KE","JJ","PK","PR","AT","BI","RJ","UL","RO","TS","VN","VY"];
    airlnrDistr = [700,360,480,6,540,6,620,14];	//for fn aCGen(): total no. of flights, main op. flightCount, group1-flightCount,group1-operatorCount, group2-fc, group2-op, g3-fc, g3-op, g4-fc, g4-op;
    destName = "LON";
    document.getElementById("myCanvas").style.backgroundImage = 'url("Images/EGLL_bgnd_map.png")';
}

function initEPWA() {
    
    navObjects[0] = ["ULPAR", Math.round(cW*.515), Math.round(cHW*.080)];
    navObjects[1] = ["SIE", Math.round(cW*.967), Math.round(cHW*.493)];
    navObjects[2] = ["DEDOL", Math.round(cW*.320), Math.round(cHW*.992)];
    navObjects[3] = ["IBARA", Math.round(cW*.006), Math.round(cHW*.680)];
    navObjects[4] = ["IDAKO", Math.round(cW*.302), Math.round(cHW*.008)];
    navObjects[5] = ["DODEK", Math.round(cW*.009), Math.round(cHW*.250)];
    navObjects[6] = ["MARIA", Math.round(cW*.670), Math.round(cHW*.992)];
    navObjects[7] = ["VEKER", Math.round(cW*.585), Math.round(cHW*.220)];
    navObjects[8] = ["LDZ", Math.round(cW*.006), Math.round(cHW*.853)];
    navObjects[9] = ["LIN", Math.round(cW*.570), Math.round(cHW*.720)];
    navObjects[10] = ["KRN", Math.round(cW*.300), Math.round(cHW*.705)];
    navObjects[11] = ["WAR", Math.round(cW*.381), Math.round(cHW*.382)];
    navObjects[12] = ["ADLAR", Math.round(cW*.120), Math.round(cHW*.008)];
    navObjects[13] = ["WAW", Math.round(cW*.500), Math.round(cHW*.473)];
    
    // 0-id, 1-rw angle, 2-navPointX, 3-navPointY, 4-startPointX, 5-startPointY, 6-centreX, 7-centreY, 8-idTagX, 9-idTagY;
    runways[0] = ["15", 150, ((cW/2)-54), ((cHW/2)-97), ((cW/2)-14), ((cHW/2)-30), ((cW/2)-4), ((cHW/2)-10), ((cW/2)-23), ((cHW/2)-40)];
    runways[1] = ["33", 330, ((cW/2)+46), ((cHW/2)+77), ((cW/2)+7), ((cHW/2)+10), ((cW/2)-4), ((cHW/2)-10), ((cW/2)+8), ((cHW/2)+22)];
    runways[2] = ["11", 110, ((cW/2)-101), ((cHW/2)-46), ((cW/2)-23), ((cHW/2)-21), ((cW/2)-7), ((cHW/2)-12), ((cW/2)-40), ((cHW/2)-21)];
    runways[3] = ["29", 290, ((cW/2)+87), ((cHW/2)+22), ((cW/2)+9), ((cHW/2)-4), ((cW/2)-7), ((cHW/2)-12), ((cW/2)+15), ((cHW/2)+2)];
    
    {
    let entryPt1 = new Object();
    entryPt1.coorX = Math.round(cW*.51);
    entryPt1.coorY = cH+7;
    entryPt1.direction = 20;
    entryPts.push(entryPt1);
    }
      
    {
    let entryPt2 = new Object();
    entryPt2.coorX = -7;
    entryPt2.coorY = Math.round(cH*.86);
    entryPt2.direction = 69;
    entryPts.push(entryPt2);
    }
      
    {
    let entryPt3 = new Object();
    entryPt3.coorX = Math.round(cW*.113);
    entryPt3.coorY = -7;
    entryPt3.direction = 149;
    entryPts.push(entryPt3);
    }
      
    {
    let entryPt4 = new Object();
    entryPt4.coorX = Math.round(cW*.67);
    entryPt4.coorY = -7;
    entryPt4.direction = 212;
    entryPts.push(entryPt4);
    }
    
    {
    let entryPt5 = new Object();
    entryPt5.coorX = cW+7;
    entryPt5.coorY = Math.round(cH*.56);
    entryPt5.direction = 247;
    entryPts.push(entryPt5);
    }
    
    airlnrCode = ["LO","W6","LO","LH","SU","AF","OS","SN","OK","LX","KL","SK","3Z","BT","BA","EW","AY","QS","PS","JP","A3","EI","CA","AZ","B2","LY","EK","DY","QR","FR","P8","P7","TP","TK","VY"];
    airlnrDistr = [219,122,158,2,164,1,203,15];	//for fn aCGen(): total no. of flights, main op. flightCount, group1-flightCount, group1-operatorCount, group2-fc, group2-op, g3-fc, g3-op
    destName = "WAW";
    document.getElementById("myCanvas").style.backgroundImage = 'url("Images/EPWA_bgnd_map.png")';
}

function initKSEA() {
    
    navObjects[0] = ["PAE", Math.round(cW*.507), Math.round(cHW*.008)];
    navObjects[1] = ["MODDA", Math.round(cW*.826), Math.round(cHW*.500)];
    navObjects[2] = ["RADDY", Math.round(cW*.827), Math.round(cHW*.862)];
    navObjects[3] = ["TAOMA", Math.round(cW*.550), Math.round(cHW*.982)];
    navObjects[4] = ["OLM", Math.round(cW*.246), Math.round(cHW*.969)];
    navObjects[5] = ["HAROB", Math.round(cW*.190), Math.round(cHW*.690)];
    navObjects[6] = ["ARRIE", Math.round(cW*.010), Math.round(cHW*.040)];
    navObjects[7] = ["LAC", Math.round(cW*.392), Math.round(cHW*.930)];
    navObjects[8] = ["HPK", Math.round(cW*.496), Math.round(cHW*.394)];
    navObjects[9] = ["RNT", Math.round(cW*.535), Math.round(cHW*.432)];
    navObjects[10] = ["GRF", Math.round(cW*.372), Math.round(cHW*.780)];
    navObjects[11] = ["PWT", Math.round(cW*.305), Math.round(cHW*.436)];
    navObjects[12] = ["VAMPS", Math.round(cW*.632), Math.round(cHW*.565)];
    navObjects[13] = ["SEA", Math.round(cW*.508), Math.round(cHW*.510)];
    
    // 0-id, 1-rw angle, 2-navPointX, 3-navPointY, 4-startPointX, 5-startPointY, 6-centreX, 7-centreY, 8-idTagX, 9-idTagY;
    runways[0] = ["18L", 180, ((cW/2)+2), ((cHW/2)-109), ((cW/2)+2), ((cHW/2)-33), ((cW/2)+2), ((cHW/2-9)), ((cW/2)+7), ((cHW/2)-43)];
    runways[1] = ["36R", 360, ((cW/2)+2), ((cHW/2)+91), ((cW/2)+2), ((cHW/2)+15), ((cW/2)+2), ((cHW/2-9)), ((cW/2)+7), ((cHW/2)+30)];
    runways[2] = ["18C", 180, ((cW/2)-4), ((cHW/2)-113), ((cW/2)-4), ((cHW/2)-33), ((cW/2)-4), ((cHW/2-13)), ((cW/2)-12), ((cHW/2)-43)];
    runways[3] = ["36C", 360, ((cW/2)-4), ((cHW/2)+87), ((cW/2)-4), ((cHW/2)+6), ((cW/2)-4), ((cHW/2)-13), ((cW/2)-12), ((cHW/2)+25)];
    runways[4] = ["18R", 180, ((cW/2)-13), ((cHW/2)-111), ((cW/2)-13), ((cHW/2)-33), ((cW/2)-13), ((cHW/2)-15), ((cW/2)-31), ((cHW/2)-43)];
    runways[5] = ["36L", 360, ((cW/2)-13), ((cHW/2)+89), ((cW/2)-13), ((cHW/2)+4), ((cW/2)-13), ((cHW/2)-15), ((cW/2)-31), ((cHW/2)+19)];
    
    {
    let entryPt1 = new Object();
    entryPt1.coorX = -7;
    entryPt1.coorY = Math.round(cH*.032);
    entryPt1.direction = 105;
    entryPts.push(entryPt1);
    }
      
    {
    let entryPt2 = new Object();
    entryPt2.coorX = cW+7;
    entryPt2.coorY = Math.round(cH*.1);
    entryPt2.direction = 275;
    entryPts.push(entryPt2);
    }
      
    {
    let entryPt3 = new Object();
    entryPt3.coorX = Math.round(cW*.75);
    entryPt3.coorY = cH+7;
    entryPt3.direction = 333;
    entryPts.push(entryPt3);
    }
      
    {
    let entryPt4 = new Object();
    entryPt4.coorX = Math.round(cW*.41);
    entryPt4.coorY = cH+7;
    entryPt4.direction = 340;
    entryPts.push(entryPt4);
    }
    
    {
    let entryPt5 = new Object();
    entryPt5.coorX = Math.round(cW*.2);
    entryPt5.coorY = cH+7;
    entryPt5.direction = 357;
    entryPts.push(entryPt5);
    }
    
    airlnrCode = ["AS","DL","WN","UA","AA","FX","B6","AC","8C","NK","VX","BA","CI","HA","HU","NH","1I","A8","AM","BR","DE","EK","F9","FI","GB","KE","LH","OX","SY","VS","Y4"];
    airlnrDistr = [556,282,417,1,513,4,531,5];	//for fn aCGen(): total no. of flights, main op. flightCount, group1-flightCount, group1-operatorCount, group2-fc, group2-op, g3-fc, g3-op
    destName = "SEA";
    document.getElementById("myCanvas").style.backgroundImage = 'url("Images/KSEA_bgnd_map.png")';
}