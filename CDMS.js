/* @pjs globalKeyEvents=true; 
 */

// Simulation of Cycloid Drawing Machine  - latest version is on https://github.com/jbum/CycloidDrawingMachine
//
// Physical machine designed by Joe Freedman  kickstarter.com/projects/1765367532/cycloid-drawing-machine
// Processing simulation by Jim Bumgardner    krazydad.com
//
//// let inchesToPoints = 72; // controls display scaling
let seventyTwoScale = inchesToPoints / 72.0; // Don't change this
//// let mmToInches = 1/25.4;

let setupTeeth = [
    [150,72],
    [120,94,90,34],
    [150,50,100,34,40],
    [144, 100, 72],
    [150, 98, 100],
    [150, 100, 74],
    [150,50,100,34,40,50,50],
  ];

let setupMounts = [ // mount point measurements
  [0, 3.3838, 10.625],
  [1.5, 4.4798,  10],
  [0.8973, 1.5, 12],
  [4, 4, 0.8, 2, 8.625],
  [0.7, 2, 4, 8, 9],
  [0.7, 3.3838, 4, 0.21, 12.75, 5.5, 5.25],
  [2.5, 1.0, 14.0],
];

let setupPens = [
  [3.375,-55],
  [4.5,90],
  [7.5,-90],
  [4.75,-65],
  [4.5,-90],
  [3.125,-65],
  [6.5,-90],
];

let setupInversions = [
  [true],
  [false],
  [false],
  [false, false],
  [false, false],
  [false, false, false],
  [false],
];

let bWidth = 18.14;
let bHeight = 11.51;
let pCenterX = 8.87;
let pCenterY = 6.61;
let toothRadius = 0.0956414*inchesToPoints;
let meshGap = 1.5*mmToInches*inchesToPoints; // 1.5 mm gap needed for meshing gears

let  gFont = {};
let hFont = {};
let nFont = {};
let titlePic = {};


let setupMode = 0; // 0 = simple, 1 = moving pivot, 2 = orbiting gear, 3 = orbit gear + moving pivot

let activeGears = [];
let activeMountPoints = [];
let rails = [];
let activeConnectingRods = [];
let mountPoints = [];
let allCdmsObjects = [];


let selectedObject = null;
let crank = {};
let turnTable = {};
let slidePoint = {}; 
let anchorPoint = {}; 
let discPoint = {}; 
let penMount = {};
let crankRail = {};
let anchorRail = {};
let pivotRail = {};
let freeRail = {};

let cRod = {};
let penRig = {};
let selectPenRig = null;

let paper = {};
//const TWO_PI = 6.283185307179586476925286766559;

let paperScale = 1;
let paperWidth = 9*inchesToPoints*paperScale;
let crankSpeed = 6.283185307179586476925/720;  // rotation per frame  - 0.2 is nice.
let passesPerFrame = 1;
let hiresMode = false;

let isStarted = false;
let isMoving = false;
let penRaised = true;
let lastPenRaised = true;

let lastPX = -1;
let lastPY = -1;
let myFrameCount = 0;
let myLastFrame = -1;
let drawDirection = 1;
let recordCtr = 0;

let backgroundColor = '#808080';
let paperColor = '#ffffff';
let foregroundColor = '#c8c8c8';
let themecolor = {};
let selectedTheme = {};
let penColors = [];
let penColor = {};
let penColorIdx = 0;
let freeMode = false;

let penWidths = [0.5, 1, 2, 3, 5, 7];
let penWidth = 1;
let penWidthIdx = 1;
let loadError = 0; // 1 = gears can't snug

function preload() {
  titlePic = loadImage("../data/title_dark.png");

}
function setup() {
  selectedTheme = color(128,128,128,255); 
  // size(window.innerWidth, window.innerHeight); 
  penColors = [color(0,0,0), color(192,0,0), color(0,128,0), color(0,0,128), color(192,0,192)];
  penColor = color(0,0,0,1);
    
  let cnvs = createCanvas(1400,828); // create drawing canvas
  cnvs.parent('p5jsCanvas'); // assign to marked div in html

  ellipseMode(RADIUS);
  // mydebug("test");
  gFont = textFont("Courier").textSize( int(32*seventyTwoScale));
  hFont = textFont("Courier").textSize( int(18*seventyTwoScale));
  nFont = textFont("Courier").textSize(int(11*seventyTwoScale)); // loadFont("Notch-Font.vlw");
//  titlePic = loadImage("title_dark.png");

  gearInit();
  /* clear arrays */
  activeGears.length = 0;
  activeMountPoints.length = 0;
  activeConnectingRods.length = 0;
  rails.length = 0;
  mountPoints.length = 0;
  allCdmsObjects.length = 0;


  // Board Setup
  
  paper = createGraphics(int(paperWidth), int(paperWidth));

  discPoint = new MountPoint("DP", pCenterX, pCenterY);
  
  rails.push(new LineRail(2.22, 10.21,0.51,0.6));
  rails.push(new LineRail(3.1, 10.23, 3.1,0.5));
  rails.push(new LineRail(8.74, 2.41, 9.87,0.47));
  rails.push(new ArcRail(pCenterX, pCenterY, 6.54, radians(-68), radians(-5)));
  rails.push(new ArcRail(8.91, 3.91, 7.79, radians(-25), radians(15)));

  let rbegD = [
    4.82, 4.96, 4.96, 4.96, 4.96, 4.96
  ];
  let rendD = [
    7.08, 6.94, 8.46, 7.70, 7.96, 8.48
  ];
  let rang = [
    radians(-120), radians(-60), radians(-40), radians(-20), 0, radians(20)
  ];

  for (let i = 0; i < rbegD.length; ++i) {
      let x1 = pCenterX + cos(rang[i])*rbegD[i];
      let y1 = pCenterY + sin(rang[i])*rbegD[i];
      let x2 = pCenterX + cos(rang[i])*rendD[i];
      let y2 = pCenterY + sin(rang[i])*rendD[i];
      rails.push(new LineRail(x1, y1, x2, y2));
  }

  setupButtons();
  doLoadSetup();
  drawingSetup(setupMode, true);
  buttonFeedback();
}

function addGear( setupIdx,  nom)
{
  let g = new Gear(setupTeeth[setupMode][setupIdx], setupIdx, nom);
  activeGears.push(g);
  return g;
}

function addMP( setupIdx,  nom,  chan)
{
  let mp = new MountPoint(nom, chan, setupMounts[setupMode][setupIdx], setupIdx);
  activeMountPoints.push(mp);
  return mp;
}

function addCR( rodNbr,  slide,  anchor)
{
  let cr = new ConnectingRod(slide, anchor, rodNbr);
  activeConnectingRods.push(cr);
  return cr;
}

function addPen( penMount) {
  return new PenRig(setupPens[setupMode][0], setupPens[setupMode][1], penMount);
}

function updateSetup(){
  updateGearSetup(turnTable);
}

function updateGearSetup(anchor){
  for (let g of anchor.meshGears.values()){
    g.snugTo(anchor);
    g.meshTo(anchor);
  }
  for (let g of anchor.meshGears.values()){
    updateGearSetup(g);
  }
}


function drawingSetup( setupIdx,  resetPaper)
{
  let aRail = {};
  let bRail = {};
  let aGear = {};
  let bGear = {};
  let slidePoint2 = {};
  let anchorPoint2 = {};
  let cRod2 = {};
  let slidePoint3 = {};
  let anchorPoint3 = {};
  let cRod3 = {};
  let anchorTable = {};
  let anchorHub = {};
  let orbit = {};
  let fulcrumCrank = {};
  let fulcrumGear = {};
  

  setupMode = setupIdx;
  loadError = 0;

  if (resetPaper) {
    isStarted = false;
  }
  isStarted = false;
  penRaised = true;
  myFrameCount = 0;

/* clear arrays */
  activeGears.length = 0;
  activeMountPoints.length = 0;
  activeConnectingRods.length = 0;
//  mountPoints.length = 0;
  
   // Drawing Setup
  switch (setupIdx) {
  case 0: // simple set up with one gear for pen arm
    turnTable = addGear(0,"Turntable"); 
    crank = addGear(1,"Crank");
    crankRail = rails[10];
    pivotRail = rails[1];
    let crmount = new MountPoint("CRMP", crankRail, 0, 0);
    activeMountPoints.push(crmount);
    crank.mountOn(crmount);
    //crank.mount(crankRail,0);
    turnTable.mount(discPoint, 0);
    crank.snugTo(turnTable);
    crank.meshTo(turnTable);

    slidePoint = addMP(0, "SP", pivotRail);
    anchorPoint = addMP(1, "AP", crank);
    cRod = addCR(0, slidePoint, anchorPoint);

    penMount = addMP(2, "EX", cRod);
    penRig = addPen(penMount);
    break;

  case 1: // moving fulcrum & separate crank
    turnTable = addGear(0,"Turntable"); 
    crank = addGear(1,"Crank");    crank.contributesToCycle = false;
    let anchor = addGear(2,"Anchor");
    fulcrumGear = addGear(3,"FulcrumGear");
    crankRail = rails[1];
    anchorRail = rails[10];
    pivotRail = rails[0];
    crank.mount(crankRail, 0); // will get fixed by snugto
    anchor.mount(anchorRail,0);
    fulcrumGear.mount(pivotRail, 0); // will get fixed by snugto
    turnTable.mount(discPoint, 0);

    crank.snugTo(turnTable);
    anchor.snugTo(turnTable);
    fulcrumGear.snugTo(crank);    

    crank.meshTo(turnTable);
    anchor.meshTo(turnTable);
    fulcrumGear.meshTo(crank);   

    slidePoint = addMP(0, "SP", fulcrumGear);
    anchorPoint = addMP(1, "AP", anchor);
    cRod = addCR(0, slidePoint, anchorPoint);
    penMount = addMP(2, "EX", cRod);
    penRig = addPen(penMount);

    break;
    
  case 2: // orbiting gear
    crankRail = rails[9];
    anchorRail = rails[4];
    pivotRail = rails[1];
    
    // Always need these...
    turnTable = addGear(0,"Turntable");
    crank = addGear(1,"Crank");    
    crank.contributesToCycle = false;
  
    // These are optional
    anchorTable = addGear(2,"AnchorTable");
    anchorHub = addGear(3,"AnchorHub"); 
    anchorHub.contributesToCycle = false;
    orbit = addGear(4,"Orbit");
  
    orbit.isMoving = true;
  
    // Setup gear relationships and mount points here...
    crank.mount(crankRail, 0);
    turnTable.mount(discPoint, 0);
    crank.snugTo(turnTable);
    crank.meshTo(turnTable);
  
    anchorTable.mount(anchorRail,0.315); // this is a hack - we need to allow the anchorTable to snug to the crank regardless of it's size...
    anchorTable.snugTo(crank);
    anchorTable.meshTo(crank);

    anchorHub.stackTo(anchorTable);
    anchorHub.isFixed = true;

    orbit.mount(anchorTable,0);
    orbit.snugTo(anchorHub);
    orbit.meshTo(anchorHub);
  
    // Setup Pen
    slidePoint = addMP(0, "SP", pivotRail);
    anchorPoint = addMP(1, "AP", orbit);
    cRod = addCR(0, slidePoint, anchorPoint);
    penMount = addMP(2, "EX", cRod);
    penRig = addPen(penMount);
    break;

  case 3:// 2 pen rails, variation A
    pivotRail = rails[1];
    aRail = rails[10];
    bRail = rails[7];
    turnTable = addGear(0,"Turntable");
    aGear = addGear(1,"A");
    bGear = addGear(2,"B");

    turnTable.mount(discPoint, 0);
    aGear.mount(aRail, 0.5);
    aGear.snugTo(turnTable);
    aGear.meshTo(turnTable);

    bGear.mount(bRail, 0.5);
    bGear.snugTo(turnTable);
    bGear.meshTo(turnTable);

    slidePoint = addMP(0, "SP", aGear);
    anchorPoint = addMP(1, "AP", bGear);
    cRod = addCR(0, slidePoint, anchorPoint);

    slidePoint2 = addMP(2, "SP2", pivotRail);
    anchorPoint2 = addMP(3, "AP2", cRod);
    cRod2 = addCR(1, slidePoint2, anchorPoint2);
    penMount = addMP(4,"EX",cRod2);
    penRig = addPen(penMount);

    break;

  case 4: // 2 pen rails, variation B
    pivotRail = rails[1];
    aRail = rails[10];
    bRail = rails[7];
    turnTable = addGear(0,"TurnTable");
    aGear = addGear(1,"A");
    bGear = addGear(2,"B");

    turnTable.mount(discPoint, 0);
    aGear.mount(aRail, 0.5);
    aGear.snugTo(turnTable);
    aGear.meshTo(turnTable);

    bGear.mount(bRail, 0.5);
    bGear.snugTo(turnTable);
    bGear.meshTo(turnTable);

    slidePoint = addMP(0, "SP", pivotRail);
    anchorPoint = addMP(1, "AP", bGear);
    cRod = addCR(0, slidePoint, anchorPoint);

    slidePoint2 = addMP(2, "SP2", aGear);
    anchorPoint2 = addMP(3, "AP2", cRod);
    cRod2 = addCR(1, anchorPoint2, slidePoint2);

    penMount = addMP(4, "EX", cRod2);

    penRig = addPen(penMount);

    break;

  case 5: // 3 pen rails
    pivotRail = rails[1];
    aRail = rails[10];
    bRail = rails[7];
    turnTable = addGear(0,"Turntable");
    aGear = addGear(1,"A");
    bGear = addGear(2,"B");

    turnTable.mount(discPoint, 0);
    aGear.mount(aRail, 0.5);
    aGear.snugTo(turnTable);
    aGear.meshTo(turnTable);

    bGear.mount(bRail, 0.5);
    bGear.snugTo(turnTable);
    bGear.meshTo(turnTable);

    slidePoint = addMP(0, "SP", pivotRail);
    anchorPoint = addMP(1, "AP", bGear);
    cRod = addCR(0, slidePoint, anchorPoint);

    slidePoint2 = addMP(2, "SP2", aGear);
    anchorPoint2 = addMP(3, "AP2", pivotRail);
    cRod2 = addCR(1, slidePoint2, anchorPoint2);

    slidePoint3 = addMP(4, "SP3", cRod2);
    anchorPoint3 = addMP(5, "SA3", cRod);
    cRod3 = addCR(2, anchorPoint3, slidePoint3);
    penMount = addMP(6, "EX", cRod3);
    
    penRig = addPen(penMount);

    break;    
  case 6: // orbiting gear with rotating fulcrum (#1 and #2 combined)
    crankRail = rails[9];
    anchorRail = rails[4];
    // pivotRail = rails[1);
    let fulcrumCrankRail = rails[1];
    let fulcrumGearRail = rails[0];
    
    // Always need these...
    turnTable = addGear(0,"Turntable");
    crank = addGear(1,"Crank");                            
    crank.contributesToCycle = false;
  
    // These are optional
    anchorTable = addGear(2,"AnchorTable");
    anchorHub = addGear(3,"AnchorHub");                    
    anchorHub.contributesToCycle = false;
    orbit = addGear(4,"Orbit");
  
    fulcrumCrank = addGear(5,"FulcrumCrank");        
    fulcrumCrank.contributesToCycle = false;       
    fulcrumGear = addGear(6,"FulcrumOrbit");
  
    orbit.isMoving = true;
  
    // Setup gear relationships and mount points here...
    crank.mount(crankRail, 0);
    turnTable.mount(discPoint, 0);
    crank.snugTo(turnTable);
    crank.meshTo(turnTable);
  
    anchorTable.mount(anchorRail,0.315);
    anchorTable.snugTo(crank);
    anchorTable.meshTo(crank);

    anchorHub.stackTo(anchorTable);
    anchorHub.isFixed = true;

    orbit.mount(anchorTable,0);
    orbit.snugTo(anchorHub);
    orbit.meshTo(anchorHub);


    fulcrumCrank.mount(fulcrumCrankRail, 0.735+0.1);
    fulcrumGear.mount(fulcrumGearRail, 0.29-0.1);
    fulcrumCrank.snugTo(turnTable);
    fulcrumGear.snugTo(fulcrumCrank);    

    fulcrumCrank.meshTo(turnTable);
    fulcrumGear.meshTo(fulcrumCrank);   

    // Setup Pen
    slidePoint = addMP(0, "SP", fulcrumGear);
    anchorPoint = addMP(1, "AP", orbit);
    cRod = addCR(0, slidePoint, anchorPoint);
    penMount = addMP(2, "EX", cRod);
    penRig = addPen(penMount);

    break;

  }
  turnTable.showMount = false;
  
}

function getColor(level, alpha=255)
{
  let clr = [level,level,level,alpha].map((value,index)=>{return int(value * themeColor.levels[index] / 255);});
  
  return color(clr);
}

function draw() 
{
  
  if (freeMode){
    themeColor = color('#ffff00');
  }
  else {
    themeColor =selectedTheme;
  }


  // Crank the machine a few times, based on current passesPerFrame - this generates new gear positions and drawing output
  for ( let p = 0; p < passesPerFrame; ++p) {
    // console.log('drawing ',p,' of ',passesPerFrame,' passes');
    if (isMoving) {
      myFrameCount += drawDirection;
      // console.log('drawing direction:',drawDirection,' framecount :',myFrameCount);
      turnTable.crank(myFrameCount*crankSpeed); // The turntable is always the root of the propulsion chain, since it is the only required gear.
      // console.log('get penrig coordinates');
      // work out coords on unrotated paper
      let nib = penRig.getPosition();
      let dx = nib.x - pCenterX*inchesToPoints;
      let dy = nib.y - pCenterY*inchesToPoints;
      let a = atan2(dy, dx);
      let l = sqrt(dx*dx + dy*dy);
      let px = paperWidth/2 + cos(a-turnTable.rotation-turnTable.phase)*l*paperScale;
      let py = paperWidth/2 + sin(a-turnTable.rotation-turnTable.phase)*l*paperScale;
      //paper.beginDraw();
      if (!isStarted) {
        // paper.clear();
        paper.smooth(8);
        paper.noFill();
        paper.stroke(penColor);
        paper.strokeJoin(ROUND);
        paper.strokeCap(ROUND);
        paper.strokeWeight(penWidth);
        // paper.rect(10, 10, paperWidth-20, paperWidth-20);
        isStarted = true;
      } else if (!penRaised && !lastPenRaised) {
        paper.line(lastPX, lastPY, px, py);
        // console.log('Line from ',lastPX,lastPY,' to ',px,py);
      }
      
      //paper.endDraw();
      lastPX = px;
      lastPY = py;
      lastPenRaised = penRaised;
      // penRaised = false;
      if (myLastFrame != -1 && myFrameCount >= myLastFrame) {
        myLastFrame = -1;
        passesPerFrame = 1;
        penRaised = true;
        isMoving = false;
        isStarted = false;
        buttonFeedback();
        break;
      }
    }
  }
  // console.log ('draw machine background');
  // Draw the machine onscreen in it's current state
  background(backgroundColor); // set color '#808080'
  push();
    image(titlePic, 20, height-titlePic.height);
    // console.log('draw labels');
    drawFulcrumLabels();
    // display number of cycles
    // TODO fix font size and color result based on number of cycle (RED,orange,green background)
    fill(0, 0, 255);
    textFont(gFont);
    textAlign(CENTER, CENTER);
    text( str(computeCyclicRotations()),titlePic.width + 40,height-titlePic.height/2);

    fill(foregroundColor); //set color '#c8c8c8'
    noStroke();

    let logoScale = inchesToPoints/72.0;
    // console.log('rails');
    for ( var ch of rails) {
       ch.draw();
    }
    if (freeMode) {
      for (var mp of mountPoints){
        mp.draw();
      }
    }
    // discPoint.draw();
    // console.log('gears');
    for ( let g of activeGears) {
      if (g != turnTable)
        g.draw();
    }
    // console.log('draw turntabel');
    turnTable.draw(); // draw this last
    // console.log('draw penrig');
    penRig.draw();
  
    push();
      translate(pCenterX*inchesToPoints, pCenterY*inchesToPoints);
      rotate(turnTable.rotation+turnTable.phase);
      image(paper, -paperWidth/(2*paperScale), -paperWidth/(2*paperScale), paperWidth/paperScale, paperWidth/paperScale);
    pop();


    helpDraw(); // draw help if needed

  pop();
}

let isShifting = false;

function keyReleased() {
  //if (key == CODED) {
    if (keyCode == SHIFT)
      isShifting = false;
  //}
}

function keyPressed() {
  switch (key) {
   case ' ':
      isMoving = !isMoving;
      myLastFrame = -1;
      // println("Current cycle length: " + myFrameCount / (TWO_PI/crankSpeed));
     buttonFeedback();

      break;
   case '?':
     toggleHelp();
     break;
   case '0':
     isMoving = false;
     passesPerFrame = 0;
     myLastFrame = -1;
     buttonFeedback();
     // println("Current cycle length: " + myFrameCount / (TWO_PI/crankSpeed));
     break;
   case '1':
     passesPerFrame = 1;
     isMoving = true;
     buttonFeedback();
     break;
   case '2':
   case '3':
   case '4':
   case '5':
   case '6':
   case '7':
   case '8':
   case '9':
      passesPerFrame = int(map((key-'0'),2,9,10,360));
      isMoving = true;
      buttonFeedback();
      break;
   case 'a':
   case 'b':
   case 'c':
   case 'd':
   case 'e':
   case 'f':
   case 'g':
     deselect();
     let setups ='abcdefg';
     let setup = setups.indexOf(key);
     if( setup < 0) break;
     drawingSetup(setup, false);
     doSaveSetup();
     buttonFeedback();
     break;
   case 'X':
   case 'x':
     clearPaper();
     break;
  case 'p':
    // Swap pen mounts - need visual feedback
    break;
  case '~':
  case '`':
    completeDrawing();
    buttonFeedback();
    break;
  case '[':
    advancePenColor(-1);
    break;
  case ']':
    advancePenColor(1);
    break;
  case '<':
    advancePenWidth(-1);
    break;
  case '>':
    advancePenWidth(1);
    break;
  case '/':
    invertConnectingRod();
    break;
  case '+':
    /// DONE pendown
    penRaised = false;
    break;
  case '-':
    /// DONE penup
    penRaised = true;
    break;
  case '=':
    let direction = (key == '+' || key == '='? 1 : -1);
    nudge(direction, keyCode);
    break;
  default:
    switch (keyCode) {
    case UP_ARROW:
    case DOWN_ARROW:
    case LEFT_ARROW:
    case RIGHT_ARROW:
      let direction = (keyCode == RIGHT_ARROW || keyCode == UP_ARROW? 1 : -1);
      nudge(direction, keyCode);
      break;
    case SHIFT:
      isShifting = true;
      break;
    case 33: //pgdwn
      if(selectedObject && selectedObject instanceof Gear){
        selectedObject.phase -= 2*Math.PI/selectedObject.teeth;
      }
      break;
    case 34: //pgup
      if(selectedObject && selectedObject instanceof Gear){
        selectedObject.phase += 2*Math.PI/selectedObject.teeth;
      }
      break;
    default:
     break;
    }
    break;
  }
}

function mouseDragged()
{
  drag();
}

function mouseReleased() {
  if (freeMode && selectedObject == null){
    doDrop();
  }
  else{
    dropObject();
//    isDragging = false;
  }
  updateSetup();
  cursor(ARROW);
}

function mousePressed() 
{
  let d = 0;
  let closest = 2000;
  let selection = null;
  if (!freeMode || (mouseButton === RIGHT)){
    deselect();
    cursor(ARROW);
  }
  
  d = penRig.isClicked(mouseX, mouseY);
  if (d >= 0 && d <= closest) {
    selection = penRig;
    closest = d;
  }

  for ( let cr of activeConnectingRods) {
    d = cr.isClicked(mouseX, mouseY);
    if (d >= 0 && d < closest ) {
      selection = cr;
      closest = d;
    }
  }
  
  /// TODO check if axel of gear is selected for movement does only work on if meshing is possible
  /// is needed for free positioning

  for ( let g of activeGears) {
    d = g.isClicked(mouseX, mouseY);
    if (d >= 0 && d < closest) {
        selection = g;
        closest = d;
    }
  }
  if (freeMode){
    for ( let mp of mountPoints) {
      d = mp.isClicked(mouseX, mouseY);
      if ( d >= 0 ) {
        selection = mp;
        closest = d;
      }
    }
  }

  for ( let mp of activeMountPoints) {
    d = mp.isClicked(mouseX, mouseY);
    if ( d >= 0 ) {
      selection = mp;
      closest = d;
    }
  }

  if (selection && selectedObject != selection){
    deselect();
    selection.select();
    selectedObject = selection;
    if (selection instanceof Gear){
      cursor('grab');
    } else if(selection instanceof ConnectingRod){
      cursor(ARROW);
    } else if(selection instanceof PenRig){
      penRig.getSelectionCursor(mouseX,mouseY);
    } else if( selection instanceof MountPoint){
      cursor('../assets/RailPoint.png',16,8);
      if (freeMode){ // remove channel constraint will be reinstated at drop
        selection.itsChannel = null;
      }
    } else{
      cursor(ARROW);
    }

  }
}

function toggleFreeMode() 
{
  if (freeMode) {
    freeMode = false;
  } else {
    selectedTheme = themeColor;
    freeMode = true;
  }
}

function doDrop()
{

    // nothing selected or clicked on
  // if in freemode add new mount point at mouse point and start tracking it 
  let mp = new MountPoint("FREEMP",mouseX/inchesToPoints,mouseY/inchesToPoints);
  selectedObject = mp;
  console.log("added free mountpoint");
  activeMountPoints.push(mp);
}