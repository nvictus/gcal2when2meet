(function () {

document.body.appendChild(document.createElement('script')).src =
  "https://apis.google.com/js/client.js?onload=GCAL";

// when2meet
var CLIENT_ID = "380166371492-pqrv7v58aac56h854qujmdvsv2b14455.apps.googleusercontent.com";
var API_KEY = "AIzaSyBBtM5IlDEK5TaY9G0ypRok8PO9kpNFrCM";
var SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
var calendars = [];

function load() {
  console.log("load");
  gapi.load('client:auth2', initClient);

  gapi.client.setApiKey(API_KEY);
}

function go() {
  reqCalendarList().then(function (calendars) {
    calendars = calendars.filter(function (c) { return c.selected; });
    return Promise.all(calendars.map(reqEvents));
  }).then(function (events) {
    events = events.filter(function (es) { return es; });
    selectAll();
    if (events.length === 0) {
      alert("Didn't find any events in this time period." +
            " Note that when2meets that use days of the week instead of" +
            " specific dates are not yet supported.");
    } else {
      // console.log("events", flatten(events));
      flatten(events).forEach(deselectEvent);
    }
  });
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
    console.log("Signing in...");
    gapi.auth2.getAuthInstance().signIn();
  }).then(function() {
    console.log("Going...");
    go();
  });
}

function updateSigninStatus(isSignedIn) {
  console.log("Sign In Status: " + isSignedIn);
}

function reqCalendarList() {
  return gapi.client.calendar.calendarList.list().then(function (response) {
    console.log("authorized!");
    // console.log(response.result);
    return Promise.resolve(response.result.items);
  }, function(response) {
    console.log("Error fetching calendar list!");
  });
}

function reqEvents(calendar) {
  return gapi.client.calendar.events.list({
    calendarId: calendar.id,
    singleEvents: true, // expand recurring events
    timeMin: new Date(TimeOfSlot[0] * 1000).toISOString(),
    timeMax: new Date(TimeOfSlot[TimeOfSlot.length-1] * 1000).toISOString()
  }).then(function (response) {
    // console.log(response);
    return Promise.resolve(response.result.items);
  });
}

var errors = [];

function deselectEvent(event) {
  try {
    var startTime = convertTime(event.start.dateTime);
    var endTime = convertTime(event.end.dateTime) - 900;
    // console.log("S:" + startTime + " E:" + endTime);
    toggleRange(startTime, endTime, false);
  } catch (e) {
    errors.push(e);
  }
}

function selectAll() {
  toggleRange(TimeOfSlot[0], TimeOfSlot[TimeOfSlot.length-1], true);
}

function toggleRange(startTime, endTime, makeAvailable) {
  try {
    SelectFromHere(startTime);
    SelectToHere(endTime);
    ChangeToAvailable = makeAvailable;
    SelectStop();
  } catch (e) {
    errors.push(e);
    // console.log(e);
    try {
      logTime(startTime, endTime);
    } catch (e2) {
      // console.log(e2);
    }
  }
}

function flatten(arrs) {
  // reduce was overridden by Prototype.js so use reduceRight
  return arrs.reduceRight(function (a1, a2) { return a1.concat(a2); });
}

function convertTime(gcalTime) {
  var d = new Date(gcalTime);
  // if not on a quarter hour increment
  if (d.getMinutes() % 15 !== 0) {
    // round to the nearest half hour
    var m = (Math.round(d.getMinutes() / 30) * 30) % 60;
    var h = d.getMinutes() > 45 ? d.getHours() + 1 : d.getHours();
    d.setMinutes(m);
    d.setHours(h);
  }
  return d.getTime() / 1000;

}

window.SelectFromHereByTouch = function SelectFromHereByTouch(event) {
  SelectFromHere(event);
}

window.SelectToHereByTouch = function SelectToHereByTouch(event) {
  SelectToHere(event);
}

function logTime(start, stop) {
  triggerMouseEvent (document.getElementById('YouTime' + start), "touchstart");
  triggerMouseEvent (document.getElementById('YouTime' + start), "touchmove");
  triggerMouseEvent (document.getElementById('YouTime' + stop), "touchmove");
  triggerMouseEvent (document.getElementById('YouTime' + stop), "touchend");
}

function triggerMouseEvent (node, eventType) {
  var clickEvent = document.createEvent ('MouseEvents');
  clickEvent.initEvent (eventType, true, true);
  node.dispatchEvent (clickEvent);
}

window.GCAL = load;
window.GCAL.errors = errors;

}());
