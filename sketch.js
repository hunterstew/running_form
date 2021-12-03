let vid;
let width = 1920;
let height = 1080;
let poses;
let detector;
let end_of_video = false;
let rightAnkley = [];
let rightHipy = [];
let hits = 0;
let playVideo = true;
let times = [];
let groundContactTime = [];
let test = [];
let test2 = [];
test[0] = [];
test[1] = [];
test[2] = [];
test2[0] = [];
test2[1] = [];
test2[2] = [];

// change this variable to get the correct video and metrics for that speed
let speed = 8; //6,8,12 -- only for single person
let people = 3; //1 for single person; 2-6 for multi-person //todo convert to loop for support for 4-6 people
let obscure = true; // true or false

if (people == 1) {
  var enableTracking = '';
  var keypoint_confidence = .6;
  if (speed == 6) {
    video = 'videos/legs-6mph.mp4';
    vo_factor = .048;
    ankle_confidence = .7;
    hip_confidence = .7;
  }
  else if (speed == 8) {
    video = 'videos/full-8mph_Trim.mp4';
    vo_factor = 0.088;
    ankle_confidence = .7;
    hip_confidence = .8;
  }
  else if (speed == 12) {
    video = 'videos/legs-12mph_Trim.mp4';
    vo_factor = .053;
    ankle_confidence = .55;
    hip_confidence = .7;
  }
  else {
    throw new Error('invalid speed');
  }
}
else if (people == 2) {
  rightAnkley[0] = [];
  rightHipy[0] = [];
  rightAnkley[1] = [];
  rightHipy[1] = [];
  times[0] = [];
  times[1] = [];
  groundContactTime[0] = [];
  groundContactTime[1] = [];
  var enableTracking = true;
  var keypoint_confidence = .35;

  if (obscure) {
    vo_factor = .096;
    hip_confidence = .6;
    ankle_confidence = .2;
    video = 'videos/obscure_trim.mp4';
  }
  else {
    vo_factor = .102;
    hip_confidence = .7;
    ankle_confidence = .35;
    video = 'videos/not_obscured_trim.mp4';
  }
}
else if (people > 2 && people < 7) {
  rightAnkley[0] = [];
  rightHipy[0] = [];
  rightAnkley[1] = [];
  rightHipy[1] = [];
  rightAnkley[2] = [];
  rightHipy[2] = [];
  times[0] = [];
  times[1] = [];
  times[2] = [];
  groundContactTime[0] = [];
  groundContactTime[1] = [];
  groundContactTime[2] = [];
  var enableTracking = true;
  var keypoint_confidence = .35;

  if (obscure) {
    vo_factor = .062;
    hip_confidence = .6;
    ankle_confidence = .15;
    video = 'videos/obscured_3.mp4';
  }
  else {
    vo_factor = .07;
    hip_confidence = .7;
    ankle_confidence = .15;
    video = 'videos/not_obscured_3.mp4';
  }
}
else {
  throw new Error('invalid # of people');
}

// first function called automatically
async function setup() {
  createCanvas(width, height);
  vid = createVideo(video);


  button = createButton('start video');
  button.position(0, 0);
  button.mousePressed(init);

  vid.onended(end);
  // Hide the video element, and just show the canvas
  //vid.hide();
}

// initialize MoveNet
async function init() { // Lightning is best for fast movements
  const detectorConfig = { modelType: people == 1 ? poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING : poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING, enableTracking: enableTracking };
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
  await getPoses();

}

function end() {
  if (people == 1) {
    end_of_video = true;
    console.log('the end');
    console.log('rightHip', rightHipy);
    sortedRightAnkley = [...rightAnkley];
    sortedRightAnkley.sort();
    console.log('rightAnkle', rightAnkley);
    // console.log(sortedRightAnkley);
    hits = sortedRightAnkley.length;

    // calculate percentile-based values for steps
    // 55 and 80 line up best with ground truth values
    p55 = sortedRightAnkley[Math.round(11 * hits / 20)]
    p80 = sortedRightAnkley[Math.round(4 * hits / 5)];

    // count steps from video
    i = 0;
    steps = [];
    step = false;
    for (i = 0; i < rightAnkley.length; i++) {
      // if no recent step detected, see if foot steps
      if (!step) {
        if (rightAnkley[i] > p80) {
          startTime = times[i];
          step = true;
          steps.push(i);
          i = i + 4; // skip a few frames to ensure no step gets counted twice
        }
      }
      // if recent step detected, see if foot is high
      else {
        if (rightAnkley[i] < p55) {
          step = false;
          endTime = times[i];

          groundContactTime.push(endTime - startTime);
        }
      }
    }

    console.log('steps', steps);
    console.log('steps', steps.length);
    cadence = steps.length * 2 / (document.getElementsByTagName('video')[0].duration) * 60;
    console.log('cadence (steps/minute)', cadence);
    console.log('groundContactTime', groundContactTime);
    verticalOscillation = [];

    acc = 0;
    groundContactTime.forEach(time => {
      acc += time;
    });
    grct = acc / groundContactTime.length;
    console.log('groundContactTime', grct);

    samplesPerStep = Math.trunc(rightHipy.length / steps.length);
    for (i = 0; i < steps.length; i++) {
      maxHipy = minHipy = test = rightHipy[samplesPerStep * i];
      for (j = 0; j < samplesPerStep; j++) {
        test = rightHipy[i * samplesPerStep + j];
        if (test < minHipy)
          minHipy = test;
        else if (test > maxHipy) {
          maxHipy = test;
        }
      }

      verticalOscillation.push(maxHipy - minHipy);
    }
    console.log('verticalOscillation', verticalOscillation);

    acc2 = 0;
    verticalOscillation.forEach(osc => {
      acc2 += osc;
    });
    vert_osc = acc2 / verticalOscillation.length;
    console.log('verticalOscillation in px', vert_osc);
    console.log('verticalOscillation in in.', vert_osc * vo_factor);

  }
  else if (people == 2) {
    end_of_video = true;
    console.log('the end');
    // console.log('test', test)
    // console.log('rightHip', rightHipy);
    // console.log('rightAnkle', rightAnkley);
    // dedup in case the video freezes
    let dedupAnkle = [];
    let dedupHip = [];
    dedupHip[0] = [];
    dedupHip[1] = [];
    dedupAnkle[0] = [];
    dedupAnkle[1] = [];
    rightAnkley[0].forEach((element, index) => { if (index != 0 && rightAnkley[0][index] == rightAnkley[0][index - 1]) return; dedupAnkle[0].push(rightAnkley[0][index]) })
    rightAnkley[1].forEach((element, index) => { if (index != 0 && rightAnkley[1][index] == rightAnkley[1][index - 1]) return; dedupAnkle[1].push(rightAnkley[1][index]) })
    rightHipy[0].forEach((element, index) => { if (index != 0 && rightHipy[0][index] == rightHipy[0][index - 1]) return; dedupHip[0].push(rightHipy[0][index]) })
    rightHipy[1].forEach((element, index) => { if (index != 0 && rightHipy[1][index] == rightHipy[1][index - 1]) return; dedupHip[1].push(rightHipy[1][index]) })

    // console.log('reduced rightHip', rightHipy);
    // console.log('reduce rightAnkley', dedupAnkle);
    let sortedRightAnkley = [];
    sortedRightAnkley[0] = [];
    sortedRightAnkley[1] = [];

    for (let j = 0; j < 2; j++) {
      sortedRightAnkley[j] = [...dedupAnkle[j]];
      sortedRightAnkley[j].sort();
      // console.log('rightAnkle', dedupAnkle[j]);
      // console.log(sortedRightAnkley[j]);
      hits = sortedRightAnkley[j].length;

      // calculate percentile-based values for steps
      // 55 and 80 line up best with ground truth values
      // using 55 and 75 to account for variable height of road
      p55 = sortedRightAnkley[j][Math.round(11 * hits / 20)];
      p75 = sortedRightAnkley[j][Math.round(3 * hits / 4)];

      // count steps from video
      i = 0;
      steps = [];
      step = false;
      for (i = 0; i < dedupAnkle[j].length; i++) {
        // if no recent step detected, see if foot steps
        if (!step) {
          if (dedupAnkle[j][i] > p55) {
            startTime = times[j][i];
            step = true;
            steps.push(i);
            if (obscure && j == 1) {
              ;
            }
            else {
              i = i + 2; // skip a few frames to ensure no step gets counted twice
            }
          }
        }
        // if recent step detected, see if foot is high
        else {
          if (dedupAnkle[j][i] < p75) {
            step = false;
            endTime = times[j][i];
            groundContactTime[j].push(endTime - startTime);
            if (obscure && j == 1) {
              ;
            }
            else {
              i = i + 2;
            }
          }
        }
      }
      // console.log('steps', steps);
      console.log('steps', steps.length);
      cadence = steps.length * 2 / (document.getElementsByTagName('video')[0].duration) * 60;
      console.log('cadence (steps/minute)', cadence);
      // console.log('groundContactTime', groundContactTime[j]);
      verticalOscillation = [];

      acc = 0;
      groundContactTime[j].forEach(time => {
        acc += time;
      });
      grct = acc / groundContactTime[j].length;
      console.log('groundContactTime', grct);
      samplesPerStep = Math.trunc(dedupHip[j].length / steps.length);
      for (i = 0; i < steps.length; i++) {
        maxHipy = minHipy = test = dedupHip[j][samplesPerStep * i];
        for (k = 0; k < samplesPerStep; k++) {
          test = dedupHip[j][i * samplesPerStep + k];
          if (test < minHipy)
            minHipy = test;
          else if (test > maxHipy) {
            maxHipy = test;
          }
        }

        verticalOscillation.push(maxHipy - minHipy);
      }
      // console.log('verticalOscillation', verticalOscillation);

      acc2 = 0;
      verticalOscillation.forEach(osc => {
        acc2 += osc;
      });
      vert_osc = acc2 / verticalOscillation.length;
      console.log('verticalOscillation in px', vert_osc);
      console.log('verticalOscillation in in.', vert_osc * vo_factor);
    }
  }
  else {
    end_of_video = true;
    console.log('the end');
    // console.log('test', test)
    // console.log('test2', test2)
    // console.log('rightHip', rightHipy);
    // console.log('rightAnkle', rightAnkley);
    // dedup in case the video freezes
    let dedupAnkle = [];
    let dedupHip = [];
    dedupHip[0] = [];
    dedupHip[1] = [];
    dedupHip[2] = [];
    dedupAnkle[0] = [];
    dedupAnkle[1] = [];
    dedupAnkle[2] = [];
    rightAnkley[0].forEach((element, index) => { if (index != 0 && rightAnkley[0][index] == rightAnkley[0][index - 1]) return; dedupAnkle[0].push(rightAnkley[0][index]) })
    rightAnkley[1].forEach((element, index) => { if (index != 0 && rightAnkley[1][index] == rightAnkley[1][index - 1]) return; dedupAnkle[1].push(rightAnkley[1][index]) })
    rightAnkley[2].forEach((element, index) => { if (index != 0 && rightAnkley[2][index] == rightAnkley[2][index - 1]) return; dedupAnkle[2].push(rightAnkley[2][index]) })
    rightHipy[0].forEach((element, index) => { if (index != 0 && rightHipy[0][index] == rightHipy[0][index - 1]) return; dedupHip[0].push(rightHipy[0][index]) })
    rightHipy[1].forEach((element, index) => { if (index != 0 && rightHipy[1][index] == rightHipy[1][index - 1]) return; dedupHip[1].push(rightHipy[1][index]) })
    rightHipy[2].forEach((element, index) => { if (index != 0 && rightHipy[2][index] == rightHipy[2][index - 1]) return; dedupHip[2].push(rightHipy[2][index]) })

    // console.log('reduced rightHip', rightHipy);
    // console.log('reduce rightAnkley', dedupAnkle);
    let sortedRightAnkley = [];
    sortedRightAnkley[0] = [];
    sortedRightAnkley[1] = [];
    sortedRightAnkley[2] = [];

    for (let j = 0; j < 3; j++) {
      sortedRightAnkley[j] = [...dedupAnkle[j]];
      sortedRightAnkley[j].sort();
      // console.log('rightAnkle', dedupAnkle[j]);
      // console.log(sortedRightAnkley[j]);
      hits = sortedRightAnkley[j].length;

      // calculate percentile-based values for steps
      // 55 and 80 line up best with ground truth values
      p55 = sortedRightAnkley[j][Math.round(11 * hits / 20)];
      p80 = sortedRightAnkley[j][Math.round(4 * hits / 5)];
      // count steps from video
      i = 0;
      steps = [];
      step = false;
      for (i = 0; i < dedupAnkle[j].length; i++) {
        // if no recent step detected, see if foot steps
        if (!step) {
          if (dedupAnkle[j][i] > p80) {
            startTime = times[j][i];
            step = true;
            steps.push(i);
            i = i + 4; // skip a few frames to ensure no step gets counted twice
          }
        }
        // if recent step detected, see if foot is high
        else {
          if (dedupAnkle[j][i] < p55) {
            step = false;
            endTime = times[j][i];
            groundContactTime[j].push(endTime - startTime);
          }
        }
      }
      console.log('steps', steps);
      console.log('steps', steps.length);
      cadence = steps.length * 2 / (document.getElementsByTagName('video')[0].duration) * 60;
      console.log('cadence (steps/minute)', cadence);
      console.log('groundContactTime', groundContactTime[j]);
      verticalOscillation = [];

      acc = 0;
      groundContactTime[j].forEach(time => {
        acc += time;
      });
      grct = acc / groundContactTime[j].length;
      console.log('groundContactTime', grct);
      samplesPerStep = Math.trunc(dedupHip[j].length / steps.length);
      for (i = 0; i < steps.length; i++) {
        maxHipy = minHipy = test = dedupHip[j][samplesPerStep * i];
        for (k = 0; k < samplesPerStep; k++) {
          test = dedupHip[j][i * samplesPerStep + k];
          if (test < minHipy)
            minHipy = test;
          else if (test > maxHipy) {
            maxHipy2 = maxHipy; // remove outlier/false positive
            maxHipy = test;
          }
        }

        verticalOscillation.push(maxHipy2 - minHipy);
      }
      console.log('verticalOscillation', verticalOscillation);

      acc2 = 0;
      verticalOscillation.forEach(osc => {
        acc2 += osc;
      });
      vert_osc = acc2 / verticalOscillation.length;
      console.log('verticalOscillation in px', vert_osc);
      console.log('verticalOscillation in in.', vert_osc * vo_factor);
    }
  }
}


// Detect poses; loop indefinitely
async function getPoses() {
  if (people == 1) {
    if (!end_of_video) {
      poses = await detector.estimatePoses(vid.elt);
      if (playVideo) {
        vid.play();
        console.log('start');
        playVideo = false; //prevent video from restarting after finished
      }

      // 16 is rightAnkle
      if (poses[0] && poses[0].keypoints[16].score > ankle_confidence) { //use .7 for 6 and 8mph; use .55 for 12mph
        rightAnkley.push(poses[0].keypoints[16].y);
        times.push(document.getElementsByTagName('video')[0].currentTime);
      }
      // 12 is rightHip
      if (poses[0] && poses[0].keypoints[12].score > hip_confidence) { // use .8 for 8mph; use .7 for 6 and 12 mph
        rightHipy.push(poses[0].keypoints[12].y);
      }
      setTimeout(getPoses, 0);
    }
  }
  else {
    if (!end_of_video) {
      poses = await detector.estimatePoses(vid.elt);
      if (playVideo) {
        vid.play();
        console.log('start');
        playVideo = false; //prevent video from restarting after finished
      }
      for (let i = 0; i < poses.length; i++) {
        if (poses[i]) test[i].push([poses[i].keypoints[16].y, poses[i].keypoints[16].score]);
        // 16 is rightAnkle
        if (poses[i] && poses[i].keypoints[16].score > ankle_confidence) { //use .7 for 6 and 8mph; use .55 for 12mph
          rightAnkley[i].push(poses[i].keypoints[16].y);
          times[i].push(document.getElementsByTagName('video')[0].currentTime);
        }
        // 12 is rightHip
        if (poses[i] && poses[i].keypoints[12].score > hip_confidence) { // use .8 for 8mph; use .7 for 6 and 12 mph
          test2[i].push([poses[i].keypoints[12].y, poses[i].keypoints[12].score])
          rightHipy[i].push(poses[i].keypoints[12].y);
        }
      }
      setTimeout(getPoses, 0);
    }
  }
}

// automatically loops
function draw() {
  image(vid, 0, 0, width, height);

  //draw all keypoints
  if (poses && poses.length > 0 && !end_of_video) {
    drawKeypoints();
  }
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  //console.log(poses);
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i++) {
    // For each pose detected, loop through all the keypoints
    // Will have multiple poses if detecting multiple people
    let pose = poses[i];
    if (pose)
      for (let j = 0; j < pose.keypoints.length; j++) {
        // A keypoint is an object describing a body part (like rightArm or leftShoulder)
        let keypoint = pose.keypoints[j];
        let namex = keypoint.name + 'x';
        let namey = keypoint.name + 'y';
        // Only draw an ellipse if the pose probability is bigger than 0.6
        if (keypoint.score > keypoint_confidence) {
          fill(255, 0, 0);
          noStroke();
          ellipse(keypoint.x, keypoint.y, 10, 10);
        }
      }
  }
}