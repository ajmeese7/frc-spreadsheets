const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const request = require('request');
var config = require('./config.json');

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);

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
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * TODO: comment this!
 */
function getScoreData(auth) {
  // List of locations: https://docs.google.com/spreadsheets/d/1HqsReMjr5uBuyZjqv14t6bQF2n038GfMmWi3B6vFGiA/edit#gid=0
  var options = {
    method: 'GET',
    url: `https://www.thebluealliance.com/api/v3/event/${config.event_code}/oprs`,
    headers: { 'X-TBA-Auth-Key': config.TBA_key },
    datatype: "json"
  };

  request(options, function (error, response, body) {
    if (error) {
      console.error("Error retrieving score data:", error);
    } else {
      data = JSON.parse(body);

      var teamData = {};
      for (const team in data.ccwms) {
        var teamNumber = team.substring(3);
        var currentTeamData = {
          // Format required for cell input: https://stackoverflow.com/a/43344928/6456163
          teamNumber: ["" + teamNumber ],
          ccwm: ["" + data.ccwms[team] ],
          dpr: ["" + data.dprs[team] ],
          opr: ["" + data.oprs[team] ]
        }

        teamData[teamNumber] = currentTeamData;
      }

      // Get the list of team numbers in numeric order
      var orderedTeamNumbers = [];
      for (const team in teamData) {
        orderedTeamNumbers.push(team);
      };

      // Move the ordered team data points into one large array
      var organizedData = [];
      orderedTeamNumbers.forEach(function (team) {
        organizedData.push(teamData[team]);
      });

      // Split the data into separate arrays with related data at the same indexes
      var teams = [], ccwms = [], dprs = [], oprs = [];
      for (i = 0; i < organizedData.length; i++) {
        teams.push( organizedData[i].teamNumber );
        ccwms.push( organizedData[i].ccwm );
        dprs.push( organizedData[i].dpr );
        oprs.push( organizedData[i].opr );
      }

      // Ignore the header row
      var columnRange = organizedData.length + 1;
      var ranges = [ `A2:A${columnRange}`, `B2:B${columnRange}`, `C2:C${columnRange}`, `D2:D${columnRange}` ];
      var columnData = [ teams, ccwms, dprs, oprs ];
      ranges.forEach(async function (range, index) {
        // Name of sheet goes before the range to select the cells properly
        await modifySpreadsheet(auth, `Score Calculations!${range}`, columnData[index]);
      });
    }
  });
}

async function modifySpreadsheet(authClient, range, data) {
  const sheets = google.sheets({version: 'v4', authClient});

  const request = {
    // The ID of the spreadsheet to update.
    spreadsheetId: config.spreadsheet_id,

    // The A1 notation of the values to update.
    range: range,

    // How the input data should be interpreted;
    // // https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption
    valueInputOption: 'USER_ENTERED',

    resource: {
      "range": range,
      "majorDimension": "ROWS",
      "values": data,
    },

    auth: authClient,
  };

  try {
    const response = (await sheets.spreadsheets.values.update(request)).data;

    // Prints the response to console as best as it can
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error(err);
  }
}