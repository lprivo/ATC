function showInfoscreen() {
    let dispInfo = document.getElementById("infoScreen").style.display;
    let dispStat = document.getElementById("statScreen").style.display;
    if (dispInfo === "none") {
        if (dispStat != "none") {
            $(document).ready(function() {
                $('#statScreen').empty()
                $('#statScreen').css("display", "none")
                $('#infoScreen').css("display", "block")
                });
        } else {
            $(document).ready(function() {
                $('#infoScreen').css("display", "block")
            });
        };
    } else {
        $(document).ready(function() {
            $('#infoScreen').css("display", "none")
        });
    }
}

function showStatscreen() {
    let dispInfo = document.getElementById("infoScreen").style.display;
    let dispStat = document.getElementById("statScreen").style.display;
    let statValues = document.getElementById("statScreen").value = "<p>Successful landings: " + successfulLandings + "</p><p>Successful handoffs: " + successfulHandoffs + "</p><p>Missed approaches: " + missedApproaches + "</p><p>Improper exits: " + improperExits + "</p><p>Separation violation (sec): " + sepViolation + "</p>";
    if (dispStat === "none") {
        if (dispInfo != "none") {
            $(document).ready(function() {
                $('#infoScreen').css("display", "none")
                $('#statScreen').append(statValues)
                $('#statScreen').css("display", "block")
                
            });
        } else {
            $(document).ready(function() {
                $('#statScreen').append(statValues)
                $('#statScreen').css("display", "block")
        })};
    } else {
        $(document).ready(function() {
            $('#statScreen').empty()
            $('#statScreen').css("display", "none")
        });
    }
}

function getFlightid() {
    $(document).ready(function() {
        $('div div div div div').click(function() {
            $('#instructionText').val(this.id + " ")
            $('#instructionText').focus()
        });
    });
}
