'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send('hello world i am a secret bot')
})

// for facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
		res.send(req.query['hub.challenge'])
	} else {
		res.send('Error, wrong token')
	}
})

// to post data
app.post('/webhook/', function (req, res) {
	let messaging_events = req.body.entry[0].messaging
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		let sender = event.sender.id
		if (event.message && event.message.text) {
			let text = event.message.text.toLowerCase().trim()
			if (text.substr(0,4) == 'wiki'){ 
				//search wiki 
				sendWikiResults(text.replace("wiki ",""),sender)
				continue
			}
			else{
				sendHelp(sender)
			}
		}
		if (event.postback && event.postback.payload) {
			sendTextMessage(sender, event.postback.payload)
			continue
		}
	}
	res.sendStatus(200)
})


// recommended to inject access tokens as environmental variables, e.g.
const token = process.env.FB_PAGE_ACCESS_TOKEN

function sendHelp(sender) {
	let messageData = { text:"Send wiki space 'search term' to search wikipedia" }
	
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendWikiResults(query,sender) {

	//save generic template format. Wiki page results to be pushed to elements array
	let genericTemplate = {
			attachment:{
				type: "template",
				payload: {
					template_type: "generic",
					elements: []
				}
			}
		}
	
	//send GET request to wiki API. body contains the json object from API

	const wikiUrl = 'https://en.wikipedia.org/w/api.php?format=json&action=query&generator=search&gsrnamespace=0&gsrlimit=10&prop=extracts&exintro&explaintext&exsentences=5&exlimit=max&gsrsearch='+query
	request(wikiUrl, function(error, response, body){
		if(error) console.log(error)
		try{
			body = JSON.parse(body)
			let pages = body.query.pages
			for(page of pages){
				//Elements format - to push to elemebts array of Generic template 
					let myElement = {
						title: page.title,
						subtitle: page.extract.substr(0,80).trim(),
						buttons: [{
							"type": "postback",
							"title": "Read more",
							"payload": page.extract.substr(0, 1000).trim()
						},
						{
							"type": "web_url",
							"url": "https://en.wikipedia.org/?curid=" + page.pageid,
							"title": "View in browser"
						}]
					}
					genericTemplate.message.attachment.payload.elements.push(myElement)		
			}
		}
		catch(err) {
			console.log(err)
			genericTemplate = {
				"text": "Something went wrong, please try again."
			}
		}
		//Post results to send API
		request({
			url: 'https://graph.facebook.com/v2.6/me/messages',
			qs: {access_token:token},
			method: 'POST',
			json: {
				recipient: {id:sender},
				message: genericTemplate,
			}
		}, function(error, response, body) {
			if (error) {
				console.log('Error sending messages: ', error)
			} else if (response.body.error) {
				console.log('Error: ', response.body.error)
			}
		})
	})
}

function sendTextMessage(sender, msg) {
	let messageData = { text:msg }
	
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

// spin spin sugar
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
