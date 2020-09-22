# frc-spreadsheets
This is a useful script for automated FRC event scouting. If you input the code for the event you are attending,
every time the script runs it will update a Google spreadsheet with the CCWM, DPR, and OPR of every team
that is competing.

To see an example of what the generated spreadsheet looks like, look [here](https://github.com/ajmeese7/frc-spreadsheets/issues/1).

## Setup
To get this project working, you need to add four things to `config.json`:
- TBA API Key
- Spreadsheet ID
- Event code
- Column labels

### TBA API Key
You can get one of these from [The Blue Alliance](https://www.thebluealliance.com).
You just need to create an account, go to your account page (under the 'More' dropdown), and
scroll to the `Read Keys` section. You type a name into the description field, it doesn't
really matter what, then copy the resulting key and paste it into the config file.

### Spreadsheet ID
This one is easy. Go to [Google Spreadsheets](https://www.google.com/sheets/about/), sign in,
create a new spreadsheet, and copy the part of the link that's just a long stream of random
numbers and letters into the config file.

For example, in the URL https://docs.google.com/spreadsheets/d/1k40T5Ve_MWtLEzwSWVdWfXel2eo6HRbaBBp-79nvI18/edit#gid=0,
the ID would be `1k40T5Ve_MWtLEzwSWVdWfXel2eo6HRbaBBp-79nvI18`.

### Event Code
This part is a little weird. To find the event code for an event, you have to go to 
[this list](https://docs.google.com/spreadsheets/d/1HqsReMjr5uBuyZjqv14t6bQF2n038GfMmWi3B6vFGiA/edit#gid=0) and copy whatever
the corresponding "2013+ Event Abbreviation" is and paste it into the config file. If you can't find your event on that list
for some reason, try Googling it and look for links to the event on the official FRC website. Usually if you scroll through
that page you can find the event code you're looking for.

### Column Labels
The labels initially in the file may make sense to you, so these should only be
changed if you have a preference to show something else here.

### After config file is set up
- Make sure you have NodeJS 10.0.0 or greater installed on your system. If you are unsure
how to do that, follow the steps [here](https://treehouse.github.io/installation-guides/windows/node-windows.html).
- Download the repository, unzip it, and run `npm install` from a terminal in the project folder.
- You should be ready to go!

## Usage
Once you have the config set up, all you need to do is go into the terminal from the
project folder and run `node .`

You'll be propmted to go to a Google page and copy back a token granting the application
access to your Google Sheets account. If you look through the code, you can see that
this code never leaves your machine and cannot be used for any malicious ends.

If nothing that screams "ERROR MESSAGE" pops up after running it, the script should've 
completed successfully. Check the spreadsheet to make sure all the data uploaded how you 
wanted it to and you'll be good.