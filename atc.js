import { startSim } from "./SimControl";

// const startGame = gameOptions => {
//   const { difficulty, airport } = gameOptions;
//   startSim(difficulty, airport);
// };

const setOpts = modal => {
  console.log("Saving options");
  const gameOptions = {
    selectedDifficulty: document.getElementById("Difficulty").value,
    selectedAirport: document.getElementById("Airports").value,
    selectedGameMode: document.getElementById("GameMode").value
  };

  startSim(gameOptions);
  //es ez a fajl egyenlore ennyi.
  //innen tovabb folyatod a munkat a simControlban
};

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

  //nem ertem itt mi tortenik :( screensize honnan jon? - ez nezi, hogy lett-e valtoztatva az ablak merete, de nem mukodik sztem jol, ezert kerdeztem a re
  // awindow.addEventListener("resize", screenSize);
  // ha nem mukodik, most nem eroltetem
  // ha jol emlekszem, de meg kell neznem majd

  //ignore this
  const promptInvalidCommTest = () => {
    document.getElementById("console").value =
      "TEST Invalid Command!\n" + document.getElementById("console").value;
    document.getElementById("instructionText").value = "";
    resid = -1;
    return;
  };

  window.onload = () => {
    const canvasElement = document.getElementById("myCanvas"); //canvas is declared, but value never used... nezzuk
    const instructionText = document.getElementById("instructionText");
    const consoleTextArea = document.getElementById("console");
    const modal = document.getElementById("startModal"); //it's style is set to block in css.
    const psFrame = document.getElementById("psFrame");
    const startButton = document.getElementById("startbutton");

    instructionText.focus();
    consoleTextArea.value = `Welcome to Privo-ATC! ${consoleTextArea.value}`; //ez az uj string epites modja. :)
    instructionText.value = "";

    startButton.addEventListener("click", () => {
      modal.style.display = "none"; //hiding the modal as soon as it's clicked
      setOpts(); //rading/setting options and starting game
    });
    //na idaig mukodik
    //egyenlore abban se vagyok biztos, hogy innentol lefele kell e meg barmi is ide.
    // valoszinuleg szukseg van rajuk, csak nem epp itt

    const canvas = {
      width: window.innerWidth - 310,
      height: window.innerHeight,
      heightWidthRatio: (window.innerWidth - 310) * 0.6,
      context: canvasElement.getContext("2d")
    };

    let planeNR = 0; // body canvas - style="background: #103848"
    let planes = [];
    let runways = [];
    let airlnrCode = []; //operating airliners' list
    let airlnrDistr = []; //operating airliners's distribution - main operator + 4 groups by no. of aircrafts
    let destName;
    let entryPts = [];
    //let consoleText = document.getElementById('console').value;
    let userCommand; // = document.getElementById("instructionText").value;
    let splitCommand = [];
    let pausing = false;
    let resid;
    let entryAlt = [50, 50, 60, 60, 60, 70, 70, 70, 70, 80, 80, 80];
    let navObjects = [];
    let successfulLandings = 0;
    let successfulHandoffs = 0;
    let improperExits = 0;
    let missedApproaches = 0;
    let sepViolation = 0;
    //  meg mindig nem latom, mi inditja be a dolgokat.... bocs ha ugralok, de keresem
  };
};

init();
