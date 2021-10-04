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

// change this variable to get the correct video and metrics for that speed
let speed = 8; //6,8,12

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
  const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
  await getPoses();

}

function end() {
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


// Detect poses; loop indefinitely
async function getPoses() {
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
        // Only draw an ellipse is the pose probability is bigger than 0.6
        if (keypoint.score > 0.6) {
          fill(255, 0, 0);
          noStroke();
          ellipse(keypoint.x, keypoint.y, 10, 10);
        }
      }
  }
}