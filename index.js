const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const request = require('request');
const config = require('./config.json');

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.error("Error loading client secret file:", err);

  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), getScoreData);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error while trying to retrieve access token:", err);

      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        // Store the token to disk for later program executions
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function getScoreData(auth) {
  // List of locations: https://docs.google.com/spreadsheets/d/1HqsReMjr5uBuyZjqv14t6bQF2n038GfMmWi3B6vFGiA/edit#gid=0
  let options = {
    method: 'GET',
    url: `https://www.thebluealliance.com/api/v3/event/${config.event_code}/oprs`,
    headers: { 'X-TBA-Auth-Key': config.TBA_key },
    datatype: 'json'
  };

  request(options, (error, response, body) => {
    if (error) return console.error("Error retrieving score data:", error);
    
    let teamData = {};
    data = JSON.parse(body);
    for (const team in data.ccwms) {
      let teamNumber = team.substring(3);
      let currentTeamData = {
        // Format required for cell input: https://stackoverflow.com/a/43344928/6456163
        teamNumber: [teamNumber],
        ccwm: [data.ccwms[team].toFixed(2)],
        dpr: [data.dprs[team].toFixed(2)],
        opr: [data.oprs[team].toFixed(2)]
      }

      teamData[teamNumber] = currentTeamData;
    }

    // Get the list of team numbers in numeric order
    let orderedTeamNumbers = [];
    for (const team in teamData)
      orderedTeamNumbers.push(team);

    // Move the ordered team data points into one large array
    let organizedData = [];
    orderedTeamNumbers.forEach((team) => {
      organizedData.push(teamData[team]);
    });

    // Split the data into separate arrays with related data at the same indexes
    let teams = [[config.labels[0]]],
        ccwms = [[config.labels[1]]],
        dprs  = [[config.labels[2]]],
        oprs  = [[config.labels[3]]];
    for (let i = 0; i < organizedData.length; i++) {
      teams.push( organizedData[i].teamNumber );
      ccwms.push( organizedData[i].ccwm );
      dprs.push(  organizedData[i].dpr );
      oprs.push(  organizedData[i].opr );
    }

    let columnRange = organizedData.length + 1;
    let ranges = [ `A1:A${columnRange}`, `B1:B${columnRange}`, `C1:C${columnRange}`, `D1:D${columnRange}` ];
    let columnData = [ teams, ccwms, dprs, oprs ];
    ranges.forEach(async function (range, index) {
      await modifySpreadsheet(auth, range, columnData[index]);
    });
  });
}

async function modifySpreadsheet(authClient, range, data) {
  const sheets = google.sheets({version: 'v4', authClient});
  const request = {
    spreadsheetId: config.spreadsheet_id,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource: {
      "range": range,
      "majorDimension": "ROWS",
      "values": data,
    },
    auth: authClient,
  };

  try {
    // Prints the response to console as best as it can
    const response = (await sheets.spreadsheets.values.update(request)).data;
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error(err);
  }
}