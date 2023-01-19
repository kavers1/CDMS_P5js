
/* not neeeded in js
interface Channel {
  PVector getPosition(float r);
  void draw();
  void snugTo(Gear moveable, Gear fixed); // position moveable gear on this channel so it is snug to fixed gear, not needed for all channels
}

interface Selectable {
  void select();
  void unselect();
  void nudge(int direction, int keycode);
}
*/
let inchesToPoints = 72; // controls display scaling
let mmToInches = 1/25.4;

let kMPDefaultRadius = inchesToPoints * 12/72.0;
let kMPSlideRadius = inchesToPoints * 20/72.0;
let kGearMountRadius = inchesToPoints * 12/72.0;
// let kGearNotchWidth = inchesToPoints * 16.5/72.0;
let kGearNotchWidth = 5 * mmToInches * inchesToPoints;
let kGearNotchHeightMaj = 5 * mmToInches * inchesToPoints;
let kGearNotchHeightMin = 3.5 * mmToInches * inchesToPoints;
let kGearLabelStart = 0.5*inchesToPoints;
let kGearLabelIncr = 0.5*inchesToPoints;
let kCRLabelIncr = 0.5*inchesToPoints;
let kCRNotchIncr = 0.25*inchesToPoints;
let kCRNotchStart = 0.75*inchesToPoints;
let kCRLabelStart = 1*inchesToPoints;
let kPenLabelStart = 0.5*inchesToPoints;  // was 4.75
let kPenLabelIncr =  0.5*inchesToPoints;  // was negative
let kPenNotchIncr =  0.25*inchesToPoints; // was negative
let kPaperRad = 4.625*inchesToPoints;

class MountPoint {
  
  constructor( typeStr,  x,  y) {

    this.radius=kMPDefaultRadius;
    this.typeStr = "MP";
    this.isFixed = false;
    this.selected = false;

    if (arguments.length == 3){
      this.typeStr = typeStr;
      this.itsChannel = null;
      this.itsMountLength = 0;
      this.isFixed = true;
      this.setupIdx = -1; // fixed
      this.x = x*inchesToPoints;
      this.y = y*inchesToPoints;

    } else {
      let chanl = arguments[1];
      let mountRatio = arguments[2];
      let setupIdx = arguments[3];
      this.typeStr = typeStr;
      this.itsChannel = chanl;
      this.itsMountLength = mountRatio;
      this.setupIdx = setupIdx;
      let pt = chanl.getPosition(mountRatio);
      this.x = pt.x;
      this.y = pt.y;
    } 
  }
  
  chooseBestDirection( direction,  keycode,  incr) 
  {
    let pNeg = this.itsChannel.getPosition(this.itsMountLength - incr);
    let pPos = this.itsChannel.getPosition(this.itsMountLength + incr);
    switch (keycode) {
      case RIGHT_ARROW:
        return (pPos.x >= pNeg.x)? 1 : -1; 
      case LEFT_ARROW:
        return (pPos.x <= pNeg.x)? 1 : -1; 
      case UP_ARROW:
        return (pPos.y <= pNeg.y)? 1 : -1; 
      case DOWN_ARROW:
        return (pPos.y >= pNeg.y)? 1 : -1; 
      default:
        return direction;      
    }
  }
  
  nudge( direction,  keycode) {
    let amount = 0; 
    let minimum = 0;
    let maximum = 1;
    if (this.itsChannel instanceof ConnectingRod) {
      amount = 0.125;
      minimum = 0.5; 
      maximum = 29;
    } else if (this.itsChannel instanceof Gear) {
      amount = 0.125;
      minimum = 0.75;
      maximum =  this.itsChannel.radius / (kGearLabelIncr) - 1;
    } else {
      amount = 0.01;
    }
    direction = this.chooseBestDirection(direction, keycode, amount);
    amount *= direction;
    this.itsMountLength += amount;
    this.itsMountLength = constrain(this.itsMountLength, minimum, maximum);
    if (this.setupIdx >= 0) {
      setupMounts[setupMode][this.setupIdx] = this.itsMountLength;
    }
  }
  
  getDistance( v1,  v2) {
    let src = this.itsChannel.getPosition(v1);
    let dst = this.itsChannel.getPosition(v2);
    return dist(src.x, src.y, dst.x, dst.y);
  }
  
  unselect() {
    this.selected = false;
  }
  
  select() {
    this.selected = true;
  }

  isClicked( mx,  my) {
    let p = this.getPosition();
    return dist(mx, my, p.x, p.y) <= this.radius;
  }

  getPosition( r) {
    
    if (r !== null && r !== undefined){
      if (this.itsChannel != null) {
        return this.itsChannel.getPosition(this.itsMountLength);
      } else {
        // console.log('Getpos mount #',this.typeStr ,' x:',this.x,' y:',this.y);
        return createVector(this.x,this.y);
      }
    } else {
      return this.getPosition(0.0);
    }
  }

  snugTo( moveable,  fixed) { // not meaningful
  }
  
  draw() {
    let p = this.getPosition();
    if (this.itsChannel instanceof ConnectingRod) {
      this.itsChannel.draw();
    } 
    if (this.selected) {
      fill(180,192);
      stroke(50);
    } else {
      fill(180,192);
      stroke(100);
    }
    strokeWeight(this.selected? 4 : 2);
    ellipse(p.x, p.y, this.radius, this.radius);
  }
}

class ConnectingRod {
  constructor( itsSlide,  itsAnchor,  rodNbr)
  {
    this.rodNbr = rodNbr;
    this.itsSlide = itsSlide;
    itsSlide.radius = kMPSlideRadius;
    this.itsAnchor = itsAnchor;
    this.armAngle = 0;
    this.selected=false;
    this.isInverted = false;  
    
    if (setupInversions[setupMode][rodNbr]){
      this.invert();
    }
  }
  
  getPosition( r) {
    let ap = this.itsAnchor.getPosition();
    let sp = this.itsSlide.getPosition();
    this.armAngle = atan2(sp.y - ap.y, sp.x - ap.x);
    let d = this.notchToDist(r);
    // console.log('Getpos conrod ',this.itsAnchor.typeStr,' ap.x',ap.x,' ap.y', ap.y,this.itsSlide.typeStr,' sp.x',sp.x,' sp.y', sp.y,' armAngle ', this.armAngle, ' d ', d);
    // console.log('Getpos conrod #',this.rodNbr,' x:',ap.x + cos(this.armAngle)*d, ' y:',ap.y + sin(this.armAngle)*d);
    return createVector(ap.x + cos(this.armAngle)*d, ap.y + sin(this.armAngle)*d);
  }  

   snugTo( moveable,  fixed) {
    // not relevant for connecting rods
  }

   unselect() {
    this.selected = false;
  }
  
   select() {
    this.selected = true;
  }
  
  invert() {
    this.isInverted = !this.isInverted;
    setupInversions[setupMode][this.rodNbr] = this.isInverted;

    let tmp = this.itsAnchor;
    this.itsAnchor = this.itsSlide;
    this.itsSlide = tmp;
    this.itsAnchor.radius = kMPDefaultRadius;
    this.itsSlide.radius = kMPSlideRadius;
    if (this.penRig != null && this.penRig.itsRod == this) {
      this.penRig.angle += 180;
      if (this.penRig.angle > 360)
        this.penRig.angle -= 360;
      setupPens[setupMode][1] = this.penRig.angle;
    }
    doSaveSetup();
  }
  
  nudge( direction,  kc) {
    if (kc == UP_ARROW || kc == DOWN_ARROW) {
      this.invert();
    }
    else {
      if (penRig.itsRod == this) {
        penRig.itsMP.nudge(direction, kc);
      }
    }
  }

  isClicked( mx,  my) 
  {
    let ap = this.itsAnchor.getPosition();
    let sp = this.itsSlide.getPosition();

    // mx,my, ap, ep522 293 546.1399 168.98767   492.651 451.97696
    let gr = 5;
    return (mx > min(ap.x-gr,sp.x-gr) && mx < max(ap.x+gr,sp.x+gr) &&
            my > min(ap.y-gr,sp.y-gr) && my < max(ap.y+gr,sp.y+gr) &&
           abs(atan2(my-sp.y,mx-sp.x) - atan2(ap.y-sp.y,ap.x-sp.x)) < radians(10)); 
  }

  notchToDist( n) {
    return kCRLabelStart+(n-1)*kCRLabelIncr;
  }

  distToNotch( d) {
    return 1 + (d - kCRLabelStart) / kCRLabelIncr;
  }

 
  draw() {
    let ap = this.itsAnchor.getPosition();
    let sp = this.itsSlide.getPosition();

    this.itsSlide.draw();
    this.itsAnchor.draw();

    noFill();
    let shade = this.selected? 100 : 200;
    let alfa = this.selected? 192 : 192;
    stroke(shade, alfa);
    strokeWeight(0.33 * inchesToPoints);
    this.armAngle = atan2(sp.y - ap.y, sp.x - ap.x);
    // println("Drawing arm " + ap.x/inchesToPoints +" " + ap.y/inchesToPoints + " --> " + sp.x/inchesToPoints + " " + sp.y/inchesToPoints);
    let L = 18 * inchesToPoints;
    line(ap.x,ap.y, ap.x+cos(this.armAngle)*L, ap.y+sin(this.armAngle)*L);
    
    stroke(100,100,100,128);
    fill(100,100,100);
    strokeWeight(0.5);
    // float notchOffset = 0.75*inchesToPoints;
    textFont(nFont);
    textAlign(CENTER);
    push();
      translate(sp.x,sp.y);
      rotate(atan2(ap.y-sp.y,ap.x-sp.x));
      let ln = dist(ap.x,ap.y,sp.x,sp.y);
      for ( let i = 0; i < 29*2; ++i) {
        let x = ln-(kCRNotchStart + kCRNotchIncr*i);
        line(x, 6, x, -(6+(i % 2 == 1? 2 : 0)));
        if (i % 2 == 1) {
          text(""+int(1+i/2),x,8);
        }
      }
    pop();
  }
}

class PenRig  {

  constructor( len,  angle,  itsMP) {
    this.len = len; // in pen notch units
    this.angle = angle;
    this.itsRod =  itsMP.itsChannel;
    this.itsMP = itsMP;
/// ????
    let ap = itsMP.getPosition();
    let ep = this.getPosition();
/// ????
    this.selected = false;
    this.lastDirection = -1; // these are used to avoid rotational wierdness with manipulations
    this.lastRotation = -1;
    this.lastKey = -1;
  }

  notchToDist( n) {
    return kPenLabelStart+(n-1) * kPenLabelIncr;
  }

  distToNotch( d) {
    return 1 + (d - kPenLabelStart) / kPenLabelIncr;
  }
  /*
  this.itsMP.draw();
    let ap = this.itsMP.getPosition();
    let ep = this.getPosition();

    let a = atan2(ap.y-ep.y,ap.x-ep.x);
    let d = 6 * inchesToPoints;
    ap.x = ep.x + cos(a)*d;
    ap.y = ep.y + sin(a)*d;

  */

  getPosition( ) {
    if (arguments.length == 0){
      let ap = this.itsMP.getPosition();
      let d = this.notchToDist(this.len);
      let rangle = radians(this.angle);
      // console.log('Getpos penrig # x:',ap.x,' y:',ap.y,' d ',d,' rangle ',rangle,' ArmAngle ',this.itsRod.armAngle);
      // console.log('Getpos penrig # x:',ap.x + cos(this.itsRod.armAngle + rangle)*d, ' y:', ap.y + sin(this.itsRod.armAngle + rangle)*d);
      return createVector(ap.x + cos(this.itsRod.armAngle + rangle)*d, ap.y + sin(this.itsRod.armAngle + rangle)*d);
    } else {
      let len = arguments[0];
      let angle = arguments[1];
      let ap = itsMP.getPosition();
      let d = this.notchToDist(len);
      let rangle = radians(angle);
      // console.log('Getpos Penrig # x:',ap.x,' y:',ap.y,' d ',d,' rangle ',rangle,' ArmAngle ',this.itsRod.armAngle);
      // console.log('Getpos Penrig # x:',ap.x + cos(this.itsRod.armAngle + rangle)*d, ' y:', ap.y + sin(this.itsRod.armAngle + rangle)*d);
      return createVector(ap.x + cos(this.itsRod.armAngle + rangle)*d, ap.y + sin(this.itsRod.armAngle + rangle)*d);
    }
  }

  
  isClicked( mx,  my) 
  {
    let ap = this.itsMP.getPosition();
    let ep = this.getPosition();

    let a = atan2(ap.y-ep.y,ap.x-ep.x);
    let d = 6*inchesToPoints;
    ap.x = ep.x + cos(a) * d;
    ap.y = ep.y + sin(a) * d;

    let gr = 5;
    return (mx > min(ap.x-gr,ep.x-gr) && mx < max(ap.x+gr,ep.x+gr) &&
            my > min(ap.y-gr,ep.y-gr) && my < max(ap.y+gr,ep.y+gr) &&
           abs(atan2(my-ep.y,mx-ep.x) - atan2(ap.y-ep.y,ap.x-ep.x)) < radians(10)); 
  }
  
  unselect() {
    this.selected = false;
  }
  
  select() {
    this.selected = true;
  }

/// TODO where is lastrotation being defined and last direction
  chooseBestDirection( direction,  keycode,  lenIncr,  angIncr) 
  {
    if (abs(angIncr) > abs(lenIncr) && this.lastRotation != -1 && (millis()-this.lastRotation) < 10000) {
      return this.lastDirection * (this.lastKey == keycode? 1 : -1);
    } 

    let pNeg = getPosition(len - lenIncr, angle - angIncr);
    let pPos = getPosition(len + lenIncr, angle + angIncr);

    switch (keycode) {
      case RIGHT_ARROW:
        return (pPos.x >= pNeg.x)? 1 : -1; 
      case LEFT_ARROW:
        return (pPos.x <= pNeg.x)? 1 : -1; 
      case UP_ARROW:
        return (pPos.y <= pNeg.y)? 1 : -1; 
      case DOWN_ARROW:
        return (pPos.y >= pNeg.y)? 1 : -1; 
      default:
        return direction;      
    }
  }
  
  nudge( direction,  kc) {
    let angIncr = 0;
    let lenIncr = 0;
    if (kc == RIGHT_ARROW || kc == LEFT_ARROW) {
      angIncr = 5;
    } else {
      lenIncr = 0.125;
    }
    direction = this.chooseBestDirection(direction, kc, lenIncr, angIncr);
    
    if (abs(angIncr) > abs(lenIncr)) {
      this.lastRotation = millis();
    }
    this.lastDirection = direction;
    this.lastKey = kc;
    
    this.angle += angIncr * direction;
    if (this.angle > 180) {
      this.angle -= 360;
    } else if (this.angle <= -180) {
      this.angle += 360;
    }
    setupPens[setupMode][1] = this.angle;
    this.len += lenIncr * direction;
    this.len = constrain(this.len, 1, 8);
    setupPens[setupMode][0] = this.len;
  }
  
  draw() {
    this.itsMP.draw();
    let ap = this.itsMP.getPosition();
    let ep = this.getPosition();

    let a = atan2(ap.y-ep.y,ap.x-ep.x);
    let d = 6 * inchesToPoints;
    ap.x = ep.x + cos(a)*d;
    ap.y = ep.y + sin(a)*d;

    noFill();
    if (this.selected)
      stroke(penColor,128);
    else
      stroke(penColor, 64);
    strokeWeight(0.33 * inchesToPoints);
    line(ap.x, ap.y, ep.x, ep.y);
  
    let nibRad = inchesToPoints * 0.111;
  
    strokeWeight(0.5);
    push();
      translate(ep.x,ep.y);
      rotate(atan2(ap.y-ep.y,ap.x-ep.x));
      fill(255);
      ellipse(0,0,nibRad,nibRad);
      noFill();
      stroke(192);
      line(-nibRad,0,nibRad,0);
      line(0,nibRad,0,-nibRad);
      
      textFont(nFont);
      textAlign(CENTER);
      fill(penColor);
      noStroke();
      ellipse(0,0,penWidth / 2, penWidth / 2);

      stroke(96);
      fill(64);
       for (let i = 2; i < 18; ++i) {
        let x = this.notchToDist(1+i/2.0); // 2, 2.5, 3, 3.5, ....9,5
        line(x, 6, x, -(6+(i % 2 == 0? 2 : 0)));
        if (i % 2 == 0) {
          text(""+int(1+i/2),x,8);
        }
      }
    pop();


  }
}

class LineRail  {
  constructor( x1,  y1,  x2,   y2) {
    this.x1 = x1 * inchesToPoints;
    this.y1 = y1 * inchesToPoints;
    this.x2 = x2 * inchesToPoints;
    this.y2 = y2 * inchesToPoints;
  }
  getPosition( ratio) {
//    // console.log('Getpos linerail # x:',this.x1 + (this.x2 - this.x1) * ratio, ' y:',this.y1 + (this.y2 - this.y1) * ratio);
    return createVector(this.x1 + (this.x2 - this.x1) * ratio, this.y1 + (this.y2 - this.y1) * ratio);
  }  

  draw() {
    noFill();
    stroke(110);
    strokeWeight(0.23 * inchesToPoints);

    line(this.x1,this.y1,this.x2,this.y2);
  }
  
  snugTo( moveable, fixed) {
    let dx1 = this.x1-fixed.x;
    let dy1 = this.y1-fixed.y;
    let dx2 = this.x2-fixed.x;
    let dy2 = this.y2-fixed.y;
    let a1 = atan2(dy1,dx1);
    let a2 = atan2(dy2,dx2);
    let d1 = dist(this.x1,this.y1,fixed.x,fixed.y);
    let d2 = dist(this.x2,this.y2,fixed.x,fixed.y);
    let adiff = abs(a1-a2);
    let r = moveable.radius + fixed.radius + meshGap;
    let mountRatio;
    if (adiff > TWO_PI)
      adiff -= TWO_PI;
    if (adiff < 0.01) {  // if rail is perpendicular to fixed circle
      mountRatio = (r - d1) / (d2 - d1);
      // find position on line (if any) which corresponds to two radii
    } else if ( abs(this.x2 - this.x1) < 0.01 ) {
      let m = 0;
      let c = (-m * this.y1 + this.x1);
      let aprim = (1 + m*m);
      let bprim = 2 * m * (c - fixed.x) - 2 * fixed.y;
      let cprim = fixed.y * fixed.y + (c - fixed.x) * (c - fixed.x) - r * r;
      let delta = bprim * bprim - 4*aprim*cprim;
      let my1 = (-bprim + sqrt(delta)) / (2 * aprim);
      let mx1 = m * my1 + c;
      let my2 = (-bprim - sqrt(delta)) / (2 * aprim); // use this if it's better
      let mx2 = m * my2 + c;
      if (my1 < min(this.y1, this.y2) || my1 > max(this.y1, this.y2) || 
          dist(moveable.x, moveable.y, mx2, my2) < dist(moveable.x, moveable.y, mx1, mx2)) {
        mx1 = mx2;
        my1 = my2;
      } 
      if (delta < 0) {
        mountRatio = -1;
      } else {
        mountRatio = dist(this.x1, this.y1, mx1, my1) / dist(this.x1, this.y1, this.x2, this.y2);
      }
    } else { // we likely have a gear on one of the lines on the left
      // given the line formed by x1,y1 x2,y2, find the two spots which are desiredRadius from fixed center.
      let m = (this.y2 - this.y1) / (this.x2 - this.x1);
      let c = (-m * this.x1 + this.y1);
      let aprim = (1 + m*m);
      let bprim = 2 * m * (c - fixed.y) - 2 * fixed.x;
      let cprim = fixed.x * fixed.x + (c - fixed.y) * (c - fixed.y) - r * r;
      let delta = bprim * bprim - 4*aprim*cprim;
      let mx1 = (-bprim + sqrt(delta)) / (2 * aprim);
      let my1 = m * mx1 + c;
      let mx2 = (-bprim - sqrt(delta)) / (2 * aprim); // use this if it's better
      let my2 = m * mx2 + c;
      if (mx1 < min(this.x1,this.x2) || mx1 > max(this.x1,this.x2) || my1 < min(this.y1,this.y2) || my1 > max(this.y1,this.y2) ||
          dist(moveable.x,moveable.y,mx2,my2) < dist(moveable.x,moveable.y,mx1,mx2)) {
        mx1 = mx2;
        my1 = my2;
      }
      if (delta < 0) {
        mountRatio = -1;
      } else {
        mountRatio = dist(this.x1, this.y1, mx1, my1) / dist(this.x1, this.y1, this.x2, this.y2);
      }
    }
    if (mountRatio < 0 || mountRatio > 1 || isNaN(mountRatio) ) {
      loadError = 1;
      mountRatio = 0;
    }
    mountRatio = constrain(mountRatio,0,1);
    moveable.mount(this,mountRatio);
  }
}

class ArcRail {
  constructor( cx,  cy,  rad,  begAngle,  endAngle) {
    this.cx = cx*inchesToPoints;
    this.cy = cy*inchesToPoints;
    this.rad = rad*inchesToPoints;
    this.begAngle = begAngle;
    this.endAngle = endAngle;  
  }

   getPosition( r) {
    let a = this.begAngle + (this.endAngle - this.begAngle)*r;
//    console.log('Getpos arcrail # x:',this.cx+cos(a)*this.rad, ' y:',this.cy+sin(a)*this.rad);

    return createVector(this.cx+cos(a)*this.rad, this.cy+sin(a)*this.rad);
  }  

//  fixed = 15.017775 6.61 1.5221801
//  moveable = 16.518276 2.237212 3.0443602
//  rail = 8.91 3.9100003 7.79
//  angles = -24.999998 15.0
//  desired r = 4.625595
//  d = 6.6779423
//  i1 12.791063 2.2343254 ang -23.352594
//  i2 16.517643 2.2343254 ang -12.421739


  snugTo( moveable,  fixed) { // get the movable gear mounted on this rail snug to the fixed gear

    // The fixed gear is surrounded by an imaginary circle which is the correct distance (r) away.
    // We need to intersect this with our arcRail circle, and find the intersection point which lies on the arcrail.
    // Mesh point 
    // https://gsamaras.wordpress.com/code/determine-where-two-circles-intersect-c/

//    println("Snug arcrail");
//    println("  fixed = " + fixed.x/72 + " " + fixed.y/72 + " " + fixed.radius/72);
//    println("  moveable = " + moveable.x/72 + " " + moveable.y/72 + " " + moveable.radius/72);
//    println("  rail = " + cx/72 + " " + cy/72 + " " + rad/72);
//    println("  angles = " + degrees(begAngle) + " " + degrees(endAngle));

  let x1 = fixed.x;
  let y1 = fixed.y;
  let r1 = moveable.radius+fixed.radius+meshGap;
  let x2 = this.cx;
  let y2 = this.cy;
  let r2 = this.rad;

    let d = dist(x1,y1,x2,y2);
    
    if (d > r1+r2) {
      loadError = 1;
      return;
    } else if (abs(d) < 0.01 && abs(r1-r2) < 0.01) {
      loadError = 1;
      return;
    } else if (d + min(r1,r2) < max(r1,r2)) {
      loadError = 1;
      return;
    }
    let a = (r1*r1 - r2*r2 + d*d) / (2*d);
    let h = sqrt(r1*r1 - a*a);
    let p2 = createVector( x1 + (a * (x2 - x1)) / d,
                              y1 + (a * (y2 - y1)) / d);
                              
    // these are our two intersection points (which may or may not fall on the arc)
    let i1 = createVector( p2.x + (h * (y2 - y1))/ d,
                              p2.y + (h * (x2 - x1))/ d);
    let i2 = createVector( p2.x - (h * (y2 - y1))/ d,
                              p2.y + (h * (x2 - x1))/ d);

    let best = i2;
    let ma = atan2(best.y-this.cy,best.x-this.cx);
    if (ma < this.begAngle || ma > this.endAngle) {
      best = i1;
      ma = atan2(best.y-this.cy,best.x-this.cx);
      if (ma < this.begAngle || ma > this.endAngle) {
        loadError = 1;
        return;
      }
    }

    let mountRatio = (ma-this.begAngle)/(this.endAngle-this.begAngle);
    if (mountRatio < 0 || mountRatio > 1)
      loadError = 1;
    moveable.mount(this, mountRatio);
  }

  draw() {
    noFill();
    stroke(110);
    strokeWeight(0.23*inchesToPoints);
    arc(this.cx, this.cy, this.rad, this.rad, this.begAngle, this.endAngle);
  }
}


rgTeeth = [ // regular gears
  30, 32, 34, 36, 40, 48, 50, 58, 60, 66, 72, 74, 80, 90, 94, 98, 100, 108, 
];
ttTeeth = [ // turntable gears
   120, 144, 150
];

class GearSetup {
  constructor( teeth,  notchStart,  notchEnd,  nbrLabels)
  {
    this.teeth = teeth;
    this.notchStart = notchStart * inchesToPoints;
    this.notchEnd = notchEnd * inchesToPoints;
    this.nbrLabels = nbrLabels;
  } 
}

gearSetups = {};

function gearInit()
{
  gearSetups = new Map();
  gearSetups.set(108, new GearSetup(108, 0.4375,  3.0,     6));
  gearSetups.set(100, new GearSetup(100, 0.40625, 2.8125,  5));
  gearSetups.set( 98, new GearSetup( 98, 0.4375,  2.8125,  5));
  gearSetups.set( 94, new GearSetup( 94, 0.375,   2.625,   5));
  gearSetups.set( 90, new GearSetup( 90, 0.40625, 2.5,     5));
  gearSetups.set( 80, new GearSetup( 80, 0.40625, 2.25,    4));
  gearSetups.set( 74, new GearSetup( 74, 0.40625, 2.031,   4));
  gearSetups.set( 72, new GearSetup( 72, 0.375,   2.0,     4));
  gearSetups.set( 66, new GearSetup( 66, 0.375,   1.6875,  3));
  gearSetups.set( 60, new GearSetup( 60, 0.3125,  1.625,   3));
  gearSetups.set( 58, new GearSetup( 58, 0.3125,  1.5625,  3));
  gearSetups.set( 50, new GearSetup( 50, 0.25,    1.3125,  2));      // notch joins axel
  gearSetups.set( 48, new GearSetup( 48, 0.375,   1.25,    2));
  gearSetups.set( 40, new GearSetup( 40, 0.25,    1.0,     2));      // notch joins axel
  gearSetups.set( 36, new GearSetup( 36, 0.3125,  0.968,   1));
  gearSetups.set( 34, new GearSetup( 34, 0.3125,  0.84375, 1));
  gearSetups.set( 32, new GearSetup( 32, 0.3125,  0.8125,  1));
  gearSetups.set( 30, new GearSetup( 30, 0.3125,  0.75,    1));
}

class Gear {
     
    constructor( teeth,  setupIdx,  nom) {
    this.itsSetup = gearSetups.get(teeth);
    this.teeth = teeth;
    this.nom = nom;
    this.setupIdx = setupIdx;
    this.radius = (this.teeth*toothRadius/PI);
    this.x = 0;
    this.y = 0;
    this.phase = 0;
    this.meshGears = [];
    this.stackGears = [];

    this.rotation =0;
    this.phase = 0;
    this.mountRatio = 0;
    this.doFill = true;
    this.showMount = true;
    this.isMoving = false; // gear's position is moving
    this.isFixed = false; // gear does not rotate or move
    this.selected = false;
    this.contributesToCycle = true;
    this.itsChannel = {};
   
  }

  isClicked( mx,  my) {
    return dist(mx, my, this.x, this.y) <= this.radius;
  }

   unselect() {
    this.selected = false;
  }
  
   select() {
    this.selected = true;
  }
  
  nudge( direction,  keycode) {
     let gearIdx = this.setupIdx;
     let teeth = 0;
     let oldTeeth = this.teeth;
    if (this.isShifting) {
      teeth = setupTeeth[setupMode][gearIdx] + direction;
    } else {
      teeth = this.findNextTeeth(setupTeeth[setupMode][gearIdx], direction);
    }
    if (teeth < 24) {
      teeth = 150;
    } else if (teeth > 150) {
      teeth = 30;
    }
    setupTeeth[setupMode][gearIdx] = teeth;
    drawingSetup(setupMode, false);
    if (loadError != 0) { // disallow invalid meshes
      // java.awt.Toolkit.getDefaultToolkit().beep();
      setupTeeth[setupMode][gearIdx] = oldTeeth;
      drawingSetup(setupMode, false);
    }
    selectedObject = activeGears[gearIdx];
    selectedObject.select();
  }

  
  findNextTeeth( teeth,  direction) {
    let gTeeth = (this == turnTable? ttTeeth : rgTeeth);

    if (direction == 1) {
        for ( let i = 0; i < gTeeth.length; ++i) {
          if (gTeeth[i] > teeth)
            return gTeeth[i];
        }
        return gTeeth[0];
    } else {
        for ( let i = gTeeth.length-1; i >= 0; --i) {
          if (gTeeth[i] < teeth)
            return gTeeth[i];
        }
        return gTeeth[gTeeth.length-1];
    }
  }
  


  getPosition( r) {
    let d = this.notchToDist(r); // kGearLabelStart+(r-1)*kGearLabelIncr;
//    console.log('Getpos ',this.nom,' # x:',this.x + cos(this.rotation + this.phase) * d, ' y:',this.y + sin(this.rotation + this.phase) * d);

    return createVector(this.x + cos(this.rotation + this.phase) * d, this.y + sin(this.rotation + this.phase) * d);
  }  

  meshTo( parent) {
    parent.meshGears.push(this);

    // work out phase for gear meshing so teeth render interlaced
    let meshAngle = atan2(this.y - parent.y, this.x - parent.x); // angle where gears are going to touch (on parent gear)
    if (meshAngle < 0)
      meshAngle += TWO_PI;

    let iMeshAngle = meshAngle + PI;
    if (iMeshAngle >= TWO_PI)
      iMeshAngle -= TWO_PI;

    let parentMeshTooth = (meshAngle - parent.phase) * parent.teeth / TWO_PI; // tooth on parent, taking parent's phase into account
    
    // We want to insure that difference mod 1 is exactly .5 to insure a good mesh
    parentMeshTooth -= floor(parentMeshTooth);
    
    this.phase = (meshAngle + PI) + (parentMeshTooth + 0.5) * TWO_PI / this.teeth;
  }
  
  
  notchToDist( n) {
    return kGearLabelStart + (n-1) * kGearLabelIncr;
  }

  distToNotch( d) {
    return 1 + (d - kGearLabelStart) / kGearLabelIncr;
  }
/// TODO
  // Using this gear as the channel, find position for moveable gear which is snug to the fixed gear (assuming fixed gear is centered)
  snugTo() {
    if (arguments.length == 1){
    // Find position in our current channel which is snug to the fixed gear
      let anchor = arguments[0];
      this.itsChannel.snugTo(this, anchor);
    } else {
      let moveable = arguments[0];
      let fixed = arguments[1];
      let d1 = 0;
      let d2 = this.radius;
      let d = moveable.radius + fixed.radius + meshGap;

      let mountRadDist = this.radius * d / d2;
      if (mountRadDist < 0 || mountRadDist > this.radius)
        loadError = 1;
      let mountNotch = this.distToNotch(mountRadDist);

      moveable.mount(this, mountNotch);
        // find position on line (if any) which corresponds to two radii
    }
  }

  stackTo( parent) {
    parent.stackGears.push(this);
    this.x = parent.x;
    this.y = parent.y;
    this.phase = parent.phase;
  }

  recalcPosition() { // used for orbiting gears
    let pt = this.itsChannel.getPosition(this.mountRatio);
    this.x = pt.x;
    this.y = pt.y;
    // console.log('Recalc ',this.nom,'# r ',this.rotation,' t=',this.teeth);
  }

  mount( ch,  r =0.0) {
    this.itsChannel = ch;
    this.mountRatio = r;
    let pt = ch.getPosition(r);
    this.x = pt.x;
    this.y = pt.y;
  }

  crank( pos) {
    if (!this.isFixed) {
      this.rotation = pos;
      // console.log('Crank  ',this.nom,':',pos,' t =',this.teeth); 
      let rTeeth = this.rotation * this.teeth;
      for ( let mGear of this.meshGears) {
         mGear.crank(-(rTeeth) / mGear.teeth);
      }
      for ( let sGear of this.stackGears) {
         sGear.crank(this.rotation);
      }
      if (this.isMoving)
       this.recalcPosition(); // technically only needed for orbiting gears
    }
    else {
      // this gear is fixed, but meshgears will rotate to the passed in pos
      for ( let mfGear of this.meshGears) {
        mfGear.crank(pos + ( pos * this.teeth ) / mfGear.teeth);
      }
    }
  }

  draw() {
    strokeWeight(1);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    noFill();
    stroke(0);

    push();
      translate(this.x, this.y);
      rotate(this.rotation+this.phase);

      let r1 = this.radius - 0.07 * inchesToPoints;
      let r2 = this.radius + 0.07 * inchesToPoints;
      let tAngle = TWO_PI / this.teeth;
      let tipAngle = tAngle * 0.1;

      if (this.doFill) {
        fill(220);
      } else {
       noFill();
      }
      if (this.selected) {
        strokeWeight(4);
        stroke(64);
      } else {
        strokeWeight(0.5);
        stroke(128);
      }
      beginShape();
      for ( let i = 0; i < this.teeth; ++i) {
        let a1 = i * tAngle;
        let a2 = (i + 0.5) * tAngle;
        vertex(r2 * cos(a1), r2 * sin(a1));
        vertex(r2*cos(a1 + tipAngle), r2 * sin(a1 + tipAngle));
        vertex(r1*cos(a2 - tipAngle), r1 * sin(a2 - tipAngle));
        vertex(r1*cos(a2 + tipAngle), r1 * sin(a2 + tipAngle));
        vertex(r2*cos(a1 + tAngle - tipAngle), r2 * sin(a1 + tAngle - tipAngle));
        vertex(r2*cos(a1 + tAngle), r2 * sin(a1 + tAngle));
      }
      endShape();

      if (this == turnTable) {
        noStroke();
        fill(255,192);
        beginShape();
        for ( let i = 0; i < 8; ++i) {
          vertex(kPaperRad * cos(i * TWO_PI / 8), kPaperRad * sin(i * TWO_PI / 8));          
        }
        endShape();
      }


      strokeWeight(1);

      push();
        translate(0, this.radius - 20);
        fill(127);
        textFont(gFont);
        textAlign(CENTER);
        text("" + this.teeth, 0, 0);
        noFill();
      pop();

      if (this.showMount) {
        noStroke();
        fill(192,128);
        ellipse(0, 0, kGearMountRadius, kGearMountRadius);

        push();
          let notchStart ={};
          let notchEnd={};
          let nbrLabels={};
          if (this.itsSetup != null) {
            notchStart = this.itsSetup.notchStart;
            notchEnd   = this.itsSetup.notchEnd;
            nbrLabels  = this.itsSetup.nbrLabels;
          } else {
            // Make a guesstimate
            notchStart = max(this.radius * 0.1,16 * seventyTwoScale);
            notchEnd = this.radius - max(this.radius * 0.1,8 * seventyTwoScale);
            nbrLabels = 1 + int((notchEnd - notchStart - 0.2 * inchesToPoints) / (0.5 * inchesToPoints));
          }
          textFont(nFont);
          textAlign(CENTER);

          stroke(128);
          fill(128);
          let nbrNotches = (nbrLabels)*2-1;
          for ( let i = 0; i < nbrNotches; ++i) {
            let x = kGearLabelStart + i * 0.25 * inchesToPoints;
            line(x,-(i % 2 == 0? kGearNotchHeightMaj : kGearNotchHeightMin), x, (i % 2 == 0? kGearNotchHeightMaj : kGearNotchHeightMin));
            if (i % 2 == 0) {
              text((i / 2 ) + 1, x, kGearNotchHeightMaj + 0.2 * inchesToPoints);
            }
          }
          fill(192);
          noStroke();
          rect(notchStart, -kGearNotchWidth/2, notchEnd-notchStart, kGearNotchWidth);
        pop();
      }
        

    pop();
  }
}


