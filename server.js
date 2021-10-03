const express = require("express"),
	app = express();

// Serve index.html
app.get("/", function(req, res) {
	res.sendFile(__dirname + "/index.html");
});

// Serve static files with automatic extension fallbacks so things can look nicer
app.use(express.static(__dirname, { extensions: ["html", "js", "css"] }));

app.listen(3000);
