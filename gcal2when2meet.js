(function () {

// https://developers.google.com/identity/oauth2/web/guides/migration-to-gis#gapi-callback

var CLIENT_ID = "296109782810-eul22gnapke0rrf4glt74mqpk7trdjov.apps.googleusercontent.com";
var API_KEY = "AIzaSyBHvdAgKKGarEzuA3-n0KNuiSpny8z9hbA";
var SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
var DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
var calendars = [];
var errors = [];
var gisInited;
var gapiInited;
var token_client;
var access_token;


function start() {
  loadDynamicScript("gis", "https://accounts.google.com/gsi/client", () => {
    // Initialize the authorization token client and set the application callback
    gisInit(main)
    
    // Initialize the google api client and then trigger the auth flow to start the app
    loadDynamicScript("gapi", "https://apis.google.com/js/client.js", () => {
      gapiLoad(gisAuthorize)
    });
  });
}

const loadDynamicScript = (script_id, url, callback) => {
  // https://cleverbeagle.com/blog/articles/tutorial-how-to-load-third-party-scripts-dynamically-in-javascript
  const existingScript = document.getElementById(script_id);

  if (!existingScript) {
    const script = document.createElement('script');
    script.src = url;
    script.id = script_id;
    document.body.appendChild(script);
    script.onload = () => {
      if (callback) callback();
    };
  }

  if (existingScript && callback) callback();
};

function gisInit(callback) {
  token_client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    ux_mode: 'popup',
    callback: (response) => {
      console.log(response);
      access_token = response.access_token;
      callback()
    },
  });
  gisInited = true;
  console.log("gcalw2m :: google identity services token client initialized");
}

function gisRevokeToken() {
  google.accounts.oauth2.revoke(
    access_token, () => {
      console.log("gcalw2m :: access token revoked");
  });
}

function gapiLoad(callback) {
  gapi.load('client', () => {
    gapi.client.init({
      // NOTE: OAuth2 'scope' and 'client_id' parameters have 
      // moved to initTokenClient().
    })
    .then(function() {
      // Load the Calendar API discovery document.
      gapi.client.load(DISCOVERY_DOC);
      gapi.client.setApiKey(API_KEY);
      gapiInited = true;
      console.log("gcalw2m :: google api client initialized; running post-init");
      callback();
    });
  });
}

function gisAuthorize() {
  // Start the auth flow and run the main routine
  if (gisInited && gapiInited) {
    console.log("gcalw2m :: authorizing and running application");
    token_client.requestAccessToken();
  }
}

// Fetch all events in google calendars
// Select all events on when2meet, then de-select google calendar events
function main() {
  getCalendarList().then( (calendars) => {
    calendars = calendars.filter( (cal) => { return cal.selected; });
    return Promise.all(calendars.map(getEvents));
  }).then( (events) => {
    events = events.filter( (es) => { return es; });
    _selectAllEvents();
    if (events.length === 0) {
      alert("Didn't find any events in this time period." +
            " Note that when2meets that use days of the week instead of" +
            " specific dates are not yet supported.");
    } else {
      _flatten(events).forEach(_deselectEvent);
    }
  });
}

function getCalendarList() {
  return gapi.client.calendar.calendarList.list().then(function (response) {
    console.log("gcalw2m :: Calendar list authorized!");
    // console.log(response.result);
    return Promise.resolve(response.result.items);
  }, function(response) {
    console.log("gcalw2m:: Error fetching calendar list!");
  });
}

function getEvents(calendar) {
  return gapi.client.calendar.events.list({
    calendarId: calendar.id,
    singleEvents: true, // expand recurring events
    timeMin: new Date(TimeOfSlot[0] * 1000).toISOString(),
    timeMax: new Date(TimeOfSlot[TimeOfSlot.length-1] * 1000).toISOString()
  }).then(function (response) {
    return Promise.resolve(response.result.items);
  });
}

function _selectAllEvents() {
  _toggleRange(TimeOfSlot[0], TimeOfSlot[TimeOfSlot.length-1], true);
}

function _deselectEvent(event) {
  try {
    var startTime = _convertTime(event.start.dateTime);
    var endTime = _convertTime(event.end.dateTime) - 900;
    // console.log("S:" + startTime + " E:" + endTime);
    _toggleRange(startTime, endTime, false);
  } catch (e) {
    errors.push(e);
  }
}

function _toggleRange(startTime, endTime, makeAvailable) {
  try {
    SelectFromHere(startTime);
    SelectToHere(endTime);
    ChangeToAvailable = makeAvailable;
    SelectStop();
  } catch (e) {
    errors.push(e);
    // console.log(e);
    try {
      _logTime(startTime, endTime);
    } catch (e2) {
      // console.log(e2);
    }
  }
}

function _flatten(arrs) {
  // reduce was overridden by Prototype.js so use reduceRight
  return arrs.reduceRight(function (a1, a2) { return a1.concat(a2); });
}

function _convertTime(gcalTime) {
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

function _logTime(start, stop) {
  _triggerMouseEvent(document.getElementById('YouTime' + start), "touchstart");
  _triggerMouseEvent(document.getElementById('YouTime' + start), "touchmove");
  _triggerMouseEvent(document.getElementById('YouTime' + stop), "touchmove");
  _triggerMouseEvent(document.getElementById('YouTime' + stop), "touchend");
}

function _triggerMouseEvent (node, eventType) {
  var clickEvent = document.createEvent ('MouseEvents');
  clickEvent.initEvent (eventType, true, true);
  node.dispatchEvent (clickEvent);
}

window.SelectFromHereByTouch = function SelectFromHereByTouch(event) {
  SelectFromHere(event);
}
window.SelectToHereByTouch = function SelectToHereByTouch(event) {
  SelectToHere(event);
}
window.GCAL = start;
window.GCAL.errors = errors;
start();

}());
