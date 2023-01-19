function saveFilename( prefix)
{
  let sf = prefix + year() + "-" + month() + "-" + day() + "_" + hour() + "." + minute() + "." + second() + ".png";
  return sf;
}


function getSetupString()
{
  let ss = "Setup\t" + ((char) (65+ setupMode)) + "\n";
  ss += "Gear Teeth\t";
  for ( let i = 0; i < setupTeeth[setupMode].length; ++i) {
    if (i > 0)  ss += "\t";
    ss += setupTeeth[setupMode][i];
  }
  ss += "\nMount Points\t";
  for ( let i = 0; i < setupMounts[setupMode].length; ++i) {
    if (i > 0)  ss += "\t";
    ss += setupMounts[setupMode][i];
  }
  ss += "\n";
  ss += "Pen\t" + penRig.len + "\t" + penRig.angle + "°" + "\n";
  return ss;
}

function GCD( a, b) {
   if (b==0) return a;
   return GCD(b,a%b);
}


// Compute total turntable rotations for current drawing
function computeCyclicRotations() {
  let a = 1; // running minimum
  let idx = 0;
  for ( let g of activeGears) {
    if (g.contributesToCycle && g != turnTable) {
      let ratioNom = turnTable.teeth;
      let ratioDenom = g.teeth;
      if (g.isMoving) { // ! cheesy hack for our orbit configuration, assumes anchorTable,anchorHub,orbit configuration
        ratioNom = turnTable.teeth * (activeGears[idx-1].teeth + g.teeth);
        ratioDenom = activeGears[idx-2].teeth * g.teeth;
        let gcd = GCD(ratioNom, ratioDenom);
        ratioNom /= gcd;
        ratioDenom /= gcd;
      }
      let b = min(ratioNom,ratioDenom) / GCD(ratioNom, ratioDenom);
      // println(g.teeth  + " " + ratioNom + "/" + ratioDenom + "  b = " + b);
      a = max(a,max(a,b)*min(a,b)/ GCD(a, b));
    }
    idx += 1;
  }
  return a;
}

function invertConnectingRod()
{
  if (selectedObject instanceof ConnectingRod) {
    selectedObject.invert();
  } else if (activeConnectingRods.length == 1) {
    activeConnectingRods[0].invert();
  } else {
    // ignore it
    // println("Please select a connecting rod to invert");
  }
}

function completeDrawing()
{
    myFrameCount = 0;
    penRaised = false;
    let totalRotations = computeCyclicRotations();
    // println("Total turntable cycles needed = " + totalRotations);
    let framesPerRotation = int(TWO_PI / crankSpeed);
    myLastFrame = framesPerRotation * totalRotations + 1;
    passesPerFrame = 360*2;
    isMoving = true;
}

function clearPaper() 
{
  paper = createGraphics(paperWidth, paperWidth);
  
  paper.smooth(8);
  paper.noFill();
  paper.stroke(penColor);
  paper.strokeJoin(ROUND);
  paper.strokeCap(ROUND);
  paper.strokeWeight(penWidth);

}

function nudge(direction, kc)
{
  if (selectedObject != null) {
    selectedObject.nudge(direction, kc);
  }
  doSaveSetup();
}

isDragging = false;
startDragX = 0;
startDragY= 0;

function drag() {
  if (selectedObject != null) {
    let direction=0, keycode=0;

    if (!isDragging) {
      startDragX = pmouseX;
      startDragY = pmouseY;
      isDragging = true;
    }
    //!!  for ConnectingRod - use a similar system as for penrig to move it's mountpoint - do NOT do swaps (maybe do them by double-clicking on swivel?)
    //
    if (selectedObject instanceof Gear) {
      let g = selectedObject;
      let dm = dist(mouseX, mouseY, g.x, g.y);
      let ds = dist(startDragX, startDragY, g.x, g.y);
      if (abs(dm-ds) > 10) {
        direction = (dm > ds)? 1 : -1;
        keycode = (direction == 1)? UP_ARROW: DOWN_ARROW;
        startDragX = mouseX;
        startDragY = mouseY;
      }
    } else if (selectedObject instanceof PenRig) {
      // For pen arm, use startX, endX to get closest anchor point on pen arm.  Then reposition/rotate so that anchorP is as close as possible to mouseX/mouseY
      // using proper penarm quantization.
      // we solve rotation first (using mouse -> arm pivot, translated for parent), then length is fairly easy.
      //
      let pr = selectedObject;
      let dm = dist(mouseX, mouseY, startDragX, startDragX);
      if (abs(dm) > 10) {
        let ap = pr.itsMP.getPosition(); // position of mount
        let pp = pr.getPosition(); // position of pen
        let startDragLen = dist(startDragX,startDragY,pp.x,pp.y);
        let gPenAngle, lenScale;
        if (startDragLen/(0.5*inchesToPoints) > pr.len) {
          // We are on opposite side of mount point from pen
          gPenAngle = atan2(ap.y-pp.y,ap.x-pp.x); // this is for moving pen when we're on the opposite side from pen
          lenScale= -1;
        } else {
          gPenAngle = atan2(pp.y-ap.y,pp.x-ap.x); // this causes us to be moving pen arm if we're close to pen...
          lenScale = 1;
        }
        let lAngleOffset = radians(pr.angle) - gPenAngle; // adjustment to stored angle, in radians
        let desiredAngle = atan2(mouseY-ap.y,mouseX-ap.x);
        pr.angle = degrees(desiredAngle+lAngleOffset);
        pr.angle = round(pr.angle / 5)*5;
        let oLen = dist(startDragX,startDragY,ap.x,ap.y);
        let desLen = dist(mouseX, mouseY, ap.x, ap.y);
        pr.len += lenScale*(desLen-oLen)/(0.5*inchesToPoints);
        pr.len = round(pr.len / 0.125)*0.125;
        setupPens[setupMode][1] = pr.angle;
        setupPens[setupMode][0] = pr.len;
        doSaveSetup();
        startDragX = mouseX;
        startDragY = mouseY;
      }
    } else {
      let dm = dist(mouseX, mouseY, startDragX, startDragX);
      if (abs(dm) > 10) {
        let a = atan2(mouseY-startDragY, mouseX-startDragX);
        if (a >= -PI/4 && a <= PI/4) {
          direction = 1;
          keycode = RIGHT_ARROW;
        } else if (a >= 3*PI/4 || a <= -3*PI/4) {
          direction = -1;
          keycode = LEFT_ARROW;
        } else if (a >= -3*PI/4 && a <= -PI/4) {
          direction = 1;
          keycode = UP_ARROW;
        } else if (a >= PI/4 && a <= 3*PI/4) {
          direction = -1;
          keycode = DOWN_ARROW;
        }
        startDragX = mouseX;
        startDragY = mouseY;
      }
    }
    if (direction != 0)
      nudge(direction, keycode);
  }
}

function deselect() {
  if (selectedObject != null) {
    selectedObject.unselect();
    selectedObject = null;
  }
}

function advancePenColor( direction) {
  penColorIdx = (penColorIdx + penColors.length + direction) % penColors.length;
  penColor = penColors[penColorIdx]; 
  //paper.beginDraw();
  paper.stroke(penColor);
  //paper.endDraw();
  if (direction != 0) {
    doSaveSetup();
  }
}

function advancePenWidth( direction) {
  penWidthIdx = (penWidthIdx + penWidths.length + direction) % penWidths.length;
  penWidth = penWidths[penWidthIdx]; 
  //paper.beginDraw();
  paper.strokeWeight(penWidth);
  //paper.endDraw();
  if (direction != 0) {
    doSaveSetup();
  }
}

function drawFulcrumLabels() { // steunpunt labels
    textFont(nFont);
    textAlign(CENTER);
    fill(64);
    stroke(92);
    strokeWeight(0.5);
    push();
      translate(3.1*inchesToPoints, 10.23*inchesToPoints);
      rotate(PI/2);
      let nbrNotches = 39;
      let startNotch = 0.25*inchesToPoints;
      let notchIncr = 0.25*inchesToPoints;
      let minNotch = 0.9*inchesToPoints;
      let lilNotch = minNotch/2;
      let widIncr = 1.722*inchesToPoints/nbrNotches;
      let notchSize = minNotch;
      let notchX = -startNotch;
      for ( let n = 0; n < 39; ++n) {
        line(notchX,0,notchX,n % 2 == 1? notchSize : lilNotch);
        if (n % 2 == 1) {
          text("" + int(n/2+1),notchX,lilNotch); 
        }
        notchSize += widIncr;
        notchX -= notchIncr;
      }
    pop();

}

class CDMSSetup {
  constructor( setupMode,  penColorIdx,  penWidthIdx, setupTeeth, setupMounts, setupPens, setupInversions)
  {
    this.penColorIdx = penColorIdx || 0;
    this.penWidthIdx = penWidthIdx || 0; 
    this.setupMode = setupMode || 0;
    this.setupTeeth = setupTeeth || [[]];
    this.setupMounts = setupMounts || [[]];
    this.setupPens = setupPens || [[]];
    this.setupInversions = setupInversions || [[]];
  }
}
 
function getSetupMode()
  {
    return setupMode;
  }
  
  function getDrawDirection()
  {
    return drawDirection;
  }
  
  function getPassesPerFrame()
  {
    return passesPerFrame;
  }
  
  function getIsMoving()
  {
    return isMoving;
  }
  function doSaveSetup()
  {
    let tsetup = new CDMSSetup(setupMode, penColorIdx, penWidthIdx, setupTeeth, setupMounts, setupPens, setupInversions);
    jsSaveSetups(tsetup);
  }

  function doLoadSetup()
  {
    let tsetup = new CDMSSetup(setupMode, penColorIdx, penWidthIdx, setupTeeth, setupMounts, setupPens, setupInversions);
    jsLoadSetups(tsetup);
    setupTeeth = tsetup.setupTeeth;
    setupMounts = tsetup.setupMounts;
    setupPens = tsetup.setupPens;
    setupInversions = tsetup.setupInversions;
    setupMode = tsetup.setupMode;
    penColorIdx = tsetup.penColorIdx;
    penWidthIdx = tsetup.penWidthIdx;
    advancePenColor(0);
    advancePenWidth(0);
  }

  function doSnapshot() 
  {
    //
    // background(255);
    // image(paper,0,0);
    // save("untitled.png");
    makeSnapshot(paper, turnTable.rotation, saveFilename("cdm_"));
  }

  function issueCmd( cmd,  subcmd) {
    if (!cmd.localeCompare("play")) {
        passesPerFrame = 1;
        isMoving = true;
        penRaised = false;
        drawDirection = 1;
        myLastFrame = -1;
    } else if (!cmd.localeCompare("pause")) {
        isMoving = false;
        drawDirection = 1;
        myLastFrame = -1;
    } else if (!cmd.localeCompare("ff")) {
        passesPerFrame = 10;
        penRaised = false;
        drawDirection = 1;
        isMoving = true;
    } else if (!cmd.localeCompare("fff")) {
        drawDirection = 1;
        penRaised = false;
        completeDrawing();
    } else if (!cmd.localeCompare("rr")) {
        drawDirection = -1;
        passesPerFrame = 1;
        penRaised = false;
        isMoving = true;
    } else if (!cmd.localeCompare("rrr")) {
        drawDirection = -1;
        passesPerFrame = 10;
        penRaised = false;
        isMoving = true;
    } else if (!cmd.localeCompare("erase")) {
        clearPaper();
    } else if (!cmd.localeCompare("setup")) {
        let setupMode = int(subcmd);
        deselect();
        drawingSetup(setupMode, false);
        doSaveSetup();
    } else if (!cmd.localeCompare("snapshot")) {
      doSnapshot();
    } else if (!cmd.localeCompare("help")) {
      toggleHelp();
      // alert("Help is coming soon...");
    }
  }


