var express = require('express');
var router = express.Router();
var https = require('https');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'TONY' });
});

/* GET Jira Search page. */
router.get('/search', function(req, res, next) {
    res.render('search', { title: 'Jira Search',jiraList:[]});
});

/* POST to Add User Service */
router.post('/query', function(req, jiraResponse, next) {

    // Get our form values. These rely on the "name" attributes
    var projectName = req.body.project;
    var strKeywords = req.body.keywords;

    // Split the keywords
    var keywordsList = strKeywords.split(" ");

    var jqlStr = 'project = ' + projectName + ' AND issuetype = Fix AND text ~ "' + strKeywords + '" ORDER BY createdDate DESC';
    var postData = {
        jql: jqlStr,
        startAt: 0,
        // no limitation for the query results count
        //maxResults: 100,
        validateQuery: true,
        fields: ['key','summary','description','status']
    };

    var opt = {
        host: 'jira.bbpd.io',
        path: '/rest/api/2/search',
        method: 'POST',
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic dGZlbmc6NDRBMmQzc2szcg=='
        }
    };


    var req = https.request(opt,function(res){
        console.log("statusCode: ", res.statusCode);
        console.log("headers: ", res.headers);

        var body = '';

        //console.log("body: ", res);
        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end',function(){

            var json = JSON.parse(body);
            // No tickets are found.
            console.log('****' + json.issues[0])
            if(json.issues[0] == undefined){
                console.log('There is no jira tickets found.');
                jiraList = (null, null);
            }
            else {
                console.log(json);
                console.log(json.issues[0].fields.status.name);

                var jiraList = matchSearch(json, keywordsList);
                jiraResponse.render('search', {title: 'Jira Search', jiraList: jiraList});
            }
        });
    });

    req.write(JSON.stringify(postData));

    req.end();

    req.on('error', function(e){
        console.error('ERROR: ' + e.message);
    });
 });

// jiraResults is json object for search date set
function matchSearch (jiraResults,keyWordsList){

    var inSummaryWeight = 80;
    var inDescriptionWeight = 20;

    var jiraItemList = jiraResults.issues;
    var matchRateList = [];

    jiraItemList.forEach(function(jiraTicket, jiraTicketIndex){

        var matchRate = 0;
        var inSummary = 0;
        var inDescription = 0;

        keyWordsList.forEach(function(keyword,keyWordIndex){

            // Search key words in summary and description
            if(jiraTicket.fields.summary != null)
            inSummary = jiraTicket.fields.summary.split(keyword).length == 1 ? 0 : 1;
            if(jiraTicket.fields.description != null)
            inDescription = jiraTicket.fields.description.split(keyword).length == 1 ? 0 : 1;

            matchRate = matchRate + inSummary * 80 + inDescription * 20;

        });

        matchRateList[jiraTicketIndex] = [jiraTicketIndex, matchRate];

    });
    // Re-order the rate list according rate by decrease order.
    matchRateList = matchRateList.sort(function(x,y){
        return y[1] - x[1]; // Decrease order
    });

    var sortedJiraItemList = [];

    // Get top 10 match rate jira tickets
    var j = matchRateList.length > 10 ? 10 : matchRateList.length;
    for (var i =0; i < j; i++) {
        // Get jira iteam list indexes for top 10 match rate
        var jiraIteamListIndex = matchRateList[i][0];
        sortedJiraItemList[i] = jiraItemList[jiraIteamListIndex];
    }

    return sortedJiraItemList;
}

module.exports = router;