//Javascript Requires
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var tropowebapi = require('tropo-webapi');
var request = require('request');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var fs = require('fs');
var fsAccess = require('fs-access');
var xlsx = require('node-xlsx');

app.use(bodyParser.json())

//Tropo Call App Token to trigger Tropo Voice Web-API Script
//EDIT THIS LINE HERE
var tropoToken = 'insert_token_here'



//placedCalls tracks Tropo session ID's with DID's dialed
var placedCalls = {}

//Spark Public Integrations Hook Room URL - get from Web Spark Client Integrations Tab
var sparkHook = null

//timer object used to clear timeout
var timerknock = null

//Express Engine to accept XLSX file
app.post('/dataformupload', upload.single('file'), function (req, res, next) {

  	//console.log(req.body) - Contains form parameters - may be useful for getting Spark Hook URL 
  	console.log(req.body)
  	if (req.body.sparkHookURL != null) {
  		sparkHook = req.body.sparkHookURL
  		console.log(sparkHook)
  		fs.writeFileSync('uploads/sparkHookURL.txt',sparkHook)
  	}
	var tmp_path = req.file.path;
	var target_path = 'uploads/numbersToValidate.xlsx';
	var src = fs.createReadStream(tmp_path);
  	var dest = fs.createWriteStream(target_path);
  	src.pipe(dest);
  	src.on('end', function() {
  		if (timerknock != null ) {
  			clearTimeout(timerknock)
  		}
  		fs.unlink(tmp_path)
  		res.sendStatus(200)
  		parseXLSX(target_path)
  		//call execution of file
  	});
  	src.on('error', function(err) { res.status(500).send('Something broke!'); });
  	
  	// req.body will hold the text fields, if there were any 
  	
})




//Parse XCEL file to get callers array - calculate the "setTimeout" to run at midnight, designated time, etc.  
//Or could just have a static file and "chron" the start of the .js file and have it process on start every time
var parseXLSX = function(path) {
	
	//Set logic to parse XLSX file and then for each entry, call validateNumbers(callers)
	var parseFile = function() {
		obj = xlsx.parse(path)
		data = obj[0].data
		data.shift()
		console.log(data.length)
		if (data.length >= 1) {
			validateNumbers(data)
		}
		else {
			console.log('Empty XLSX file - waiting for new upload in web UI')
		}
		  
	}

	//Check if path was passed - if not, check if file already exists.  If path exists, parse with that path
	if (path == null) {
		testpath = 'uploads/numbersToValidate.xlsx'
		fsAccess(testpath, function(err) {
		    if (!err) {
		        path = 'uploads/numbersToValidate.xlsx'
		        parseFile();
		    } else {
		        console.log('No XLSX file to parse - will wait for one to be uploaded in WebUI')
		        
		    }
		});
		
	}
	else {
		parseFile();
	}

}


//Tropo Application
var validateNumbers = function (callers) {
	



	var startOutbound = function() {

		//Let Spark Room know we're starting testing
		date = new Date
		var options = {
	  		uri: sparkHook,
	  		method: 'POST',
	  		json: {
	  			"text" : 'Starting testing to provided numbers on '+date+'.  Any errors found will be posted here shortly.'
	  		}
	  	}
		request(options, function (error, response, body) {
	  		if (!error && response.statusCode == 204) {
	  			console.log('Successfully posted startup message to Spark room') 
	  		}
	  		else {
	  			console.log('Error posting to Spark for initialization.')
	  		}
		})


		placedCalls = {} //Reset data for placedCalls session ID's
		//Start outbound calls
		callers.forEach(function(caller) {
			parameters = {to: caller[0]}
			placeCall(parameters) //May want to introduce a timeout with some variability for each outbound call to throttle number of calls coming in the trunks
			console.log('Placing call to',caller[0])
		});

		console.log('Parsed file & placed calls - sleeping for 3 minutes')
		timerknock = setTimeout(parseXLSX, 300000) //86400000 ms for 1 full day, 180000 is 3 min for testing.  This is where you would want to remove the setTimeout if you want to chron the service to run every day, or calculate a setTimeout based no when you want it to run next (i.e. every night at midnight).  Leaving it running allows access to the webui, but this could be run from someone's laptop etc.

	}


	//Check if flat file has SparkURI
	if (sparkHook == null) {
		testpath = 'uploads/sparkHookURL.txt'
		fsAccess(testpath, function(err) {
		    if (!err) {
		        fs.readFile(testpath, 'utf8', function(err, data) {
					if (err) throw err;
					sparkHook = data
					console.log('sparkHook found in flat file is',data)
					startOutbound();
				});
		    } 
		    else {
		   		console.log('No Spark Hook URL in flat file - no place to post notifications to so waiting for Spark URL from uploader')
		    }
		});
	}
	else {
		startOutbound();
	}
	
}

var placeCall = function (parameters) {
	// var session = new TropoSession();
	var options = {
  		uri: 'https://api.tropo.com/1.0/sessions',
  		method: 'POST'
  	}
  	token = tropoToken
  	parameters.token = token
  	options.json = parameters
	request(options, function (error, response, body) {
  		if (!error && response.statusCode == 200) {
  			placedCalls[body.id] = {}
  			placedCalls[body.id].to = parameters.to
  			//console.log(placedCalls) 
  		}
  		else {
  			console.log('Error calling outbound for caller',parameters.to)
  		}
	})

};

// Stereo Outbound Dialer
app.post('/', function (req, res) {
	parameters = req.body.session.parameters
	// console.log(parameters)
	var callingparty = '+15551231234'  //Change to the caller ID you want to use when placing calls
	var tropo = new tropowebapi.TropoWebAPI();
	tropo.call(parameters.to, null, null, callingparty, null, parameters.to, null, null, null, '4', null, null);
	tropo.wait(1000);
	tropo.say('This is a test of the emergency phone system.  Please disregard this call.')
	tropo.on("incomplete", null, "/incomplete", true)
    tropo.on("hangup", null, "/hangup", true)
    tropo.on("error", null, "/error", true)
    console.log(tropowebapi.TropoJSON(tropo))
	res.send(tropowebapi.TropoJSON(tropo));
});





app.post('/incomplete', function (req, res) {
	callId = req.body.result.sessionId
	//console.log(callId)
	console.log('Incomplete call data received from Tropo for',placedCalls[callId].to)
	date = new Date
	var options = {
  		uri: sparkHook,
  		method: 'POST',
  		json: {
  			"text" : 'The call to '+placedCalls[callId].to+' failed at ' +date+'.  Please check the analog port and confirm its operation.'
  		}
  	}
	request(options, function (error, response, body) {
  		if (!error && response.statusCode == 204) {
  			console.log('Successfully posted failed call to Spark room') 
  		}
  		else {
  			console.log('Error posting to Spark for failed call to',placedCalls[callId].to)
  		}
	})

	res.sendStatus(200)
	
});

app.post('/hangup', function (req, res) {
	parameters = req.body
	console.log('Hangup call in Tropo')
	console.log(parameters)
	res.sendStatus(200)
	
});

app.post('/error', function (req, res) {
	parameters = req.body
	console.log('Error calling in Tropo')
	console.log(parameters)
	res.sendStatus(200)
	
});





//Start parsing flat-files on launch.  If not found, will wait for upload from web-interface.
parseXLSX();


//Serve Static Web Files

app.use('/validator', express.static(__dirname + "/circuitValidationStaticFiles"));
app.use('/bower_components', express.static(__dirname + '/bower_components'));


//Mount App to Port 8080
app.listen(8080);
console.log("validationApp server running on port 8080");

