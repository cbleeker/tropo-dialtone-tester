# tropo-dialtone-tester
This app uses the Tropo Service, and allows you to upload an XLSX file of phone numbers in a web interface.  It then dials each number at a regular programmed interval, and confirms the remote end answers within a specified timeout.  It then posts results with any failures to a Cisco Spark room.  This can be useful for testing public safety phones, elevator lines, auto-answer services, emergency devices, or "bluephones".

#Requirements
Requires Node.js be installed (should work on 10.4.x and higher) and a publicly accessible webserver for the Tropo cloud service to access this app. Ngrok to your DEV machine works well if you don't have a public webserver!

#Install
Pull this repo, and run "npm install" in the directory. 

#Setup Tropo Web App
You will need a Tropo Web-API application and have a validated account to perform outbound dialing.  

You can signup for a free Tropo developer account at www.tropo.com.  Create a new Tropo application (Click on "Create New App" under applications).  Name your app, choose "Web (HTTP) API", enter the URL your server will be hosted at (this app defaults to port 8080 i.e. http://domain.com:8080) and then add a phone number to your Tropo app.  

Take note of your Tropo voice API key.

#Setup Cisco Spark Room for notifications
Visit web.ciscospark.com.  Select the Spark room you want the notifications to be posted to, and on the right select "integrations".  Select "Inbound Webhook" and create a new Webhook.  

Take note of your Cisco Spark Webhook URL.

#Edit circuitvalidator.js
Edit the circuitvalidator.js file to update the "tropoToken" variable with your Tropo voice API key to allow the script to use your Tropo account to make/recieve phone calls.

#RUN!
node circuitvalidator.js
Visit the validator webpage at your domain (i.e. http://domain.com:8080/validator or http://localhost:8080/validator)
Upload an XLSX file with the phone numbers you want to test (a sample file to show the expeted formatting is included in this repo), and pass in the Spark room webhook.  After first launch, the app will check if there is already an XLSX file or Spark Inbound Webhook provided and will start testing immediately if they exist.

#Notes
You will probably want to adjust the timeout values as you would most likely run this every 24 hours (or for more regularity than node.js can provide for scheduled tasks, remove the timeout loop, place the static test files in the expected location, and then use a chron job to execute at the desired launch time).

#Test